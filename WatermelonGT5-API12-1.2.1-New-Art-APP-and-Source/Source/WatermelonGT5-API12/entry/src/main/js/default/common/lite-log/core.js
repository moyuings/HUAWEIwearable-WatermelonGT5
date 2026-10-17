// MIT / moyu. The core lives in app.js, shared via the explicit $app bridge.
var slots=[],cursor=0,base=0,limit=8,app='LiteApp',version='',fields=[],lastError=null;
function cut(value,bytes){
    var text=typeof value==='string'?value:String(value),out='',used=0,i=0,c,n,part;
    while(i<text.length){
        c=text.charCodeAt(i);n=c<128?1:(c<2048?2:3);part=text.charAt(i++);
        if(c>=55296&&c<=56319&&i<text.length){c=text.charCodeAt(i);if(c>=56320&&c<=57343){part+=text.charAt(i++);n=4;}else {part='?';n=1;}}
        else if(c>=55296&&c<=57343){part='?';n=1;}
        if(used+n>bytes)break;used+=n;out+=part;
    }
    return out;
}
function message(value){
    if(value&&typeof value==='object'){
        var text='';if(typeof value.code==='number'||typeof value.code==='string')text='code='+cut(value.code,20)+' ';
        if(typeof value.message==='string')text+=cut(value.message,96);else text+='[object]';
        return cut(text,96);
    }
    return cut(value===undefined?'':value,96);
}
function record(level,tag,value){
    var time=Date.now();if(!base)base=time;
    var l=level==='error'?'E':(level==='warn'?'W':'I'),name=cut(tag,24),text=message(value),i,old;
    for(i=0;i<slots.length;i++){old=slots[i];if(old.l===l&&old.tag===name&&old.msg===text){old.n=Math.min(9999,old.n+1);old.s=Math.max(0,Math.floor((time-base)/1000));if(l==='E')lastError=old;return;}}
    var row={s:Math.max(0,Math.floor((time-base)/1000)),l:l,tag:name,msg:text,n:1};
    if(slots.length<limit)slots.push(row);else {slots[cursor]=row;cursor=(cursor+1)%limit;}
    if(l==='E')lastError=row;
}
function ordered(){var rows=[],i;for(i=0;i<slots.length;i++)rows.push(slots[slots.length===limit?(cursor+i)%limit:i]);return rows;}
function configure(options){
    options=options||{};app=cut(options.app||'LiteApp',32);version=cut(options.version||'',16);
    var n=Math.floor(Number(options.maxRecords));limit=n>=4&&n<=16?n:8;
    slots=[];cursor=0;base=Date.now();fields=[];lastError=null;
}
function context(values){
    fields=[];var key,value;
    for(key in values){if(!Object.prototype.hasOwnProperty.call(values,key))continue;
        value=values[key];if(typeof value!=='number'&&typeof value!=='string'&&typeof value!=='boolean'&&value!==null)continue;
        if(fields.length===12)break;fields.push([cut(key,16),value===null?'unknown':cut(value,24)]);
    }
}
function snapshot(){return JSON.stringify({format:'LWLOG1',scope:'app',app:app,v:version,start:base,at:Date.now(),metrics:fields,lastError:lastError,logs:ordered()});}
function lines(offset){
    var rows=ordered(),out=[],i;
    for(i=offset;i<rows.length&&i<offset+3;i++)out.push(rows[i].s+'s '+rows[i].l+' '+rows[i].tag+' ×'+rows[i].n+'\n'+rows[i].msg);
    return out;
}
function clear(){slots=[];cursor=0;base=Date.now();fields=[];lastError=null;}
export default {configure:configure,context:context,record:record,
    info:function(tag,msg){record('info',tag,msg);},warn:function(tag,msg){record('warn',tag,msg);},
    error:function(tag,err){record('error',tag,err);},snapshot:snapshot,lines:lines,
    count:function(){return slots.length;},clear:clear,cut:cut};
