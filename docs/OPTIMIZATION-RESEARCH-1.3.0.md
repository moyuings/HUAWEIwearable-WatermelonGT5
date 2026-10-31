# 1.3.0 优化研究与验证记录

日期：2026-10-25。目标：Huawei GT5，466×466 圆屏，API 12。512 KiB 是本轮采用的 JS 堆设计预算，尚无本轮真机堆实测；不等于已确认设备实际可用容量。

用户报告：60 模式空场循环约 11–12 Hz，五六颗水果时低于 10；曾在约 470 分卡死。目前未复现该真机卡死，也未确认物理计算是根因；1.3.0 候选版尚未完成 GT5 真机验证。30/60 仍为目标模式，循环计数不等于屏幕呈现 FPS。作者 moyu、bundle com.moyu.gt5.watermelon 保持不变。

## 本轮改动范围

前版已经具有预分配 SoA 数组、平方距离拒绝、x 左边缘 sweep 与 y 轴粗筛、全场休眠。本轮没有把这些既有能力计为新增优化，没有引入第三方物理运行库。

- 物理：保留上一遍排序次序；增删水果标脏；每遍校正插入排序；左边缘相同时按槽位编号保持原版顺序。
- 求解：仅在本遍没有位置修正、速度冲量、合成或墙修正时提前退出，不能单靠 penetration 判定。保留每步最多 4 遍、40 球上限、同一步新生水果不能再次被合成消费。
- 计量：新增累计 sortComparisons、solverPasses、contactResolves，reset 清零。
- 页面：用纯 JS 投影缓存比较显示变化，避免从响应式 getter 反复读取旧值；只提交变化字段。当前候选采用固定 40 个不可变数字 key 直接循环 image，以 show 隐藏空槽；运行中不增删循环数组，保留缓存，移除原有 40 个 board stack 包装节点。固定槽位的新原生内存行为仍待本轮长测报告，不能保证稳定。
- 调度与诊断：时钟策略未改；新增 round 开始/重开事件、回调频率与时钟粒度诊断，循环异常可见并记录日志。固定物理步仍为 1/60 秒，单次最多补 6 步。60 模式的真实执行/提交频率须继续观察。

## 撤回的动态列表实验

此前按活动水果动态增删循环数组的候选，在 Windows SDK 原生受控长测第二局约 143 秒实际出现 `JS HEAP OOM`，因此撤回。证据保存在 [active-list-oom.json](experiments/active-list-oom.json) 和 [active-list-oom.log](experiments/active-list-oom.log)，日志明确包含该异常。

当前候选已改为固定 40 数字 key / image 节点复用，空槽只调整 show，不再增删循环数组。固定槽位的 180 秒原生测试已完成，完成状态和具体指标统一见 [VALIDATION.md](VALIDATION.md)。43 组主机代码测试仍通过；该结果不能替代原生长测。此次 SDK OOM 不能证明原版约 470 分 GT5 真机卡死的原因，也不代表固定槽位方案已经通过真机稳定性验收。

## GitHub 源码核查

以下为实际阅读过的实现，不仅是 README。分支 HEAD 使用 git ls-remote 核验，后续讨论应按 commit 追溯；不执行这些仓库的脚本。

