# 2026-10-23 文档治理移出的陈旧内容

以下内容逐字搬运自治理前版本（含当时未提交的0.47.2更新），不再维护。当前结论见[当前实施状态](../../IMPLEMENTATION_STATUS.md)、[收口台账](../../PRODUCT_CLOSURE.md)、[签名与部署记录](../../SIGNING_DEVICE_RECORD.md)和[测试报告](../../TEST_REPORT.md)。

## `docs/IMPLEMENTATION_STATUS.md`

更新：2026-10-22。**用户最新要求：先不部署，转文档更新及第三方独立验收。**[独立验收任务](THIRD_PARTY_ACCEPTANCE_PROMPT.md) · [唯一收口台账](PRODUCT_CLOSURE.md)。完整v1.0.0仍未完成。[第三方验收](acceptance/third-party/2026-10-22T213335-0400/REPORT.md)之后，用户授权按建议实施：[ADR-087](adr/087-third-party-acceptance-fixes.md)修正F11日志上限、评论回复层级、R07倍速判定及默认画质，源码/本地692项通过；**未构建、未部署**。

## 区分两个验收对象

| 已安装0.47.2 | [ADR-094](adr/094-search-course-rows-and-ai-subtitle-files.md)：视频搜索跳过混入的课程行（常见短词不再整页失败）、选词后焦点留在“搜索”键直到结果到达；AI字幕无扩展名地址可读、单条轨道不合规不再让整个列表失败（TS与原生`overlay-read`同改，新目录链接，冻结build不变）；本地301模块/703单元/原生8/17合成UI（新5条对冻结0.47.1全部失败）/回归29条/8包负例通过；签名`c602062d…1efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`2199303c…fbae`，**设备复验待用户S1/S3**（[证据](design/evidence/2026-10-23-reading-fix2/README.md)） | [ADR-094](adr/094-search-course-rows-and-ai-subtitle-files.md) |

| 0.47.1（前一安装版） | 0.47.0真机S1/S3/S5的根因修正：搜索右栏左边缘显式回键盘、结果四列与方向图一致、键盘新增“搜索”键；“字幕”只开字幕设置并显示字幕状态，“弹幕设置”从⚙进入；⚙列表单列上下互通。仅前端；本地301模块/701单元/12合成UI（新5条对冻结0.47.0全部失败）/回归29条/8包负例通过；签名`b9786074…5284`（证书预检PASS，权限与0.47.0相同）；首次SDB能力确认超时、重连未连上；用户确认电视开机并处于开发者模式后，重启本机SDB服务再连接，**第二次升级安装/启动platformSuccess（不清数据）**；源码归档`345e5979…dda1`，**用户复验：S5 USER PASS；S1 FAIL（常见两字词搜不到、选词后焦点）；S3 FAIL（overlay.permission）；根因与修正见ADR-094/0.47.2**（[证据](design/evidence/2026-10-23-reading-fix/README.md)） | [ADR-092](adr/092-one-page-search-and-single-column-comments.md) · [ADR-093](adr/093-overlay-stepping-resume-after-home-and-continuous-preference.md) |

| 0.47.0（前一安装版） | ADR-092/093第三批：一页式搜索、单列评论、设置调值、Home返回续看、连播偏好持久化；原生与权限不变；本地301模块/701单元/7合成UI（另回归29条）/8包负例通过；已签名并升级安装/启动（平台确认），**用户S2/S4/S6 USER PASS；S5连播记忆PASS但⚙“循环”上移FAIL；S1、S3 FAIL**（[证据](design/evidence/2026-10-23-reading/README.md)） | [ADR-092](adr/092-one-page-search-and-single-column-comments.md) · [ADR-093](adr/093-overlay-stepping-resume-after-home-and-continuous-preference.md) |

| 0.46.0（前一安装版） | ADR-090/091第二批2A：主行图标与⚙侧栏、弹幕一键开关、长按加速、同一视频连播倒计时、首页货架、焦点放大、整页详情与分P；原生模块不变；本地298模块/699单元/18合成UI/8包负例通过；已签名并升级安装/启动（平台确认），**用户所请求P1–P7 USER PASS**（[证据](design/evidence/2026-10-23-polish/README.md)） | [ADR-090](adr/090-player-main-row-settings-and-next-up.md) · [ADR-091](adr/091-home-shelves-and-full-page-detail.md) |

| 0.45.0（前一安装版） | [ADR-088](adr/088-remote-media-keys-and-direct-controls.md)第一批遥控快改：媒体键（新增tv.inputdevice权限）、本机隐藏态直达操作、选单当前项、冗余按钮/默认焦点/文案、续播可达；本地check 294模块、696单元、13合成UI、8包负例通过；已签名并升级安装/启动（平台确认），**用户所请求R1–R6 USER PASS，R7按ADR-089移除**（[证据](design/evidence/2026-10-23-remote/README.md)） | [ADR-088](adr/088-remote-media-keys-and-direct-controls.md) |

| 0.43.0（前一安装版，USER证据来源） | Android所请求首投/非零定位/暂停继续/回0停止、iPhone首投/声画时间/停止，以及F11关注切换恢复、收藏取消/增删恢复、Back/Home均USER PASS；点赞/稍后再看继承已有结果 | [冻结包/源码回执](design/evidence/2026-10-22-cast-clock/receipt.json)、[投屏分项](design/evidence/2026-10-22-cast-clock/USER_ACCEPTANCE.md)、[F11](design/evidence/2026-10-22-cast-clock/F11_ACCEPTANCE_READY.md) |

| 0.44.0（前一安装版） | ADR-087三项修正；仅6个UI输入相对0.43.0变化，原生模块不变，R07适配器不在包内；升级安装/启动获平台确认；**M1回复全文（UGC/番剧楼中楼）与M2默认画质USER PASS**（[用户结果](design/evidence/2026-10-22-acceptance-fix/USER_ACCEPTANCE.md)）；0.43.0既有USER PASS组因相关源码未变而继承 | [回执与本地验证](design/evidence/2026-10-22-acceptance-fix/README.md) |

0.43.0基线：291模块、676单元合同、30合成UI、6包负例；不是当前候选的检查结果。候选当前strict/边界293模块通过；DOM关闭修正前全量687项通过，修正后针对性20项通过，当前全量未重跑。真实桌面MP4台架0.25/0.5/0.75/1×通过；1.25×有效窗口不足中止（退出1），其余三档及真实DASH未执行，无电视小数倍速/人工声音通过。

旧观察进程的应用结束获平台确认；同目标SDB重连后实时能力查询恢复，但随后普通/调试重开超时，**当前前台未确认**。历史安装成功不等于本次重开成功。源相关定位精度及完整F20仍开放。

0.28–0.43工件冻结；当前Git HEAD不代表已部署源码快照。账号/本机数据、旧unknown与全部脏工作区保持。用户转入文档任务后不继续应用开发/测试、签名/安装/启动、Git提交/推送或公开发布；本次没有新增部署或代理真实账号POST。

| F02 推荐/榜单 | 游客热门、全站榜/14项分区入口；本人视频推荐所请求组USER PASS，首次cURL28保留；0.26.1首读补验USER PASS | 动画/舞蹈API-352及其余分区 |

| F03 搜索 | 首字母候选、四类搜索、热搜、历史开关/清空/重开最小组通过 | 最终错误/会话集成矩阵 |

| F06 播放控制 | 0.21.1 A/B所请求控制、轨道、分P/记录/结束策略USER PASS；0.21.3缺4K自动回退1080P高码率播放USER PASS | 小数倍速仅有未集成/未部署候选（ADR-086）；无样本合集/源失效及完整媒体矩阵 |

| F07 续播/接续 | 本地首P及0.27.0所请求P2队列续播组USER PASS | 云进度用户要求跳过；双向接续未完成 |

| F08 弹幕 | 真实读取/绘制/过滤/设置A–D及0.22.1滚动连续性所请求组USER PASS | 完整性能仍未覆盖 |

| F09 字幕 | 真实读取/多行/偏移/语言设置A–D及0.22.1控制层/字幕空间所请求组USER PASS | 完整轨道/语言样本不外推 |

| F10 评论/回复 | 生产WBI/真实游标、热门/最新、全文/楼中楼/四卡分页及播放侧面板；0.23.0所请求集中组USER PASS | 0.43.0回复全文/番剧楼中楼打不开（第三方确认）；0.44.0修正，M1 UGC回复全文与番剧楼中楼USER PASS，收藏夹深路径未单独观察；完整性能/最终产品矩阵交W07 |

## `docs/PRODUCT_CLOSURE.md`

更新：2026-10-22。**0.40.0账号更新A/B/C USER PASS**，0.39.0所请求三组及随后一次点赞通过。0.41.0主动定位/停止等所请求项USER PASS，但进程首投回退FAIL；0.42.0同秒冗余Seek前跳已取证；0.43.0 Android所请求首投/控制组及iPhone首投/声画时间/停止组USER PASS；[回执](design/evidence/2026-10-22-cast-clock/receipt.json)。F11所请求关注/收藏正常路径亦USER PASS。U4/U5及完整门槛继续OPEN。[第三方验收](acceptance/third-party/2026-10-22T213335-0400/REPORT.md)发现的P1-02/P2-01/P1-01/P2-02已按[ADR-087](adr/087-third-party-acceptance-fixes.md)完成源码修正、本地692项通过，并已构建签名0.44.0候选（[证据](design/evidence/2026-10-22-acceptance-fix/README.md)）并升级安装到电视；M1回复全文/M2默认画质USER PASS（[用户结果](design/evidence/2026-10-22-acceptance-fix/USER_ACCEPTANCE.md)），其余门槛不变。0.45.0第一批遥控快改（[ADR-088](adr/088-remote-media-keys-and-direct-controls.md)）已签名并升级安装，所请求R1–R6 USER PASS（R7 Voice Guide按ADR-089非需求移除）；R15仍OPEN。0.46.0第二批（ADR-090/091：播放器主行/⚙侧栏/连播倒计时、首页货架、整页详情）已签名并升级安装，所请求P1–P7 USER PASS；R15整体仍OPEN。0.47.0第三批（ADR-092/093：一页式搜索、单列评论、设置调值、Home返回续看、连播偏好）已签名并升级安装（平台确认），设备验收待用户S1–S6。

**当前执行边界：用户要求先不部署，转文档及[第三方独立验收](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。0.43.0冻结，R07候选未集成/打包/部署，停止进一步应用及设备操作。**

| 不在本次授权 | Git commit/push、GitHub仓库/Release公开发布；不动旧未知写日志，不清除用户已有工作/私人数据 |

| R15 / 全F前端 | 0.34.0整合界面所请求功能组USER PASS；0.36.0承载的连续浏览/焦点/队列/投屏引导及互动只读组USER PASS；0.39.0稳定滚动/封面/简化控制所请求三组USER PASS；0.38.0深列表失败保留；恢复及最终整合OPEN。评论回复全文/番剧楼中楼层级缺陷0.44.0修正，合成UI及M1 USER PASS（ADR-087）；收藏夹深路径未单独观察 | 按[大屏设计](TV_PRODUCT_DESIGN.md)完成所有保留入口映射，遥控可达、焦点/返回/加载失败一致；完整产品化候选通过集中验收，桌面图不替代电视 |

## 本轮实际交付

0.43.0已签名升级启动；291模块/676单元合同/30合成UI/6包负例通过，[工件与边界](design/evidence/2026-10-22-cast-clock/README.md)。播放态非零定位保留原生路径；已在同一新鲜SOAP整数秒时直接幂等完成，不执行无谓Seek。不同秒/小数/paused/旧缓存仍按原合同；0.43 Android所请求组及iPhone首投/声画时间/停止组USER PASS；源相关定位精度与其他发送端/完整矩阵仍OPEN。0.42约64秒由用户主动停止，不记自动故障，也不补记未测控制。F11所请求正常路径已收口；R07仍只有未部署候选及[部分本地证据](design/evidence/2026-10-22-element-candidate/README.md)，用户要求先不部署。其余R项不自动关闭。

## `docs/TEST_REPORT.md`

2026-10-22；用户要求先不部署，转文档及[第三方独立验收](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。以下按验收对象分别记录。

## 已安装0.43.0（冻结基线）

| 层次 | 结果与范围 |
| --- | --- |
| 源码/合同 | 291模块strict/边界、676单元合同通过 |
| 合成UI | 30通过：seek6、同秒幂等4、既有所有权7、账号恢复7、设置6；包含0.41/0.42两条预期旧失败复现，不是30次真实播放 |
| 包/资源 | 6负例通过；249输入/27输出配对，405旧冻结文件、17原生模块/68资源沿用 |
| 平台 | 原0.43.0签名包安装/启动成功；不是随后每次重开均成功 |
| 投屏USER | Android所请求首投/控制组及iPhone首次起播/声画时间/手机停止USER PASS |
| F11 USER | 关注切换/恢复、指定收藏夹取消/增删恢复、Back/Home完整请求组USER PASS；点赞/稍后再看继承旧结果 |
| 自动边界 | 同秒不调用SDK、55秒/回0有事实；精确30秒未录到；61秒/近结束精度仍OPEN。iPhone后段观察超时，Stop只有USER结果 |
| 后续设备状态 | 同目标重连及实时能力查询恢复；结束旧应用进程获平台确认；普通/调试重开超时，当前前台未知。未重装/清数据 |

[工件回执](design/evidence/2026-10-22-cast-clock/receipt.json) · [投屏分项](design/evidence/2026-10-22-cast-clock/USER_ACCEPTANCE.md) · [F11](design/evidence/2026-10-22-cast-clock/F11_ACCEPTANCE_READY.md)。已有USER证据不等于第三方当轮独立复验。

## 第三方验收后的源码修正（ADR-087，未构建/未部署）

| 层次 | 实际结果 |
| --- | --- |
| 第三方当轮 | 修正前check 293模块、全量688/688、冻结0.43.0投屏定位合成UI 10/10；[第三方验收](acceptance/third-party/2026-10-22T213335-0400/REPORT.md) |
| 修正后 | check 293模块退出0；全量692/692退出0（+4回归：F11日志淘汰2、最深回复层级1、默认画质1；倍速8×8矩阵断言改为全对角线） |
| 0.44.0构建后 | 新目录构建/打包/签名；合成UI 12/12（回复全文、默认画质2条＋保留投屏定位10条）；同2条对冻结0.43.0失败作负对照；包负例6/6；冻结dist 802/build 176文件不变；[证据](design/evidence/2026-10-22-acceptance-fix/README.md) |
| 部署 | 升级安装/启动platformSuccess（第2次；第1次capability超时后同目标SDB重连）；设备验收UNVERIFIED |
| 用户 | M1 UGC回复全文/番剧楼中楼、M2冷启动默认画质USER PASS；[用户结果](design/evidence/2026-10-22-acceptance-fix/USER_ACCEPTANCE.md) |
| 未执行 | 0.43.0会写证据目录的20条保留UI规格；F11日志淘汰的UI合成 |

[候选回执/部分结果](design/evidence/2026-10-22-element-candidate/README.md) · [ADR-086](adr/086-fractional-rate-element-candidate.md)。用户转入文档任务后没有追加应用测试或重跑覆盖本次失败。

完整U4/U5、来源、性能/耐久、故障/升级回退及发布仍OPEN。直播/真实双账号排除，F14暂停，云进度跳过且旧unknown不重发；唯一剩余项见[收口台账](PRODUCT_CLOSURE.md)。

## 0.45.0第一批遥控快改（ADR-088，未签名/未部署）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 294模块，退出0 |
| 单元/合同 | 696/696（+4：媒体键映射/注册、文案无代码、默认10秒） |
| 合成UI（`dist/product-remote-app`） | 13/13 |
| 负对照（冻结0.44.0） | 同12条中11条失败（投屏只唤回为不变护栏，两版均通过） |
| 保留规格对0.45.0 | 默认画质＋投屏定位/同秒幂等11条通过；0.44 `reply.spec`因按钮改名失败，已移植到新套件 |
| 包 | 负例8/8（含缺少/多出权限）；未签名WGT `f9192505811bafecdb846f66f7c83ff3eecd7f454f94483071118763428159b4`；冻结dist 832/build 176文件不变 |
| 签名/部署 | 签名`acb95126…580e`；升级安装/启动platformSuccess（一次）；[证据](design/evidence/2026-10-23-remote/README.md) |
| 用户 | R1–R6 USER PASS；R7 Voice Guide按ADR-089非需求移除 |

## 0.46.0第二批2A（ADR-090/091，未签名/未部署）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 298模块，退出0 |
| 单元/合同 | 699/699（+3） |
| 合成UI（`dist/product-polish-app`） | 18/18：主行/⚙侧栏、弹幕开关、加速、连播倒计时三种结果、货架/失败隔离/列记忆、查看更多与Back、焦点放大/减少动画、整页详情与分P；ADR-088移植8项 |
| 负对照（冻结0.45.0） | 18/18失败（多数因无货架入口） |
| 保留 | 投屏只唤回1/1；投屏定位/同秒幂等10/10；0.45套件其余因入口变化失败、已移植 |
| 包 | 负例8/8；未签名WGT `6831517c…fae1`；原生17/68与0.45.0一致；冻结dist 862/build 176不变 |
| 签名/部署 | 签名`13d1f3d6…43bf`；首次SDB未连上，重连后升级安装/启动platformSuccess；[证据](design/evidence/2026-10-23-polish/README.md) |
| 用户 | P1–P7 USER PASS |

## 0.47.1第三批真机反馈修正（ADR-092/093文末，已签名/已部署）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 301模块，退出0 |
| 单元/合同 | 701/701 |
| 合成UI（`dist/product-reading-fix-app`） | 12/12：0.47.0原7条＋新5条（S1结果各行/类型/热搜左移回键盘、“搜索”键；S5⚙“循环”上移到“连播”；S3字幕只开字幕设置并显示状态、弹幕设置从⚙进入、无字幕时说明） |
| 负对照（冻结0.47.0） | 新5条全部失败 |
| 回归 | 0.46.0全套18/18（“字幕”入口一条按构建区分名称，冻结0.46.0上8/8仍过）、投屏只唤回1/1、投屏定位/同秒幂等10/10 |
| 包 | 负例8/8；未签名WGT `1fa9162e…a5d6`；与0.47.0相比只有app.js/style.css/config.xml/build.json变化；冻结dist 922/build不变 |
| 签名/部署 | 签名`b9786074…5284`（证书预检PASS，权限与0.47.0相同）；首次SDB能力确认超时、重连未连上；用户确认电视开机并处于开发者模式后，重启本机SDB服务再连接，**第二次升级安装/启动platformSuccess（不清数据）**；源码归档`345e5979…dda1`；[回执](design/evidence/2026-10-23-reading-fix/receipt.json) |
| 用户复验 | S5 PASS；S1/S3 FAIL → ADR-094（0.47.2） |

## 0.47.0第三批（ADR-092/093；S2/S4/S6 USER PASS，S1/S3/S5见0.47.1）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 301模块，退出0 |
| 单元/合同 | 701/701（+2：续看内存身份绑定、连播独立键） |
| 合成UI（`dist/product-search-reading-app`） | 7/7：选词即搜与焦点、Back顺序与最近搜索、单列评论自动接续、设置调值边界与保留、Home返回续看与无声、正常退出不提供、连播偏好跨刷新 |
| 负对照（冻结0.46.0） | 7条中6条失败（正常退出护栏两版均过） |
| 回归 | 0.46.0全套18/18、投屏只唤回1/1、投屏定位/同秒幂等10/10 |
| 包 | 负例8/8；未签名WGT `2cbe5a54…6dd3`；原生17/68与0.46.0一致；权限不变；冻结dist 892/build 176不变 |
| 签名/部署 | 签名`53a81495…b598`；升级安装/启动platformSuccess（一次）；[证据](design/evidence/2026-10-23-reading/README.md) |
| 未执行 | 真机S1–S6 |

## 0.47.2搜索课程行与AI字幕修正（ADR-094，已签名/已部署）

| 未执行 | 真机复验S1/S3 |

## `docs/SIGNING_DEVICE_RECORD.md`

2026-10-22；用户最新要求先不部署；以下为既有开发侧载记录，非Samsung认证/公开发布。应用ID `BiliSofa01.TV`、自有BiliSofa profile及Author保持。

| 0.47.2搜索课程行与AI字幕修正 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`c602062d…1efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`2199303c…fbae`；设备复验待用户S1/S3；ADR-094；含原生`overlay-read`重链接（`build/overlay-read-subtitle`）；未签名WGT `5487c146dad89d4c60d487e6bc9defd02fb03b87364fbdddffb05cfdf76dd4d6`；[验证](design/evidence/2026-10-23-reading-fix2/README.md) |

