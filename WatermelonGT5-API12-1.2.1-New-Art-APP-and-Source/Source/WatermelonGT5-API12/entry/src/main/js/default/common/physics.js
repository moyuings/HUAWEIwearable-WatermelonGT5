import rules from './rules.js';
function array(n){var a=[];for(var i=0;i<n;i++)a[i]=0;return a;}
function create(seed){
    var n=rules.max;
    return {x:array(n),y:array(n),vx:array(n),vy:array(n),level:array(n),active:array(n),
        age:array(n),danger:array(n),born:array(n),order:array(n),count:0,score:0,
        steps:0,seed:seed||13579,current:0,next:1,aim:144,cooldown:0,over:0,
        flashX:0,flashY:0,flashR:0,flashTime:0,merges:0,checks:0,
        sleeping:false,still:0,allowSleep:true,solvedSteps:0,sleepSteps:0,penetration:0};
}
function random(w){w.seed=(w.seed*16807)%2147483647;return w.seed/2147483647;}
function reset(w,seed){
    for(var i=0;i<rules.max;i++){w.active[i]=0;w.vx[i]=0;w.vy[i]=0;w.age[i]=0;w.danger[i]=0;}
    w.seed=seed||13579;w.count=0;w.score=0;w.steps=0;w.current=Math.floor(random(w)*5);
    w.next=Math.floor(random(w)*5);w.aim=144;w.cooldown=0;w.over=0;w.flashTime=0;w.merges=0;w.checks=0;
    w.sleeping=false;w.still=0;w.solvedSteps=0;w.sleepSteps=0;w.penetration=0;
}
function add(w,x,y,level){
    for(var i=0;i<rules.max;i++)if(!w.active[i]){
        w.active[i]=1;w.x[i]=rules.clamp(x,rules.radii[level],rules.width-rules.radii[level]);
        w.y[i]=y;w.vx[i]=0;w.vy[i]=0;w.level[i]=level;w.age[i]=0;w.danger[i]=0;w.born[i]=w.steps;
        w.sleeping=false;w.still=0;w.count++;return i;
    }
    return -1;
}
function aim(w,x){var r=rules.radii[w.current];w.aim=rules.clamp(x,r+1,rules.width-r-1);}
function drop(w){
    if(w.over||w.cooldown>0)return 0;
    if(w.count>=rules.max){w.over=2;return -1;}
    var r=rules.radii[w.current];
    // Do not insert a new circle inside an existing circle near the mouth.
    for(var i=0;i<rules.max;i++)if(w.active[i]){
        var dx=w.x[i]-w.aim,dy=w.y[i]-rules.spawnY,sum=r+rules.radii[w.level[i]];
        if(dx*dx+dy*dy<sum*sum)return -2;
    }
    add(w,w.aim,rules.spawnY,w.current);w.current=w.next;w.next=Math.floor(random(w)*5);
    aim(w,w.aim);w.cooldown=0.36;return 1;
}
function wall(w,i){
    var r=rules.radii[w.level[i]];
    if(w.x[i]<r){w.x[i]=r;if(w.vx[i]<0)w.vx[i]*=-0.08;}
    if(w.x[i]>rules.width-r){w.x[i]=rules.width-r;if(w.vx[i]>0)w.vx[i]*=-0.08;}
    if(w.y[i]>rules.height-r){
        w.y[i]=rules.height-r;
        if(w.vy[i]>0)w.vy[i]=w.vy[i]>30?-w.vy[i]*0.08:0;
        w.vx[i]*=0.92;
    }
    if(w.y[i]<r){w.y[i]=r;if(w.vy[i]<0)w.vy[i]=0;}
}
function sort(w){
    var count=0;
    for(var i=0;i<rules.max;i++)if(w.active[i]){
        var left=w.x[i]-rules.radii[w.level[i]],j=count;
        while(j>0){var old=w.order[j-1];if(w.x[old]-rules.radii[w.level[old]]<=left)break;
            w.order[j]=old;j--;}
        w.order[j]=i;count++;
    }
    return count;
}
function merge(w,i,j){
    var level=w.level[i]+1;
    w.x[i]=(w.x[i]+w.x[j])/2;w.y[i]=(w.y[i]+w.y[j])/2;
    w.vx[i]=(w.vx[i]+w.vx[j])/2;w.vy[i]=(w.vy[i]+w.vy[j])/2;
    w.level[i]=level;w.active[j]=0;w.count--;w.born[i]=w.steps;w.sleeping=false;w.still=0;
    w.age[i]=0;w.danger[i]=0;w.score+=rules.points(level);w.merges++;
    wall(w,i);w.flashX=w.x[i];w.flashY=w.y[i];w.flashR=rules.radii[level]+4;w.flashTime=0.18;
}
function solve(w,count,canMerge){
    for(var a=0;a<count;a++){
        var i=w.order[a];if(!w.active[i])continue;
        var ri=rules.radii[w.level[i]];
        for(var b=a+1;b<count;b++){
            var j=w.order[b];if(!w.active[j])continue;
            var rj=rules.radii[w.level[j]];
            // Sweep by left edge; order is rebuilt for each pass.
            if(w.x[j]-rj>w.x[i]+ri)break;
            var dx=w.x[j]-w.x[i],dy=w.y[j]-w.y[i],sum=ri+rj;
            if(Math.abs(dy)>sum)continue;
            w.checks++;
            var ds=dx*dx+dy*dy;if(ds>sum*sum)continue;
            if(canMerge&&w.level[i]===w.level[j]&&w.level[i]<10&&w.born[i]!==w.steps&&w.born[j]!==w.steps){
                merge(w,i,j);ri=rules.radii[w.level[i]];continue;
            }
            var dist=Math.sqrt(ds),nx,ny;
            if(dist<0.001){nx=1;ny=0;dist=0;}else{nx=dx/dist;ny=dy/dist;}
            var invI=rules.inverseMass[w.level[i]],invJ=rules.inverseMass[w.level[j]],inv=invI+invJ;
            w.penetration=Math.max(w.penetration,sum-dist);
            var overlap=Math.max(0,sum-dist-0.03)*0.86;
            w.x[i]-=nx*overlap*invI/inv;w.y[i]-=ny*overlap*invI/inv;
            w.x[j]+=nx*overlap*invJ/inv;w.y[j]+=ny*overlap*invJ/inv;
            var relative=(w.vx[j]-w.vx[i])*nx+(w.vy[j]-w.vy[i])*ny;
            if(relative<0){
                var impulse=-relative*1.02/inv;
                w.vx[i]-=impulse*nx*invI;w.vy[i]-=impulse*ny*invI;
                w.vx[j]+=impulse*nx*invJ;w.vy[j]+=impulse*ny*invJ;
                var tx=-ny,ty=nx,slide=(w.vx[j]-w.vx[i])*tx+(w.vy[j]-w.vy[i])*ty;
                var friction=rules.clamp(-slide/inv,-impulse*0.18,impulse*0.18);
                w.vx[i]-=friction*tx*invI;w.vy[i]-=friction*ty*invI;
                w.vx[j]+=friction*tx*invJ;w.vy[j]+=friction*ty*invJ;
            }
        }
    }
}
function step(w){
    if(w.over)return;
    var dt=rules.step;w.steps++;w.cooldown=Math.max(0,w.cooldown-dt);w.flashTime=Math.max(0,w.flashTime-dt);
    if(w.sleeping){w.sleepSteps++;return;}if(!w.count)return;w.solvedSteps++;
    for(var i=0;i<rules.max;i++)if(w.active[i]){
        w.age[i]+=dt;w.vy[i]=Math.min(rules.maxSpeed,w.vy[i]+rules.gravity*dt);
        w.vx[i]=rules.clamp(w.vx[i]*0.998,-rules.maxSpeed,rules.maxSpeed);
        w.x[i]+=w.vx[i]*dt;w.y[i]+=w.vy[i]*dt;wall(w,i);
    }
    w.penetration=0;
    for(var pass=0;w.count>1&&pass<4;pass++){
        w.penetration=0;
        solve(w,sort(w),pass===0);
        for(var k=0;k<rules.max;k++)if(w.active[k])wall(w,k);
    }
    var quiet=w.allowSleep&&w.count>0&&w.cooldown===0&&w.flashTime===0&&w.penetration<0.1;
    for(var q=0;q<rules.max;q++)if(w.active[q]){
        // New/in-flight fruit gets 0.8 s grace. Danger accumulates only in a slow pile.
        if(w.age[q]>0.8&&w.y[q]-rules.radii[w.level[q]]<rules.loseLine&&Math.abs(w.vy[q])<45){
            w.danger[q]+=dt;if(w.danger[q]>1.2)w.over=1;
        }else w.danger[q]=0;
        // Never sleep a near-line fruit: its age and loss grace must continue.
        if(w.y[q]-rules.radii[w.level[q]]<rules.loseLine||Math.abs(w.vx[q])>1||Math.abs(w.vy[q])>1)quiet=false;
    }
    w.still=quiet?w.still+dt:0;
    if(w.still>=0.5){w.sleeping=true;for(var s=0;s<rules.max;s++)if(w.active[s]){w.vx[s]=0;w.vy[s]=0;}}
}
export default {create:create,reset:reset,add:add,aim:aim,drop:drop,step:step};
