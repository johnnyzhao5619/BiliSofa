# 2026-10-26 台账清理归档

2026-10-26 文档清理时，从当前台账与说明中移出的过程描述、已被取代的逐版本行和过时措辞，按原文逐字保存。当前结论以各源文件为准；本页内的相对链接按原文件位置书写，不保证在此处可点。

## 来自 `docs/IMPLEMENTATION_STATUS.md`

以下各行按原文保存（表格行与原表同列）：

| 0.52.0候选（未签名/未部署） | [ADR-107](adr/107-single-product-build.md)：版本链收敛为单一产品构建（37个变体开关按当前值折叠、旧分支删除；构建/打包/签名/部署无变体参数；合成UI收敛为`playwright.app.config.ts`，旧套件归档）；行为等同0.51.3，原生模块逐字节一致。本地737单元/100条合成UI/11包负例通过；未签名WGT `f37077d0…c73e` | [证据](design/evidence/2026-10-24-single-build/README.md) |

| 0.51.2（USER证据来源） | ADR-105：登录时分区排行与UP投稿用本人会话读取并节制请求；**V1 USER PASS（登录状态）、V2②补 USER PASS、导航与UP主页回归 USER PASS** | [证据](design/evidence/2026-10-23-up-fix2/README.md) |

| 0.51.0–0.51.1（USER证据来源） | ADR-103/104：**V2① PASS、V2③ PASS、搜索视频与首页详情一致 PASS、导航 PASS、关注页直达卡 PASS、稍后再看/云端历史/收藏完整详情 PASS**；V1与继续观看/队列详情转ADR-105 | [证据](design/evidence/2026-10-23-up-fix/README.md) |

| 0.50.4（USER证据来源） | ADR-102来源检查主备切换与运行内避开；**P4⁗ USER PASS**（伍六七之玄武国篇前三集） | [证据](design/evidence/2026-10-23-source-failover/README.md) |

| 0.50.1（USER证据来源） | ADR-099文末：启动选择页改为整页产品样式；“帮助与诊断”顶部显示最近一次播放失败；**P1′ USER PASS**；P4′失败摘要network、时好时坏 → ADR-100 | [证据](design/evidence/2026-10-23-profiles-fix/README.md) |

| 0.43.0（USER证据来源） | Android所请求首投/非零定位/暂停继续/回0停止、iPhone首投/声画时间/停止，以及F11关注切换恢复、收藏取消/增删恢复、Back/Home均USER PASS；点赞/稍后再看继承已有结果 | [冻结包/源码回执](design/evidence/2026-10-22-cast-clock/receipt.json)、[投屏分项](design/evidence/2026-10-22-cast-clock/USER_ACCEPTANCE.md)、[F11](design/evidence/2026-10-22-cast-clock/F11_ACCEPTANCE_READY.md) |

| 0.44.0（USER证据来源） | ADR-087三项修正；仅6个UI输入相对0.43.0变化，原生模块不变，R07适配器不在包内；升级安装/启动获平台确认；**M1回复全文（UGC/番剧楼中楼）与M2默认画质USER PASS**（[用户结果](design/evidence/2026-10-22-acceptance-fix/USER_ACCEPTANCE.md)）；0.43.0既有USER PASS组因相关源码未变而继承 | [回执与本地验证](design/evidence/2026-10-22-acceptance-fix/README.md) |

| R07小数倍速（设备限制） | HTML video适配器/固定小数倍速合同及相关检查已实现；**按ADR-097不接入生产**：本机video仅0.5×/0.75×可用、0.25×停住、快档约1.1–1.2×封顶；只保留诊断探查。生产AVPlay/菜单仍只提供1×/2× | [ADR-086](adr/086-fractional-rate-element-candidate.md)、[候选分层结果](design/evidence/2026-10-22-element-candidate/README.md) |

R07候选（ADR-086）本地：strict/边界293模块通过；DOM关闭修正前全量687项通过，修正后针对性20项通过，当前全量未重跑。真实桌面MP4台架0.25/0.5/0.75/1×通过；1.25×有效窗口不足中止（退出1），其余三档及真实DASH未执行，无电视小数倍速/人工声音通过。

已签名包不覆盖；构建为单一产品构建（ADR-107），新版本只提升`foundation-config.xml`中的版本号，本机仅保留0.51.2起的构建目录；账号/本机数据与旧unknown写日志保留、不重放。签名/部署按版本取得用户授权（升级安装，不清数据）；Git只在用户要求时提交/推送。

