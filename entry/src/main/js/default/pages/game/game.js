import physics from '../../common/physics.js';
import rules from '../../common/rules.js';
import scheduler from '../../common/loop.js';
import projection from '../../common/render.js';
import prefs from '../../common/preferences.js';
import logger from '../../common/lite-log/logger.js';
import transfer from '../../common/lite-log/qr-transfer.js';
import timing from '../../common/timing-probe.js';
var world=null,loop=null,view=null,rows=null,cache=null,probe=null,visible=false,alive=false,resumeOnShow=false;
var gesture=false,loaded=false,saveBusy=false,bestKnown=false,savedBest=0,lastHud=0,epoch=0,requestId=0,lastRelease=-1000;
var initTimer=null,loading=false,lastCheckpoint=0,lastScoreBand=0,roundId=0;
function now(){return Date.now();}
function put(key,value){if(view[key]===value)return 0;view[key]=value;return 1;}
function tell(text){if(visible&&view)view.notice=text;}
function current(token,id){return alive&&token===epoch&&id===requestId;}
function draw(){
    if(!view||!world||!visible)return 0;
    var writes=projection.sync(world,rows,cache);
    writes+=put('score',world.score);writes+=put('count',world.count);
    if(world.score>view.best)writes+=put('best',world.score);
    var r=rules.radii[world.current];
    writes+=put('aimX',Math.round(world.aim-r));writes+=put('aimSize',r*2);
    writes+=put('aimSrc',rules.images[world.current]);writes+=put('nextSrc',rules.images[world.next]);
    writes+=put('currentName',rules.names[world.current]);
    writes+=put('flashVisible',world.flashTime>0);
    if(world.flashTime>0){
        writes+=put('flashX',Math.round(world.flashX-world.flashR));writes+=put('flashY',Math.round(world.flashY-world.flashR));
        writes+=put('flashSize',Math.max(8,world.flashR*2));
    }
    writes+=put('readyDrop',world.cooldown<=0);
    var time=now();
    if(time-lastHud>1000){lastHud=time;writes+=put('frequency',scheduler.stats(loop).loopHz+' Hz');}
    // Bounded in-memory breadcrumb, no storage/native log per frame.
    var band=Math.floor(world.score/100);
    if(loop.running&&(time-lastCheckpoint>=10000||band>lastScoreBand)){
        lastCheckpoint=time;lastScoreBand=band;
        logger.info('play','score='+world.score+' fruits='+world.count+' steps='+world.steps+' checks='+world.checks);
    }
    if(world.over&&loop.running){
        scheduler.stop(loop);gesture=false;writes+=put('panel',3);
        writes+=put('notice',world.over===2?'达到40颗容量上限':'水果越过失败线');
        logger.info('game.over','reason='+world.over+' score='+world.score);
        var report=captureMetrics();
        console.info('SUIKA_METRICS '+JSON.stringify(report)+' fruits='+world.count+' outcome='+world.over);
        saveBest();
    }
    return writes;
}
function saveBest(){
    if(!view||!loaded||saveBusy||view.best<=savedBest)return;
    if(!bestKnown){tell('最高分尚未读出，点重试保存');return;}
    saveBusy=true;var value=view.best,token=epoch,id=++requestId;
    prefs.saveBest(value,function(ok,msg){
        if(!current(token,id))return;saveBusy=false;
        if(ok){savedBest=value;tell('最高分已保存');}
        else {tell(msg+'，可点重试保存');logger.error('best.save',msg);}
    });
}
function loadPreferences(){
    if(!alive||!visible||loaded||loading)return;
    loading=true;var token=epoch,id=++requestId;
    prefs.load(function(fps,best,warning,known){
        if(!current(token,id))return;
        loading=false;loaded=true;bestKnown=known===true;view.fps=fps;loop.fps=fps;
        savedBest=best;view.best=Math.max(view.best,best);view.canStart=true;
        tell(warning?warning+'，可游戏，保存可重试':'滑动瞄准 · 松手投放');
        if(warning)logger.warn('preferences.load',warning);
        draw();
        if(resumeOnShow&&view.panel===0&&!world.over){
            resumeOnShow=false;scheduler.start(loop,view.fps);
        }
    });
}
function scheduleLoad(){
    if(!alive||!visible||loaded||loading||initTimer!==null)return;
    // Let the first page paint before native storage is entered.
    initTimer=setTimeout(function(){initTimer=null;loadPreferences();},120);
}
function cancelTasks(){
    if(probe)timing.stop(probe);
    if(initTimer!==null){clearTimeout(initTimer);initTimer=null;}
    if(loading)loaded=false;
    loading=false;saveBusy=false;requestId++;prefs.dispose();
}
function coordinates(e){
    if(e&&typeof e.globalX==='number'&&typeof e.globalY==='number')return {x:e.globalX-89,y:e.globalY-126};
    return null;
}
function pause(){
    if(probe)timing.stop(probe);if(view)view.probeBusy=false;
    if(loop)scheduler.stop(loop);gesture=false;resumeOnShow=false;
    if(view&&world&&!world.over)view.panel=1;
    saveBest();
}
function captureMetrics(){
    var s=scheduler.stats(loop);
    s.round=roundId;
    logger.context({round:roundId,mode:s.mode,fruits:world.count,activeMs:s.activeMs,loopHz:s.loopHz,
        dataHz:s.submitHz,p95Ms:s.p95GapUpperMs,maxGapMs:s.maxGapMs,
        maxWorkMs:s.maxWorkMs,discardedMs:s.discardedMs,maxPhysicsMs:s.maxPhysicsMs,
        maxDisplayMs:s.maxDisplayMs,timer:s.timer,callbackHz:s.callbackHz,
        clockMinMs:s.clockMinMs,sameClock:s.sameClock,score:world.score,
        checks:world.checks,sorts:world.sortComparisons,passes:world.solverPasses});
    return s;
}
function initialData(){
    var value={score:0,best:0,count:0,fps:30,frequency:'-- Hz',panel:1,
        notice:'正在读取设置',title:'瓜瓜坠落',started:false,canStart:false,
        aimX:135,aimSize:18,aimSrc:'/common/fruit/fruit_0.png',nextSrc:'/common/fruit/fruit_1.png',currentName:'葡萄',
        flashVisible:false,flashX:0,flashY:0,flashSize:8,readyDrop:true,
        metricA:'',metricB:'',metricC:'',metricD:'',metricE:'',metricF:'',metricG:'',
        qrValue:'',qrPage:0,qrCount:0,qrLabel:'',probeA:'',probeB:'',probeC:'',probeBusy:false};
    value.slotKeys=[];var slots=projection.slots();for(var i=0;i<rules.max;i++){var key='f'+i;value[key]=slots[i];}
    return value;
}
export default {
    data:initialData(),
    fruit:function(key){return this['f'+key];},
    onInit:function(){
        epoch++;requestId++;view=this;alive=true;visible=false;loaded=false;loading=false;
        saveBusy=false;bestKnown=false;savedBest=0;lastHud=0;lastRelease=-1000;resumeOnShow=false;gesture=false;
        world=physics.create(13579);physics.reset(world,13579);rows=projection.slots();cache=projection.slots();
        var fixedKeys=[];for(var slot=0;slot<rules.max;slot++)fixedKeys[slot]=slot;
        this.slotKeys=fixedKeys;lastCheckpoint=now();lastScoreBand=0;
        for(var i=0;i<rules.max;i++){this['f'+i]=rows[i];rows[i]=this['f'+i];}
        probe=timing.create(now,setTimeout,clearTimeout,setInterval,clearInterval);
        this.score=0;this.best=0;this.count=0;this.fps=30;this.panel=1;this.started=false;this.canStart=false;
        this.notice='正在读取设置';this.qrValue='';this.qrCount=0;this.qrPage=0;
        this.probeA='';this.probeB='';this.probeC='';this.probeBusy=false;
        loop=scheduler.create(now,setTimeout,clearTimeout,function(){physics.step(world);},draw,setInterval,clearInterval);
        loop.onError=function(error){
            if(!alive||!visible||!view)return;
            gesture=false;resumeOnShow=false;view.panel=1;
            var name=error&&error.name?error.name:'Error';
            view.notice='运行异常 '+name+'，请打开性能日志';
            logger.error('game.loop',name+' score='+world.score+' fruits='+world.count);
        };
        logger.info('game.init','isolated slots; fixed step 60 Hz; interval deadline');
    },
    onReady:function(){draw();scheduleLoad();},
    onShow:function(){
        visible=true;draw();scheduleLoad();
        if(resumeOnShow&&loaded&&this.panel===0&&!world.over){
            resumeOnShow=false;scheduler.start(loop,this.fps);
        }
    },
    onHide:function(){
        visible=false;resumeOnShow=!!(loop&&loop.running);
        if(saveBusy)this.notice='保存结果未确认，请重试';
        if(loop)scheduler.stop(loop);gesture=false;cancelTasks();this.probeBusy=false;
        if(this.panel===7){this.probeA='测量已中断，可重测';this.probeB='';this.probeC='';}
        transfer.clear();this.qrValue='';
        if(this.panel===6)this.panel=4;
    },
    onDestroy:function(){
        alive=false;visible=false;epoch++;resumeOnShow=false;gesture=false;cancelTasks();
        if(loop)scheduler.stop(loop);transfer.clear();loop=null;world=null;view=null;rows=null;cache=null;probe=null;
        for(var i=0;i<rules.max;i++)this['f'+i].visible=false;
        this.qrValue='';
    },
    onBackPress:function(){
        if(this.panel===0){pause();return true;}
        if(this.panel===6){this.closeLogs();return true;}
        if(this.panel===7){this.closeProbe();return true;}
        if(this.panel===2||this.panel===4||this.panel===5){this.panel=world.over?3:1;return true;}
        return false;
    },
    begin:function(){
        if(probe)timing.stop(probe);this.probeBusy=false;
        if(world&&world.over){if(loop)scheduler.stop(loop);this.panel=3;return;}
        if(!loaded){tell('正在读取设置，请稍候');return;}
        if(!visible)return;
        if(saveBusy){tell('正在保存，请稍候');return;}
        var newRound=!this.started;
        if(newRound){
            physics.reset(world,Math.floor(now()%2147483646)+1);scheduler.reset(loop);this.started=true;
            roundId++;
            logger.info('game.start','fps='+this.fps);
        }
        this.panel=0;this.notice='';gesture=false;draw();scheduler.start(loop,this.fps);
        if(newRound)console.info('SUIKA_ROUND '+JSON.stringify({round:roundId,event:'start',score:world.score,fruits:world.count}));
    },
    pauseGame:function(){pause();},
    askRestart:function(){pause();this.panel=5;},
    restart:function(){
        if(!loaded||!visible||saveBusy){tell('读取或保存中，请稍候');return;}
        if(probe)timing.stop(probe);this.probeBusy=false;
        scheduler.stop(loop);physics.reset(world,Math.floor(now()%2147483646)+1);scheduler.reset(loop);
        roundId++;
        this.started=true;this.panel=0;this.notice='';gesture=false;draw();scheduler.start(loop,this.fps);
        lastCheckpoint=now();lastScoreBand=0;
        logger.info('game.restart','fps='+this.fps);
        console.info('SUIKA_ROUND '+JSON.stringify({round:roundId,event:'restart',score:world.score,fruits:world.count}));
    },
    cancelRestart:function(){this.panel=world.over?3:1;},
    openSettings:function(){pause();this.panel=2;},
    closeSettings:function(){this.panel=world.over?3:1;},
    selectFps:function(value){
        if(saveBusy||!loaded){tell('读取或保存中，请稍候');return;}
        scheduler.stop(loop);this.fps=value===60?60:30;loop.fps=this.fps;scheduler.reset(loop);
        saveBusy=true;this.notice='正在保存 '+this.fps+' FPS';var token=epoch,id=++requestId;
        logger.info('mode',this.fps+' FPS selected');
        prefs.saveFps(this.fps,function(ok,msg){
            if(!current(token,id))return;saveBusy=false;
            tell(ok?'帧率设置已保存':msg+'，可重新选择重试');
            if(!ok)logger.error('fps.save',msg);
        });
    },
    retrySave:function(){
        if(!loaded||saveBusy){tell('读取或保存中，请稍候');return;}
        if(bestKnown){
            if(this.best<=savedBest)tell('最高分已保存');else saveBest();
            return;
        }
        saveBusy=true;tell('重新读取最高分');var token=epoch,id=++requestId;
        prefs.readBest(function(ok,best,msg){
            if(!current(token,id))return;saveBusy=false;
            if(!ok){tell(msg+'，未覆盖旧最高分');logger.error('best.read',msg);return;}
            bestKnown=true;savedBest=best;view.best=Math.max(view.best,best);
            if(view.best>savedBest)saveBest();else tell('最高分已保存');
        });
    },
    touchStart:function(e){
        if(!loop||!loop.running||this.panel!==0)return;
        var c=coordinates(e);if(!c){tell('触摸坐标不可用');return;}
        if(c.x<0||c.x>288||c.y<0||c.y>264)return;
        gesture=true;physics.aim(world,c.x);
    },
    touchMove:function(e){
        if(!gesture||!loop||!loop.running)return;
        var c=coordinates(e);if(c)physics.aim(world,c.x);
    },
    touchEnd:function(e){
        if(!gesture)return;gesture=false;
        if(!loop||!loop.running||this.panel!==0)return;
        lastRelease=now();var c=coordinates(e);
        if(c&&(c.y<0||c.y>264))return;
        if(c)physics.aim(world,c.x);
        var result=physics.drop(world);
        tell(result===-2?'投放口被挡住，换个位置':(result===0?'等待下一颗':''));
    },
    touchCancel:function(){gesture=false;},
    tapBoard:function(e){
        if(!loop||!loop.running||this.panel!==0||now()-lastRelease<400)return;
        gesture=false;var c=coordinates(e);
        if(!c){tell('触摸坐标不可用');return;}
        if(c.x<0||c.x>288||c.y<0||c.y>264)return;
        physics.aim(world,c.x);var result=physics.drop(world);
        tell(result===-2?'投放口被挡住，换个位置':(result===0?'等待下一颗':''));
    },
    showMetrics:function(){
        pause();var s=captureMetrics();this.panel=4;
        this.metricA='目标'+s.mode+' / '+world.count+'颗 / '+(s.activeMs/1000).toFixed(1)+'s';
        this.metricB='循环 '+s.loopHz+' / 数据 '+s.submitHz+' Hz';
        this.metricC='P95间隔 ≤'+s.p95GapUpperMs+'ms';
        this.metricD='最长间隔 '+s.maxGapMs+'ms';
        this.metricE='耗时 '+s.maxWorkMs+'ms / 丢时 '+s.discardedMs+'ms';
        this.metricF='物理峰 '+s.maxPhysicsMs+' / 提交峰 '+s.maxDisplayMs+'ms';
        this.metricG='回调 '+s.callbackHz+'Hz / 时钟 '+s.clockMinMs+'ms';
        console.info('SUIKA_METRICS '+JSON.stringify(s)+' fruits='+world.count);
    },
    openLogs:function(){
        if(!alive||!visible)return;
        pause();captureMetrics();
        if(!logger.connected()){tell('当前环境没有应用日志桥');this.panel=4;return;}
        this.qrCount=transfer.start(logger.snapshot(),now());this.qrPage=0;
        if(!this.qrCount){tell('日志生成失败');this.panel=4;return;}
        this.panel=6;this.qrValue=transfer.page(0);this.qrLabel='1 / '+this.qrCount;
    },
    qrPrev:function(){
        if(this.qrPage>0){this.qrPage--;this.qrValue=transfer.page(this.qrPage);this.qrLabel=(this.qrPage+1)+' / '+this.qrCount;}
    },
    qrNext:function(){
        if(this.qrPage+1<this.qrCount){this.qrPage++;this.qrValue=transfer.page(this.qrPage);this.qrLabel=(this.qrPage+1)+' / '+this.qrCount;}
    },
    closeLogs:function(){transfer.clear();this.qrValue='';this.qrCount=0;this.qrPage=0;this.panel=4;},
    runProbe:function(){
        if(!alive||!visible)return;
        pause();if(!loaded||loading||saveBusy){this.panel=4;tell('读写完成后再测');return;}
        this.panel=7;this.probeBusy=true;this.probeA='正在测量，约8秒';this.probeB='';this.probeC='';
        var token=epoch;
        timing.start(probe,this.fps,function(report){
            if(!alive||!visible||token!==epoch)return;
            view.probeBusy=false;
            view.probeA='单次 '+report.timeout.hz+' Hz';
            view.probeB='常驻 '+report.interval.hz+' Hz';
            view.probeC='时间差'+report.interval.minPositiveGapMs+'ms / 重复'+report.interval.sameClock;
            logger.info('timer.probe','mode='+report.mode+' timeout='+report.timeout.hz+' interval='+report.interval.hz+' Hz minDelta='+report.interval.minPositiveGapMs+' zeros='+report.interval.sameClock);
            console.info('SUIKA_TIMER_PROBE '+JSON.stringify(report));
        });
    },
    closeProbe:function(){if(probe)timing.stop(probe);this.probeBusy=false;this.panel=4;}
};
