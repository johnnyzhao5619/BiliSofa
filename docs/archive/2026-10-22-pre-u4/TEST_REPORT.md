# 测试报告

## 连续浏览与投屏优化（0.35.0，已部署/USER待验）

284模块检查、632单元合同、8项新组合UI＋13项保留播放器/设置UI、6项新包负例通过；242源码输入/27界面文件已配对，0.28–0.34的189冻结文件未变。覆盖首页空态焦点、连续加载/前后窗口/失败保留、搜索/本机/关注列表、有效BV播放、队列更多/换P与投屏状态切换。初次焦点回抢、加载时序及旧四卡/匿名夹具断言已修正，失败日志保留；无真实账号POST。

原连接能力查询失败，有界重连一次后state/capability/install/launch明确成功；[本轮证据](../../design/evidence/2026-10-22-browse/README.md)。0.34.0 A–F功能组USER PASS及五项体验缺陷并列保留；新体验/真实BV覆盖/Voice Guide/性能待用户，U4/U5不自动关闭。

## U2设置/账号与U3播放器（0.34.0，已部署/USER待验）

280模块strict/边界、631单元合同、79相关合成UI通过；其中本轮13、片库9、搜索8、关注9、壳层6、保留媒体13、叠加评论14、投屏7。6项新包负例通过，0.28–0.33的162个冻结文件及manifest核对未变。详情见[本轮证据](../../design/evidence/2026-10-21-u3/README.md)。

时间轴先预览后确认、更多四列方向图、隐藏/唤回、自然结束重播、PGC/阅读原卡返回、手机控制权及设置/账号保护均由生产UI＋合成边界验证。首次投屏结束回调缺陷已修复；旧暂停互动套件误选后停止，改跑保留阅读项，不能把停止的套件计为通过。原生17模块/68项资源沿用，未声称重做网络/decoder/HDR验证。

自有profile签名；原连接失效后有界重连一次，平台state/capability/install/launch明确成功。无真实账号POST、卸载、数据清空、commit/push或发布。新UI、声画、TV封面/CORS、Voice Guide、升级后数据保持及性能仍待用户/最终矩阵；[有限清单](../../CURRENT_DEVICE_TEST.md)待测，不记USER PASS。以下均为对应历史版本的证据。

## U2关注与已追番剧（0.33.0，未部署）

275模块strict/依赖边界、631单元/合同、32项合成UI通过（新模块9、搜索8、片库9、壳层6），见[ADR-075](../../adr/075-following-and-pgc-product-browse.md)及[截图/构建身份](../../design/evidence/2026-10-21-u2-following/README.md)。覆盖游客零私人读取、关注摘要与真实列表合同、分类分页、季集播放/原卡返回、取消与身份失效、关闭未知禁用和Home重读。

初次运行暴露的异步原卡未挂载时误落首页导航已修复；私人季/集夹具、游客首页与隐藏控件断言按既有合同校正，原失败日志保留。C/媒体/账号仍为合成边界，无真实追番/其他账号写入。0.28–0.32的135个manifest文件及原manifest SHA均核查未变；新候选未签名/安装，U2账号/设置、完整动态/UP来源及U3–U5保持未完成。

## U2统一搜索（0.32.0，未部署）

274模块strict/依赖边界、631单元/合同、本轮23项合成UI通过：统一搜索8项、片库回归9项、保留壳层6项（旧独立视频搜索用例由新统一搜索取代）。覆盖共用关键词/类型分页、真实Worker合同解析、原卡/播放返回、错误/空结果、取消/快速切换、Home重读及输入弹窗层级。见[ADR-074](../../adr/074-unified-product-search.md)与[截图/构建身份](../../design/evidence/2026-10-21-u2-search/README.md)。

首次运行的Home用例错误地要求跳首页，现按既有恢复原路由行为断言新结果不受旧响应覆盖；历史选择器也已修正，原失败日志保留。截图发现的固定导航遮挡输入层已修复并补可见性检查。C/媒体/响应与账号仍为合成边界，无真实账号POST、新WGT或电视安装；番剧/关注入口、账号/设置和完整设备验收未关闭。0.28–0.31的108个文件及原manifest均校验未变。

