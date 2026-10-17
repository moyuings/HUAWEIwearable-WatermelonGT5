// Original small native engine. No browser / third party physics runtime.
var radii = [9,12,15,18,22,27,32,38,44,51,58];
var names = ['葡萄','樱桃','橙子','柠檬','猕猴桃','番茄','桃子','菠萝','椰子','半个西瓜','大西瓜'];
var images = [];
var inverseMass = [];
for (var i=0; i<11; i++) images[i]='/common/fruit/fruit_'+i+'.png';
for (var m=0; m<11; m++) inverseMass[m]=1/(radii[m]*radii[m]);
export default {
    max:40, width:288, height:264, loseLine:48, spawnY:20,
    step:1/60, maxSteps:6, gravity:650, maxSpeed:360,
    radii:radii, inverseMass:inverseMass, names:names, images:images,
    clamp:function(v,a,b){return v<a?a:(v>b?b:v);},
    // Reference default: consumed level + 1; first full watermelon earns 100 extra.
    points:function(level){return level+(level===10?100:0);}
};
