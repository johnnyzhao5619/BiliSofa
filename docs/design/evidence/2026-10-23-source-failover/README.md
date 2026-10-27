# 0.50.4 来源检查主备切换与运行内避开失败节点（本地证据）

2026-10-23；[ADR-102](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/102-source-check-failover-and-run-level-avoidance.md)。

- 原生链接：`python3 tools/link-vod-api-failover.py`、`python3 tools/link-pgc-read-failover.py`，输出到 `build/vod-api-failover`、`build/pgc-read-failover`。
- 构建：`node tools/build-foundation-app.mjs --product-source-failover`，输出到 `dist/product-source-failover-app`。
- 打包：`python3 tools/package-foundation-app.py --product-source-failover`。

**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 727/727（新增`tests/unit/vod-source-failover.test.ts`） |
| 原生主机测试 | `source-failover` 37/37；原`vod-api`、`pgc-read`通过；`vod-bridge-failover` 6/6 |
| Samsung SDK链接 | 两个新目录；其他`build/`目录不变 |
| `tests/product-source-failover-ui`（0.50.4） | 3/3 |
| 同三条对冻结0.50.3 | 3/3失败 |
| 去掉运行内避开的变异版本 | 第2条失败（切换4次）；恢复源码后重建，产物与变异前一致 |
| 回归（0.50.4） | 备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏时钟配置30/30 |
| 测试调整 | 0.50.3备用切换规格的合成主地址改为真实形态的`upos-sz-mirrorcosov`（`synthetic.bilivideo.com`在0.50.4属于边缘节点，会被排到Akamai之后）；调整后对0.50.3、0.50.4通过，对0.50.2仍失败 |
| 包负例 | 10/10（新增“来源模块缺少Akamai规则被拒”），暂存目录与manifest复原 |
| 未签名WGT | `BiliSofa-0.50.4-unsigned.wgt` `e9cb3739118264dda2eb3276967a19dd26567d07a41af8dca05bbb657a751778` |
| 与0.50.3包对比 | 原生仅`vod-api/`与`pgc-read/`各三件变化；桥接与其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-source-failover`、`python3 tools/deploy-foundation-app.py --product-source-failover`；签名`36fa9440…7467`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9f5b0437…5873`；[回执](receipt.json)（仅`vod-api/`、`pgc-read/`六件与0.50.3不同） |

## 真机复验

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| P4⁗ | 连续播放伍六七之玄武国篇第1–3集 | 都能播放；若仍失败，报告“设置 → 帮助与诊断”的失败摘要（含步骤、线路、节点类别、上游代码与切换次数） |

结果（2026-10-23）：**P4⁗ USER PASS**，前三集均可播放。