| 仓库 / commit | 阅读位置与具体启发 | 许可及采用边界 |
| --- | --- | --- |
| [Playdate 合成行星](https://github.com/tommusrhodus/Legally-Distinct--Planetary-Based--Suika-Game-Clone-for-Playdate)，9b873f3a822fcaa5c703bc44b7b8ce6f9ae2b5fc | [src/physics.c](https://github.com/tommusrhodus/Legally-Distinct--Planetary-Based--Suika-Game-Clone-for-Playdate/blob/9b873f3a822fcaa5c703bc44b7b8ce6f9ae2b5fc/src/physics.c)：sortOrder 保留次序、增删后重建；phys_update 限制补步。仅排序思路用于本轮；其合成渐长、软约束和 warm start 未移植。 | 根页面未见许可证，LICENSE 路径返回 404，许可未确认。本轮仅独立实现通用算法，不复制代码。其 C 结构含 256 球、2048 接触、4096 缓存槽，不能当作适合低堆 JS 的整包方案。 |
| [Matter.js 0.20.0](https://github.com/liabru/matter-js/commit/8a67787735585f02c4b46eabf7b9fcc1c7c321da)，8a67787735585f02c4b46eabf7b9fcc1c7c321da | [Sleeping.js](https://github.com/liabru/matter-js/blob/8a67787735585f02c4b46eabf7b9fcc1c7c321da/src/core/Sleeping.js) 的逐体睡眠与接触唤醒；[Detector.js](https://github.com/liabru/matter-js/blob/8a67787735585f02c4b46eabf7b9fcc1c7c321da/src/collision/Detector.js) 的 sweep、睡眠对跳过。 | MIT。仅作比较研究；本轮未引入其代码或逐体休眠。现有全场睡眠继续保留。若将来逐体睡眠，必须处理下方水果合成后失去支撑的唤醒。 |
| [big-alloy-merge](https://github.com/wanchengyang2010/big-alloy-merge)，402300f3f24ad8ee04ac4978b4ab9468be92346b | [physics.py](https://github.com/wanchengyang2010/big-alloy-merge/blob/402300f3f24ad8ee04ac4978b4ab9468be92346b/physics.py)：SpatialGrid 本格及四个前向邻格避免重复配对；circles_near 使用接触容差；apply_sleep 速度归零。 | 根页面未见许可证，LICENSE 路径返回 404，许可未确认，仅研究。本轮未复制或移植。最大果直径较大时，288px 场地分格很粗，不能保证比现有 sweep 更快；Python dict/list/generator 也不适合直接照搬。 |

## 主机等价验证

本轮主机代码测试共 43 组（35 + 8）通过；下面的 24 游戏/93,984 步是另行进行的物理 baseline 精确对照，不把游戏数或步数计入 43 组。SDK 和受限堆等当前指标以 [VALIDATION.md](VALIDATION.md) 为准，本文件不复制旧指标。

执行 tools/test-physics-optimization.cjs，与原始只读工程 WatermelonGT5-API12-1.2.1-New-Art-APP-and-Source/Source/WatermelonGT5-API12 比较。测试运行在 Node；为 baseline 仅注入计数，不改变算术和遍历顺序。

结果：24 个固定种子的完整游戏，93,984 步逐步精确状态比较通过。比较位置、速度、等级、活动槽、分数、随机状态、失败状态、睡眠与计时。另有专项测试：469→470、470 以上各级合成、同一步不重复消费、40 球及完全重合圆、满容量失败、精确排序 tie、重置和槽位复用；只有速度变化且零穿透时不得提前退出；sub-slop 无改动接触保留 penetration。

| 累计工作量 | Baseline | 本轮 | 减少约 |
| --- | ---: | ---: | ---: |
| 排序比较 | 59,892,871 | 9,295,405 | 84.48% |
| 求解遍数 | 363,736 | 344,107 | 5.40% |
| 非合成接触求解 | 11,562,721 | 11,555,031 | 0.067% |

这证明测试输入下状态等价并减少了部分物理工作量；不能换算为 GT5 提速比例。470 分专项通过是合成逻辑测试，不能证明真机卡死已修复。新测试 node --check 通过。

## 风险与验证状态

本轮自查未发现新增的提前退出误判：位置/冲量/合成/墙修改均阻止退出，精确 tie 顺序保持 baseline。现有 broadphase 在一遍求解中会因位置修正和合成而暂时失序，下一遍才重排；这是原版已有近似，仍可能把某些接触延后到下一遍或下一步。本轮没有扩大物理模型改动，也没有宣称连续碰撞检测或完全消除漏检。

| 层级 | 状态 |
| --- | --- |
| Node 状态等价与有界压力场景 | 通过，范围见上文 |
| SDK 构建 / 编译语义 | 见 [当前验证记录](VALIDATION.md)，本文不预填完成或复用旧指标 |
| 固定 40 槽位候选的原生节点长测 | 固定槽位的 180 秒测试已完成；见 [当前验证记录](VALIDATION.md)，不以已撤回候选或 Node 结果替代 |
| GT5 页面、五六球、约 470 分与满场 | 待真机复测 |
| GT5 JS 堆峰值、图片池、屏幕呈现 FPS | 未测 |

下一步应比较空场、5–6 球、连续合成及满场的循环、计算、页面提交和最长停顿诊断，再判断计算与绘制分别占多少。空场低频说明不能以圆碰撞优化承诺 60 FPS。
