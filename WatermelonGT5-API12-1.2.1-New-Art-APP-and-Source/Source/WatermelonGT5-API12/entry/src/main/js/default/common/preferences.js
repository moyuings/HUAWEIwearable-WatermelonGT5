import storage from '@system.storage';
// One logical native request. Cancellation invalidates callbacks; it cannot abort storage itself.
var busy=false,disposeRequest=null;
function request(method,key,value,done){
    if(busy){done(false,'存储忙碌，请稍后重试');return;}
    busy=true;var settled=false;
    var timer=setTimeout(function(){finish(false,'保存/读取超时');},3000);
    function finish(ok,result){
        if(settled)return;settled=true;clearTimeout(timer);busy=false;disposeRequest=null;
        var cb=done;done=null;cb(ok,result);
    }
    disposeRequest=function(){settled=true;clearTimeout(timer);busy=false;done=null;};
    var opts={key:key,success:function(v){finish(true,v);},fail:function(data,code){finish(false,'存储错误 '+code);}};
    if(method==='get')opts.default=value;else opts.value=value;
    try{storage[method](opts);}catch(e){finish(false,'存储接口不可用');}
}
function readBest(done){
    request('get','suika_best','0',function(ok,value){
        var best=Number(value);
        if(!ok){done(false,0,value);return;}
        if(!isFinite(best)||best<0||best>99999999||Math.floor(best)!==best){
            done(false,0,'最高分内容异常');return;
        }
        done(true,best,'');
    });
}
function load(done){
    request('get','suika_fps','30',function(ok,value){
        var fps=ok&&String(value)==='60'?60:30,warning=ok?'':value;
        readBest(function(known,best,msg){done(fps,best,warning||msg,known);});
    });
}
function dispose(){if(disposeRequest)disposeRequest();disposeRequest=null;}
export default {load:load,readBest:readBest,dispose:dispose,
    saveFps:function(v,cb){request('set','suika_fps',String(v),cb);},
    saveBest:function(v,cb){request('set','suika_best',String(v),cb);}};
