# 瓜瓜坠落 1.3.0 性能与内存优化

APP目录是官方Hvigor构建的未签名APP，Source目录是完整工程。没有独立HAP、证书、私钥、Profile或依赖缓存；官方APP内部包含标准模块HAP。

原应用身份com.moyu.gt5.watermelon / moyu / API12保持，素材保持。30和60仍是目标模式。固定40图片槽位复用；减少物理排序；新增时钟/回调诊断。新版尚未在GT5验证，不能承诺达到60帧或已修复旧版470分卡死。

已通过主机代码与官方SDK预览，包含512KiB堆的180秒跨局测试；真实显示FPS、GT5内存和持久化仍须实测。详细数字、撤回实验和复测步骤见Source/WatermelonGT5-API12/docs/VALIDATION.md。

构建：在工程根目录用PowerShell运行 .\build-app.ps1，默认DevEco路径 E:\DevEco Studio，可用参数指定本机目录。完整构建/许可证说明见工程README.md。代码MIT；用户素材CC BY-NC 4.0，未改变既有许可。
