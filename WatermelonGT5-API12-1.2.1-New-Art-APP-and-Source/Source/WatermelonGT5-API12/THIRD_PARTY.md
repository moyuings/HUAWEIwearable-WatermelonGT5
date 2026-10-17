# 来源与许可

程序逻辑、页面、调度、存储封装和电脑端工具按用户最新要求使用 MIT，作者 moyu，完整条文见 LICENSE。此许可不覆盖下面的水果图片。

## 本轮用户提供的水果图片

来源：用户提供的《合成大西瓜素材.zip》，SHA256见 artwork/user-supplied/source.json。11张512×512透明母图保留在该目录，实际运行图片由 tools/prepare-user-assets.py 裁剪、移除相邻图像碎片、居中缩放并限制圆形边界得到。启动图标由新大西瓜派生。修改记录和全部哈希见 docs/assets.json。

用户要求非商业学习交流，素材及派生图标采用 CC BY-NC 4.0，署名 moyu；完整范围见 LICENSE-ARTWORK.md。素材由用户提供，权利仅在许可人依法持有的范围内授予，未独立核实生成历史与全部权利。

本次交付的源码和APP不包含旧版 yieio/daxigua / 比翼互动水果原图、运行图片或旧启动图标。旧版本工程与交付未修改，没有通过修改新版本许可证追溯改变旧素材的权利。

## 参考项目

- liyupi/daxigua：玩法与11级合成的研究参考，未复制代码、图片、音效或Cocos引擎。
- Acu1000/m5stack-watermelon-game、chayantank/multicade：嵌入式圆形物理、固定容量物体池的研究参考，未打包其源码或图片。
- kqakqakqa/hmlitewearable_game2048：本机API12只读参考，用于核对工程结构、stack/image、生命周期及storage用法。原文件哈希见 docs/reference-hashes.json，未把2048代码或素材放入APP。
- AlanLinYu/huawei-lite-watch-development：本机skill规范与SDK审查；未分发SDK或厂商文档。

应用日志模块沿用工作区 MIT / moyu 实现，保留 LICENSE-LiteAppLog。Native触摸行为曾对照 OpenHarmony ace_engine_lite；SDK中的行为不能代替GT5实测。