## U2继续观看与我的片库（0.31.0，未部署）

272模块strict/依赖边界、631单元/合同、片库9项＋壳层7项＋旧私人列表30项合成UI通过，见[ADR-073](../../adr/073-continuation-and-product-library.md)和[截图/工件配对](../../design/evidence/2026-10-21-u2/README.md)。保留实际P号、本机/云端语义、逐项删除/最近邻、队列顺序/下一项、收藏子层、旧请求取消与同账号Home后游标失效；没有真实账号POST。

初次全量单元复跑有一处旧合成取消测试时序失败，改为等待合成POST阶段事件后全量通过，失败日志保留。C/账号/媒体/图片为合成边界；新UI真机、图床CORS、朗读/远距/性能和U2其余页面仍未完成。0.28/0.29/0.30工件保持冻结，本轮不安装电视包。

## U1大屏壳层开发候选（0.30.0，未部署）

267模块strict/依赖边界、625单元/合同、新壳层7项＋记录10项＋分P队列7项＋媒体22项合成UI通过；11项直播依ADR-068跳过。0.30.0主壳层/首页/视频搜索/详情播放返回与受限图片加载见[ADR-072](../../adr/072-product-shell-and-public-artwork.md)，[截图与工件配对](../../design/evidence/2026-10-21-u1/README.md)。图片/C/媒体使用合成边界，不构成真实图床CORS、电视解码/Voice Guide/远距/性能通过。其余界面与完整U1–U5保持OPEN。

0.28.0/0.29.0冻结构建文件完整性校验保留；无新WGT/签名/安装或真实账号POST。初次焦点缺陷、目录硬编码的Back测试分支、测试服务端口冲突已记录并分别修复或串行重跑；当前日志仅保存最终复跑，不声称留存了每次中间失败工件。

更新：2026-10-21。源码/主机、浏览器、平台安装和用户声画观察分开记录；下表不是完整F模块或v1.0.0通过声明。

## U1内容基础0.29.0（开发构建，未装机）

名称/P标题记录、当前页同身份本机队列补名、直播入口门控及封面安全合同已编码，见[ADR-071](../../adr/071-content-display-foundation.md)。259模块strict/边界、620单元/合同、记录/范围10＋分P队列7＋普通点播/番剧13项合成UI通过。覆盖名称重开/逐P删除/损坏或未来格式/部分失败/旧位置字节、P2生产回调模拟、焦点/Home与无直播入口；不是新TV声画/Voice Guide证据。

构建独立`dist/u1-app`，日志和配对记录在ignored `.local/u1-content/`；旧0.28.0构建manifest与文件hash一致。未执行原生重编译、新WGT/签名/安装、真实账号POST或用户测试；封面加载和产品壳层未完成，不重测已通过的无影响模块。

## F12本机记录与列表缓存管理0.28.0

[ADR-067](../../adr/067-local-bookmarks-and-read-cache.md)实现设置中的逐P记录/删除/仅续播清空，以及当前账号内存列表缓存清理。保留旧数据格式、偏好/队列/搜索/登录/写日志；无账号POST。所请求A–D USER PASS；续播名称仍仅BV的体验问题OPEN。

