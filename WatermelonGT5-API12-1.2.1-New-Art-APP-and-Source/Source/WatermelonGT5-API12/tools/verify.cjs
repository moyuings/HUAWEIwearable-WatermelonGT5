// Computer-only tests execute the unchanged production algorithms.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),common=path.join(root,'entry/src/main/js/default/common');
let groups=0;const results=[];
function moduleFile(file,imports={},extras={}){
 const c={Math,Number,String,JSON,isFinite,console,...imports,...extras,result:null};
 let text=fs.readFileSync(file,'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','result=');
 vm.runInNewContext(text,c,{filename:file});return c.result;
}
const rules=moduleFile(path.join(common,'rules.js'));
const physics=moduleFile(path.join(common,'physics.js'),{rules});
const renderer=moduleFile(path.join(common,'render.js'),{rules});
const sched=moduleFile(path.join(common,'loop.js'),{rules});
const timing=moduleFile(path.join(common,'timing-probe.js'));
function test(name,fn){fn();groups++;results.push({name,passed:true});console.log('PASS '+name);}
function fakeTimers(){let now=0,id=0,peak=0,created=0;const jobs=new Map();
 function add(fn,ms,repeat){const n=++id;created++;jobs.set(n,{at:now+ms,fn,repeat});peak=Math.max(peak,jobs.size);return n;}
 return {clock:()=>now,set:(fn,ms)=>add(fn,ms,0),interval:(fn,ms)=>add(fn,ms,ms),
 clear:n=>jobs.delete(n),run:target=>{while(true){let best=null,at=Infinity;for(const [n,j]of jobs){if(j.at<at){best=n;at=j.at;}}if(at>target||best===null)break;now=at;const job=jobs.get(best);if(job.repeat)job.at+=job.repeat;else jobs.delete(best);job.fn();}now=target;},
 get jobs(){return jobs.size;},get peak(){return peak;},get created(){return created;},jump:ms=>{now+=ms;},first:()=>jobs.values().next().value?.fn};}
function world(seed=13579){const w=physics.create(seed);physics.reset(w,seed);return w;}
function steps(w,n){for(let i=0;i<n;i++)physics.step(w);}
function invariant(w){let count=0;for(let i=0;i<rules.max;i++)if(w.active[i]){count++;
 assert(Number.isFinite(w.x[i])&&Number.isFinite(w.y[i])&&Number.isFinite(w.vx[i])&&Number.isFinite(w.vy[i]));
 const r=rules.radii[w.level[i]];assert(w.x[i]>=r-.001&&w.x[i]<=rules.width-r+.001);
 assert(w.y[i]>=r-.001&&w.y[i]<=rules.height-r+.001);assert(w.level[i]>=0&&w.level[i]<=10);
 }assert.equal(w.count,count);assert(count<=40);}
