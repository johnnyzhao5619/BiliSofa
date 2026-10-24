# 0.51.1 运行时User-Agent、所有入口共用详情页与失败后焦点（本地证据）

2026-10-23；[ADR-104](../../../adr/104-runtime-user-agent-shared-detail-everywhere.md)。

- 原生链接：`python3 tools/link-catalog-ua.py`，输出到 `build/catalog-ua`。
- 构建：`node tools/build-foundation-app.mjs --product-up-fix`，输出到 `dist/product-up-fix-app`。
- 打包：`python3 tools/package-foundation-app.py --product-up-fix`。

**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## User-Agent对照（本机匿名，同一分区交替请求，间隔4秒，各一次）

| User-Agent | rid=1004 | rid=1008 |
| --- | --- | --- |
| 原生`BiliSofa-W01-Probe/0.0.15` | -352 | -352 |
| 通用`Mozilla/5.0` | 0 | 0（不采用：属于伪装） |
| Tizen字样加`BiliSofa/0.51`的串 | -352 | -352 |
| 真实Tizen电视浏览器串（两种形式） | 0 | — |

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 731/731 |
| 原生主机测试 | `catalog-ua` 17/17；原`catalog`、`catalog-up`通过（新增User-Agent核对） |
| `tests/product-up-fix-ui`（0.51.1） | 4/4 |
| 同四条对冻结0.51.0 | 4/4失败 |
| 回归（0.51.1） | UP主页4/4、来源检查切换3/3、备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏时钟配置30/30 |
| 共享fixture调整 | `tests/catalog-ui/native-fixture.js`接受开头可选的`--ua=Mozilla/5.0 …`参数，其他参数校验不变 |
| 包负例 | 10/10，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.51.1-unsigned.wgt` `9e9c3e83f68b84ca3d97abb3bc9d4ba6b4348d444741a1e8ef788e3328223110` |
| 与0.51.0包对比 | 原生仅`catalog/`的manifest与wasm变化；UI脚本与config变化；其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-up-fix`、`python3 tools/deploy-foundation-app.py --product-up-fix`；签名`854d7904…6209`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`20e2cc29…e5ca`；[回执](receipt.json)（仅`catalog/`两件与0.51.0不同） |

## 真机复验

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| V1 | 首页 → 分区，14个逐个打开 | 有内容；个别失败只记该分区，并报告“帮助与诊断”内容 |
| 导航 | 分区成功或失败后，左键回导航栏、返回键回首页货架、切到其他页面 | 均可 |
| V2② | 我的（历史、稍后再看、收藏）、关注更新、继续观看 → 打开视频 | 完整详情页；续播对应分P；有“UP主页” |
| K3 | 关注 → 直达卡 | 打开番剧影视的我的追番 |

结果（2026-10-23）：**V1 FAIL**；导航 PASS；V2② 三项 PASS、继续观看/本机播放队列仍为旧面板；关注页直达卡 PASS。User-Agent结论作废，处理见[ADR-105](../../../adr/105-signed-public-reads-pacing-and-local-detail.md)。
