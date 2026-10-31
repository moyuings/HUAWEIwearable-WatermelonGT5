import core from './common/lite-log/core.js';
export default {
    onCreate:function(){core.configure({app:'WatermelonGT5',version:'1.3.0',maxRecords:8});core.info('boot','app created');},
    onDestroy:function(){core.clear();},
    liteLog:function(action,a,b,c){
        if(action==='record'){core.record(a,b,c);return true;}
        if(action==='context'){core.context(a);return true;}
        if(action==='snapshot')return core.snapshot();
        if(action==='lines')return core.lines(a||0);
        if(action==='count')return core.count();
        if(action==='clear'){core.clear();return true;}
        if(action==='cut')return core.cut(a,b);
        return null;
    }
};