test('single drop, exact ground, legal aim',()=>{let w=world();w.current=0;physics.aim(w,-999);assert.equal(w.aim,10);physics.aim(w,999);assert.equal(w.aim,278);assert.equal(physics.drop(w),1);steps(w,360);assert(Math.abs(w.y[0]-255)<.1);assert(Math.abs(w.vy[0])<1);invariant(w);});
test('collision stack and no tunneling at max fall speed',()=>{const w=world();physics.add(w,144,240,2);physics.add(w,144,100,3);w.vy[1]=360;steps(w,480);assert.equal(w.count,2);assert(w.y[1]<w.y[0]);assert(Math.abs(w.y[0]-w.y[1])>32.6);invariant(w);});
test('same-tier merge exactly once, no phantom slot',()=>{const w=world();physics.add(w,100,200,0);physics.add(w,117,200,0);steps(w,1);assert.equal(w.count,1);assert.equal(w.merges,1);assert.equal(w.score,rules.points(1));assert.equal(w.level[0],1);steps(w,100);assert.equal(w.merges,1);invariant(w);});
test('three simultaneous contacts cannot double-consume',()=>{const w=world();for(let i=0;i<3;i++)physics.add(w,120+i*17,200,0);steps(w,1);assert.equal(w.count,2);assert.equal(w.merges,1);assert.equal(w.score,rules.points(1));invariant(w);});
test('watermelon is reachable and final tier never overflows',()=>{for(let level=0;level<10;level++){const w=world(),r=rules.radii[level];physics.add(w,144-r+1,140,level);physics.add(w,144+r-1,140,level);steps(w,1);assert.equal(w.level[0],level+1);assert.equal(w.count,1);invariant(w);}const w=world();physics.add(w,100,180,10);physics.add(w,210,180,10);steps(w,20);assert.equal(w.merges,0);invariant(w);});
test('cooldown, cancelled/repeated drops, blocked mouth',()=>{const w=world();assert.equal(physics.drop(w),1);assert.equal(physics.drop(w),0);steps(w,44);physics.aim(w,280);assert.equal(physics.drop(w),1);const z=world();physics.add(z,z.aim,20,z.current);assert.equal(physics.drop(z),-2);assert.equal(z.count,1);});
test('40 cap reports game over and never evicts fruit',()=>{const w=world();for(let i=0;i<40;i++)physics.add(w,20+i%10*25,70+Math.floor(i/10)*40,i%5);assert.equal(physics.add(w,40,60,0),-1);assert.equal(physics.drop(w),-1);assert.equal(w.over,2);assert.equal(w.count,40);});
test('falling fruit is not an immediate loss, sustained pile loses',()=>{const w=world();physics.drop(w);steps(w,60);assert.equal(w.over,0);const p=world();for(let i=0;i<3;i++)physics.add(p,144,60+i*85,10);steps(p,600);assert.equal(p.over,1);});
test('projection contains only bounded drawing fields and reuses slots',()=>{const w=world(),rows=renderer.slots();physics.add(w,120,200,5);const object=rows[0];renderer.sync(w,rows);assert.equal(rows.length,40);assert.equal(rows[0],object);assert.deepEqual(Object.keys(rows[0]).sort(),['id','size','src','visible','x','y']);assert(rows[0].visible);physics.reset(w,12);renderer.sync(w,rows);assert(!rows[0].visible);});
test('deadline 30/60 cadence, fixed physics equivalence',()=>{function simulate(fps){const w=world(),t=fakeTimers();physics.drop(w);const l=sched.create(t.clock,t.set,t.clear,()=>physics.step(w),()=>{});sched.start(l,fps);t.run(10000);sched.stop(l);return {w,s:sched.stats(l),t};}const a=simulate(30),b=simulate(60);assert(Math.abs(a.w.steps-b.w.steps)<=4);assert(Math.abs(a.w.y[0]-b.w.y[0])<.1);assert(Math.abs(a.s.loopHz-30)<.2);assert(Math.abs(b.s.loopHz-60)<.2);assert.equal(a.t.jobs,0);assert.equal(b.s.renderHz,null);});
test('frame switch preserves world and one scheduled loop; stale callback inert',()=>{const w=world(),t=fakeTimers();physics.drop(w);const l=sched.create(t.clock,t.set,t.clear,()=>physics.step(w),()=>{});sched.start(l,30);t.run(300);const count=w.count;for(let i=0;i<100;i++)sched.start(l,i%2?30:60);assert.equal(t.jobs,1);assert.equal(w.count,count);const callback=t.first();sched.stop(l);const n=w.steps;callback();assert.equal(w.steps,n);assert.equal(t.jobs,0);});
test('long stall caps physics at 6 steps and reports discarded time',()=>{const t=fakeTimers();let n=0;const l=sched.create(t.clock,t.set,t.clear,()=>n++,()=>{});sched.start(l,60);const cb=t.first();t.jump(1000);cb();assert.equal(n,6);assert(sched.stats(l).discardedMs>=899);sched.stop(l);});
test('10 minutes of seeded real games, dense 40-body piles finite',()=>{let w=world(),games=0,actions=0;const duration=Math.round(600/rules.step),dropEvery=Math.round((50/120)/rules.step);for(let i=0;i<duration;i++){if(i%dropEvery===0){physics.aim(w,20+(i*71)%248);physics.drop(w);actions++;}physics.step(w);if(i%60===0)invariant(w);if(w.over){games++;physics.reset(w,13579+games*193);}}assert(games>0);for(let seed=1;seed<=12;seed++){w=world(seed);for(let i=0;i<40;i++)physics.add(w,12+(i%10)*27,80+Math.floor(i/10)*40,(i+seed)%5);steps(w,360);invariant(w);}results.push({games,actions,simulatedSeconds:duration*rules.step});});
// Native service failures and timeouts; actual production preferences callbacks.
test('preferences serialize, success only on native callback, timeout ignores late callback',()=>{const t=fakeTimers();let req,success=false;const storage={get:o=>{req=o;},set:o=>{req=o;}};const p=moduleFile(path.join(common,'preferences.js'),{storage},{setTimeout:t.set,clearTimeout:t.clear});p.saveFps(60,ok=>success=ok);assert(!success);req.success();assert(success);let failure='';p.saveBest(10,(ok,msg)=>failure=ok?'':msg);const late=req;t.run(3000);assert(failure.includes('超时'));late.success();assert(failure.includes('超时'));p.dispose();assert.equal(t.jobs,0);});
test('preference failures do not report success; disposed callbacks ignored',()=>{const t=fakeTimers();let req,called=0;const p=moduleFile(path.join(common,'preferences.js'),{storage:{set:o=>req=o,get:o=>req=o}},{setTimeout:t.set,clearTimeout:t.clear});p.saveFps(60,(ok,msg)=>{called++;assert(!ok);assert(msg.includes('200'));});req.fail('bad',200);assert.equal(called,1);p.saveBest(7,()=>called++);const late=req;p.dispose();late.success();t.run(4000);assert.equal(called,1);assert.equal(t.jobs,0);});
// Page services below are deterministic test substitutes, never production assets.
function pageHarness(t,prefs){
 class ClockDate{static now(){return t.clock();}}
 const core=moduleFile(path.join(common,'lite-log/core.js'));
 const app=moduleFile(path.join(root,'entry/src/main/js/default/app.js'),{core});app.onCreate();
 const logger=moduleFile(path.join(common,'lite-log/logger.js'),{},{$app:app});
 const transfer=moduleFile(path.join(common,'lite-log/qr-transfer.js'));
 const p=moduleFile(path.join(root,'entry/src/main/js/default/pages/game/game.js'),{physics,rules,scheduler:sched,projection:renderer,prefs,logger,transfer,timing},{Date:ClockDate,setTimeout:t.set,clearTimeout:t.clear,setInterval:t.interval,clearInterval:t.clear});
 function fresh(){const page={...p.data};for(const [k,v]of Object.entries(p))if(typeof v==='function')page[k]=v;return page;}
 return {fresh,logger,core,transfer};
}
function goodPrefs(){return {load:cb=>cb(30,0,'',true),readBest:cb=>cb(true,0,''),saveBest:(v,cb)=>cb(true),saveFps:(v,cb)=>cb(true),dispose:()=>{}};}
test('page background resumes one loop; fast touch, settings and restart',()=>{
 const t=fakeTimers(),writes=[],prefs=goodPrefs();prefs.saveBest=(v,cb)=>{writes.push(v);cb(true);};
 const h=pageHarness(t,prefs),page=h.fresh();page.onInit();page.onShow();page.onReady();t.run(120);page.begin();
 assert.equal(page.panel,0);assert.equal(t.jobs,1);
 page.touchStart({globalX:180,globalY:210});page.touchMove({globalX:200,globalY:230});page.touchEnd({globalX:200,globalY:230});
 assert.equal(page.count,0);t.run(155);assert.equal(page.count,1);
 page.touchEnd({globalX:200,globalY:230});t.run(200);assert.equal(page.count,1);
 t.run(500);page.onHide();assert.equal(t.jobs,0);page.onShow();assert.equal(t.jobs,1);page.onShow();assert.equal(t.jobs,1);
 page.openSettings();assert.equal(t.jobs,0);page.selectFps(60);assert.equal(page.fps,60);assert.equal(page.count,1);
 page.closeSettings();page.begin();assert.equal(t.jobs,1);
 page.askRestart();page.restart();assert.equal(page.count,0);assert.equal(t.jobs,1);
 page.touchStart({globalX:180,globalY:210});page.touchCancel();page.touchEnd();t.run(530);assert.equal(page.count,0);
 t.run(1300);page.tapBoard({globalX:210,globalY:250});t.run(1320);assert.equal(page.count,1);
 page.tapBoard({globalX:210,globalY:250});assert.equal(page.count,1);
 page.onDestroy();assert.equal(t.jobs,0);for(let i=0;i<40;i++)assert(!page['f'+i].visible);
});
test('first game paint precedes native storage; hide clears pending initialization',()=>{
 const t=fakeTimers(),prefs=goodPrefs();let reads=0;prefs.load=cb=>{reads++;cb(30,0,'',true);};
 const h=pageHarness(t,prefs),p=h.fresh();p.onInit();assert.equal(reads,0);p.onShow();p.onReady();assert.equal(reads,0);
 p.onHide();t.run(200);assert.equal(reads,0);assert.equal(t.jobs,0);p.onShow();t.run(320);assert.equal(reads,1);p.onDestroy();assert.equal(t.jobs,0);
});
test('1000 drag moves are coalesced into the next game tick',()=>{
 const t=fakeTimers(),p=pageHarness(t,goodPrefs()).fresh();p.onInit();p.onShow();t.run(120);p.begin();
 const old=p.aimX;p.touchStart({globalX:150,globalY:250});
 for(let i=0;i<1000;i++)p.touchMove({globalX:100+i%270,globalY:250});
 assert.equal(p.aimX,old);assert.equal(t.jobs,1);t.run(154);assert.notEqual(p.aimX,old);p.onDestroy();assert.equal(t.jobs,0);
});
test('read error 200 never overwrites an unknown old best; explicit retry recovers',()=>{
 const t=fakeTimers(),prefs=goodPrefs(),writes=[];let read;
 prefs.load=cb=>cb(30,0,'存储错误 200',false);prefs.readBest=cb=>{read=cb;};prefs.saveBest=(v,cb)=>{writes.push(v);cb(true);};
 const p=pageHarness(t,prefs).fresh();p.onInit();p.onShow();t.run(120);p.best=10;p.pauseGame();assert.equal(writes.length,0);
 p.retrySave();assert(p.notice.includes('重新读取'));read(false,0,'存储错误 200');assert.equal(writes.length,0);assert(p.notice.includes('未覆盖'));
 p.retrySave();read(true,100,'');assert.equal(p.best,100);assert.equal(writes.length,0);
 p.best=110;p.retrySave();assert.deepEqual(writes,[110]);assert(p.notice.includes('已保存'));p.onDestroy();
});
test('old page save callback cannot release a new page saving lock',()=>{
 const t=fakeTimers(),prefs=goodPrefs(),callbacks=[];prefs.saveFps=(v,cb)=>callbacks.push(cb);
 const h=pageHarness(t,prefs),a=h.fresh();a.onInit();a.onShow();t.run(120);a.openSettings();a.selectFps(60);a.onDestroy();
 const b=h.fresh();b.onInit();b.onShow();t.run(240);b.openSettings();b.selectFps(30);assert.equal(callbacks.length,2);
 callbacks[0](true);b.selectFps(60);assert.equal(callbacks.length,2);assert.equal(b.fps,30);
 callbacks[1](false,'存储错误 200');assert(b.notice.includes('200'));b.selectFps(60);assert.equal(callbacks.length,3);b.onDestroy();
});
test('paused log QR retains the current game and cleans up on background',()=>{
 const t=fakeTimers(),h=pageHarness(t,goodPrefs()),p=h.fresh();p.onInit();p.onShow();t.run(120);p.begin();
 p.tapBoard({globalX:210,globalY:250});t.run(200);assert.equal(p.count,1);p.showMetrics();p.openLogs();
 assert.equal(p.panel,6);assert(p.qrCount>0&&p.qrCount<=32);assert(p.qrValue.startsWith('LWL1|'));assert.equal(t.jobs,0);
 const first=p.qrValue;p.qrNext();if(p.qrCount>1)assert.notEqual(first,p.qrValue);p.qrPrev();assert.equal(first,p.qrValue);
 p.closeLogs();assert.equal(p.qrValue,'');p.closeSettings();p.begin();assert.equal(p.count,1);assert.equal(t.jobs,1);
 p.openSettings();p.openLogs();p.onHide();assert.equal(t.jobs,0);assert.equal(p.qrValue,'');p.onDestroy();
});
test('settled world sleeps without collision checks; a new drop wakes it',()=>{
 const w=world();physics.add(w,70,rules.height-rules.radii[2],2);physics.add(w,220,rules.height-rules.radii[4],4);steps(w,360);
 assert(w.sleeping);const checks=w.checks,solved=w.solvedSteps,x=w.x.slice(),y=w.y.slice();steps(w,1200);
 assert.equal(w.checks,checks);assert.equal(w.solvedSteps,solved);assert.deepEqual(w.x,x);assert.deepEqual(w.y,y);
 physics.aim(w,144);assert.equal(physics.drop(w),1);assert(!w.sleeping);steps(w,30);assert(w.solvedSteps>solved);invariant(w);
});
test('sleep enabled and disabled keep the settled game position',()=>{
 function run(sleep){const w=world();w.allowSleep=sleep;physics.drop(w);steps(w,2400);return w;}
 const a=run(true),b=run(false);assert.equal(a.score,b.score);assert.equal(a.count,b.count);assert(Math.abs(a.y[0]-b.y[0])<.1);assert(a.sleepSteps>0);assert.equal(b.sleepSteps,0);
});
test('restarting inside an active tick creates exactly one replacement timer',()=>{
 for(const where of ['advance','submit']){
  const t=fakeTimers();let l,once=false;
  function restart(){if(!once){once=true;sched.start(l,60);}return 1;}
  l=sched.create(t.clock,t.set,t.clear,where==='advance'?restart:()=>{},where==='submit'?restart:()=>1);
  sched.start(l,30);t.run(200);assert.equal(t.jobs,1);assert(t.peak<=1);sched.stop(l);assert.equal(t.jobs,0);
 }
});
test('data update metric counts changed batches separately from loop frequency',()=>{
 const t=fakeTimers();let n=0;const l=sched.create(t.clock,t.set,t.clear,()=>{},()=>++n%2?2:0);
 sched.start(l,60);t.run(10000);sched.stop(l);const s=sched.stats(l);assert(Math.abs(s.loopHz-60)<.2);assert(Math.abs(s.submitHz-30)<.2);assert.equal(s.fieldWrites,s.submits*2);assert.equal(s.renderHz,null);
});
test('invalid stored best is not treated as a known zero',()=>{
 const t=fakeTimers();let req,answer;const p=moduleFile(path.join(common,'preferences.js'),{storage:{get:o=>req=o}},{setTimeout:t.set,clearTimeout:t.clear});
 p.readBest((...v)=>answer=v);req.success('NaN');assert.equal(answer[0],false);assert.equal(t.jobs,0);
});
test('log ring is bounded and QR pages preserve UTF-8 Chinese without splitting pairs',()=>{
 const core=moduleFile(path.join(common,'lite-log/core.js')),q=moduleFile(path.join(common,'lite-log/qr-transfer.js'));
 core.configure({app:'WatermelonGT5',version:'1.1.0',maxRecords:8});for(let i=0;i<50;i++)core.info('event'+i,'中文😀'+i);
 assert.equal(core.count(),8);const text=core.snapshot(),count=q.start(text,123);
 assert(count>1&&count<=32);let restored='';for(let i=0;i<count;i++){const part=q.page(i).split('|').slice(4).join('|');assert(Buffer.byteLength(part)<=160);assert(!/^[\uDC00-\uDFFF]/.test(part));restored+=part;}assert.equal(restored,text);
 q.clear();assert.equal(q.page(0),'');assert.equal(q.start('x'.repeat(4097),1),0);
});
const benchmarks=[];
test('persistent interval uses one native timer and fractional 30/60 deadlines',()=>{
 for(const fps of [30,60]){const t=fakeTimers();let n=0;const l=sched.create(t.clock,t.set,t.clear,()=>n++,()=>1,t.interval,t.clear);
 sched.start(l,fps);t.run(10000);const result=sched.stats(l);assert.equal(t.created,1);assert.equal(t.jobs,1);assert(Math.abs(result.loopHz-fps)<.2);assert(Math.abs(n*rules.step*1000-result.activeMs)<rules.step*1000+.001);assert.equal(result.discardedMs,0);assert.equal(result.timer,'interval');assert.equal(result.renderHz,null);sched.stop(l);assert.equal(t.jobs,0);assert.equal(sched.stats(l).timer,'interval');}
});
test('100ms dispatch gap advances real time with at most six 60Hz physics steps',()=>{
 const t=fakeTimers();let n=0;const l=sched.create(t.clock,t.set,t.clear,()=>n++,()=>0);sched.start(l,60);t.jump(100);t.first()();const result=sched.stats(l);assert.equal(n,6);assert.equal(result.discardedMs,0);sched.stop(l);
});
test('physics and data-submission costs are measured independently',()=>{
 const t=fakeTimers();const l=sched.create(t.clock,t.set,t.clear,()=>t.jump(2),()=>{t.jump(3);return 1;});sched.start(l,60);t.run(18);sched.stop(l);const result=sched.stats(l);assert.equal(result.maxPhysicsMs,2);assert.equal(result.maxDisplayMs,3);assert.equal(result.maxWorkMs,5);
});
test('timer probe has two bounded phases, no parallel timers and cancellation guards',()=>{
 const t=fakeTimers(),p=timing.create(t.clock,t.set,t.clear,t.interval,t.clear);let report,called=0;
 timing.start(p,60,value=>{report=value;called++;});t.run(8100);assert(report);assert.equal(called,1);assert.equal(report.renderHz,null);assert(report.timeout.ms>=4000&&report.interval.ms>=4000);assert.equal(t.jobs,0);assert.equal(t.peak,1);
 timing.start(p,30,()=>called++);const stale=t.first();timing.stop(p);stale();t.run(20000);assert.equal(called,1);assert.equal(t.jobs,0);
});
test('game and probe are exclusive, and background cancels both without moving fruit',()=>{
 const t=fakeTimers(),p=pageHarness(t,goodPrefs()).fresh();p.onInit();p.onShow();t.run(120);p.begin();p.tapBoard({globalX:200,globalY:220});t.run(300);const y=p.f0.y,count=p.count;
 p.showMetrics();p.runProbe();assert.equal(p.panel,7);assert.equal(t.jobs,1);t.run(8500);assert(p.probeA.includes('Hz'));assert(p.probeB.includes('Hz'));assert.equal(p.count,count);assert.equal(p.f0.y,y);assert.equal(t.jobs,0);
 p.runProbe();p.onHide();assert.equal(t.jobs,0);assert(!p.probeBusy);p.onShow();p.closeProbe();p.closeSettings();p.begin();assert.equal(t.jobs,1);p.onDestroy();assert.equal(t.jobs,0);
});
test('coarse Date timestamps are distinguishable from a low callback rate',()=>{
 const t=fakeTimers(),p=timing.create(()=>Math.floor(t.clock()/100)*100,t.set,t.clear,t.interval,t.clear);let report;
 timing.start(p,60,value=>report=value);t.run(8500);assert(report);assert(report.interval.hz>60);assert.equal(report.interval.minPositiveGapMs,100);assert(report.interval.sameClock>100);assert.equal(t.jobs,0);
});
test('fruit repetition depends only on immutable keys and inactive images are unbuilt',()=>{
 const hml=fs.readFileSync(path.join(root,'entry/src/main/js/default/pages/game/game.hml'),'utf8');assert(!/for="\{\{fruits/.test(hml));assert(hml.includes('for="{{slotKeys}}"'));assert(hml.includes('if="{{fruit($item).visible}}"'));
 const t=fakeTimers(),p=pageHarness(t,goodPrefs()).fresh();p.onInit();p.onShow();t.run(120);p.begin();assert.equal(Object.keys(p).filter(k=>/^f\d+$/.test(k)&&p[k].visible).length,0);p.tapBoard({globalX:210,globalY:220});t.run(180);assert.equal(Object.keys(p).filter(k=>/^f\d+$/.test(k)&&p[k].visible).length,1);p.onDestroy();
});
test('old timer already queued before restart cannot create a second loop',()=>{const t=fakeTimers();let n=0;const l=sched.create(t.clock,t.set,t.clear,()=>n++,()=>{});sched.start(l,30);const old=t.first();sched.start(l,60);old();assert.equal(n,0);assert.equal(t.jobs,1);t.run(500);assert.equal(t.jobs,1);sched.stop(l);});
for(const count of [1,16,40]){const w=world();for(let i=0;i<count;i++)physics.add(w,15+i%10*27,60+Math.floor(i/10)*45,i%5);
 const rows=renderer.slots(),times=[];w.over=0;for(let i=0;i<1000;i++){w.over=0;const start=process.hrtime.bigint();physics.step(w);renderer.sync(w,rows);times.push(Number(process.hrtime.bigint()-start)/1e6);}
 times.sort((a,b)=>a-b);benchmarks.push({environment:'PC Node.js production physics + projection; no native renderer',initialFruits:count,finalFruits:w.count,iterations:1000,meanMs:times.reduce((a,b)=>a+b,0)/1000,p95Ms:times[949],maxMs:times[999],renderHz:null});}
const report={groups,passed:true,environment:{node:process.version,platform:process.platform,GT5:false},results,benchmarks};
fs.mkdirSync(path.join(root,'docs'),{recursive:true});fs.writeFileSync(path.join(root,'docs/code-tests.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({groups,passed:true,benchmarks}));