| F06 播放控制 | 0.21.1 A/B所请求控制、轨道、分P/记录/结束策略USER PASS；0.21.3缺4K自动回退1080P高码率播放USER PASS；0.45媒体键/隐藏态直达（ADR-088）R1–R6、0.46长按加速/连播倒计时（ADR-090）P3/P4 USER PASS | 小数倍速仅有未集成/未部署候选（ADR-086）；无样本合集/源失效及完整媒体矩阵 |；小数倍速按本机设备限制记录（ADR-097），非PASS、保留候选代码

| F18 直播 | 旧浏览USER PASS/实播USER FAIL保留；最新用户要求直播不做（ADR-068） | 当前交付EXCLUDED，非PASS；0.34.0源码统一隐藏入口，待TV确认，保留源码/历史 |

过程记录见[历史归档](archive/2026-10-19-process-records/README.md)、[2026-10-23归档](archive/2026-10-23-superseded/README.md)与[W01–W06阶段记录](archive/2026-10-24-phase-records/README.md)；本页只维护当前结论，不追加逐轮日志，逐版本记录在[签名与部署记录](SIGNING_DEVICE_RECORD.md)。本页形状由`tools/check-docs.mjs`机器门禁强制（见[开发与部署](DEVELOPMENT.md)）。

## 来自 `docs/TEST_REPORT.md`

以下各行按原文保存（表格行与原表同列）：

## R07小数倍速候选（按ADR-097不接入生产）



本机两轮倍速探查（0.48.0/0.49.0）：0.5×/0.75×通过；0.25×停住；1.25×/1.5×/2×在无等待、缓冲充足时为1.09/1.17/0.85。生产保持1×/2×，[ADR-097](adr/097-fractional-rates-device-limited.md)。以下为原候选的桌面分层结果。



| 层次 | 实际结果 |

| --- | --- |

| strict/边界 | 当前293模块通过 |

| 全量单元/合同 | DOM关闭修正前687通过；不能当成修正后全部源码的最新全量门禁 |

| 修改后针对性 | element-video、rate-observation、vod-rate共20项通过；当前全量未重跑，不写688全量PASS |

| 桌面真实MP4 | 0.25/0.5/0.75/1×实际时间斜率、解码帧、暂停定位/DOM释放通过；1.25×比例125但窗口不足，退出1；后三档及真实DASH未执行 |

| 原失败/修正 | currentSrc历史值导致关闭未确认；保留失败，修正为本次emptied事件加真实空状态后才释放，异常仍持锁；相关回归/前四档关闭通过 |

| 未证明 | 人工声音、电视、生产SegmentBase双轨DASH、4K/HDR、跨后端互斥/切换、生产菜单；台架固定MPD路由实际为muxed MP4，不能称DASH通过 |

| 发布状态 | 没有新WGT/签名/安装；0.43.0不含此适配器 |



## 来自 `docs/PRODUCT_CLOSURE.md`

以下各行按原文保存（表格行与原表同列）：

更新：2026-10-23。已安装0.51.3；U5集中验收V1–V6全部USER PASS（[U5报告](acceptance/2026-10-23-u5-final/REPORT.md)），本轮无FAIL；PAUSED（R08、R12、R14）、BLOCKED（图文/关注动态）与条件未验证项单列，不宣布完整v1.0.0完成。更早的USER结果见[签名与部署记录](SIGNING_DEVICE_RECORD.md)与[当前实施状态](IMPLEMENTATION_STATUS.md)；下表R01–R15为唯一剩余清单。

| R14 / W07发布准备 | 内部源码/签名包配对已有；构建已收敛为单一产品构建（ADR-107，0.52.0候选，可复现：清理后重建hash不变），最终发布候选未冻结 | 最终源码、依赖/许可、无私密信息检查、可复现构建、签名包hash、安装升级/回退说明和剩余限制齐全；发布动作另待授权 |

以下是同一产品的开发批次，不是新增产品版本。U0规划完成，U1–U3源码阶段完成并整合部署，0.34.0所请求组及0.36.0 A–E修正USER PASS；0.38.0旧失败保留，0.39.0所请求修复三组USER PASS，U4/U5继续OPEN。

