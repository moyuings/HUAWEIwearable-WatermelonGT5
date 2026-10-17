// SDK native Lite preview, unchanged production APP build. Not GT5 verification.
const fs=require('fs'),path=require('path'),net=require('net'),crypto=require('crypto'),{spawn}=require('child_process');
const sdk=process.argv[2]||'E:/DevEco Studio/sdk',scenario=process.argv[3]||'menu',heap=Number(process.argv[4]||524288);
const project=path.resolve(__dirname,'..'),out=path.join(project,'docs/preview');fs.mkdirSync(out,{recursive:true});
const runLabel=scenario+'-'+heap;
for(const name of fs.readdirSync(out)){
 if(name===runLabel+'.jpg'||name===runLabel+'.log'||name===runLabel+'.json'||name.startsWith(runLabel+'-')&&/^\d+s\.jpg$/.test(name.slice(runLabel.length+1))){
  const target=path.resolve(out,name);if(!target.startsWith(out+path.sep))throw new Error('Preview path escaped');fs.unlinkSync(target);
 }
}
const WebSocket=require(path.resolve(sdk,'../tools/hvigor/hvigor-ohos-plugin/node_modules/ws'));
const bin=path.join(sdk,'default/openharmony/previewer/liteWearable/bin'),root=path.join(project,'entry/build/default/intermediates/loader_out_lite/default/js/default');
const base='suika_'+process.pid,label=scenario+'-'+heap;
let pipe,child,ws,frames=0,log='',finished=false,connected=false,firstImage=0,metricLines=[];
const captured=new Set();
const hashes={};
for(const file of ['app.bc','pages/index/index.bc','pages/game/game.bc'])hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
function command(name,args,type='action'){if(pipe&&!pipe.destroyed)pipe.write(JSON.stringify({version:'1.0.1',command:name,type,args})+'\0');}
function tap(x,y,at){setTimeout(()=>command('MousePress',{x,y}),at);setTimeout(()=>command('MouseRelease',{x,y}),at+70);}
function drag(x1,x2,y,at){setTimeout(()=>command('MousePress',{x:x1,y}),at);for(let i=1;i<=5;i++)setTimeout(()=>command('MouseMove',{x:x1+(x2-x1)*i/5,y}),at+i*50);setTimeout(()=>command('MouseRelease',{x:x2,y}),at+320);}
function actions(){
 command('Language',{Language:'zh-CN'},'set');
 if(scenario==='startup'){tap(233,270,2000);tap(233,184,6500);drag(233,210,240,7400);}
 if(scenario==='logs'){tap(233,333,6500);tap(233,325,7600);tap(295,339,9500);}
 if(scenario==='game30'||scenario==='game60'||scenario==='gameprobe60'||scenario==='stress60'){
  if(scenario==='game60'||scenario==='gameprobe60'||scenario==='stress60'){tap(233,236,6500);tap(233,236,7400);tap(233,328,8100);}
  tap(233,184,9000);
  const count=scenario==='stress60'?88:12;
  for(let i=0;i<count;i++){
   const at=10000+i*600;
   if(i%3===0)tap(136+i%5*47,265,at);
   else drag(140+i%5*43,145+i%5*44,250,at);
  }
  const pauseAt=scenario==='stress60'?65000:19000;
  tap(170,432,pauseAt);tap(233,333,pauseAt+800);
  if(scenario==='gameprobe60')tap(233,312,21100);
 }
 if(scenario==='settings'){tap(233,236,6500);tap(233,236,7500);}
 if(scenario==='single'){tap(233,184,6500);drag(233,210,240,7400);}
}
const server=net.createServer(socket=>{pipe=socket;let pending='';socket.on('data',data=>{pending+=data.toString();let pos;while((pos=pending.indexOf('\0'))>=0){const chunk=pending.slice(0,pos);pending=pending.slice(pos+1);log+='PIPE '+chunk+'\n';try{const m=JSON.parse(chunk);if(m.MessageType==='imageWebsocket'&&!connected)connect(Number(m.args.port));}catch(e){}}});});
function connect(port,attempt=0){
 if(finished)return;connected=true;ws=new WebSocket('ws://127.0.0.1:'+port+'/a1b2c3d4');
 ws.on('open',actions);
 ws.on('message',data=>{
  if(data.length>=42&&data.readUInt32BE(0)===0x12345678&&data[40]===255&&data[41]===216){frames++;if(!firstImage)firstImage=Date.now();
   fs.writeFileSync(path.join(out,label+'.jpg'),data.subarray(40));
   const elapsed=Date.now()-firstImage;
   const second=Math.floor(elapsed/1000);
   if(!captured.has(second)){captured.add(second);fs.writeFileSync(path.join(out,label+'-'+second+'s.jpg'),data.subarray(40));}
  }
 });
 ws.on('error',e=>{log+='WS '+e.message+'\n';if(!finished&&attempt<15)setTimeout(()=>connect(port,attempt+1),150);});
}
function finish(){
 if(finished)return;finished=true;command('exit',{});if(ws)ws.terminate();if(pipe)pipe.destroy();server.close();if(child)child.kill();
 const ok=frames>0&&!/Eval JS file failed|Nothing to render|Script Error|JS Error|JS Exception|ERR_OUT_OF_MEMORY|Start args is invalid|JsEngine Crash|Engine Crash Info|bigger than 48 KB/i.test(log);
 const metrics=log.split(/\r?\n/).filter(line=>line.includes('SUIKA_METRICS'));
 const probes=log.split(/\r?\n/).filter(line=>line.includes('SUIKA_TIMER_PROBE'));
 fs.writeFileSync(path.join(out,label+'.log'),log);const peaks=Array.from(log.matchAll(/"peakAllocBytes":\s*(\d+)/g),m=>Number(m[1]));
 const report={scenario,heapBytes:heap,unchangedProductionBuild:true,compiledSha256:hashes,framesTransported:frames,ok,metrics,probes,peakJsAllocBytes:peaks.length?Math.max(...peaks):null,scope:'Windows native SDK preview; transported JPEG count is NOT displayed FPS; no GT5',durationSeconds:scenario==='stress60'?68:(scenario==='gameprobe60'?32:(scenario.startsWith('game')?22:11))};
 fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=ok?0:1;
}
server.listen('\\\\.\\pipe\\'+base+'_commandPipe',()=>{const portServer=net.createServer();portServer.listen(0,'127.0.0.1',()=>{const port=portServer.address().port;portServer.close(()=>{
 child=spawn(path.join(bin,'Simulator.exe'),['-device','liteWearable','-shape','circle','-or','466','466','-cr','466','466','-j',root,'-url',scenario==='entry'||scenario==='startup'?'pages/index/index':'pages/game/game','-n','entry','-s',base,'-lws',String(port),'-sid','a1b2c3d4','-hs',String(heap),'-sd','160','-refresh','full','-ilt','false'],{cwd:bin,windowsHide:true});
 child.stdout.on('data',b=>log+=b.toString());child.stderr.on('data',b=>log+=b.toString());child.on('error',e=>{log+=e.message;finish();});child.on('exit',()=>{if(!finished)finish();});setTimeout(finish,scenario==='stress60'?68000:(scenario==='gameprobe60'?32000:(scenario.startsWith('game')?22000:11000)));
 });});});
