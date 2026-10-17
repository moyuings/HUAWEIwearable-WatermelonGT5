# 1.2.1说明

本版沿用1.2.0物理及渲染架构，仅替换素材、启动图标、版本标识和文档/许可。图片尺寸和物理半径不变，512母图只留电脑源码。当前验证以VALIDATION.md为准。

# 1.2.0 设计与依据

GT5，466×466圆屏，目标API12。用户此前报告固件6.0.0.32、应用预算512KB、整机32MB；本次未连接GT5，当前固件、可用堆、图片池及WearEngine版本均未知。按用户512KB预算设计并留余量，不推广到64KB机型。

## 调度与物理

一个游戏定时器，30/60设置均保留。硬件请求周期分别32/15ms，逻辑截止时间仍为1000/30或1000/60ms；2ms整数计时容差与截止时间抑制多余更新，避免把更快的底层回调直接当成游戏帧率。实际时间计入物理债务。固定物理步长1/60s，单次最多6步；最长补到100ms，超额丢弃并计数，限制暂停后的计算峰值。比1.1.1目标物理步数减半，未声称所有场景CPU耗时减半。

setInterval只创建一个原生重复任务；切模式、暂停和销毁取消它。generation使旧排队回调失效。电脑测试覆盖切换、重开、回调中重启与单活动句柄。定时器被限制、Date时间采样较粗或页面线程被占用时仍可能达不到目标；没有忙等、多个循环或虚构帧数。

物理仍有40槽、圆形重力、边界、4遍碰撞求解、同一步单次消费、最终西瓜封顶、进入与失败宽限。空场/单水果跳过多体求解，碰撞逆质量使用11项预计算。所有模式使用同一物理参数，未通过慢放假装流畅。

## 显示与布局

物理的10×40数值槽位与计算状态留在模块。页面保存40个有界显示对象、40个固定短槽名和少量UI标量；不把世界物理数组放入data。HML重复块只读固定slotKeys，图像绑定访问对应f0～f39。未使用槽的image由if排除；显示信息准备好之后才激活图像。每颗水果的位置只改变自己固定父容器内的唯一图像，减少父级重新布局范围；原生框架的实际布局/绘制成本仍需GT5测量。

集中更新变化字段，没有每果实定时器、每帧读写、全场景JSON序列化或重复加载图片。单个短合并环，所有图片路径和解码尺寸保留。初始化读取设置延后到首屏之后，最高分和设置以成功回调确认；读失败不会将未知旧最高分覆盖为0。后台停止循环、探针和初始化任务；返回同一实例恢复局面。

## 空载探针与指标

两段各约4秒：连续单次定时器与常驻间隔定时器。游戏先暂停，读写结束后才允许测量，探针每次回调只记标量，不更新data、不计算物理、不读文件。两段结束后集中显示；退出、后台或开始游戏会取消探针。最多一个探针句柄，与游戏循环互斥。记录回调数、窗口、最长间隔、最小正采样差与相同时间戳数；后两项是采样观察，不等于测得系统时钟分辨率。

loopHz是实际执行游戏更新的频率；callbacks是底层回调数；submitHz是响应式字段有变化的批次。maxPhysicsMs和maxDisplayMs按JS调用前后计时，后者不覆盖异步原生渲染或屏幕呈现。renderHz始终未知。日志8条、标量上下文12项、二维码32页上限保持。

## 公开源码核对

2026-10-17只读核对OpenHarmony公开实现，未复制代码；这些代码不代表GT5固件保证。

- [Component::IsLayoutRelatedAttrs / InvalidateIfNeeded](https://github.com/openharmony/arkui_ace_engine_lite/blob/master/frameworks/src/core/components/component.cpp)：left/top等属于布局属性，相关路径会请求父容器LayoutChildren。它支持这次缩小布局范围的设计，不足以证明旧版11Hz的唯一根因。
- [TimerModule::StartTask](https://github.com/openharmony/arkui_ace_engine_lite/blob/master/frameworks/src/core/modules/presets/timer_module.cpp)：单次/重复任务走不同原生任务生命周期。没有找到可据此确认GT5固定11Hz上限的证据。
- [canvas_component.cpp](https://github.com/openharmony/arkui_ace_engine_lite/blob/master/frameworks/src/core/components/canvas_component.cpp)与[UICanvas](https://github.com/openharmony/graphic_ui/blob/master/frameworks/components/ui_canvas.cpp)：存在按编译选项开放的绘图方法及保留命令列表；没有把浏览器Canvas或每帧追加命令的方案直接移入本产品。

生产仅用已存在的Lite stack/image/text/input/qrcode、全局计时器和原有@system.router/storage。没有新增权限；API12上的真实计时和显示结果待GT5。保留应用身份com.moyu.gt5.watermelon以及114/80双启动图标。