0.34.0 A–F功能组已获USER PASS，不重复该整组。当前分组见[当前清单](CURRENT_DEVICE_TEST.md)，0.36.0承载的A–E已通过，F11与倍速菜单已有所请求USER结果，不重复；以下T1–T8保留为U5最终矩阵，未受影响的旧通过不重测。

## 最近交付



已安装0.51.0（[证据](design/evidence/2026-10-23-up/README.md)，[ADR-103](adr/103-up-page-shared-detail-and-following-shortcut.md)），V1 FAIL、V2部分；已安装0.51.1（[ADR-104](adr/104-runtime-user-agent-shared-detail-everywhere.md)），V1 FAIL、导航与关注页直达卡 PASS、V2②部分；已安装0.51.2（[ADR-105](adr/105-signed-public-reads-pacing-and-local-detail.md)），V1（登录状态）、V2②补与回归 USER PASS；已安装0.51.3（[ADR-106](adr/106-guest-visitor-identity-and-sign-in-hint.md)），游客V1g、清除访客标识、登录状态回归 USER PASS；所请求组见页首，逐版本结论见[签名与部署记录](SIGNING_DEVICE_RECORD.md)。R07小数倍速按ADR-097关闭为本机设备限制。其余R项不自动关闭。



## 来自 `docs/SIGNING_DEVICE_RECORD.md`

以下各行按原文保存（表格行与原表同列）：

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

当前安装为0.51.3，升级安装/启动获平台确认。R07候选未集成/打包/签名/部署，不将旧WGT重标为新候选。各版本均未卸载或清数据，未执行代理账号POST。已签名包与冻结dist/build不覆盖；0.47.2起`overlay-read`从新目录`build/overlay-read-subtitle`打包，0.50.3起`vod/`桥接从`build/vod-failover`打包，0.50.4起`vod-api/`、`pgc-read/`从各自的`-failover`目录打包，0.51.0起`catalog/`从`build/catalog-up`打包，0.51.1起从`build/catalog-ua`打包，0.51.2新增`public-read/`（`build/public-read`），0.51.3起`catalog/`从`build/catalog-visitor`打包，其余原生沿用。签名包、源码快照、证书及原始日志均在仓库外保护目录；公共回执仅含hash与平台结果。2026-10-24起为单一产品构建（ADR-107）：模块目录同上，构建输出`dist/bilisofa-app`；本机已清理0.51.2以前的dist目录与未签名包，已签名包与源码快照仍在仓库外保护目录。

## 来自 `README.md`

以下各行按原文保存（表格行与原表同列）：

已安装工件为0.63.0：公开列表与账号读取改走常驻只读内核（[ADR-108](docs/adr/108-resident-read-kernels-connection-reuse-and-batched-pages.md)，[设备对比](docs/design/evidence/2026-10-25-network-kernel/README.md)），封面跨页保留、身份只核对一次（[ADR-109](docs/adr/109-cover-cache-single-account-verification-and-lifecycle-measurement.md)，[设备对比](docs/design/evidence/2026-10-25-lifecycle/README.md)），详情页预读播放并交给播放器、续播从位置起播（[ADR-110](docs/adr/110-playback-start-prefetch-handoff-and-overlay-lane.md)，[设备对比](docs/design/evidence/2026-10-25-playback-start/README.md)），列表单张卡不合格不再让整页失败（[ADR-111](docs/adr/111-list-item-tolerance-and-unknown-duration.md)，[设备验证](docs/design/evidence/2026-10-25-list-tolerance/README.md)），弹幕与评论复用播放读取的视频编号（[ADR-112](docs/adr/112-parallel-source-checks-and-overlay-binding-reuse.md)，[设备对比](docs/design/evidence/2026-10-26-p1-1b/README.md)），卡片按OK直接播放、长按打开菜单（[ADR-113](docs/adr/113-direct-play-quick-settings-and-navigation-trim.md)，[设备实按](docs/design/evidence/2026-10-26-p1-2a/README.md)），首页、详情、播放器与搜索的界面与布局调整（[ADR-114](docs/adr/114-tv-layout-and-visual-pass.md)，[设备验证](docs/design/evidence/2026-10-26-p2a-device/README.md)；模糊背景实测拖慢方向键，0.61.1已关闭并复测恢复），侧栏去掉“账号”、账号并入设置（[ADR-113 P1-2b](docs/adr/113-direct-play-quick-settings-and-navigation-trim.md)，[设备验证](docs/design/evidence/2026-10-26-p1-2b/README.md)），来源检查改回逐项检查、媒体时长上限7天（[ADR-115](docs/adr/115-serial-source-check-and-long-videos.md)，[设备验证](docs/design/evidence/2026-10-26-p1-1c/README.md)；超长视频尚未在设备上验证）。0.45.0–0.51.3各批所请求组USER PASS（前端三批、详情与番剧页、追番、热门番剧筛选、启动账号选择、播放中断重连与CDN/来源主备切换、UP主页投稿、登录与游客状态下的分区），U5集中验收V1–V6全部USER PASS（[报告](docs/acceptance/2026-10-23-u5-final/REPORT.md)），此前投屏/F11等所请求组保持；不等于完整产品通过。

