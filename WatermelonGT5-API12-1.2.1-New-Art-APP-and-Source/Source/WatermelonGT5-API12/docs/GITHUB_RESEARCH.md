> 历史研究记录：1.2.1已移除此前采用的yieio水果图及其备份，当前图片来自用户提供素材包。以下仓库链接用于记录研究来源，不代表当前素材授权。

# GitHub 源码参考核对（2026-10-17）

本轮先搜索 GitHub，再确定优化方式。搜索结果保存在 github-search.json。以下项目用于源码研究，没有把其引擎或代码装入手表工程。水果素材另按用户后续指定使用 yieio/daxigua，保留来源与说明。

| 项目 | 核对到的事实 | 本工程采用的原则与边界 |
| --- | --- | --- |
| [Acu1000/m5stack-watermelon-game](https://github.com/Acu1000/m5stack-watermelon-game) | ESP32 / M5Stack，src/main.cpp 约 6 KB；目标 25 FPS；圆形物理、11 级水果、8 位小画布 | 自写小物理比移植整套网页引擎更接近预算。其 vector 没有水果上限，遍历中删除元素存在引用失效风险，帧延迟使用无符号减法也存在超时下溢风险，不照搬这些实现。 |
| [chayantank/multicade](https://github.com/chayantank/multicade/tree/main/src/suika) | ESP32 / 128×64 OLED；Suika 使用固定 40 槽、时间差上限、圆碰撞和三个物理子步 | 保持本工程已有 40 槽上限和单循环；继续采用固定 1/120 秒物理步长及最多 6 次补步，不把它的可变子步当成帧率一致性的证明。 |
| [liyupi/daxigua](https://github.com/liyupi/daxigua) | Cocos 网页方案；11 级水果，接触合并、最高级奖励；需要浏览器/引擎环境 | 参考玩法与同一水果不能重复消费的规则；保留独立的 Lite HML/image 渲染，最高级合成有额外 100 分。 |
| [kqakqakqa/hmlitewearable_game2048](https://github.com/kqakqakqa/hmlitewearable_game2048) | 本机 API12 参考含 default 目录、stack/image、storage 和生命周期实现 | 作为工程布局和原生接口的参照；原目录只读，63 个文件哈希复核。不是水果物理或 60 帧的证据。 |

另外，qpalzm2332933171-droid/watermelon-game 的 README 说明是 Windows / MinGW / SDL2 上的 LVGL 课程工程；SteveYuOWO/Mix-watermelon 是 SwiftUI / SpriteKit。均未作为 RTOS / GT5 已运行的证据。

复查版本：M5Stack 1833cc10a980b52f76cec9fd7e139dc360564a95；Multicade 52455d2478a9c815a496dc498348a5c28801f2e0；liyupi/daxigua ffc582158cb0fde70b9c5cc85dea874be2c4bf17。

本轮没有找到带 GT5 / API12 真机证据的现成大西瓜项目，不能由此断言 GitHub 上绝对没有。两项 ESP32 代码不能证明 512 KB JerryScript 能运行相同效果，更不能证明 GT5 的屏幕实际达到 60 FPS。

两个 ESP32 仓库的根目录及递归目录未见 LICENSE，GitHub license 字段为 null。liyupi 仓库也未提供可据以分发整套资产的明确许可，README 有权利提示。因此这里只记录研究结论，生产游戏代码保持独立实现。后续采用的 yieio 图片不纳入本工程 MIT 许可，详见 THIRD_PARTY.md 与 artwork/yieio-original/NOTICE.md。