| 证据层 | 实际结果 | 日志/边界 |
| --- | --- | --- |
| 静态/单元 | 256模块、611项通过 | `.local/local-data-check-final.log`、`local-data-unit-final.log`；新增8项含固定身份/副本/损坏保护、部分删除未确认、缓存重置/取消/实际ACK/晚到/unknown |
| 新模块UI | 7项通过，已查看1920×1080截图 | `local-data-ui-final.log`；生产UI/Worker＋合成native，逐P/分页/Back、取消/删除、重开、部分写/未来数据、缓存保留登录、Home/旧按钮 |
| 关联UI | 队列7项、推荐12项、私人列表/媒体63项通过 | `local-data-queue-ui.log`、`local-data-recommend-ui.log`、`local-data-retained-ui.log`；合成协议/decoder，不作真实账号/直播/性能结论 |
| 原生来源 | 17模块/68文件含CA与冻结0.27.0一致 | `local-data-native-pairing.json`；无新SDK、HOST重跑、依赖或权限 |
| 整包 | 正向来源校验及53项负例通过 | `local-data-package.log`、`local-data-package-negative.log` |
| 签名/电视平台 | 0.28.0自有profile签名，重连一次后四项平台回执成功 | `local-data-sign.log`、`local-data-deploy.log`；首次能力查询关闭/未安装保留于initial日志 |
| 真机USER | 所请求A–D全部通过 | 用户补充仅显示BV的名称问题；清空全部位置未被单独要求/分列，不扩展其覆盖 |

初次静态检查的未用import已移除；初次UI把旧存储昵称误当作已验证身份，修正测试为比较同一实际核对身份后通过。失败日志保留，不把fixture断言问题记作电视故障。旧0.27.0 A–D USER PASS由`w03-270-user-acceptance.json`配对；原ZIP不修改。新源码/包/日志指针为`w05-source-280-latest-archive.json`，电视结果另记。

## F05分P队列整合0.27.0

[ADR-066](../../adr/066-part-aware-local-queue.md)实现普通视频BV＋P队列、云端历史P2入队、当前身份生产源及逐P续播，独立v2普通KV兼容旧首P快照；所请求A–D USER PASS，未分列可选自然结束/历史P2不外推；未执行账号POST。

| 证据层 | 实际结果 | 日志/边界 |
| --- | --- | --- |
| 静态/单元 | 254模块、603项单元/合同通过 | `.local/queue-parts-check-final.log`、`queue-parts-unit-final.log`；新增5项迁移/回退/同BV双P/删除失败/导航锚点，保留双关闭与取消门槛 |
| 新队列生产UI | 7项通过，已检查1920×1080队列截图 | `queue-parts-ui-final.log`；实际生产Worker/解析/媒体层＋合成native/decoder；入队/排序/重开、P2恢复/自然推进/默认停止、Home等待ACK、缺P停止、v1升级、账号历史P2 |
| 关联UI回归 | 私人列表/媒体63项、推荐12项通过 | `queue-parts-retained-ui-final.log`、`queue-parts-recommend-ui.log`；合成数据/本机路由，不代表真实账号写入、直播或设备性能 |
| 原生来源 | 17模块/68文件（含CA）与冻结0.26.1相同 | `queue-parts-native-pairing.json`；无SDK/HOST重跑、新网络依赖或权限 |
| 整包 | 正向来源校验及53项包负例通过 | `queue-parts-package-final.log`、`queue-parts-package-negative.log`；负例恢复后不改包内容 |
| 签名/电视平台 | 0.27.0自有profile签名，state/capability/install/launch均成功 | `queue-parts-sign.log`、`queue-parts-deploy.log`；无重连；队列所请求A–D USER PASS；可选分支未分列不外推 |

初次UI发现含冒号的队列标识不满足返回锚点合同、详情打不开，修正安全标识后重跑通过；旧历史测试的“P2必须禁用”和存储版本断言已按新合同更新，非电视故障。失败日志保留。真机不复用首P/普通播放页P2结果冒充队列整合；新包/源码/平台结果见部署记录与独立`w03-source-270-latest-archive.json`。

## F02首读恢复0.26.1

0.26.0首次`recommend.transport_28`为USER FAIL，手动刷新成功，其他所请求列表/翻页刷新/声画Back为USER PASS；仓库外`w03-recommend-260-user-observation.json`配对原冻结包。单凭码28不能确定网络根因。0.26.1仅增加确认关闭后的一次安全GET重试，不重做整组。

