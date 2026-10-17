# 瓜瓜坠落 · WatermelonGT5

一个为华为 GT5 制作的“合成大西瓜”小游戏，适配 466×466 圆形屏幕，使用 HarmonyOS Lite Wearable API12。

作者：**moyu**。项目用于学习和交流，当前版本 **1.2.1**。

![重新裁剪后的水果素材](docs/artwork-preview.png)

## 功能

- 11 级水果，重力下落、碰撞、堆积和同级合成，最终合成西瓜。
- 点击投放；按住并滑动调整位置，松手投放。
- 显示当前水果、下一颗水果、得分与最高分。
- 开始、暂停、继续、重新开始，失败线带宽限时间。
- 提供 **30 FPS / 60 FPS** 两种目标更新模式，默认 30，保存选择。
- 应用进入后台时暂停循环，保留当前进程内局面；进程结束后不保证恢复局面。
- 内置性能记录和本应用日志二维码导出。

**30/60 是目标更新模式，不是已保证的 GT5 实际屏幕帧率。**此前用户报告 60 模式在 GT5 上约 11 Hz，本版主要更换图片，尚未获得新的 GT5 性能结果。定时器次数、数据提交次数和实际显示帧率分别统计/标记，不能混用。

## 1.2.1 的素材更新

使用本轮用户提供的《合成大西瓜素材.zip》，从 512×512 母图重新裁剪，清除相邻水果的边缘残片，居中缩放并限制在圆形区域内。11 张游戏图片为 18、24、30、36、44、54、64、76、88、102、116 像素；启动图标也替换为新西瓜。

新素材原图及来源哈希位于 `artwork/user-supplied/`，生成工具为 `tools/prepare-user-assets.py`。512 母图留在电脑源码中，APP 仅包含缩小后的图片。本版源码和 APP 已移除旧 yieio / 比翼互动图片及其备份；本版未调整水果半径或物理规则。

## 工程结构

```text
entry/src/main/config.json              Lite Wearable 配置
entry/src/main/js/default/common/       物理、合成、循环、存储、日志与水果图片
entry/src/main/js/default/pages/        启动入口、游戏与设置界面
entry/src/main/resources/base/media/    两种启动图标
artwork/user-supplied/                  用户提供的母图和来源记录，不进入APP
tools/                                 电脑端裁剪、检查和测试工具
docs/                                  设计、构建与验证记录
```

## 构建

使用安装了 Lite Wearable SDK 的 DevEco Studio，或在工程根目录执行：

```powershell
.\build-app.ps1 -DevEcoHome 'E:\DevEco Studio' -SdkHome 'E:\DevEco Studio\sdk'
```

脚本调用 DevEco 自带 Node 与官方 Hvigor 的 `assembleApp`。项目 target / compatible 均为 API12；编译 SDK 版本以本机实际安装为准。输出：`build/outputs/default/*-unsigned.app`。

图片已经生成，正常构建不需要运行裁剪脚本。重新生成需要 Python 和 Pillow：

```powershell
python -X utf8 tools/prepare-user-assets.py
```

交付为**源码与未签名 APP**，不包含独立 HAP、证书、私钥、调试 Profile 或依赖缓存。签名与安装由使用者在自己的开发环境完成。

## 验证与设备限制

按用户报告的 512 KB 应用内存预算、32 MB 整机内存设计，实际固件堆配置和图片池行为仍须 GT5 测量。运行时最多 40 颗水果，每次物理补步最多 6 次；图片按实际显示尺寸预处理，没有表端母图解码或浏览器游戏引擎。

代码测试、SDK 原生预览、GT5 真机结果分别记录在 [验证记录](docs/VALIDATION.md)。**构建成功和电脑预览不能证明手表实际性能或安装成功。**

复测建议：30/60 各玩一局，观察新水果、投放、合成、暂停和后台返回；确认最高分保存。出现异常时，通过性能记录或应用日志二维码保留数据。

## 许可证：代码和图片分别授权

**程序代码：MIT。**允许使用、修改、分享和商业使用，须保留版权与许可声明。MIT 不要求修改者一定公开源码，也不能禁止别人商用代码。完整条文见 [LICENSE](LICENSE)。

**用户提供的水果素材及派生图标：CC BY-NC 4.0。**许可范围内允许署名后进行非商业分享和修改，须标明修改并附许可链接；商业使用不在这份许可范围内。见 [图片许可](LICENSE-ARTWORK.md)。许可仅涵盖许可人依法享有的权利，本工程没有独立核实图片的全部来源权利。

**MIT 不覆盖这些图片。**如果分发包含图片的完整游戏，还须遵守图片许可。GitHub 创建仓库时可为代码选择 MIT，再一同上传本工程的 `LICENSE-ARTWORK.md`、`LICENSING.md` 和 `THIRD_PARTY.md`。如果某个平台要求连图片也必须采用 MIT，这套混合许可不符合该要求；把代码选成 MIT 不会改变图片的许可。

此前已经按 MIT 发布的代码授权继续有效。不能通过一句“仅供学习”收回 MIT 已允许的商业使用。更多范围说明见 [LICENSING.md](LICENSING.md)。

## 致谢

- 用户提供的水果素材及游戏测试反馈。
- [huawei-lite-watch-development](https://github.com/AlanLinYu/huawei-lite-watch-development) 的 Lite Wearable 开发规范。
- 本机 API12 的 2048 参考工程，以及 GitHub 上的嵌入式合成游戏研究资料。
- 应用日志模块沿用工作区的 MIT / moyu 实现。

具体来源、参考范围与第三方声明见 [THIRD_PARTY.md](THIRD_PARTY.md)。
