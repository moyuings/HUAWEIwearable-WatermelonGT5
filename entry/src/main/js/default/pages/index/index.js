import router from '@system.router';
export default {
 data:{status:'启动就绪 · 1.3.0'},
 onInit:function(){},onShow:function(){},onHide:function(){},onDestroy:function(){},
 enter:function(){try{router.replace({uri:'pages/game/game'});}catch(e){this.status='打开失败，请重试';}}
};
