# 签名与部署记录

2026-10-25；以下为逐版本开发侧载记录，非Samsung认证/公开发布。应用ID `BiliSofa01.TV`、自有BiliSofa profile及Author保持。

| 工件 | 当前结论 |
| --- | --- |
| 0.58.0 列表逐卡容错与未知时长（ADR-111） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`96decd07…bd8`（证书预检PASS，权限不变）；设备验证见[证据](design/evidence/2026-10-25-list-tolerance/README.md) |
| 0.57.2 画质说明与互动状态并列（ADR-110） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`ca719d62…797d`（证书预检PASS，权限不变）；设备复核见[证据](design/evidence/2026-10-25-playback-start/README.md) |
| 0.57.1 “缓冲中”提示修正（ADR-110） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`106a419d…f293`（证书预检PASS，权限不变）；设备复核见[证据](design/evidence/2026-10-25-playback-start/README.md) |
| 0.57.0 详情页预读交接与续播从位置起播（ADR-110 P1-1a） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`3635ca96…7866`（证书预检PASS，权限不变）；设备对比见[证据](design/evidence/2026-10-25-playback-start/README.md) |
| 0.56.0 封面跨页保留与身份只核对一次（ADR-109） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`3fceda36…fcb5`（证书预检PASS，权限不变）；0.55.0未签名、未部署；设备对比见[证据](design/evidence/2026-10-25-lifecycle/README.md) |
| 0.54.0 常驻公共与账号只读内核（ADR-108） | **已签名并升级安装/启动（平台确认，不清数据）**；签名`515a6229…29dd`（证书预检PASS，权限不变）；0.52.0、0.53.0未签名、未部署；设备对比与门槛见[证据](design/evidence/2026-10-25-network-kernel/README.md) |
| 0.51.3 游客访客标识、设置中清除与登录提示 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`19ac5ad3…3c5f`（证书预检PASS，权限不变）；本机`/tmp/sdb.log`归root所有、SDB无法写日志，后台服务启动后随即退出（推断与此有关），改为前台运行SDB服务后连接；升级安装/启动platformSuccess（一次，不清数据）；源码归档`aaddfb3d…759a`；ADR-106；原生仅`catalog/`的manifest、probe.js与wasm（`build/catalog-visitor`），其余69个原生资源与0.51.2逐字节一致；游客V1g、清除访客标识、登录状态回归 USER PASS；[hash/源码/验证](design/evidence/2026-10-23-up-fix3/README.md) |
| 0.51.2 登录会话读取公开列表、请求节奏与本机记录/队列详情 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`33eec812…dfba`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`edf20427…57d2`；ADR-105；原生新增`public-read/`（`build/public-read`），原有68个原生资源与0.51.1逐字节一致；V1（登录状态）、V2②补、导航与UP主页回归 USER PASS；[hash/源码/验证](design/evidence/2026-10-23-up-fix2/README.md) |
| 0.51.1 运行时User-Agent、所有入口共用详情与失败后焦点 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`854d7904…6209`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`20e2cc29…e5ca`；ADR-104；原生仅`catalog/`的manifest与wasm（`build/catalog-ua`），其余66个原生资源与0.51.0逐字节一致；V1 FAIL，导航与关注页直达卡 PASS，V2②部分（见ADR-105）；[hash/源码/验证](design/evidence/2026-10-23-up-fix/README.md) |
| 0.51.0 UP主页投稿、共用详情与关注页直达卡 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`c04139b4…d817`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`f42b8e5e…cdb9`；ADR-103；原生仅`catalog/`重链接（`build/catalog-up`），其余65个原生资源与0.50.4逐字节一致；V1 FAIL（分区-352、导航失焦），V2①③ PASS、②部分（见ADR-104）；[hash/源码/验证](design/evidence/2026-10-23-up/README.md) |
| 0.50.4来源检查主备切换与运行内避开 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`36fa9440…7467`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9f5b0437…5873`；ADR-102；原生仅`vod-api/`与`pgc-read/`重链接（`build/vod-api-failover`、`build/pgc-read-failover`），其余62个原生资源与0.50.3逐字节一致；P4⁗ USER PASS（伍六七之玄武国篇前三集）；[hash/源码/验证](design/evidence/2026-10-23-source-failover/README.md) |
| 0.50.3播放源切换到B站备用线路 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`16fe51fe…660c`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9ccf64aa…0646`；ADR-101；原生仅`vod/`桥接重链接（`build/vod-failover`），其余65个原生资源与0.50.2逐字节一致；P4‴第1集PASS、第2/3集读取播放源阶段FAIL（见ADR-102）；[hash/源码/验证](design/evidence/2026-10-23-cdn-failover/README.md) |
| 0.50.2播放网络中断有界重连 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`0bd1c8c3…0ff5`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`b2d06956…57ac`；ADR-100；原生与0.50.1逐字节一致，仅6个UI输入变化；真机P4″ FAIL（位置一致，见ADR-101）；[hash/源码/验证](design/evidence/2026-10-23-reconnect/README.md) |
| 0.50.1选择页界面统一与失败摘要 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`743bbc13…7c8d`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`85e6d973…d7439`；ADR-099文末；原生与0.50.0逐字节一致；用户P1′ PASS，P4′失败摘要network（见ADR-100）；[hash/源码/验证](design/evidence/2026-10-23-profiles-fix/README.md) |
| 0.50.0启动账号选择与热门番剧筛选 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`22ec2901…b5d2`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`87fd5a2c…12fb4f`；ADR-098/099；原生仅`catalog/`重链接（`build/catalog-pgc2`）；用户P1/P3 PASS、P2暂缓、P4部分通过（见ADR-099）；[hash/源码/验证](design/evidence/2026-10-23-profiles/README.md) |
| 0.49.1追番状态与写入结果 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`e76c619c…0e79`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`56cc3f29…fbaa4`；ADR-096文末；原生仅`pgc-follow/`重链接（`build/pgc-follow-status`）；Q3复验USER PASS；[hash/源码/验证](design/evidence/2026-10-23-season-fix/README.md) |
| 0.49.0番剧详情、一键追番与热门番剧 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`cd08619b…e6ef`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`6438d7db…3e1a`；ADR-096；原生仅`catalog/`重链接（`build/catalog-pgc`）；用户Q1/Q2 PASS、Q3 FAIL（见0.49.1）、Q4倍速结果见ADR-096；[hash/源码/验证](design/evidence/2026-10-23-season/README.md) |
| 0.48.0详情补全与倍速探查 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`223813c4…49efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`8d1a535a…0193`；ADR-095；原生与0.47.2逐字节一致；用户Z1 PASS、Z2部分通过、Z3 FAIL（见ADR-096）；[hash/源码/验证](design/evidence/2026-10-23-detail/README.md) |
| 0.47.2搜索课程行与AI字幕修正 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`c602062d…1efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`2199303c…fbae`；用户复验S1/S3 USER PASS；ADR-094；含原生`overlay-read`重链接（`build/overlay-read-subtitle`）；未签名WGT `5487c146dad89d4c60d487e6bc9defd02fb03b87364fbdddffb05cfdf76dd4d6`；[验证](design/evidence/2026-10-23-reading-fix2/README.md) |
| 0.47.1第三批真机反馈修正 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`b9786074…5284`（证书预检PASS，权限与0.47.0相同）；首次SDB能力确认超时、重连未连上；用户确认电视开机并处于开发者模式后，重启本机SDB服务再连接，**第二次升级安装/启动platformSuccess（不清数据）**；源码归档`345e5979…dda1`；用户复验S5 PASS，S1/S3 FAIL（见ADR-094）；仅前端（app.js/style.css/config.xml/build.json变化，原生/许可78个文件与0.47.0一致）；未签名WGT `1fa9162e3c60ae008c55154f7c3c623f8c389212a9b600f9ce8d7dc8e1eaa5d6`；[验证](design/evidence/2026-10-23-reading-fix/README.md) |
| 0.47.0第三批 | **已签名并升级安装/启动（平台确认，一次成功，不清数据）**；ADR-092/093；用户S2/S4/S6 USER PASS；S5连播记忆PASS但⚙“循环”上移FAIL；S1、S3 FAIL；[hash/源码/验证](design/evidence/2026-10-23-reading/README.md) |
| 0.46.0第二批2A | **已签名并升级安装/启动（平台确认，不清数据）**；首次SDB未连上，同目标重连后第二次成功；ADR-090/091；所请求P1–P7 USER PASS；[hash/源码/验证](design/evidence/2026-10-23-polish/README.md) |
| 0.45.0第一批遥控快改 | **已签名并升级安装/启动（平台确认，一次成功，不清数据）**；ADR-088；新增tv.inputdevice权限；本地696单元/13合成UI/8包负例通过；所请求R1–R6 USER PASS（R7按ADR-089移除）；[hash/源码/验证](design/evidence/2026-10-23-remote/README.md) |
| 0.44.0第三方验收修正 | **已签名并升级安装/启动（平台确认，不清数据）**；首次capability超时，SDB同目标重连后第二次成功；M1回复全文/M2默认画质USER PASS；ADR-087修正（F11日志淘汰、回复层级、默认画质），本地692单元/12合成UI/6负例通过；[hash/源码/验证](design/evidence/2026-10-22-acceptance-fix/README.md) |
| 0.43.0当前位置幂等 | Android所请求组、iPhone首投/声画时间/停止及F11关注/收藏所请求组USER PASS，完整矩阵OPEN；[hash/源码/平台回执](design/evidence/2026-10-22-cast-clock/receipt.json) |
| 0.42.0播放态投屏定位 | 用户报告向前跳转，所请求控制组未测；[hash/源码/平台回执](design/evidence/2026-10-22-cast-seek/receipt.json) |
| 0.41.0投屏起播定位 | 已签名升级启动，所请求主动定位/停止通过、进程首次投屏FAIL；[hash/源码/平台回执](design/evidence/2026-10-22-cast-start/receipt.json) |
| 0.40.0单账号恢复 | 所请求A/B/C USER PASS；[hash/源码/平台回执](design/evidence/2026-10-22-recovery/receipt.json) |
| 0.39.0稳定浏览/目标控制 | 所请求三组及随后一次点赞USER PASS；[hash/源码快照/平台回执](design/evidence/2026-10-22-stream/receipt.json) |
| 0.38.0冻结 | 倍速USER PASS；关注invalid/点赞-403/互动慢/跳动缺图未通过；[用户事实](design/evidence/2026-10-22-direct/USER_ACCEPTANCE.md) |
| 0.37.0及以前冻结 | 原最小通过组与失败保持；不覆盖原工件或把旧UI通过扩展为新设备通过 |

当前安装为0.51.3，升级安装/启动获平台确认。R07候选未集成/打包/签名/部署，不将旧WGT重标为新候选。各版本均未卸载或清数据，未执行代理账号POST。已签名包与冻结dist/build不覆盖；0.47.2起`overlay-read`从新目录`build/overlay-read-subtitle`打包，0.50.3起`vod/`桥接从`build/vod-failover`打包，0.50.4起`vod-api/`、`pgc-read/`从各自的`-failover`目录打包，0.51.0起`catalog/`从`build/catalog-up`打包，0.51.1起从`build/catalog-ua`打包，0.51.2新增`public-read/`（`build/public-read`），0.51.3起`catalog/`从`build/catalog-visitor`打包，其余原生沿用。签名包、源码快照、证书及原始日志均在仓库外保护目录；公共回执仅含hash与平台结果。2026-10-24起为单一产品构建（ADR-107）：模块目录同上，构建输出`dist/bilisofa-app`；本机已清理0.51.2以前的dist目录与未签名包，已签名包与源码快照仍在仓库外保护目录。

[当前验收](CURRENT_DEVICE_TEST.md) · [0.38.0原记录](archive/2026-10-22-direct-038/SIGNING_DEVICE_RECORD.md)