| 证据层 | 实际结果 | 边界/日志 |
| --- | --- | --- |
| 静态/单元 | 254模块、598项通过 | `.local/recommend-261-check.log`、`recommend-261-unit-final.log`；新增两项含同批只重试一次、连续超时停止、取消/账号关闭后不建新Worker |
| 生产浏览器 | 推荐12项通过 | `.local/recommend-261-ui-final.log`；新增真实生产Worker的超时恢复/两次后停止；合成native，不是电视网络证明 |
| 原生来源 | 17模块/51文件与0.26.0完全一致 | `recommend-261-native-pairing.json`；复用原HOST 6项/SDK及保留媒体/叠加/投屏证据，本轮未重跑这些旧检查 |
| 整包 | 正向校验和53项负例通过 | `recommend-261-package.log`、`recommend-261-package-negative.log` |
| 签名/电视平台 | 自有profile签名，state/capability/install/launch均成功 | `recommend-261-sign.log`、`recommend-261-deploy.log`；无重连/真实账号POST |
| 电视补验 | 单次首读USER PASS，原话“首读成功” | 仓库外`w03-recommend-261-user-acceptance.json`配对；未采集重试次数，不能证明电视触发过重试或网络根因已解决 |

当前来源/包配对见仓库外`w03-source-261-latest-archive.json`；原0.26.0失败及通过证据不覆盖。HTTP/API拒绝、匿名/身份/格式错误与未知关闭不自动重试；关闭确认和取消约束保持。

## F02账号视频推荐0.26.0

[ADR-065](../../adr/065-account-recommendation-read.md)完整读模块已实现，0.26.0自有签名安装启动；用户报告首次`recommend.transport_28`、手动刷新成功，其余所请求列表/翻页刷新/声画Back通过。网络根因未确认。游客热门/榜单独立，账号nav和推荐mid均需匹配，不用匿名结果冒充个性化；账号互动仍暂缓。

| 证据层 | 结果 | 边界/日志 |
| --- | --- | --- |
| 静态/单元 | 254模块、596项单元/合同通过 | `.local/recommend-check.log`、`recommend-unit-final.log`；新增7项含来源/身份/DTO、快照分页/去重/有限窗口、刷新与账号关闭 |
| 生产浏览器 | 新推荐10项、保留投屏7项、评论/叠加14项、媒体33项通过 | `.local/recommend-ui-final.log`、`recommend-cast-ui.log`、`recommend-retained-ui.log`、`recommend-media-ui.log`；生产UI/Worker＋合成native/decoder，播放Back/身份丢失/匿名拒绝/切账号/Home/未知关闭；已查看1920×1080合成布局截图 |
| 原生HOST | 独立推荐C/真实localhost TLS 6项通过 | `.local/recommend-host-final.log`；同合成jar两GET/WBI签名与固定参数、继续/刷新、输入/无终止符/头/正文边界、TLS/重定向、取消/期限、未知关闭 |
| SDK/来源 | 仅新recommend链接；原10个W04/W05/W06模块manifest和字节一致 | `.local/recommend-link.log`、`recommend-native-pairing.json`；固定curl/OpenSSL/CA，无新依赖 |
| 整包 | 正向校验及53项包负例通过 | `.local/recommend-package.log`、`recommend-package-negative.log`；新增推荐固定路由/CA、账号/评论禁写；早期禁写遗漏与负例失败保留，已补门禁并重跑 |
| 主机API | 当前官方首页JS路由/普通参数，匿名HTTP200/API0/12条 | [一手核查](../../research/2026-10-21-account-recommendations.md)，不代表本人账号或电视结果 |
| 电视平台 | state/capability/install/launch均exit0且明确成功 | `.local/recommend-sign.log`、`recommend-deploy.log`；未执行真实账号POST，未重启直播/云进度测试 |

初次UI检查发现具体HTTP/API码在账号协调器丢失，已只保留白名单细分码后重跑；早期HOST未知关闭注入位置错误也已纠正。初始日志保留，不把fixture错误说成TV故障。签名/源码配对见包记录及仓库外`w03-source-260-latest-archive.json`，真机清单见[当前验收](../../CURRENT_DEVICE_TEST.md)。完整F02分区阻塞、F04缺口、W05暂停项及W06/W07完整矩阵保持OPEN。

