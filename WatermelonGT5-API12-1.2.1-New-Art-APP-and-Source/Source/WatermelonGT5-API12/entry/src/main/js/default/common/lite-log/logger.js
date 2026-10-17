// Page bundles have separate module copies. The $app bridge owns the real ring.
function connected(){return typeof $app!=='undefined'&&$app&&typeof $app.liteLog==='function';}
function send(action,a,b,c){if(!connected())return null;try{return $app.liteLog(action,a,b,c);}catch(e){return null;}}
export default {connected:connected,
    info:function(tag,msg){return send('record','info',tag,msg);},
    warn:function(tag,msg){return send('record','warn',tag,msg);},
    error:function(tag,err){return send('record','error',tag,err);},
    context:function(values){return send('context',values);},
    snapshot:function(){return send('snapshot')||'';},
    lines:function(offset){return send('lines',offset)||[];},
    count:function(){return send('count')||0;},clear:function(){return send('clear');},
    cut:function(value,bytes){var result=send('cut',value,bytes);return result===null?'':result;}};