R07小数倍速按本机设备限制关闭（[ADR-097](docs/adr/097-fractional-rates-device-limited.md)），生产保持1×/2×。大屏UI已有实现与分组USER证据；最终整合（收口计划V3–V6）、恢复矩阵及内容来源缺口（图文/关注动态BLOCKED、游客分区待验证）仍开放。

## 来自 `docs/PROJECT_STRUCTURE.md`

以下各行按原文保存（表格行与原表同列）：

R07新候选：`apps/tv/src/platform/element-video.ts`、`packages/contracts/src/playback-rate.ts`及`tests/media-element/`，见[ADR-086](adr/086-fractional-rate-element-candidate.md)。尚未在生产入口导入/选择，未打包或部署；当前保持0.43.0冻结。

## 来自 `docs/adr/108-resident-read-kernels-connection-reuse-and-batched-pages.md`

以下各行按原文保存（表格行与原表同列）：

2026-10-25；F01/F02/F03/F04/F07、R05/R15、性能（W02基线）。接2026-10-25前端交互与调用逻辑review。状态：**用户确认全部5项决定（2026-10-25）。P0a（0.53.0）与P0b（0.54.0）已实现，0.54.0已签名并升级安装；设备对比与`terminate`门槛PASS，播放门槛只测到720P，-352的一天计数OPEN**（[设备证据](../design/evidence/2026-10-25-network-kernel/README.md)）。改动方案见[P0网络内核方案](../plans/2026-10-25-p0-network-kernel-plan.md)。

  - 两内核常驻时播放：585 s内始终PLAYING、无错误、用户确认全程流畅，但选中的是720P，**1080P仍待补测**；

## 来自 `AGENTS.md`

以下各行按原文保存（表格行与原表同列）：

- One standalone Samsung TV app; retain F01–F20 tracking. The user explicitly excluded live features and dependent acceptance branches from the current delivery on 2026-10-21 ([ADR-068](docs/adr/068-current-scope-and-reversible-interactions.md)), superseding the earlier playback-only deferral. Preserve live IDs/code/evidence; current entry hiding remains pending. The user also excluded real dual-account functionality/acceptance from current delivery under ADR-069; preserve existing code and single-account security. Other required features remain in the complete v1.0.0 scope. Internal tasks/test builds are not separate product releases. Never silently remove required features.

## 来自 `CONTRIBUTING.md`

以下各行按原文保存（表格行与原表同列）：

Candidate probe commands now exist: `npm ci --ignore-scripts`, `npm run check` (includes the documentation drift gate `tools/check-docs.mjs`), `npm test`, `npm run build`, `npm run package`, `npm run test:ui`. See docs/DEVELOPMENT.md for browser setup and the separately blocked Samsung native build. These validate candidates, not a selected final runtime. CI contains actual checking/tests/build/package/UI checks and no private signing/account/device actions; no hosted CI run is claimed before publication.

## 来自 `docs/DEVELOPMENT.md`

以下各行按原文保存：

旧W01探针使用`build/package/package:native`等独立命令；仅复现历史证据时查[探针指南](archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md)和[环境归档](archive/2026-10-19-process-records/DEVELOPMENT.md)，不把它们当作当前产品包入口。CI仅有workflow配置，未运行hosted CI或发布。


## 来自 `docs/SAMSUNG_CERTIFICATE_GUIDE.md`

以下各行按原文保存：

## 创建后继续 W01

