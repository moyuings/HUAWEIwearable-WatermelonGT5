import rules from './rules.js';
// Fixed 40-slot projection. Never expose velocities / physics arrays to page data.
function slots(){var a=[];for(var i=0;i<rules.max;i++)a[i]={id:i,x:0,y:0,size:18,src:rules.images[0],visible:false};return a;}
function sync(w,rows,cache){
    var changes=0;
    for(var i=0;i<rules.max;i++){
        var row=rows[i],seen=cache?cache[i]:row,visible=!!w.active[i];
        if(w.active[i]){var r=rules.radii[w.level[i]];
            var x=Math.round(w.x[i]-r),y=Math.round(w.y[i]-r),size=r*2,src=rules.images[w.level[i]];
            if(seen.x!==x){row.x=x;if(cache)seen.x=x;changes++;}if(seen.y!==y){row.y=y;if(cache)seen.y=y;changes++;}
            if(seen.size!==size){row.size=size;if(cache)seen.size=size;changes++;}if(seen.src!==src){row.src=src;if(cache)seen.src=src;changes++;}
        }
        // Reveal the fixed native image only after its position and source are ready.
        if(seen.visible!==visible){row.visible=visible;if(cache)seen.visible=visible;changes++;}
    }
    return changes;
}
export default {slots:slots,sync:sync};
