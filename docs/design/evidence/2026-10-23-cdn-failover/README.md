# 0.50.3 播放源按轨道切换到B站备用线路（本地证据）

2026-10-23；[ADR-101](../../../adr/101-cdn-failover-to-bilibili-backup.md)。

- 原生链接：`python3 tools/link-vod-bridge-failover.py`，输出到 `build/vod-failover`。
- 构建：`node tools/build-foundation-app.mjs --product-cdn-failover`，输出到 `dist/product-cdn-failover-app`。
- 打包：`python3 tools/package-foundation-app.py --product-cdn-failover`。

**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## 匿名核对（伍六七之玄武国篇第1集，480P AVC与192K音频，每段2 MiB）

| 主机 | 结果 |
| --- | --- |
| `upos-sz-mirrorcosov.bilivideo.com`（主地址） | 视频14段中第5段起大多15秒超时；音频10段中4段失败；重复测试同一偏移一致；15–26秒无响应头后返回504或迟到的206 |
| `upos-hz-mirrorakam.akamaized.net`（B站备用） | 视频14段、音频10段全部成功，分别用时18.7秒和8.5秒 |

只记录公开CDN主机名和分段结果，不保存地址、签名或响应体。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 721/721（新增`tests/unit/vod-cdn-failover.test.ts`） |
| 原生主机测试 | `vod-bridge-failover` 6/6；原`vod-bridge` 10/10 |
| Samsung SDK链接 | `build/vod-failover`；其他`build/`目录不变 |
| `tests/product-cdn-failover-ui`（0.50.3） | 1/1 |
| 同一条对冻结0.50.2 | 失败 |
| 同一条对去掉排除表的变异版本 | 失败（切换2次）；恢复源码后重建，产物与变异前一致 |
| 回归（0.50.3） | 重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏时钟配置30/30 |
| 包负例 | 9/9（新增“缺少备用切换的桥接被拒”），暂存目录与manifest复原 |
| 未签名WGT | `BiliSofa-0.50.3-unsigned.wgt` `53a64651552ae8d1215a66f308b5ce3907bfc068c661d930a262b738d90db482` |
| 与0.50.2包对比 | 变化：UI脚本、`config.xml`、`build.json`与`vod/`桥接三件；`vod/probe.data`（CA）与其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-cdn-failover`、`python3 tools/deploy-foundation-app.py --product-cdn-failover`；签名`16fe51fe…660c`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9ccf64aa…0646`；[回执](receipt.json)（仅`vod/`三件与0.50.2不同） |

## 真机复验

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| P4‴ | 连续播放伍六七之玄武国篇前三集，每集看过原来出错的位置 | 不再提示网络中断，也不出现“正在重新连接”；若仍失败，报告“设置 → 帮助与诊断”的失败摘要（含“上游”与“已切换备用线路”） |

结果（2026-10-23）：**P4‴**第1集PASS；第2、3集在读取播放源阶段失败（source·network）。原因与处理见[ADR-102](../../../adr/102-source-check-failover-and-run-level-avoidance.md)。
