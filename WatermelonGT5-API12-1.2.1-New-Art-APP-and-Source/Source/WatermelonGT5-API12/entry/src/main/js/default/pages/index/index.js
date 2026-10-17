import router from '@system.router';
export default {
 data:{status:'启动就绪 · 1.2.1'},
 onInit:function(){},onShow:function(){},onHide:function(){},onDestroy:function(){},
 enter:function(){try{router.replace({uri:'pages/game/game'});}catch(e){this.status='打开失败，请重试';}}
};
