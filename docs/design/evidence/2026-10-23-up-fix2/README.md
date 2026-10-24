# 0.51.2 登录会话读取公开列表、请求节奏与本机记录/队列完整详情页（本地证据）

2026-10-23；[ADR-105](../../../adr/105-signed-public-reads-pacing-and-local-detail.md)。

- 原生链接：`python3 tools/link-public-read.py`，输出到 `build/public-read`。
- 构建：`node tools/build-foundation-app.mjs --product-up-fix2`，输出到 `dist/product-up-fix2-app`。
- 打包：`python3 tools/package-foundation-app.py --product-up-fix2`。

**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## 风控对照（本机，同一时刻）

| 请求 | 分区rid=1004 | 全站rid=0 |
| --- | --- | --- |
| 生产原生代码（主机编译）+ 原生标识 | -352 | -352 |
| 生产原生代码 + 真实Tizen串 | -352 | — |
| Python + 真实Tizen串 | -352 | -352 |

早些时候同一串可读；结论：-352取决于同一出口的状态，单靠User-Agent不足（ADR-104该结论作废）。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 733/733（新增`tests/unit/public-read.test.ts`；一次直播F18计时用例偶发失败，单独与整体重跑均通过，相关文件未改） |
| 原生主机测试 | `public-read` 10/10；`vod-api` 10、`pgc-read` 12、`source-failover` 37、`catalog-ua` 17均通过 |
| Samsung SDK链接 | `build/public-read`；其他`build/`目录不变 |
| `tests/product-up-fix2-ui`（0.51.2） | 4/4 |
| 同四条对冻结0.51.1 | 4/4失败 |
| 回归（0.51.2） | ADR-104修正4/4、UP主页4/4、来源检查切换3/3、备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏时钟配置30/30（其中R06恢复用例单独运行时偶发超时，对冻结0.51.1同样出现，整体重跑30/30） |
| 测试调整 | 限频文字与暂停期间“重新读取”按版本断言；ADR-104焦点测试改为断言重试后焦点仍在可见控件上（对0.51.1失败，问题已在本版修正） |
| 包负例 | 10/10，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.51.2-unsigned.wgt` `0e972abd16a0713df8365b744e03c25d290ca18f0c00b82642d880a53745d22f` |
| 与0.51.1包对比 | 新增`public-read/`四件与`public-read-worker.js`；变化：`app.js`、`config.xml`、`build.json`、`style.css`；catalog与其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-up-fix2`、`python3 tools/deploy-foundation-app.py --product-up-fix2`；签名`33eec812…dfba`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`edf20427…57d2`；[回执](receipt.json)（新增`public-read/`四件，原有原生文件均未变） |

## 真机复验

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| V1 | 登录状态：首页 → 分区，逐个打开 | 有内容；若失败，页面显示“风控 N”，并报告“帮助与诊断”的“最近一次分区读取”一行 |
| V2②补 | 我的 → 继续观看、本机播放队列 → 打开视频 | 完整详情页；继续观看有“删除本机此项”；队列有“从本项开始播放队列”、上移/下移、删除 |
| 回归 | 导航、UP主页 | 不变 |

结果（2026-10-23）：**V1 USER PASS**（登录状态）、**V2②补 USER PASS**、导航与UP主页回归 **USER PASS**。游客匿名通道未验证。