## W06冻结候选0.25.0

F20非直播前台产品接收模块见ADR-064；A–D所请求组USER PASS；三端/内容剩余矩阵OPEN，清单见[当前验收](../../CURRENT_DEVICE_TEST.md)。W05本人互动状态读取USER FAIL（原报`interaction.invailid`），版本引用有歧义、无底层根因；用户要求暂缓，按ADR-063保留，不把取消预览/真实POST记为通过。

| 证据层 | 实际结果 | 边界/配对日志 |
| --- | --- | --- |
| 静态/单元 | 249模块、589项单元/合同通过 | `.local/w06-check.log`、`w06-unit-final.log`；含>5分钟、>24控制、宽代次/帧/RPC、真实到期刷新、初始化超时、取消/双关闭 |
| 生产浏览器 | 新投屏7项、保留评论/叠加14项、媒体33项通过 | `.local/w06-ui-final.log`、`w06-retained-ui.log`、`w06-media-ui.log`；生产TS/Worker＋合成native/decoder，连续7源/26控制、双端时间、旧端拒绝/新端接管、取消、手动重开、Home及未知关闭；没有真实B站POST。图层布局定向1项通过并检查截图，浏览器缺原生视频插件不是TV声画证据 |
| 产品原生HOST | 生成产品头/真实固定TLS库7项通过 | `.local/w06-host-final.log`；601秒后监听、旧累计阈值后实际匿名Range、逐源关闭到第8代、每请求重连限额、到期、TLS/重定向/Range/目的地/正文边界；只有localhost合成服务 |
| SDK/来源 | 仅新cast-product链接通过；原9个W04/W05模块manifest/字节与冻结0.24.1一致 | `.local/w06-native-link-final.log`、`w06-native-pairing.json`；原探针输入hash保持，不重链旧探针或升级依赖 |
| 整包 | 正向来源/权限/CSP/CA重读、50项包负例通过 | `.local/w06-package-final.log`、`w06-package-negative.log`；新增产品身份、配额策略、CA和禁止账号/评论POST检查 |
| 签名/平台 | 0.25.0自有profile签名，state/capability/install/launch均成功 | `.local/w06-sign.log`、`w06-deploy.log`；首次能力查询未确认，原地址断开/重连一次后重新部署通过；不将它说成电视声画或网络根因修复 |

精确hash见[包记录](../../SIGNING_DEVICE_RECORD.md)，源码/日志/包由仓库外`w06-source-250-latest-archive.json`配对。旧0.23.0/0.24.0/0.24.1冻结源码与签名包hash核对保持；本轮未执行真实账号POST、直播请求、Git提交或发布。0.25.0本轮A–D所请求组已获USER PASS，由仓库外`w06-250-user-acceptance.json`配对；发送端补充为iPhone、版本未新报，三端/内容及W07完整矩阵仍OPEN。旧三端/UGC/分P/PGC证据不自动升级为本产品包PASS。

## W04收口与W05冻结证据

W04按[ADR-058](../../adr/058-w04-closure-and-w05-start.md)工程阶段收口，不是全项PASS。E/HDR/未覆盖样本移交W07最终候选，真实追番写回移交W05账号互动；直播维持ADR-057延期。原0.21.4包/源码ZIP不变，阶段归档由仓库外`w04-closure-latest.json`定位。

W05叠加模块0.22.0 A–D、0.22.1滚动/控制层所请求补验均获USER PASS，分别由仓库外`w05-220-user-acceptance.json`、`w05-221-user-acceptance.json`配对冻结源码/包；不扩展为全语言、完整性能或Voice Guide通过。

0.24.0在最终归档时发现诊断版本字面量类型未同步，静态门禁FAIL；原源码/签名包和失败日志由`w05-source-240-latest-archive.json`保持。0.24.1同步声明并在关闭时释放互动lane的私有会话引用；下表对应修正后实际重跑，不将类型错误说成运行时或电视故障。