开发代理核查 profile 的非敏感元数据和设备适用性，执行 `python3 tools/sign-probe.py basic` 或 `native`，输出签名包到仓库外，记录包 SHA-256，然后按已获内部探针侧载授权安装/启动。工具拒绝 SDK 默认 Distributor、过期/尚未生效的证书和不匹配资源；它不替代电视的证书链信任验证。具体独立命令与 W01-P01–P10 见 [探针指南](archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md)。新 Author 与旧第三方应用不互相替换；只部署 BiliProbe1.Probe。当前签名/安装/启动通过，用户反馈两项 Worker/native 最终 PASS；媒体/官方投屏等完整 W01 仍开放。


## 来自 `docs/adr/107-single-product-build.md`

以下各行按原文保存：

- **测试**：合成UI收敛为`playwright.app.config.ts`（`npm run test:ui:app`）。按“对冻结0.51.3是否通过”逐个规格文件分类：通过的保留，失败的（等待已被取代的旧网格、旧面板或旧设置页）移入`tests/archive`；打包负例收敛为`tests/native/app-packaging.test.py`。


## 来自 `platform/wasm-network/README.md`

以下各行按原文保存：

# On-TV WASM networking candidate

Contains original W01 Worker glue and C/cURL/socket candidate probe source. `src/probe-worker.ts` executes real minimal WASM and explicitly reports missing native artifacts. `src/probe.c` tests bounded TCP/UDP loopback, multicast self-receive, verified guest HTTPS and isolated synthetic cookie engines. Native SDK compiler/CA configuration is explicit; `npm run probe:native:check` is host syntax evidence only.

The initial probe had no official-sender receiver. Later 0.0.50 has ordinary-video/control user evidence for Android, iPhone and both iPad apps, with a retained iPad target-window discrepancy; full F20 and real authenticated sessions remain open. Synthetic MPD, KeyManager and guest read evidence is recorded separately below and in the device register. Validate retail-device permissions and packaging before implementation commitment. Runtime modules belong inside the TV app; no PC/NAS gateway is introduced. See [guide](../../docs/archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md).

The fixed Samsung SDK 1.39.4.7 now compiles through authorized Rosetta 2. `build/native` contains actual JS/WASM/public CA data; `npm run package:native` verifies provenance/license hashes and stages the separate unsigned internal candidate in `dist/probe-native`. Upstream license/notice files are preserved in `licenses/`; original MIT does not relicense them. Native desktop tests verify initialization, UI responsiveness, timeout and stop/restart, not TV sockets/TLS. The final authenticated networking dependency/security decision remains open.

`src/probe-http.h` adds an original short-lived, fixed `/report` LAN diagnostic endpoint (120 seconds, bounded clients/headers/report, no proxy). It returns only schema-checked nonsecret results; TV addresses are transient display-only state. Host socket tests pass; 0.0.3 is installed, phone transfer and device cleanup remain unverified. User-observed 0.0.2 native PASS covers five synthetic/guest cases only.

0.0.5 exact source-matched TV report proves guest/synthetic native cases and foreground LAN transfer/close. 0.0.6 embeds original synthetic DASH assets in MEMFS and adds a loopback-only fixed-file MPD probe server; actual AVPlay frames/audio/control remain device gates. No general-purpose file/URL server is introduced.

0.0.15's exact-device report confirms guest view/playurl and two bounded CDN ranges. 0.0.16 adds `probe-bridge.h`: tokenized loopback MPD and two fixed tracks, cURL multi with bounded pause/resume buffering, scoped destinations/TLS, no credential forwarding and closure-before-ACK. `npm run test:native:bridge` compiles a separate HTTP fixture branch only for host tests; normal Samsung builds never define that guard. Actual TV AVPlay results remain separate device evidence. Current product scope is ADR-003 (comments/replies/danmaku view-only).

0.0.51 adds original `probe-session.h` and a separate session Worker: nine serial, nonce-scoped HTTP exchanges only inside TV loopback prove synthetic response-header/Set-Cookie access, two cookie jars, disabled redirect following, clearing one jar without changing the other, and closure. `npm run test:native:session` uses real HOST cURL/loopback, never account data. No external URL/credential input, TLS bypass, PC server, or product account claim. See ADR-012; explicit auto7 runs once and exposes the redacted report; default remains manual. Native source manifests now cover nine C inputs and verify the new stop export.


## 来自 `tools/README.md`

以下各行按原文保存：

