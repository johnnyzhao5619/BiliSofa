# 0.49.0 番剧详情、一键追番、热门番剧与倍速探查v2（本地证据）

2026-10-23；[ADR-096](../../../adr/096-product-season-page-follow-toggle-and-hot-ranking.md)。构建`node tools/build-foundation-app.mjs --product-season` → `dist/product-season-app`；原生`python3 tools/link-catalog.py --out build/catalog-pgc`；打包`python3 tools/package-foundation-app.py --product-season`。**已签名（`cd08619bcf8f58d73bffb46d7d8d6bfa4c34f197c4b924eec2552c6db850e6ef`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据），未经真机验收。** 用户结果：Q1/Q2 USER PASS；Q3 FAIL，修正见[0.49.1](../2026-10-23-season-fix/README.md)；Q4倍速见ADR-096文末。 源码归档`6438d7db3d68f530d49b1768ce44165fe30c64aa0eb2a1007d378ea449853e1a`，见[receipt.json](receipt.json)。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` | 307模块，退出0（含文档门禁） |
| `npm test` | 711/711（新增`tests/unit/pgc-season-product.test.ts`4条：排行解析与跳过、Worker边界、季封面、追番原因文案） |
| 原生`tests/native/catalog.test.py` | 10/10（新增番剧排行固定GET、无凭据） |
| `tests/product-season-ui`（0.49.0） | 3/3：游客进番剧影视落在热门番剧并跳过坏行、卡片直达番剧详情；追番一键往返、无确认面板、共2次写入；回读失败时显示原因，下一次只查询 |
| 同3条对冻结0.48.0 | 3/3失败 |
| 回归（0.49.0） | 详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| `product-collections`套件 | 0.49.0与冻结0.48.0同为7条失败、2条通过：该套件针对0.33.0页面结构，后续产品构建一直未适配，与本次无关 |
| 包负例`tests/native/product-season-packaging.test.py` | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.49.0-unsigned.wgt` `d148586f502ff024e28e23cdecab8b357caa2f0edd0b4db8481a69ff28a4a878` |
| 与0.48.0包对比 | 条目相同；原生只有`catalog/`（重链接，含番剧排行路由）变化；权限不变 |
| 冻结工件 | dist（不含新输出）与`build/`（不含新`catalog-pgc`）不变 |

日志在`.local/u5-season/`（不入库）。

## 真机验收（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| Q1 番剧影视 | 进入番剧影视；游客与登录各看一次 | 默认在“热门番剧”，有封面、更新信息与评分；页面标明是公开排行；“我的追番/我的追剧”登录后可用 |
| Q2 番剧详情 | 从热门番剧或我的追番打开一部番剧 | 直接进入详情页：封面、标题、更新状态、简介；“播放 · 第N话”可用；分组切换与横排剧集可用；Back回原卡 |
| Q3 追番 | 你指定的番剧：按“追番”，再按“已追番 ✓” | 每次只提交一次；按钮与B站实际状态一致；重进仍一致。若失败，记下页面上的原因文字 |
| Q4 倍速探查v2 | 先正常播放任意视频，再运行“倍速探查（诊断）” | 列出1/0.25/0.5/0.75/1.25/1.5/2×的结果、斜率、等待次数与缓冲余量 |