原0.43.0安装时state/capability/install/launch明确成功。后续结束旧观察进程获平台确认，普通/调试重新启动超时，当前前台未知。R07候选未集成/打包/签名/部署，不将旧WGT重标为新候选。未卸载、清数据、执行代理账号POST或发布Git。0.28–0.43工件冻结，17原生模块/68资源沿用。签名包、源码快照、证书及原始日志均在仓库外保护目录；公共回执仅含hash与平台结果。

## `docs/CURRENT_DEVICE_TEST.md`

# 当前验收安排

2026-10-22；**用户要求先不部署，先更新文档并交第三方验收。当前没有新的用户设备测试清单。**

0.43.0 Android所请求投屏组、iPhone首次起播/声画时间/停止及F11关注/收藏完整请求组均USER PASS；点赞/稍后再看继承已有结果，不重复这些账号操作。

- [第三方独立验收提示词](THIRD_PARTY_ACCEPTANCE_PROMPT.md)：默认不改应用、不部署、不连接操作电视、不执行真实账号写入；可审源码、证据及安全本地检查。
- [当前实施状态](IMPLEMENTATION_STATUS.md)：区分已安装0.43.0与未集成/未打包/未部署的R07候选。
- [唯一收口台账](PRODUCT_CLOSURE.md)：R03所请求正常路径已收口，其余真实缺口保留。
- [候选失败/未测项](design/evidence/2026-10-22-element-candidate/README.md)：小数倍速未完成，不为纯取证立即发新包。

