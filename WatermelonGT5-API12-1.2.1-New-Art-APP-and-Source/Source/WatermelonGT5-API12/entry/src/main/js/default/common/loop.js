import rules from './rules.js';
// Deadline scheduler. Exactly one handle; physics debt and work are bounded.
function create(clock,timer,cancel,advance,submit,interval,clearInterval){
    var l={clock:clock,timer:timer,cancel:cancel,advance:advance,submit:submit,
        handle:null,running:false,inTick:false,generation:0,fps:30,period:1000/30,last:0,next:0,debt:0,
        ticks:0,submits:0,elapsed:0,maxGap:0,maxWork:0,discarded:0,skipped:0,hist:[],maxSteps:0,fieldWrites:0,
        interval:interval,clearInterval:clearInterval,repeating:false,timerKind:'timeout',callbacks:0,physicsMs:0,displayMs:0,maxPhysicsMs:0,maxDisplayMs:0};
    for(var i=0;i<16;i++)l.hist[i]=0;
    l.callback=null;return l;
}
function stop(l){l.running=false;l.generation++;if(l.handle!==null){if(l.repeating)l.clearInterval(l.handle);else l.cancel(l.handle);}l.handle=null;l.repeating=false;}
function start(l,fps){
    stop(l);l.fps=fps===60?60:30;l.period=1000/l.fps;
    l.last=l.clock();l.next=l.last+l.period;l.running=true;
    var generation=l.generation;
    l.callback=function(){if(l.generation===generation)tick(l);};
    l.repeating=typeof l.interval==='function'&&typeof l.clearInterval==='function';
    l.timerKind=l.repeating?'interval':'timeout';
    l.handle=l.repeating?l.interval(l.callback,Math.max(1,Math.floor(l.period)-1)):l.timer(l.callback,Math.ceil(l.period));
}
function tick(l){
    if(!l.running)return;if(!l.repeating)l.handle=null;
    var generation=l.generation;
    var begin=l.clock();l.callbacks++;
    // Hardware interval is rounded down; a fractional deadline prevents long-term drift.
    if(begin<l.last)l.next=begin;
    if(l.repeating&&begin+2<l.next)return;
    var delta=begin-l.last;l.last=begin;
    if(delta<0){delta=0;l.next=begin+l.period;}
    l.elapsed+=delta;l.ticks++;l.maxGap=Math.max(l.maxGap,delta);
    var bin=Math.min(15,Math.floor(delta/10));l.hist[bin]++;
    l.debt+=Math.min(delta,100)/1000;
    var steps=0;
    while(l.debt+0.0000001>=rules.step&&steps<rules.maxSteps){l.advance();if(!l.running||l.generation!==generation)return;l.debt-=rules.step;steps++;}
    l.maxSteps=Math.max(l.maxSteps,steps);
    if(delta>100)l.discarded+=delta-100;
    if(l.debt>=rules.step){var excess=l.debt-(l.debt%rules.step);l.discarded+=excess*1000;l.debt-=excess;}
    var beforeDisplay=l.clock(),physicsTime=beforeDisplay-begin;
    l.physicsMs+=physicsTime;l.maxPhysicsMs=Math.max(l.maxPhysicsMs,physicsTime);
    l.inTick=true;var writes=l.submit();l.inTick=false;if(writes>0){l.submits++;l.fieldWrites+=writes;}
    var end=l.clock();l.maxWork=Math.max(l.maxWork,end-begin);
    var displayTime=end-beforeDisplay;l.displayMs+=displayTime;l.maxDisplayMs=Math.max(l.maxDisplayMs,displayTime);
    if(!l.running||l.generation!==generation)return;
    l.next+=l.period;
    if(l.next<=end){var missed=Math.floor((end-l.next)/l.period)+1;l.skipped+=missed;l.next+=missed*l.period;}
    if(!l.repeating)l.handle=l.timer(l.callback,Math.max(1,Math.ceil(l.next-end)));
}
function reset(l){
    l.debt=0;l.ticks=0;l.submits=0;l.elapsed=0;l.maxGap=0;l.maxWork=0;l.discarded=0;l.skipped=0;l.maxSteps=0;l.fieldWrites=0;
    l.callbacks=0;l.physicsMs=0;l.displayMs=0;l.maxPhysicsMs=0;l.maxDisplayMs=0;
    for(var i=0;i<16;i++)l.hist[i]=0;
}
function stats(l){
    var n=0,p95=0;
    for(var i=0;l.ticks>0&&i<16;i++){n+=l.hist[i];if(n>=l.ticks*0.95){p95=i===15?Math.max(160,l.maxGap):(i+1)*10;break;}}
    return {mode:l.fps,activeMs:l.elapsed,loops:l.ticks,submits:l.submits,
        loopHz:l.elapsed?Math.round(l.ticks*10000/l.elapsed)/10:0,
        submitHz:l.elapsed?Math.round(l.submits*10000/l.elapsed)/10:0,
        p95GapUpperMs:p95,maxGapMs:l.maxGap,maxWorkMs:l.maxWork,
        discardedMs:Math.round(l.discarded),skipped:l.skipped,maxSteps:l.maxSteps,fieldWrites:l.fieldWrites,
        timer:l.timerKind,callbacks:l.callbacks,physicsMs:l.physicsMs,displayMs:l.displayMs,
        maxPhysicsMs:l.maxPhysicsMs,maxDisplayMs:l.maxDisplayMs,renderHz:null};
}
export default {create:create,start:start,stop:stop,reset:reset,stats:stats};
