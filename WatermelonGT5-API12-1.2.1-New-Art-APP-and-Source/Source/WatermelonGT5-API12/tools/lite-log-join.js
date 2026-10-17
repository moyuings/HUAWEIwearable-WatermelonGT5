// Computer/browser only. Never import into the watch application.
function digest(text){let n=1;for(let i=0;i<text.length;i++)n=(n*31+text.charCodeAt(i))%65521;return ('0000'+n.toString(16)).slice(-4);}
function decode(input){
    if(typeof input!=='string'||input.length>40000)throw new Error('粘贴内容过大');
    const lines=input.split(/\r?\n/).filter(line=>line.trim()),parts=new Map();let identity='',total=0,sum='';
    for(const raw of lines){
        const line=raw.trimStart(),m=/^LWL1\|([0-9a-f]+)\|(\d+)\/(\d+)\|([0-9a-f]{4})\|(.*)$/.exec(line);
        if(!m)throw new Error('有一行不是扫码原文，请每个二维码一行');
        const index=Number(m[2]),count=Number(m[3]),key=m[1]+'/'+count+'/'+m[4];
        if(count<1||count>32||index<1||index>count)throw new Error('分段编号无效');
        if(identity&&identity!==key)throw new Error('混入了不同次导出的二维码，请重新粘贴');
        identity=key;total=count;sum=m[4];
        if(parts.has(index)&&parts.get(index)!==m[5])throw new Error('同一页有冲突内容');
        parts.set(index,m[5]);
    }
    if(!total)throw new Error('请先粘贴扫码文字');
    const missing=[];let text='';for(let i=1;i<=total;i++){if(!parts.has(i))missing.push(i);else text+=parts.get(i);}
    if(missing.length)throw new Error('还缺第 '+missing.join('、')+' 页');
    if(digest(text)!==sum)throw new Error('内容校验失败，可能复制少了字符或多了空格');
    const report=JSON.parse(text);if(report.format!=='LWLOG1'||report.scope!=='app'||!Array.isArray(report.logs))throw new Error('不是应用日志报告');
    return report;
}
if(typeof module==='object'&&module.exports)module.exports={decode};else window.LiteLogJoin={decode};
