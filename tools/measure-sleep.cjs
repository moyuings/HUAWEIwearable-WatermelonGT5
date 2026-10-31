// PC-only controlled comparison of production physics with sleep on/off.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),common=path.join(root,'entry/src/main/js/default/common');
function load(name,imports={}){const c={Math,Number,String,isFinite,...imports,result:null};vm.runInNewContext(fs.readFileSync(path.join(common,name),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default','result='),c);return c.result;}
const rules=load('rules.js'),physics=load('physics.js',{rules});
function run(sleep,stack){
 const w=physics.create(13579);physics.reset(w,13579);w.allowSleep=sleep;
 if(stack){physics.add(w,144,240,2);physics.add(w,144,130,3);}
 else {physics.add(w,70,80,2);physics.add(w,220,60,4);}
 const start=process.hrtime.bigint();for(let i=0;i<14400;i++)physics.step(w);
 return {sleep,scene:stack?'two-fruit vertical stack':'two separated falling fruits',simulatedSeconds:120,
  count:w.count,score:w.score,over:w.over,solvedSteps:w.solvedSteps,sleepSteps:w.sleepSteps,collisionChecks:w.checks,
  pcWallMs:Number(process.hrtime.bigint()-start)/1e6,positions:w.x.map((x,i)=>w.active[i]?{x,y:w.y[i]}:null).filter(Boolean)};
}
const pairs=[];
for(const stack of [false,true]){const off=run(false,stack),on=run(true,stack);assert.equal(off.count,on.count);assert.equal(off.score,on.score);assert.equal(off.over,on.over);
 for(let i=0;i<off.positions.length;i++)assert(Math.hypot(off.positions[i].x-on.positions[i].x,off.positions[i].y-on.positions[i].y)<.2);
 pairs.push({off,on});}
const report={environment:'Windows PC / Node '+process.version,scope:'Production physics only; 120 s simulated time per scene. PC timings are not GT5 timings or rendered FPS.',GT5:false,pairs};
fs.writeFileSync(path.join(root,'docs/sleep-comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
