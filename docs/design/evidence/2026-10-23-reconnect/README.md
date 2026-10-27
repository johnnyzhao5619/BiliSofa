# 0.50.2 播放中网络中断的有界自动重连（本地证据）

2026-10-23；[ADR-100](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/100-bounded-playback-reconnect.md)。构建`node tools/build-foundation-app.mjs --product-reconnect` → `dist/product-reconnect-app`；打包`python3 tools/package-foundation-app.py --product-reconnect`。**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 716/716（新增`tests/unit/media-reconnect.test.ts`） |
| `tests/product-reconnect-ui`（0.50.2） | 2/2：一次掉线后在原位置之前继续；两次重连后第三次停止并显示原有提示 |
| 同2条对冻结0.50.1 | 2/2失败 |
| 回归（0.50.2） | 选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| 包负例 | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.50.2-unsigned.wgt` `c7e06daf46493ded76854bb7988c60d82fdb80f212fca1b43302e36a4112a3c1` |
| 与0.50.1包对比 | 只有`app.js`、`config.xml`、`build.json`变化；原生与权限不变 |
| 冻结工件 | dist与`build/`不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-reconnect`、`python3 tools/deploy-foundation-app.py --product-reconnect`；签名`0bd1c8c3…0ff5`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`b2d06956…57ac`；[回执](receipt.json)（原生68个资源与0.50.1一致） |

测试夹具新增“播放中连接失败”事件（`mediaFixture.fail()`）。合成片段时长为8秒，规格中的位置都在片段之内。

## 真机复验

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| P4″ | 连续播放伍六七之玄武国篇前三集，各看几分钟 | 网络波动时出现“正在重新连接…”并在原位置附近继续；若仍提示网络中断，进“设置 → 帮助与诊断”报告失败摘要，并说明出现过几次“正在重新连接” |

结果（2026-10-23）：**P4″ FAIL**，两次“正在重新连接”后仍中断，位置一致；原因与处理见[ADR-101](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/101-cdn-failover-to-bilibili-backup.md)。