冻结0.24.1 F11/F14完整互动模块见[ADR-062](../../adr/062-explicit-video-interactions.md)。**未执行真实账号POST**，本人读取失败并按用户要求暂缓；真实写入未验收。

| 证据层 | 结果 | 边界/日志 |
| --- | --- | --- |
| 静态/单元 | 249模块、583项单元/合同通过 | `.local/w05-interactions-check-final.log`、`w05-interactions-unit-final.log`；新增18项，含一次token、精确夹/数量、旧日志保护、部分三连、未知投币重开锁定、悄悄关注取消、Home/代次/关闭 |
| 生产浏览器 | 账号互动7项、旧评论/叠加14项通过；保留媒体33项通过 | `.local/w05-interactions-product-ui-final.log`、`w05-interactions-legacy-ui-final.log`；生产TS/Worker＋合成C/decoder，无真实账号/POST；包含明确预览、双向增删、三连部分成功、Back/Home/换源、焦点恢复；不作完整性能结论 |
| 新原生HOST | video-interactions C/TLS 6项通过 | `.local/w05-interactions-host-final.log`；真实localhost TLS、全部固定GET/POST、双向/数量/act4、GET方法复位、TLS/重定向/输入/取消/未知关闭/不重发；仅合成账号 |
| 原生来源 | 新互动模块Samsung SDK链接通过；原8模块字节/manifest复用 | `.local/w05-interactions-native-link-final.log`、`w05-interactions-native-pairing.json`；不是TV/账号证明 |
| 整包 | 正向重读＋46项包负例通过 | `.local/w05-interactions-package-final.log`、`w05-interactions-package-negative-final.log`；精确来源/权限/CA/固定路由/数量及独立只读lane拒绝写入 |
| 主机协议 | 官方网页当前路由/字段静态核查；匿名稍后再看HTTP200/API-101 | [协议记录](../../research/2026-10-20-video-interactions.md)；匿名详情HTTP未获可用结果，不假称本人字段或真实写入已通过 |
| 电视 | 0.24.1自有签名及state/capability/install/launch全部成功 | 精确hash见[包记录](../../SIGNING_DEVICE_RECORD.md)；平台回执不升级为界面/账号/真实写入通过 |

已冻结0.23.0完整只读评论/回复模块见[ADR-061](../../adr/061-owned-readonly-comments.md)，实际结果：

| 证据层 | 结果 | 日志/边界 |
| --- | --- | --- |
| 静态/单元 | 239模块、565项通过 | `.local/w05-comments-check-final.log`、`w05-comments-unit-final.log`；新增8项覆盖源身份/ID/分页/正文、缓存四卡/游标/回复、取消及未知关闭 |
| 生产浏览器 | 评论7项＋叠加7项、原媒体33项通过 | `.local/w05-comments-product-ui-final.log`、`w05-comments-legacy-ui-final.log`；生产TS/Worker＋合成C/decoder，含全文滚动、回复分批、手动恢复、播放不中断、换源关闭阅读树、Home等待可选ACK时300ms内停解码器 |
| 新模块HOST | 评论C/TLS 8项通过 | `.local/w05-comments-host-final.log`；真实本机TLS/C、签名与排序、20位root字符串、页数/URL注入拒绝、TLS/重定向/正文/取消/关闭未知；仅合成账号 |
| 原生链接 | comments-read新SDK链接；原7模块字节/manifest保持 | `.local/w05-comments-native-link.log`、`w05-comments-native-pairing.json`；原模块HOST未重跑，不冒称SDK编译代表TV运行 |
| 整包 | 正向重读＋43项负例通过 | `.local/w05-comments-package-positive.log`、`w05-comments-package-negative-final.log`；新增真实评论路由/CA/写接口拒绝；共享C不可调用媒体分支仍含旧只读URL字符串，门禁按实际固定操作与写路由验证，见ADR-061 |
| 真实主机API | 热门/最新各21条（置顶去重），回复8条；热门下一源页API0/20条 | [官方协议证据](../../research/2026-10-20-comments-read.md)，原文/正文仓库外；不代表电视或私人身份 |
| 真机 | 0.23.0所请求列表排序分页/全文回复Back/播放与Home集中组USER PASS | 平台安装与具体源码/包hash见[包记录](../../SIGNING_DEVICE_RECORD.md)，USER结果配对`w05-230-user-acceptance.json`；不扩展为完整性能/无障碍矩阵 |

