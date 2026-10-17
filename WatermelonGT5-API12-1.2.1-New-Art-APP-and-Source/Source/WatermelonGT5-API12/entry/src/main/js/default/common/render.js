import rules from './rules.js';
// Fixed 40-slot projection. Never expose velocities / physics arrays to page data.
function slots(){var a=[];for(var i=0;i<rules.max;i++)a[i]={id:i,x:0,y:0,size:18,src:rules.images[0],visible:false};return a;}
function sync(w,rows){
    var changes=0;
    for(var i=0;i<rules.max;i++){
        var row=rows[i],visible=!!w.active[i];
        if(w.active[i]){var r=rules.radii[w.level[i]];
            var x=Math.round(w.x[i]-r),y=Math.round(w.y[i]-r),size=r*2,src=rules.images[w.level[i]];
            if(row.x!==x){row.x=x;changes++;}if(row.y!==y){row.y=y;changes++;}
            if(row.size!==size){row.size=size;changes++;}if(row.src!==src){row.src=src;changes++;}
        }
        // Build the conditional native image only after its position and source are ready.
        if(row.visible!==visible){row.visible=visible;changes++;}
    }
    return changes;
}
export default {slots:slots,sync:sync};
