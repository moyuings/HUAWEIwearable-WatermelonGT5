// MIT / moyu. One immutable snapshot; 160 UTF-8 bytes per QR payload.
// At most 32 pages. No timers, native services or persistent writes.
var report='',offsets=[],session='',checksum='';
function digest(text){var n=1,i;for(i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))%65521;return ('0000'+n.toString(16)).slice(-4);}
function clear(){report='';offsets=[];session='';checksum='';}
function start(text,time){
    clear();if(typeof text!=='string'||text.length>4096)return 0;
    var i=0,bytes=0,first=0,c,n,end;
    while(i<text.length){
        c=text.charCodeAt(i);n=c<128?1:(c<2048?2:3);end=i+1;
        if(c>=55296&&c<=56319&&end<text.length){c=text.charCodeAt(end);if(c>=56320&&c<=57343){n=4;end++;}}
        if(bytes+n>160){offsets.push(first);first=i;bytes=0;}
        bytes+=n;i=end;
    }
    if(text.length)offsets.push(first);offsets.push(text.length);
    if(offsets.length>33){clear();return 0;}
    report=text;checksum=digest(text);session=Math.floor(time%16777216).toString(16);
    return offsets.length-1;
}
function page(index){
    var count=offsets.length-1;if(count<=0)return '';
    index=Math.max(0,Math.min(count-1,index));
    return 'LWL1|'+session+'|'+(index+1)+'/'+count+'|'+checksum+'|'+report.slice(offsets[index],offsets[index+1]);
}
export default {start:start,page:page,clear:clear,digest:digest};