当前源码/日志配对`.local/w05-comments-local-evidence.json`，冻结指针`w05-source-230-latest-archive.json`。旧0.22.0/0.22.1源码包、签名包与原失败/修复日志保持；原官方叠加源/主机证据由`w05-primary-latest.json`定位。直播仅保留原本地合成回归，不新增直播网络请求或用户配合。

## 冻结W04证据

| 对象 | 实际结果 | 证据边界 |
| --- | --- | --- |
| 0.21.4用户直播 | `live.network.source.manifest_h0_c28_n2`，实播仍失败 | 第2个CDN清单HTTP0/cURL28；source阶段尚未打开解码器，网络/服务端根因未唯一确定；用户按ADR-057批准延期 |
| 本轮图层复核 | 2项定向浏览器检查通过；播放态对象可见、父面板隐藏、画面区域命中对象；同码失败解码器打开0次 | 当前测试源码＋冻结0.21.4 UI/生产TS Worker＋合成native/decoder；不是新整包回归或真实直播图层通过，无运行时改动/构建/部署 |
| 0.21.4平台部署 | 自有profile签名，state/capability/install/launch均成功 | 无需重连；仅平台回执，直播声画仍未通过 |
| 0.21.4源码 | 静态218模块、单元/合同528项通过 | CDN候选/查询字节、阶段DTO、耗尽不重复启动；不代替TV |
| 0.21.4浏览器 | W04构建及33项通过，旧媒体16项通过 | 生产TS/Worker/私密端口＋合成native/decoder，覆盖首节点失败/耗尽/TLS拒绝/Back及登录包装 |
| 0.21.4整包 | 37项打包负例、unsigned重读校验通过 | 权限/模块/CA/路由/来源等门禁，签名/设备另外记录 |
| 直播HOST | 11项通过，新增同运行时匿名引擎真实关闭再启动 | 生产C＋本机TLS，不是电视网络/解码；旧其余39项HOST与6SDK按原字节复用，旧relay4项未重跑 |
| 公开直播主机读取 | 官方API200/API0；两CDN DNS/TCP/TLS正常，清单HTTP无响应超时 | 改分隔符/Referer/HTTP2/通用UA仍未解除；不同于电视诊断，不唯一归因 |
| 0.21.3用户点播 | 标称4K 3108×2160/25.253fps声画正常；下一条自动切1080P高码率1920×1080/24fps并正常播放 | USER PASS，保留原读数；独立decoder尺寸/编码及HDR未采集 |
| 0.21.3用户直播 | 仅控制条，准备/重试后`live.network.source` | USER FAIL，旧码不足以区分API和CDN阶段，未复测点播 |
| 0.21.2用户反馈 | 1920×1080 AVC提示附近仍不能播放；要求取消验证范围限制、改运行时回退 | 没有prepare诊断码，不能记为1080P硬件失败；冻结包与用户记录保留 |
| 0.21.1用户结果 | A–C及D关注/分区所请求项目通过；D直播两间失败、只有控制条、`live.unsupported`；另报跨内容轨道不回退 | 无原直播房间/原轨道组合和错误码，不能唯一归因；E、恢复/消息及无样本分支不推断通过；C不含账号写授权 |
| 0.21.1权限修复 | 普通视频可正常起播，声画正常；state/capability/install/launch成功 | 关闭ProductInfo权限漏项，保持原设备/编码边界 |
| 0.21.0已知失败 | 用户起播前被权限门禁拦截，A–E全部未完成 | 原源码/签名包/失败证据保持，见[根因记录](../../W04_PRODUCTINFO_FIX.md) |
| 已冻结0.20.0 | 435单元/合同、178模块、34相关浏览器、25打包负例；用户本人资料/等级/会员与Back通过 | 原版本的检查和最小人工组；不是当前源码的媒体验收 |

