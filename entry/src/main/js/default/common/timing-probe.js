// Paused-only timer comparison. No physics, reactive writes or file operations per callback.
function create(clock,timeout,clearTimeout,interval,clearInterval){
    return {clock:clock,timeout:timeout,clearTimeout:clearTimeout,interval:interval,clearInterval:clearInterval,
        active:false,handle:null,kind:0,generation:0};
}
function stop(p){p.active=false;p.generation++;if(p.handle!==null){if(p.kind)p.clearInterval(p.handle);else p.clearTimeout(p.handle);}p.handle=null;}
function start(p,fps,done){
    stop(p);p.active=true;var generation=p.generation,phase=0,first=null,period=Math.max(1,Math.floor(1000/(fps===60?60:30))-1);
    function run(){
        var began=p.clock(),last=began,count=0,maxGap=0,minPositive=0,sameClock=0;
        p.kind=phase;
        function tick(){
            if(!p.active||p.generation!==generation)return;
            if(!phase)p.handle=null;
            var now=p.clock(),elapsed=now-began,gap=now-last;count++;maxGap=Math.max(maxGap,gap);
            if(gap===0)sameClock++;else if(gap>0&&(minPositive===0||gap<minPositive))minPositive=gap;
            last=now;
            if(elapsed>=4000){
                if(phase)p.clearInterval(p.handle);p.handle=null;
                var report={ms:elapsed,callbacks:count,hz:elapsed?Math.round(count*10000/elapsed)/10:0,maxGapMs:maxGap,minPositiveGapMs:minPositive,sameClock:sameClock};
                if(!phase){first=report;phase=1;run();return;}
                p.active=false;done({mode:fps,requestedMs:period,timeout:first,interval:report,renderHz:null});return;
            }
            if(!phase)p.handle=p.timeout(tick,Math.max(1,Math.floor(period)));
        }
        p.handle=phase?p.interval(tick,Math.max(1,Math.floor(period))):p.timeout(tick,Math.max(1,Math.floor(period)));
    }
    run();
}
export default {create:create,start:start,stop:stop};
