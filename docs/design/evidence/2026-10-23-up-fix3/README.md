# 0.51.3 游客读取带B站官方访客标识、设置中可清除、被拦时提示登录（本地证据）

2026-10-23；[ADR-106](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/106-guest-visitor-identity-and-sign-in-hint.md)。

- 原生链接：`python3 tools/link-catalog-visitor.py`，输出到 `build/catalog-visitor`。
- 构建：`node tools/build-foundation-app.mjs --product-up-fix3`，输出到 `dist/product-up-fix3-app`。
- 打包：`python3 tools/package-foundation-app.py --product-up-fix3`。

**已签名并升级安装/启动（平台确认，不清数据）；游客V1g、清除访客标识、登录状态回归 USER PASS。**

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 737/737（新增`tests/unit/visitor-id.test.ts` 4条） |
| 原生主机测试 | `catalog-visitor` 20/20；`catalog` 13、`catalog-up` 15、`catalog-ua` 17、`public-read` 10、`vod-api` 10、`pgc-read` 12、`source-failover` 37均通过 |
| Samsung SDK链接 | `build/catalog-visitor`；其他`build/`目录不变 |
| `tests/product-up-fix3-ui`（0.51.3） | 5/5 |
| 同五条对冻结0.51.2 | 前4条失败；第5条（登录时不取访客标识、无登录提示）为回归保护，两版都通过 |
| 变异（Worker不传访客标识） | 第1–3条失败 |
| 回归（0.51.3） | 0.51.2套件4/4、ADR-104修正4/4、UP主页4/4、来源检查切换3/3、备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏时钟配置30/30、投屏只唤回1/1 |
| 测试调整 | 共用catalog fixture接受前置`--visitor=`并应答`visitor-id`；UP路由与ADR-104规格容许访客标识在User-Agent之前；UP主页限频文字按版本断言（0.51.3带“；登录后通常更稳定”），对0.51.1/0.51.2仍4/4 |
| 包负例 | 11/11（新增：catalog缺访客标识即拒绝），暂存目录复原 |
| 未签名WGT | `BiliSofa-0.51.3-unsigned.wgt` `830f9708eb42308523cd64ed92a617c0962bf09508bfcec4ed8728a6dec4e8e6` |
| 与0.51.2包对比 | 变化：`app.js`、`catalog-worker.js`、`catalog/probe.js`、`catalog/probe.wasm`、`catalog/manifest.json`、`config.xml`、`build.json`；`catalog/probe.data`（CA）与其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（构建前与签名部署后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-up-fix3`、`python3 tools/deploy-foundation-app.py --product-up-fix3`；签名`19ac5ad3…3c5f`（证书预检PASS，权限不变）；本机`/tmp/sdb.log`归root所有、SDB无法写日志，后台服务启动后随即退出（推断与此有关），改为前台运行SDB服务后连接；升级安装/启动platformSuccess（一次，不清数据）；源码归档`aaddfb3d…759a`；[回执](receipt.json)（原生仅`catalog/`三件变化，其余69个与0.51.2一致） |

## 真机复验（签名部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| V1g | 游客：首页 → 分区，逐个打开；视频详情 → UP主页翻页 | 有内容；若被拦，页面显示“风控 N …；登录后通常更稳定”，并报告“帮助与诊断”的“最近一次分区/UP投稿读取”一行（应为“游客（带访客标识）”） |
| 清除 | 设置 → 本机数据 → 清除B站访客标识，再打开一个分区 | 状态变为“已清除…”，焦点留在按钮上；之后分区照常读取 |
| 回归 | 登录状态的分区、UP主页、导航 | 不变 |

结果（2026-10-23）：**V1g USER PASS**（游客）、**清除访客标识 USER PASS**、**登录状态回归 USER PASS**。

更正（2026-10-24）：上表“投屏时钟配置30/30”因该配置把构建目录写死，实际跑在冻结的0.43.0上，不是本版的回归结果；本版在投屏规格上的重跑见[ADR-107](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/107-single-product-build.md)“更正”。