后续真机操作须根据第三方报告先列一组真正受影响/缺证项目，待用户明确安排。保持现有包/数据，不因文档更新而签名、安装、重开或清理电视；当前前台未知。

## `README.md`

**用户当前要求先不部署，先更新文档并交第三方验收。** 已安装工件为0.43.0：所请求Android/iPhone投屏组与F11关注/收藏组USER PASS，既有点赞/稍后再看和其他已通过组保持；不等于完整产品通过。旧进程结束已确认，后续重新启动超时，当前前台未知。

当前工作区另有R07小数倍速HTML video候选，尚未集成生产、打包、签名或部署。桌面MP4只有前四档通过，1.25×窗口不足中止，其余档位/DASH/电视未验；不能借用0.43.0的设备结果。大屏UI已有实现与分组USER证据，最终整合/性能/恢复及内容来源缺口仍开放。

## `docs/ARCHITECTURE.md`

小数倍速候选按[ADR-086](adr/086-fractional-rate-element-candidate.md)独立开发，尚未接入上述生产架构；原生video的生产DASH、跨后端排他切换与电视证据未完成，不能用当前0.43.0通过替代。当前用户要求先不部署。

## `docs/DEVELOPMENT.md`

> 用户当前要求先不部署，见[第三方验收任务](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。下文构建/签名/安装命令仅作开发参考，不是当前授权。0.28–0.43目录/工件冻结，不直接重建覆盖；R07候选未接生产/打包/部署，不能借用0.43.0的设备结果。

## `docs/DEVICE_CAPABILITIES.md`

| 当前应用 | BiliSofa / BiliSofa01.TV / 0.43.0；原安装启动与所请求投屏/F11组有证据；后续结束进程已确认、重开超时，当前前台未知；用户要求先不部署 |

## `docs/IMPLEMENTATION_PLAN.md`

**当前用户要求先不部署，只更新文档与[第三方验收任务](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。0.43.0所请求投屏/F11组通过，R07为未部署源码候选。以下为保留的实施计划，不是立即执行授权。**

## `docs/RELEASE_CHECKLIST.md`

**当前要求先不部署，先做[第三方验收](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。R07无新包，不得借用0.43.0签名/设备通过。**

## `docs/RELEASE_DRAFT.md`

**当前要求先不部署，先做[第三方验收](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。R07无新包，不得借用0.43.0签名/设备通过。**

## `docs/TV_PRODUCT_DESIGN.md`

2026-10-22：0.39.0所请求浏览/遥控/互动读取组及随后一次点赞、0.40.0账号更新A/B/C USER PASS。0.41.0首次投屏失败已取证；0.42.0同秒冗余Seek前跳已取证；0.43.0按ADR-085修正，Android所请求组、iPhone首投/声画时间/停止及F11关注/收藏组USER PASS，精确平台/工件见[回执](design/evidence/2026-10-22-cast-clock/receipt.json)。U4/U5未完成。当前用户要求先不部署，先进行[第三方验收](THIRD_PARTY_ACCEPTANCE_PROMPT.md)；小数倍速只有未集成候选。

- 一页完成输入、热搜/历史与结果；输入区可展开/收起，结果浏览时让出空间。默认不逐字请求，选词后显式“搜索”。视频/UP/番剧是结果类型，不是三套独立键盘。

## `docs/TV_UI.md`

- 0.46.0（ADR-090/091）：播放器主行图标化、⚙设置侧栏取代“更多”、同一视频连播5秒倒计时、首页货架与整页详情；投屏布局不变。

- 0.47.0（ADR-092/093）：一页式搜索（选词即搜）、单列评论自动接续、弹幕字幕设置左右调值、Home返回后提供“继续观看”（不自动播放）、连播偏好独立键持久化。0.47.1修正真机S1/S3/S5：搜索右栏左边缘显式回到键盘、键盘新增“搜索”键、结果四列；“字幕”只开字幕设置并显示字幕状态，弹幕设置从⚙进入；⚙列表单列上下互通。0.47.2（ADR-094）：视频搜索跳过混入的课程行，选词后焦点在结果到达前留在“搜索”键；AI字幕无扩展名地址可读，单条轨道不合规只跳过该轨。

## `docs/adr/092-one-page-search-and-single-column-comments.md`

2026-10-23；F03/F10/F15、R15/T2/T4、U5。用户确认第三批F1（一页式搜索）与F3（单列评论）。仅在`--product-reading`（0.47.0）构建生效（0.47.1真机反馈修正见文末，`--product-reading-fix`）。状态：**0.47.0已签名并升级安装/启动（平台确认，[证据](../design/evidence/2026-10-23-reading/README.md)）；用户S2/S4/S6 USER PASS；S5连播记忆PASS但⚙“循环”上移FAIL；S1、S3 FAIL。0.47.1修正已签名并升级安装/启动（平台确认，[证据](../design/evidence/2026-10-23-reading-fix/README.md)），用户复验S5 PASS，S1/S3 FAIL，后续修正见[ADR-094](094-search-course-rows-and-ai-subtitle-files.md)（0.47.2）**。

## `docs/adr/093-overlay-stepping-resume-after-home-and-continuous-preference.md`

2026-10-23；F06/F07/F08/F09/F12、R01/R13/R15、U5。用户确认第三批F2（回详情续看）与F4（记住连播）。仅在`--product-reading`（0.47.0）构建生效（0.47.1真机反馈修正见文末，`--product-reading-fix`）。状态：**0.47.0已签名并升级安装/启动（平台确认，[证据](../design/evidence/2026-10-23-reading/README.md)）；用户S2/S4/S6 USER PASS；S5连播记忆PASS但⚙“循环”上移FAIL；S1、S3 FAIL。0.47.1修正已签名并升级安装/启动（平台确认，[证据](../design/evidence/2026-10-23-reading-fix/README.md)），用户复验S5 PASS，S1/S3 FAIL，后续修正见[ADR-094](094-search-course-rows-and-ai-subtitle-files.md)（0.47.2）**。

## `docs/adr/094-search-course-rows-and-ai-subtitle-files.md`

2026-10-23；F03/F07、R15、U5。接0.47.1真机复验：S5 USER PASS；S1、S3 FAIL。仅在`--product-reading-fix2`（0.47.2）构建生效；源码共享部分（搜索解析、字幕地址规则）对之后重建的旧变体同样生效。状态：**0.47.2已签名并升级安装/启动（平台确认，不清数据）；设备复验待用户S1/S3**（[证据](../design/evidence/2026-10-23-reading-fix2/README.md)）。

## `README.md`（第二轮）

[当前状态](docs/IMPLEMENTATION_STATUS.md) · [第三方验收提示词](docs/THIRD_PARTY_ACCEPTANCE_PROMPT.md) · [验收安排](docs/CURRENT_DEVICE_TEST.md) · [分层测试](docs/TEST_REPORT.md) · [签名工件](docs/SIGNING_DEVICE_RECORD.md)

## `docs/ACCEPTANCE.md`（第二轮）

Current execution: [R01–R15 closure register and final T1–T8 grouped checks](PRODUCT_CLOSURE.md), with the [TV product design](TV_PRODUCT_DESIGN.md), under ADR-070. This page retains full-feature gates; it does not create a second independent manual test campaign. Productization has implemented and user-tested groups; full final acceptance remains open. Current user instruction: no deployment; use [independent acceptance task](THIRD_PARTY_ACCEPTANCE_PROMPT.md).

## `docs/IMPLEMENTATION_STATUS.md`（第二轮）

过程记录见[历史归档](archive/2026-10-19-process-records/README.md)；本页只维护当前结论，不追加逐轮日志。

## 链接改写（仅计划文件移入本归档，目标路径变化）

`docs/design/evidence/2026-10-23-remote/README.md`：

2026-10-23；[ADR-088](../../../adr/088-remote-media-keys-and-direct-controls.md) · [回执](receipt.json) · [实施计划](../../../plans/2026-10-23-batch1-remote-quickfix.md)。**已签名并升级安装/启动（平台确认，不清数据）；用户所请求R1–R6 USER PASS，R7按[ADR-089](../../../adr/089-voice-guide-not-required.md)移除。**

`docs/design/evidence/2026-10-23-reading/README.md`：

2026-10-23；[ADR-092](../../../adr/092-one-page-search-and-single-column-comments.md) · [ADR-093](../../../adr/093-overlay-stepping-resume-after-home-and-continuous-preference.md) · [回执](receipt.json) · [计划](../../../plans/2026-10-23-batch3-search-reading-resume.md)。**已签名并升级安装/启动（平台确认，一次成功，不清数据）；设备验收待用户S1–S6。**

`docs/design/evidence/2026-10-23-polish/README.md`：

2026-10-23；[ADR-090](../../../adr/090-player-main-row-settings-and-next-up.md) · [ADR-091](../../../adr/091-home-shelves-and-full-page-detail.md) · [回执](receipt.json) · [计划](../../../plans/2026-10-23-batch2-player-home.md)。**已签名并升级安装/启动（平台确认，不清数据）；用户所请求P1–P7 USER PASS。**

`docs/adr/090-player-main-row-settings-and-next-up.md`：

见[第二批计划](../plans/2026-10-23-batch2-player-home.md)。

`docs/adr/088-remote-media-keys-and-direct-controls.md`：

2026-10-23；F05/F06/F07/F10/F15/F20、R07/R11/R15、U5。依据[0.44.0前端评审](../plans/2026-10-23-batch1-remote-quickfix.md)，用户确认：D1停手1.2秒自动提交，D2停止键退出播放回原卡，D3默认步长10秒。状态：**0.45.0已签名并升级安装/启动（平台确认，[证据](../design/evidence/2026-10-23-remote/README.md)）；R1–R6 USER PASS，R7按ADR-089移除**。

## `docs/DEVELOPMENT.md`

更新：2026-10-21。当前为WGT/Web＋电视内Worker/WASM/AVPlay路线；开发机仅用于构建、签名和安装。build/package不隐式连接设备或发布。

## 产品界面独立开发构建

`npm run build:app:u1`生成`dist/u1-app`（0.29.0开发构建），不覆盖已冻结的`dist/recommend-app`/0.28.0，不生成WGT、不签名/安装。该冻结候选仅含名称/范围与呈现合同，见[ADR-071](adr/071-content-display-foundation.md)。不能用旧`package:app:local-data`命令把此目录说成新包。

`npm run build:app:product-ui`生成独立`dist/product-ui-app`（0.30.0开发候选），新增大屏壳层、首页/视频搜索卡片、详情播放返回及受限公开封面，见[ADR-072](adr/072-product-shell-and-public-artwork.md)。无原生依赖变更、WGT、签名或部署；不能用旧打包命令为此目录套用历史设备通过。`BILISOFA_TEST_ROOT=dist/product-ui-app npm run test:ui:product`只作合成UI证据。`node tools/build-foundation-app.mjs --u1 --verification`输出`dist/u1-regression-app`供共享逻辑回归，不覆盖0.29.0冻结工件。

前一候选使用`npm run build:app:product-library`输出独立`dist/product-library-app`（0.31.0），见[ADR-073](adr/073-continuation-and-product-library.md)。`npm run test:ui:product-library`仅运行合成检查。旧0.28/0.29/0.30目录是冻结工件，不以重建旧命令覆盖；共享逻辑回归用`--u1 --verification`的独立输出，UI配置可由`BILISOFA_PROBE_ROOT`选择。当前无新WGT/签名/安装。

0.32.0源码使用`npm run build:app:product-discovery`输出独立`dist/product-discovery-app`（0.32.0统一搜索），见[ADR-074](adr/074-unified-product-search.md)。`npm run test:ui:product-discovery`检查新模块；`BILISOFA_PROBE_ROOT=dist/product-discovery-app npm run test:ui:product-library`复用片库回归。0.28–0.31工件冻结，后续修改需选择新的独立输出；未集成全部产品页面前不为此构建单独部署。

前一冻结候选使用`npm run build:app:product-collections`输出独立`dist/product-collections-app`（0.33.0），见[ADR-075](adr/075-following-and-pgc-product-browse.md)。`npm run test:ui:product-collections`检查关注/已追番剧；统一搜索与片库配置均可用`BILISOFA_PROBE_ROOT=dist/product-collections-app`选择本轮目录。0.28–0.32工件冻结，不重建覆盖；未生成新WGT，不单独部署此内部候选。

本轮必要检查：`npm run check`、`npm test`；相关UI使用`BILISOFA_PROBE_ROOT=dist/u1-regression-app`运行`playwright.local-data.config.ts`、`playwright.queue-parts.config.ts`；媒体UI另加`BILISOFA_TEST_ROOT=dist/u1-regression-app`，运行`playwright.w04-media.config.ts`中的`playback.spec.ts pgc.spec.ts`。仅为合成检查，完整模块就绪后集中给设备清单。

## 当前稳定浏览/目标控制候选0.39.0

```sh
npm run check
npm test
npm run build:app:product-stream
npm run test:ui:product-stream
python3 tests/native/product-stream-packaging.test.py
python3 tools/sign-foundation-app.py --product-stream
python3 tools/deploy-foundation-app.py --product-stream
```

独立dist/product-stream-app/0.39.0及product-stream私有指针；新UI套件包含适配遥控退出的保留播放器/设置/浏览回归，旧冻结套件不改。UI与会修改stage的包负例串行。封存后不重建旧目录；自动检查无真实账号POST。浏览/资源合同见ADR-081。

## 冻结单击互动/缓存0.38.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-instant
npm run test:ui:product-instant
BILISOFA_PROBE_ROOT=dist/product-instant-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-instant-app npm run test:ui:product-browse
python3 tests/native/product-instant-packaging.test.py
python3 tools/sign-foundation-app.py --product-instant
python3 tools/deploy-foundation-app.py --product-instant
```

独立dist/product-instant-app/0.38.0及product-instant私有指针。UI与修改stage的包负例串行；自动检查无真实账号POST。封存后下轮新目录，不覆盖0.28–0.38。界面单击授权合同见ADR-080，小数后端待实施。

## 冻结控制栏0.37.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-actions
npm run test:ui:product-actions
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-interactions
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-browse
python3 tests/native/product-actions-packaging.test.py
python3 tools/sign-foundation-app.py --product-actions
python3 tools/deploy-foundation-app.py --product-actions
```

输出独立`dist/product-actions-app`/0.37.0及product-actions私有指针。UI与会修改stage的包负例串行；不执行真实账号POST。配对工件冻结后，下轮使用新版本/目录，不覆盖0.28–0.37。小数倍速后端未实现，见ADR-079。

## 冻结U4互动0.36.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-interactions
npm run test:ui:product-interactions
BILISOFA_PROBE_ROOT=dist/product-interactions-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-interactions-app npm run test:ui:product-browse
python3 tests/native/product-interactions-packaging.test.py
python3 tools/sign-foundation-app.py --product-interactions
python3 tools/deploy-foundation-app.py --product-interactions
```

4173 UI套件与会修改stage的包负例串行运行。0.36.0使用独立`dist/product-interactions-app`、unsigned WGT及`*-product-interactions-manifest.json`指针；真实写入不作为自动检查。原生固定GET/POST/CA未重建，F14默认暂停。已配对工件冻结后，下一轮另选版本/目录，不能用旧构建命令覆盖0.28–0.36的工件。实际部署结论以[签名记录](SIGNING_DEVICE_RECORD.md)为准。

## 冻结体验组合0.35.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-browse
npm run test:ui:product-browse
BILISOFA_PROBE_ROOT=dist/product-browse-app npm run test:ui:product-player
python3 tests/native/product-browse-packaging.test.py
python3 tools/sign-foundation-app.py --product-browse
python3 tools/deploy-foundation-app.py --product-browse
```

所有4173 UI服务及修改stage的包负例串行；输出独立`dist/product-browse-app`与`dist/BiliSofa-0.35.0-unsigned.wgt`，使用独立product-browse签名/部署指针。0.28–0.34冻结工件不重建覆盖。原生依赖/权限不变，关注视频目标只改变生产Worker/DTO解析。新签名工件与源码快照在仓库外保护目录，升级不卸载/清数据。[ADR-077](adr/077-continuous-browse-and-cast-refinement.md)及[验收](CURRENT_DEVICE_TEST.md)记录边界。

## 历史U3组合候选0.34.0

本轮用户授权U3完成后部署。使用独立目录，保留0.28–0.33冻结工件：

```sh
npm run check
npm test
npm run build:app:product-player
npm run test:ui:product-player
python3 tests/native/product-player-packaging.test.py
python3 tools/sign-foundation-app.py --product-player
python3 tools/deploy-foundation-app.py --product-player
```

负例会短暂修改并恢复新stage，必须与UI/签名串行。签名工具重验来源后生成`dist/BiliSofa-U3-0.34.0-unsigned.wgt`，自有BiliSofa profile的签名工件和设备记录在仓库外保护目录，独立`*-product-player-manifest.json`指针；不暴露证书/地址。应用ID/Author保持，不卸载、不清数据。当前包配对见[签名记录](SIGNING_DEVICE_RECORD.md)，state/capability/install/launch成功仍不代表用户声画验收。回退先按旧签名包及其源码hash核对身份，平台可能拒绝低版本升级；不要为回退擅自卸载或清数据，需保留失败并另行确定数据安全方案。无自动回退操作。

## `CONTRIBUTING.md`

Candidate probe commands now exist: `npm ci --ignore-scripts`, `npm run check`, `npm test`, `npm run build`, `npm run package`, `npm run test:ui`. See docs/DEVELOPMENT.md for browser setup and the separately blocked Samsung native build. These validate candidates, not a selected final runtime. CI contains actual checking/tests/build/package/UI checks and no private signing/account/device actions; no hosted CI run is claimed before publication.

## `docs/TEST_REPORT.md`（0.48.0安装后移出）

## 已安装0.47.2（ADR-094；含前端第一至三批）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 301模块，退出0 |
| 单元/合同 | 703/703（+2：课程行跳过；AI字幕地址与单轨跳过） |
| 原生 | `overlay-read.test.py` 8/8（新增AI地址接受/拒绝） |
| 合成UI（`dist/product-reading-fix2-app`） | 17/17：0.47.1原12条＋新5条（课程行页正常显示、空/失败时焦点留在“搜索”键×2、AI字幕可读且外域轨道跳过、全部不支持时显示unsupported） |
| 负对照（冻结0.47.1） | 新5条全部失败 |
| 回归 | 0.46.0全套18/18、投屏只唤回1/1、投屏定位/同秒幂等10/10；旧搜索套件30/31（冻结foundation构建的账号移除文案旧期望，已有问题） |
| API（本机匿名，非电视） | 2字/4字关键词均返回4行；含`ketang`行的3页旧解析拒绝、新解析各得3条 |
| 包 | 负例8/8；未签名WGT `5487c146…d4d6`；与0.47.1相比变化限于前端、两个Worker与`overlay-read`的wasm/manifest；权限不变；冻结dist 952/build不变 |
| 签名/部署 | 签名`c602062d…1efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`2199303c…fbae`；[回执](design/evidence/2026-10-23-reading-fix2/receipt.json) |
| 用户 | S1/S3复验USER PASS；此前S2/S4/S6（0.47.0）、S5（0.47.1）、P1–P7（0.46.0）、R1–R6（0.45.0）USER PASS |

## `docs/TEST_REPORT.md`（0.49.0安装后移出）

## 已安装0.48.0（ADR-095）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 303模块，退出0 |
| 单元/合同 | 707/707 |
| 合成UI | 0.48.0新3条通过、对冻结0.47.2全部失败；阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `739b088f…e1ea`；原生与权限同0.47.2 |
| 签名/部署 | 签名`223813c4…49efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`8d1a535a…0193`；[回执](design/evidence/2026-10-23-detail/receipt.json) |
| 用户 | Z1 USER PASS；Z2倍速0.5/0.75×通过、1×/1.25×/1.5×斜率0.81/0.9/1.05（off）；Z3 FAIL → ADR-096 |

[证据](design/evidence/2026-10-23-detail/README.md)

## R07决定前的行（ADR-097）

`docs/PRODUCT_CLOSURE.md`：

| R07 / F05、F06、F17 | 基本队列、分P、番剧、缺轨回退通过，完整类型/权益与自然结束仍不全；小数倍速仅有未集成候选（ADR-086）；[候选证据](design/evidence/2026-10-22-element-candidate/README.md)为桌面MP4前四档通过、1.25窗口不足中止，真实DASH/电视未验；倍速判定已收紧为相邻档可区分（ADR-087），1.25×及以上旧观测不沿用 | 有效/失效/无权限条目、选集/分P、自然下一项/停止策略形成有限用例；所有入口共用正确播放与返回合同。完成小数倍速后端选择/实播验证；只补缺口，既有基本声画不重测 |

`docs/IMPLEMENTATION_STATUS.md`：

| F06 播放控制 | 0.21.1 A/B所请求控制、轨道、分P/记录/结束策略USER PASS；0.21.3缺4K自动回退1080P高码率播放USER PASS；0.45媒体键/隐藏态直达（ADR-088）R1–R6、0.46长按加速/连播倒计时（ADR-090）P3/P4 USER PASS | 小数倍速仅有未集成/未部署候选（ADR-086）；无样本合集/源失效及完整媒体矩阵 |

`docs/IMPLEMENTATION_STATUS.md`：

| 当前R07源码候选 | HTML video适配器/固定小数倍速合同及相关检查已实现；**未集成生产、未打包、未签名、未部署**。生产AVPlay/菜单仍只提供1×/2× | [ADR-086](adr/086-fractional-rate-element-candidate.md)、[候选分层结果](design/evidence/2026-10-22-element-candidate/README.md) |

`docs/TEST_REPORT.md`：

## 当前R07源码候选（未集成/未部署）

## `docs/TEST_REPORT.md`（0.49.1安装后移出）

## 已安装0.49.0（ADR-096）

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 307模块，退出0 |
| 单元/合同 | 711/711；原生catalog 10/10 |
| 合成UI | 新3条通过、对冻结0.48.0全部失败；详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `d148586f…a878`；原生仅`catalog/`变化；权限不变 |
| 签名/部署 | 签名`cd08619b…e6ef`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`6438d7db…3e1a`；[回执](design/evidence/2026-10-23-season/receipt.json) |
| 用户 | Q1/Q2 USER PASS；Q3 FAIL → 0.49.1；Q4：0.25×与紧随其后的0.5×斜率0、1.25/1.5/2×为1.09/1.17/0.85，均无等待且缓冲充足 |

[证据](design/evidence/2026-10-23-season/README.md)

## R09关闭前的行（0.49.1 Q3 USER PASS）

`docs/PRODUCT_CLOSURE.md`：

| R09 / F17写入 | 追番只读与候选有实现，真实增删未授权验收 | 具体番剧与增/删方向的授权、取消、提交一次、回读；不借用F11授权。无授权先完成可审阅实现与合成验证 |

`docs/IMPLEMENTATION_STATUS.md`：

| F17 番剧/影视 | 0.21.1 C详情/选集/播放、私人只读USER PASS；追番增删/持久回查候选 | 真实追番写入/回读未授权验收；完整权益/失效恢复 |

## `docs/TEST_REPORT.md`（0.50.0安装后移出）

## 已安装0.49.1（ADR-096文末）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 713/713；原生pgc-follow通过 |
| 合成UI | 0.49.1季页6/6，新3条对冻结0.49.0全部失败；详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `eb8a2fdc…eaf3`；原生仅`pgc-follow/`变化；权限不变 |
| 签名/部署 | 签名`e76c619c…0e79`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`56cc3f29…fbaa4`；[回执](design/evidence/2026-10-23-season-fix/receipt.json) |
| 用户 | Q3复验USER PASS |

[证据](design/evidence/2026-10-23-season-fix/README.md)

## `docs/TEST_REPORT.md`（0.50.1安装后移出）

## 已安装0.50.0（ADR-098/099）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 715/715；原生catalog 13/13 |
| 合成UI | 新8条通过、对冻结0.49.1全部失败；番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `3db7d810…a664a`；原生仅`catalog/`变化；权限不变 |
| 签名/部署 | 签名`22ec2901…b5d2`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`87fd5a2c…12fb4f`；[回执](design/evidence/2026-10-23-profiles/receipt.json) |
| 用户 | P1/P3 USER PASS；P2暂缓（待多账号）；P4部分国创提示网络中断，凡人修仙传（限免/会员）可播 |

[证据](design/evidence/2026-10-23-profiles/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.45–0.50.0 USER证据行，逐版本结论见签名与部署记录）

| 0.50.0（USER证据来源） | [ADR-099](adr/099-launch-account-chooser.md)启动时“谁在观看？”（已保存账号列卡、游客浏览、添加账号；无账号时一次欢迎页；只记上次账号id）；[ADR-098](adr/098-hot-bangumi-type-and-time-filters.md)热门番剧筛选国创/番剧与近三日/近一周/累计热门（原生`catalog`参数化白名单路由，新目录链接）。本地715单元/原生13/新8条合成UI（对冻结0.49.1全部失败）/回归55条/8包负例通过；签名`22ec2901…b5d2`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`87fd5a2c…12fb4f`，**用户P1/P3 USER PASS；P2暂缓（待多账号）；P4部分国创提示网络中断，原因待0.50.1失败摘要定位** | [证据](design/evidence/2026-10-23-profiles/README.md) |
| 0.49.1（USER证据来源） | ADR-096文末：追番状态改读B站本人状态接口（原生`pgc-follow`只改一条只读路由，新目录链接），打开详情先读一次；写入被拒显示代码，受理但回读未变不报成功、下一次只查询；修正“已取消追番”误报。本地713单元/新3条合成UI（对冻结0.49.0全部失败）/回归49条/8包负例通过；签名`e76c619c…0e79`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`56cc3f29…fbaa4`，**Q3复验USER PASS** | [证据](design/evidence/2026-10-23-season-fix/README.md) |
| 0.49.0（USER证据来源） | [ADR-096](adr/096-product-season-page-follow-toggle-and-hot-ranking.md)：番剧详情产品页（封面、简介、主播放、分组与横排剧集，卡片直达）；追番改为一键切换并显示失败原因；番剧影视新增公开“热门番剧”（原生`catalog`新增一条固定只读路由，新目录链接）；倍速探查v2（加0.25×/2×，统计等待与缓冲）。本地307模块/711单元/原生10/新3条合成UI（对冻结0.48.0全部失败）/回归49条/8包负例通过；签名`cd08619b…e6ef`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`6438d7db…3e1a`，**用户Q1/Q2 USER PASS；Q3 FAIL（见0.49.1）；Q4倍速：本机video仅0.5×/0.75×可用，0.25×停住，快档约1.1–1.2×封顶** | [证据](design/evidence/2026-10-23-season/README.md) |
| 0.48.0（USER证据来源） | [ADR-095](adr/095-detail-facts-and-rate-probe.md)：详情页补简介、发布日期、点赞/弹幕数与UP头像（仅TS，来自已读的视频详情响应）；“设置 → 帮助与诊断”加按需运行的倍速探查（R07电视判定用，生产仍1×/2×）。本地303模块/707单元/新3条合成UI（对冻结0.47.2全部失败）/回归46条/8包负例通过；签名`223813c4…49efc`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`8d1a535a…0193`，**用户Z1 USER PASS；Z2倍速0.5/0.75×通过、≥1×均off；Z3 FAIL（见ADR-096）** | [证据](design/evidence/2026-10-23-detail/README.md) |
| 0.47.2（USER证据来源） | 前端第一至三批（[ADR-088](adr/088-remote-media-keys-and-direct-controls.md)、ADR-090–094）累积在此包：遥控媒体键与隐藏态直达、播放器主行/⚙侧栏/连播倒计时、首页货架与整页详情、一页式搜索、单列评论、设置左右调值、Home返回续看、连播偏好，以及真机反馈修正（搜索左边缘与“搜索”键、课程行跳过、选词后焦点；字幕/弹幕分面板、AI字幕地址、⚙列表上移）。仅`overlay-read`原生模块重链接，其余原生不变。已签名并升级安装/启动（平台确认，不清数据）。**所请求R1–R6、P1–P7、S1–S6全部USER PASS**（S5于0.47.1、S1/S3于0.47.2复验通过）。 | [证据](design/evidence/2026-10-23-reading-fix2/README.md) · [ADR-094](adr/094-search-course-rows-and-ai-subtitle-files.md) |

## `docs/TEST_REPORT.md`（0.50.2安装后移出）

## 已安装0.50.1（ADR-099文末）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 715/715 |
| 合成UI | 选择与筛选9/9；番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `8240269f…0f16`；原生与权限同0.50.0 |
| 签名/部署 | 签名`743bbc13…7c8d`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`85e6d973…d7439`；[回执](design/evidence/2026-10-23-profiles-fix/receipt.json) |
| 用户 | P1′ USER PASS；P4′失败摘要为network，时好时坏 → ADR-100 |

[证据](design/evidence/2026-10-23-profiles-fix/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.50.2安装后替换的行）

| 已安装0.50.1 | ADR-099文末：启动选择页改为与产品页一致的整页样式；“设置 → 帮助与诊断”顶部显示最近一次播放失败（阶段 · 原因 · 代码）。本地715单元/9条选择与筛选合成UI/回归55条/8包负例通过；签名`743bbc13…7c8d`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`85e6d973…d7439`，**用户P1′ USER PASS；P4′失败摘要原因network、时好时坏（伍六七之玄武国篇前三集）→ ADR-100** | [证据](design/evidence/2026-10-23-profiles-fix/README.md) |
| 0.50.2候选（未签名/未部署） | [ADR-100](adr/100-bounded-playback-reconnect.md)：画质回退用尽后，网络/超时失败自动重连同一集（重新取播放地址，从原位置前2秒继续，两分钟内最多2次，显示“正在重新连接”）。仅前端；本地716单元/新2条合成UI（对冻结0.50.1全部失败）/回归64条/8包负例通过，**待签名部署授权与真机P4″** | [证据](design/evidence/2026-10-23-reconnect/README.md) |

## `docs/TEST_REPORT.md`（0.50.3安装后移出）

## 已安装0.50.2（ADR-100）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 716/716 |
| 合成UI | 重连2/2（对冻结0.50.1全部失败）；选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与10/10 |
| 包 | 负例8/8；未签名WGT `c7e06daf…a3c1`；原生与权限同0.50.1 |
| 签名/部署 | 签名`0bd1c8c3…0ff5`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`b2d06956…57ac`；[回执](design/evidence/2026-10-23-reconnect/receipt.json) |
| 用户 | P4″ FAIL：伍六七之玄武国篇前三集两次“正在重新连接”后仍中断，位置一致；其他视频可播 → ADR-101 |

[证据](design/evidence/2026-10-23-reconnect/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.50.3安装后替换的行）

| 已安装0.50.2 | [ADR-100](adr/100-bounded-playback-reconnect.md)：画质回退用尽后，网络/超时失败自动重连同一集（重新取播放地址，从原位置前2秒继续，两分钟内最多2次，显示“正在重新连接”）。仅前端；本地716单元/新2条合成UI（对冻结0.50.1全部失败）/回归64条/8包负例通过；签名`0bd1c8c3…0ff5`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`b2d06956…57ac`，**真机P4″ FAIL：两次“正在重新连接”后仍中断，位置一致 → ADR-101** | [证据](design/evidence/2026-10-23-reconnect/README.md) |
| 0.50.3候选（未签名/未部署） | [ADR-101](adr/101-cdn-failover-to-bilibili-backup.md)：播放地址保留B站给出的备用线路（Akamai）；某段6秒无响应、超时或返回错误时，该轨道切到备用并从同一段继续，同页之后从备用开始；失败摘要显示上游代码与切换次数。原生仅桥接重链接到`build/vod-failover`；本地721单元/原生6+10/新1条合成UI（对冻结0.50.2与去掉排除表的变异版本均失败）/回归86条/9包负例通过，**待签名部署授权与真机P4‴** | [证据](design/evidence/2026-10-23-cdn-failover/README.md) |

## `docs/TEST_REPORT.md`（0.50.4安装后移出）

## 已安装0.50.3（ADR-101）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 721/721 |
| 原生主机 | 备用切换桥接6/6；原桥接10/10 |
| 合成UI | 备用切换1/1（对冻结0.50.2、去掉排除表的变异版本均失败）；重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与时钟30/30 |
| 包 | 负例9/9；未签名WGT `53a64651…b482`；原生仅`vod/`桥接变化，权限不变 |
| 签名/部署 | 签名`16fe51fe…660c`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9ccf64aa…0646`；[回执](design/evidence/2026-10-23-cdn-failover/receipt.json) |
| 用户 | P4‴：第1集PASS；第2、3集在读取播放源阶段失败（source·network），自动重连后仍失败 → ADR-102 |

[证据](design/evidence/2026-10-23-cdn-failover/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.50.4安装后替换或移出的行）

| 已安装0.50.3 | [ADR-101](adr/101-cdn-failover-to-bilibili-backup.md)：播放地址保留B站给出的备用线路（Akamai）；某段6秒无响应、超时或返回错误时，该轨道切到备用并从同一段继续，同页之后从备用开始；失败摘要显示上游代码与切换次数。原生仅桥接重链接到`build/vod-failover`；本地721单元/原生6+10/新1条合成UI（对冻结0.50.2与去掉排除表的变异版本均失败）/回归86条/9包负例通过；签名`16fe51fe…660c`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9ccf64aa…0646`，**P4‴：第1集PASS；第2、3集在读取播放源阶段失败（source·network）→ ADR-102** | [证据](design/evidence/2026-10-23-cdn-failover/README.md) |
| 0.50.2（USER证据来源） | ADR-100有界重连；**P4″ FAIL**：两次“正在重新连接”后仍中断，位置一致 → ADR-101 | [证据](design/evidence/2026-10-23-reconnect/README.md) |
| 0.50.4候选（未签名/未部署） | [ADR-102](adr/102-source-check-failover-and-run-level-avoidance.md)：开播前的来源检查也按轨道切到B站备用线路；按B站地址顺序（国内边缘节点后移）；本次运行内失败过的节点类别排到后面；失败摘要写明步骤、线路、节点类别与上游代码。原生仅`vod-api`/`pgc-read`重链接到新目录；本地727单元/原生37+6/新3条合成UI（对冻结0.50.3全部失败，去掉避开的变异版本失败）/回归87条/10包负例通过，**待签名部署授权与真机P4⁗** | [证据](design/evidence/2026-10-23-source-failover/README.md) |

## `docs/TEST_REPORT.md`（0.51.0安装后移出）

## 已安装0.50.4（ADR-102）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 727/727 |
| 原生主机 | 来源模块37/37；备用切换桥接6/6 |
| 合成UI | 来源检查切换3/3（对冻结0.50.3全部失败；去掉避开的变异版本失败）；备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏1/1与时钟30/30 |
| 包 | 负例10/10；未签名WGT `e9cb3739…1778`；原生仅`vod-api/`、`pgc-read/`变化，权限不变 |
| 签名/部署 | 签名`36fa9440…7467`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9f5b0437…5873`；[回执](design/evidence/2026-10-23-source-failover/receipt.json) |
| 用户 | P4⁗ USER PASS：伍六七之玄武国篇前三集均可播放 |

[证据](design/evidence/2026-10-23-source-failover/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.51.0安装后替换或移出的行）

| 已安装0.50.4 | [ADR-102](adr/102-source-check-failover-and-run-level-avoidance.md)：开播前的来源检查也按轨道切到B站备用线路；按B站地址顺序（国内边缘节点后移）；本次运行内失败过的节点类别排到后面；失败摘要写明步骤、线路、节点类别与上游代码。原生仅`vod-api`/`pgc-read`重链接到新目录；本地727单元/原生37+6/新3条合成UI（对冻结0.50.3全部失败，去掉避开的变异版本失败）/回归87条/10包负例通过；签名`36fa9440…7467`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`9f5b0437…5873`，**P4⁗ USER PASS（伍六七之玄武国篇前三集）** | [证据](design/evidence/2026-10-23-source-failover/README.md) |
| 0.50.3（USER证据来源） | ADR-101桥接按轨道切到B站备用线路；**P4‴第1集PASS**，第2、3集在读取播放源阶段失败 → ADR-102 | [证据](design/evidence/2026-10-23-cdn-failover/README.md) |
| 0.51.0候选（未签名/未部署） | [ADR-103](adr/103-up-page-shared-detail-and-following-shortcut.md)：UP主页·投稿（搜索UP结果与视频详情进入，最新在前、每页30、限频不自动重试）；搜索与首页共用视频详情页；关注页改为直达番剧影视的追番/追剧；旧`product-collections`套件归档。原生仅`catalog`重链接到`build/catalog-up`；本地730单元/原生15/新4条合成UI（对冻结0.50.4全部失败，嵌套变异版本失败）/回归90条/10包负例通过，**待签名部署授权与真机V1/V2** | [证据](design/evidence/2026-10-23-up/README.md) |

## `docs/TEST_REPORT.md`（0.51.1安装后移出）

## 已安装0.51.0（ADR-103）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 730/730 |
| 原生主机 | catalog-up 15/15 |
| 合成UI | UP主页与共用详情4/4（对冻结0.50.4全部失败；嵌套变异版本失败）；回归90条全部通过 |
| 包 | 负例10/10；未签名WGT `ac93ec44…730c`；原生仅`catalog/`变化，权限不变 |
| 签名/部署 | 签名`c04139b4…d817`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`f42b8e5e…cdb9`；[回执](design/evidence/2026-10-23-up/receipt.json) |
| 用户 | V1 FAIL（分区-352、导航失焦）；V2① PASS、② 仅首页/搜索为完整详情、③ PASS；关注页直达卡未报告 → ADR-104 |

[证据](design/evidence/2026-10-23-up/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.51.1安装后替换的行）

| 已安装0.51.0 | [ADR-103](adr/103-up-page-shared-detail-and-following-shortcut.md)：UP主页·投稿（搜索UP结果与视频详情进入，最新在前、每页30、限频不自动重试）；搜索与首页共用视频详情页；关注页改为直达番剧影视的追番/追剧；旧`product-collections`套件归档。原生仅`catalog`重链接到`build/catalog-up`；本地730单元/原生15/新4条合成UI（对冻结0.50.4全部失败，嵌套变异版本失败）/回归90条/10包负例通过；签名`c04139b4…d817`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`f42b8e5e…cdb9`，**V1 FAIL（分区-352，原因为原生User-Agent）、导航失焦；V2① PASS、② 仅首页/搜索为完整详情、③ PASS；关注页直达卡未报告 → ADR-104** | [证据](design/evidence/2026-10-23-up/README.md) |
| 0.51.1候选（未签名/未部署） | [ADR-104](adr/104-runtime-user-agent-shared-detail-everywhere.md)：分区与UP主页读取改用电视运行时自身的User-Agent（原生仅`catalog`重链接到`build/catalog-ua`）；读取失败后焦点不丢、上键回来源按钮；我的、关注更新、继续观看都打开共用详情页并保持续播分P。本地731单元/原生17/新4条合成UI（对冻结0.51.0全部失败）/回归94条/10包负例通过，**待签名部署授权与真机V1/导航/V2②/K3** | [证据](design/evidence/2026-10-23-up-fix/README.md) |

## `docs/TEST_REPORT.md`（0.51.2安装后移出）

## 已安装0.51.1（ADR-104）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 731/731 |
| 原生主机 | catalog-ua 17/17 |
| 合成UI | 修正4/4（对冻结0.51.0全部失败）；回归94条全部通过 |
| 包 | 负例10/10；未签名WGT `9e9c3e83…3110`；原生仅`catalog/`变化，权限不变 |
| 签名/部署 | 签名`854d7904…6209`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`20e2cc29…e5ca`；[回执](design/evidence/2026-10-23-up-fix/receipt.json) |
| 用户 | V1 FAIL；导航 PASS；V2② 三项 PASS、继续观看/本机播放队列仍旧面板；关注页直达卡 PASS → ADR-105 |

[证据](design/evidence/2026-10-23-up-fix/README.md)

## `docs/IMPLEMENTATION_STATUS.md`（0.51.2安装后替换或移出的行）

| 已安装0.51.1 | [ADR-104](adr/104-runtime-user-agent-shared-detail-everywhere.md)：分区与UP主页读取改用电视运行时自身的User-Agent（原生仅`catalog`重链接到`build/catalog-ua`）；读取失败后焦点不丢、上键回来源按钮；我的、关注更新、继续观看都打开共用详情页并保持续播分P。本地731单元/原生17/新4条合成UI（对冻结0.51.0全部失败）/回归94条/10包负例通过；签名`854d7904…6209`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`20e2cc29…e5ca`，**V1 FAIL（分区仍不可读）；导航 PASS；V2② 稍后再看/云端历史/收藏 PASS，继续观看/本机播放队列仍为旧面板；关注页直达卡 PASS → ADR-105** | [证据](design/evidence/2026-10-23-up-fix/README.md) |
| 0.51.0（USER证据来源） | ADR-103 UP主页·投稿；**V2① PASS、V2③ PASS、搜索视频结果与首页详情一致 PASS**；V1与V2②转ADR-104 | [证据](design/evidence/2026-10-23-up/README.md) |
| 0.51.2候选（未签名/未部署） | [ADR-105](adr/105-signed-public-reads-pacing-and-local-detail.md)：登录时分区排行与UP投稿用本人会话只读读取（新原生`public-read`，仅nav/分区/UP三个固定GET）；10分钟复用、风控拒绝后暂停60秒并显示代码，“帮助与诊断”记录通道与结果；继续观看与本机播放队列打开完整详情页；读取后焦点不丢。本地733单元/原生10/新4条合成UI（对冻结0.51.1全部失败）/回归98条/10包负例通过，**待签名部署授权与真机V1/V2②补** | [证据](design/evidence/2026-10-23-up-fix2/README.md) |

## `README.md`与`docs/CURRENT_DEVICE_TEST.md`（0.51.2验收后替换的行）

已安装工件为0.47.2：前端三批（遥控、播放器、首页、搜索、阅读）所请求组USER PASS，此前投屏/F11等所请求组保持；不等于完整产品通过。

当前工作区另有R07小数倍速HTML video候选，尚未集成生产、打包、签名或部署。桌面MP4只有前四档通过，1.25×窗口不足中止，其余档位/DASH/电视未验；不能借用已安装包的设备结果。大屏UI已有实现与分组USER证据，最终整合/性能/恢复及内容来源缺口仍开放。

2026-10-23；**当前没有待执行的设备测试组。** 已安装0.47.2，前端三批所请求R1–R6、P1–P7、S1–S6全部USER PASS（[证据](design/evidence/2026-10-23-reading-fix2/README.md)）。