当前配对日志`.local/w04-214-check-final.log`、`w04-214-unit-final.log`、`w04-214-ui-final.log`、`w04-214-legacy-ui.log`、`w04-214-package-negative.log`及`w04-214-live-host.log`；源码/日志/UI/原生/unsigned配对为`.local/w04-local-evidence.json`。初次编辑/检查失败保留；后续完整命令通过。

`.local/w04-214-live-primary.log`、`w04-214-cdn-alternates.log`、`w04-214-connectivity.log`及各HTTP对照是匿名主机证据；原始数据仓库外`w04-live-214-latest.json`。公开样本HTTP阻塞不能当本电视唯一根因，策略/上限见[ADR-056](../../adr/056-live-cdn-startup-and-evidence.md)。

用户观察按冻结包配对：`w04-211-user-acceptance-abc.json`、`w04-212-user-observation.json`、`w04-213-user-observation.json`、`w04-214-user-observation.json`均位于仓库外。后者单独配对原0.21.4包/源码ZIP，不改写冻结归档。本轮图层检查日志`.local/w04-214-layer-review-final.log`；初次断言因多元素locator写法失败的日志保留，修正后2项通过，不把测试写法错误当产品故障。A–C/D列表与点播回退通过保留，旧失败/冻结工件不改写。追番仍未提交真实写入；近期消息空样本、分区API-352历史失败不升级通过。

当前签名/部署/源码包hash见[签名部署](../../SIGNING_DEVICE_RECORD.md)；当前剩余项以[W04收尾表](../../W04_DEVICE_ACCEPTANCE.md)为准；直播已停止本轮测试，不以本地检查代替结果。

## 可复用验收

| 范围 | 已有证据 | 保留缺口 |
| --- | --- | --- |
| W01运行时/存储/网络 | 自有签名安装、Worker/WASM/socket、TLS正负例、cookie隔离、KeyManager、独立运行等分项 | 不证明所有运行场景或硬件加密/原子覆盖 |
| 输入/无障碍 | 首字母候选/方向/Back、Voice Guide焦点最小组 | 全产品页面与最终UI矩阵 |
| W03内容/账号 | 搜索、榜单、只读私人列表、队列、账号资料各最小组 | 空/分页分支、真实过期/双账号、接口阻塞项 |
| 媒体/投屏 | 所测UGC/PGC/live、1→2→1倍、官方三端控制及关电脑投屏分项 | 全内容、连续/快速切换、高画质、完整故障/长播 |

精确W01工件配对见[证据索引](../../W01_EVIDENCE_INDEX.md)；版本交付页保留各自源码/包/人工结果，不能跨版本借用未验证结果。

## 未关闭项

- F06跨内容回退已有用户通过；F18实播/消息/恢复按ADR-057延期。W04-E/F19/样本缺证已交W07，F17真实追番写回已交W05；状态仍OPEN，不因阶段归档改PASS。
- F18真实公开规范化为10推荐、12父/453子分区，实际样本为720P AVC/AAC；近期消息为空；分区列表新鲜WBI签名仍API-352，未解除。见[ADR-053](../../adr/053-product-live-read-and-serial-relay.md)。
- 云进度两次一次性授权已消耗，目标未确认且用户要求跳过；禁止为测试通过重发。
- 分区/UP API-352、完整动态HTTP412；旧全局联网故障根因未确认。
- 真实双账号、完整会话失效/恢复及最终设备矩阵；1080P高码率/标称4K最小声画观察已通过，HDR/独立decoder仍缺证。
- W07的30条视频、两小时混合、故障/休眠、升级回退及量化性能；GitHub CI未执行。

过程日志见[历史归档](../2026-10-19-process-records/README.md)。后续仅更新证据表、失败/阻塞和验收结论。
