# 启动器资源检查

1.1.1修复的双启动图标继续保留。原失败1.1.0只有128×128大图标、缺小图标；公开Lite安装器存在任一原生图标缺失导致解析失败并返回40的路径。GT5是否使用完全相同源码仍未知。

本版维持114×114 icon.png与80×80 icon_small.png，并由官方SDK生成两份原生图标。tools/launcher-guard.py从最终APP的resources.index解析iconId，再核对同目录的两套资源。当前检查结果见package-verification.json；没有修改应用身份或签名材料。

[公开Lite安装器](https://github.com/openharmony/bundlemanager_bundle_framework_lite/blob/4780d0d26aa1f8fc584ea6cb8e04350edd56289f/services/bundlemgr_lite/src/gt_bundle_parser.cpp#L686)。这项资源检查不等于完整签名验证或GT5安装成功。