Build/type/test/unsigned packaging tools are executable. `build.mjs` bundles only original local probe resources and records source hashes; `package.py` creates a deterministic unsigned WGT; `verify-package.py` checks package identity/entry/hash and private-file boundaries. `native-probe.py` separately checks C syntax or invokes an explicit Samsung compiler with a CA bundle. No command implicitly signs, installs, connects a TV or publishes.

These tools run on the development computer. Shipped local probe resources need no dev server; actual installation/independent cold-start acceptance is still unverified. See docs/DEVELOPMENT.md and docs/archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md.

`python3 tools/sign-probe.py basic` (or `native`) explicitly uses the user's BiliSofa profile and writes signed packages/logs outside the repository. It rejects the SDK default Distributor, expired/not-yet-valid embedded certificates, non-Samsung leaf issuers and altered packaged resources. It does not change profiles, accept passwords, install or run a package. Certificate date/issuer checks do not establish chain trust; the TV must accept the signature separately.

`media-probe.py generate/check` prepares/checks original synthetic media with host ffmpeg/ffprobe, no downloads/accounts/deployment. `collect-probe.py collect` explicitly reads the single private authorized target fixed diagnostic route, without proxy/redirect, with bounds and the shared TS schema + expected source match; it is never an account/network proxy. Internal `BILISOFA_PROBE_AUTORUN=1` only enables one guest/synthetic run at startup (0.0.9 also writes/reads/removes one owned nonsecret KeyManager value); default build remains manual, mode is verified in package metadata. Native packaging checks exact CA/media data layout and embedded fixture provenance.

`initials-data.py` checks the pinned AOSP dictionary/notice and derives local search-word data (no downloads in build). Basic/native packaging and signing reject data/notice/provenance mismatches. Search word queries run in a separate local Worker; no Bilibili search request, comment/danmaku authoring or credential operation is added.

`npm run test:native:cast-source`：HOST mock-cURL策略、512byte范围回调、TLS/redirect选项与取消/未知清理的13项测试（含候选确认、私有转移与失效），不访问网络，不是TV/CDN证明。0.0.25 native源码校验覆盖新增probe-cast-source.h在内的八个C文件；修改任何一个须实际SDK重编译。

0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。


## 来自 `tests/archive/README.md`

该文件随 `tests/archive/` 一起删除（2026-10-26 代码清理），以下各行按原文保存：

# 归档的测试套件

此目录下的测试不再随产品构建运行，内容原样保留，只改了导入路径与`tests/`文件路径，使其指向新位置。当前运行的合成UI见`playwright.app.config.ts`（`npm run test:ui:app`，对`dist/bilisofa-app`）。

| 套件 | 归档日期 | 原因 |

| --- | --- | --- |

| `product-collections-ui` | 2026-10-23（K4） | 按0.33.0关注/已追番剧入口布局编写；0.45.0起页面已改为整页详情、货架与“番剧影视”，对0.48.0及以后的构建全部失败，覆盖已由`product-polish-ui`、`product-season-ui`、`product-profiles-ui`等套件取代 |

| W02–W06与早期产品套件（`cast-app-ui`、`catalog-ui`、`favorites-ui`、`follow-updates-ui`、`history-ui`、`identity-ui`、`library-ui`、`local-app-ui`、`local-data-ui`、`media-ui`、`queue-ui`、`queue-parts-ui`、`recommend-ui`、`search-ui`、`w04-media-ui`、`w05-product-ui`、`w06-cast-ui`、`product-ui`、`product-library-ui`、`product-discovery-ui`、`product-player-ui`、`product-actions-ui`、`product-interactions-ui`、`product-browse-ui`、`product-instant-ui`、`product-stream-ui`、`product-recovery-ui`、`product-acceptance-fix-ui`、`product-remote-ui`的旧规格，以及`product-cast-*-ui`中的`recovery`/`settings`规格和重复副本） | 2026-10-24（版本链收敛） | 逐个规格文件对冻结0.51.3运行（每例30秒）：均失败，原因是它们等待已被取代的旧首页网格、旧面板或旧设置页。对0.51.3全部通过的套件与规格保留，并在单一构建0.52.0上结果相同；仍被保留套件引用的fixture留在原目录 |

这些规格对应的冻结构建目录已在本机清理；如需复核，须先从对应提交重建那一版的构建。

