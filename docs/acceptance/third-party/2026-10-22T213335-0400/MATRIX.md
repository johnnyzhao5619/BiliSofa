# F01–F20 / R01–R15 验收矩阵

验收时间：2026-10-22 21:33–21:50 EDT。路径前缀`/Users/weijiazhao/Dev/BiliSofa/`在表中写作`⟨R⟩/`以便阅读，展开即为绝对路径（例：`⟨R⟩/apps/tv/src/app/vod-comments.ts` = `/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/vod-comments.ts`）。

## 列与状态说明

- **实现**：当前工作区源码事实。0.43.0的249个UI输入与当前工作区逐个hash一致（0变更），所以0.43.0的实现列与当前源码相同；R07候选是不在生产依赖图中的新增文件。
- **本地（当轮）**：本轮实际运行的`npm run check`（293模块，退出0）、`npm test`（688/688，退出0）及冻结0.43.0投屏定位合成UI（10/10，退出0）。只是合成/合同层，不是真机。
- **既有USER**：项目记录的用户在指定版本上的结果，本轮未复测。
- **当轮独立**：第三方本轮自己得到的结论（源码审查、本地运行、探针）。没有任何真机项。
- **真机**：完整功能真机门槛的状态。

状态词：INDEPENDENT_PASS（仅指本轮本地/源码层）、EXISTING_USER_PASS、FAIL、NOT_IMPLEMENTED、PARTIAL、BLOCKED、PAUSED、EXCLUDED、UNVERIFIED。

行号来源：本轮源码追踪；标★的已由验收人逐行复核，其余来自同轮只读追踪，可能有±数行偏差。

## F01–F20

| ID | 实现 | 本地（当轮） | 既有USER | 当轮独立 | 真机（完整门槛） | 源码 | 缺口 / 关闭条件 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F01 账号 | 实现：扫码、身份、保护存储v2 bank、原账号重扫更新 | INDEPENDENT_PASS（F01×3、R06×14、W02等合同） | EXISTING_USER_PASS：0.40.0扫码更新/取消/重开 | 代次/晚回调拒绝、恢复仅存路由与锚点：源码确认 | UNVERIFIED（自然服务端失效） | `⟨R⟩/packages/bili-client/src/session.ts:9-44`；`⟨R⟩/packages/bili-client/src/accounts.ts:41-104`；`⟨R⟩/apps/tv/src/app/account-workspace.ts:35-83`；`⟨R⟩/apps/tv/src/app/foundation-main.ts:152-204` | 自然失效一次记录（DEVICE_PLAN M4）；恢复后返回栈仅单页（P3-04） |
| F02 推荐/榜单 | 实现：游客热门、全站榜、14分区入口、本人推荐 | INDEPENDENT_PASS（F02×10） | EXISTING_USER_PASS：本人推荐组、0.26.1首读 | 源码可达 | BLOCKED（动画/舞蹈API-352） | `⟨R⟩/apps/tv/src/app/product-home.ts:71-86,175-183`；`⟨R⟩/apps/tv/src/app/category-picker.ts:5` | R05：取得可用来源后补读取证据 |
| F03 搜索 | 实现：首字母候选、视频/UP/番剧三类、热搜、历史开关/清空 | INDEPENDENT_PASS（F03×3、词表/NOTICE hash一致） | EXISTING_USER_PASS：最小组 | 源码确认三类（直播类按ADR-068隐藏） | UNVERIFIED（最终错误/会话矩阵） | ★`⟨R⟩/apps/tv/src/app/product-search.ts:31`；`⟨R⟩/apps/tv/src/app/search-keyword.ts:16` | 文档“四类”措辞陈旧（P3-07） |
| F04 动态/UP | PARTIAL：UP搜索/摘要、关注更新可播；无完整动态、无UP主页/投稿页 | INDEPENDENT_PASS（F04×6） | EXISTING_USER_PASS：0.36.0关注播放 | BV校验`^BV[A-Za-z0-9]{10}$`且链接一致：源码确认 | BLOCKED（HTTP412/API-352） | `⟨R⟩/packages/bili-client/src/follow-updates.ts:12-18`；`⟨R⟩/apps/tv/src/app/product-following.ts:22,110` | R04 |
| F05 私人片库/队列 | 实现 | INDEPENDENT_PASS（F05×30） | EXISTING_USER_PASS：0.27.0 A–D等 | 队列复用播放器、栈深不增：源码确认 | PARTIAL（完整类型/权限、自然连续结束） | `⟨R⟩/apps/tv/src/app/product-library.ts:41-44,127-191`；`⟨R⟩/apps/tv/src/app/queue-playback.ts:20-33` | R07 有限用例 |
| F06 播放控制 | 实现（AVPlay 1×/2×）；小数倍速NOT_IMPLEMENTED（生产） | INDEPENDENT_PASS（F06×30；R07候选12项） | EXISTING_USER_PASS：0.21.1 A/B、0.38.0倍速菜单 | 生产`rates:[1,2]`★；候选未被生产引用★；观测容差缺陷（P1-01） | PARTIAL | ★`⟨R⟩/apps/tv/src/platform/samsung.ts:19`；★`⟨R⟩/apps/tv/src/app/vod-workspace.ts:93-104`；★`⟨R⟩/apps/tv/src/platform/element-video.ts:1-189` | R07全部条件＋修P1-01 |
| F07 续播 | 实现：本地续播；云进度不在生产包 | INDEPENDENT_PASS（R01×8） | EXISTING_USER_PASS：本地首P、P2队列续播 | 源码确认 | 云进度：用户跳过（非PASS）；双向接续未完成 | `⟨R⟩/apps/tv/src/app/product-continuing.ts:6,38,49`；`⟨R⟩/apps/tv/src/app/vod-workspace.ts:162` | R01删除/账号移除/升级回退TV验收 |
| F08 弹幕 | 实现（只读） | INDEPENDENT_PASS（W05组） | EXISTING_USER_PASS：A–D、0.22.1 | 无发送端点：源码确认 | UNVERIFIED（完整性能） | `⟨R⟩/apps/tv/src/app/vod-overlays.ts:114-163`；`⟨R⟩/packages/media/src/danmaku.ts` | R12 |
| F09 字幕 | 实现 | INDEPENDENT_PASS（W05组） | EXISTING_USER_PASS：A–D、0.22.1 | 源码可达 | UNVERIFIED（完整轨道/语言） | `⟨R⟩/apps/tv/src/app/vod-overlays.ts:102,144` | — |
| F10 评论/回复 | PARTIAL：根评论/全文/楼中楼列表可用；**回复全文打不开**；PGC路径楼中楼打不开 | INDEPENDENT_PASS（F10×7；但UI测试未点回复卡） | EXISTING_USER_PASS：0.23.0集中组（旧界面） | **FAIL（源码确定，P2-01）** | FAIL待确认（M1） | ★`⟨R⟩/apps/tv/src/app/vod-comments.ts:15,19,39`；★`⟨R⟩/apps/tv/src/app/navigation.ts:39` | 修P2-01＋UGC/PGC回归 |
| F11 账号互动 | 实现：单击可逆、先持久后POST一次、回读、unknown只查 | INDEPENDENT_PASS（F11×15） | EXISTING_USER_PASS：0.43.0关注/收藏/Back/Home；点赞/稍后再看继承 | 不自动重发：源码确认；**256条终身上限（P1-02）** | 所请求正常路径USER PASS；长期使用FAIL（源码确定） | ★`⟨R⟩/packages/bili-client/src/interaction-writes.ts:37-48`；★`⟨R⟩/apps/tv/src/platform/interaction-journal.ts:5-12` | 修P1-02；身份/弱网unknown随R06/R13 |
| F12 设置/恢复 | 实现 | INDEPENDENT_PASS（F12×8；冻结UI设置组未重跑） | EXISTING_USER_PASS：偏好/叠加设置组 | 源码可达 | UNVERIFIED（完整故障恢复/性能） | `⟨R⟩/apps/tv/src/app/local-settings.ts:11`；`⟨R⟩/apps/tv/src/app/product-settings.ts:7` | R13 |
| F13 多账号 | 存储层实现，UI只显示一行 | 合成隔离合同通过 | — | 与ADR-069一致 | EXCLUDED | `⟨R⟩/packages/bili-client/src/accounts.ts:59,117` | 不计PASS/FAIL |
| F14 投币/三连 | 实现但运行时禁止 | INDEPENDENT_PASS（F14×3合同） | — | `allowIrreversible=false`拒绝：源码确认 | PAUSED | `⟨R⟩/apps/tv/src/platform/interaction-runtime.ts:34`；`⟨R⟩/apps/tv/src/app/video-interactions.ts:27` | R08 |
| F15 评论回复只读 | 只读，无编辑/发送/删除端点 | INDEPENDENT_PASS（F15×1） | 随F10 | 无写端点：源码确认；阅读缺陷同F10 | 随F10 | `⟨R⟩/platform/wasm-network/src/comments-read.c:23,32` | 随P2-01 |
| F16 弹幕只读 | 只读 | 随F08 | 随F08 | 无发送：源码确认 | 点播UNVERIFIED；直播EXCLUDED | 同F08 | — |
| F17 番剧/影视 | 实现：详情/选集/播放/追番增删候选 | INDEPENDENT_PASS（F17×19） | EXISTING_USER_PASS：0.21.1 C | 追番接受后先记unknown待读确认：源码确认 | 真实追番写入UNVERIFIED | `⟨R⟩/apps/tv/src/app/pgc-season.ts:24,48`；`⟨R⟩/packages/bili-client/src/pgc-follows.ts:33-41` | R09授权；P2-01的PGC分支；P3-01 |
| F18 直播 | 代码保留，入口门控隐藏 | 合同F18×25（历史） | 旧浏览PASS/实播FAIL保留 | `LIVE_IN_CURRENT_DELIVERY=false`★；侧栏无直播★ | EXCLUDED | ★`⟨R⟩/packages/contracts/src/product-scope.ts:2`；★`⟨R⟩/apps/tv/src/app/product-frame.ts:4` | R02新候选TV核对 |
| F19 高画质/HDR | 实现：qn=127/fourk=1请求、有限降级；无HDR处理 | 合同通过 | EXISTING_USER_PASS：标称4K、1080P回退 | **默认最低档AVC（P2-02，PLAUSIBLE）** | 条件未验证（HDR/decoder/其他型号） | ★`⟨R⟩/packages/media/src/vod-track-preference.ts:14-16`；`⟨R⟩/platform/wasm-network/src/vod-api.c:163` | R10；M2 |
| F20 官方投屏 | 实现：显式“开始接收”、有界SOAP、私网、同秒幂等 | INDEPENDENT_PASS（F20×15；冻结0.43.0定位合成UI 10/10） | EXISTING_USER_PASS：0.43.0 Android首投/定位/暂停/回0停止；iPhone首投/声画/停止 | ADR-085规则按文实现；首个私网发送端自动获批（P3-02） | PARTIAL（iPad、PGC/长P、争用/断连、精度；直播EXCLUDED） | ★`⟨R⟩/apps/tv/src/app/product-cast.ts:11-12`；`⟨R⟩/packages/cast/src/soap.ts:52-174`；`⟨R⟩/apps/tv/src/app/cast-receiver-player.ts:76-78` | R11；M3 |

## R01–R15

| ID | 实现 | 本地（当轮） | 既有USER | 当轮独立 | 真机 | 关键源码 / 证据 | 关闭条件（未变） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R01 继续观看/名称 | 实现；空时隐藏、焦点回侧栏 | INDEPENDENT_PASS（R01×8） | 并入0.34+所请求组 | 空状态无死角：源码确认 | UNVERIFIED（删除/移除/升级回退） | `⟨R⟩/apps/tv/src/app/product-continuing.ts:38`；`⟨R⟩/apps/tv/src/app/product-home.ts:190` | TV集中验收 |
| R02 直播范围 | 实现（门控） | — | 0.34.0组通过 | 源码确认隐藏；历史列表过滤直播 | UNVERIFIED（需新完整候选核对） | ★`⟨R⟩/packages/contracts/src/product-scope.ts:2`；`⟨R⟩/apps/tv/src/app/product-library-read.ts:108` | 新候选部署后一次巡检（C1） |
| R03 F11 | 实现 | INDEPENDENT_PASS | EXISTING_USER_PASS（所请求正常路径CLOSED） | **新增P1-02** | 正常路径USER PASS | 见F11 | 修P1-02；故障集成随R06/R13；不重复写入 |
| R04 动态/UP | PARTIAL | — | 关注播放USER PASS | 无UP主页/投稿页 | BLOCKED | 见F04 | 新来源 |
| R05 分区 | PARTIAL | — | — | — | BLOCKED | 见F02 | 新来源 |
| R06 会话恢复 | 实现 | INDEPENDENT_PASS（R06×14） | EXISTING_USER_PASS（0.40.0 A/B/C） | 源码确认 | UNVERIFIED（自然失效） | 见F01 | M4 |
| R07 队列/权益/小数倍速 | 基本队列实现；小数倍速候选未集成 | INDEPENDENT_PASS（R07×12，含修正后全量688）；桌面台架：既有记录0.25–1×，1.25退出1，未复跑 | 基本声画通过 | **P1-01观测无效**；claim未统一；无异步切换；无生产DASH | NOT_IMPLEMENTED（生产）/UNVERIFIED | ★`⟨R⟩/apps/tv/src/platform/element-video.ts`；★`⟨R⟩/packages/media/src/rate-observation.ts:19`；`⟨R⟩/docs/design/evidence/2026-10-22-element-candidate/desktop-partial.json` | ADR-086全部门槛＋P1-01 |
| R08 F14 | 实现/禁用 | 合同通过 | — | 运行时拒绝 | PAUSED | 见F14 | 用户恢复决定 |
| R09 F17写入 | 实现候选 | 合同通过 | — | — | UNVERIFIED | 见F17 | 具体授权 |
| R10 高画质 | 部分 | 合同通过 | 4K/回退USER PASS | P2-02 | 条件未验证 | 见F19 | 有样本时 |
| R11 投屏矩阵 | 部分 | 冻结定位合成UI 10/10 | 0.43.0 Android/iPhone所请求组 | 源码确认；P3-02 | PARTIAL | 见F20 | iPad/PGC/争用/断连（M3、C4） |
| R12 性能耐久 | 未执行 | — | — | — | UNVERIFIED | — | C6 |
| R13 故障恢复 | 部分 | 合同通过 | 零散Home/关电脑 | — | UNVERIFIED | — | C5、C7 |
| R14 发布准备 | 部分 | 0.43.0 WGT/归档/清单hash一致；WGT无凭据；许可齐全 | — | **P2-03源码可追溯性** | OPEN | `⟨R⟩/docs/design/evidence/2026-10-22-cast-clock/receipt.json` | 最终候选、Git修订、可复现构建、发布授权 |
| R15 全前端 | 实现；焦点/Back/缓存/控制栏源码一致 | 合同通过 | 0.34/0.36/0.39所请求组 | 焦点/Back、有界缓存（8批/48封面/8MiB）、控制栏5秒隐藏：源码确认；评论栈缺陷P2-01 | OPEN（最终整合） | `⟨R⟩/apps/tv/src/app/tv-shell.ts:13-47,141`；`⟨R⟩/apps/tv/src/app/continuous-grid.ts:11,32-35`；`⟨R⟩/apps/tv/src/app/cover-art.ts:6`；`⟨R⟩/apps/tv/src/app/vod-controls.ts:29-40` | T1–T8集中验收 |

## 产品路径核查（任务第4.3节）

| 路径 | 当轮结论 | 依据 |
| --- | --- | --- |
| 空继续观看时侧栏可达 | INDEPENDENT_PASS（源码） | 空时隐藏货架，初始焦点`nav-home`，卡片左邻侧栏 |
| 焦点/Back归位 | INDEPENDENT_PASS（源码） | 单一InputRouter/FocusRouter；弹窗关闭恢复记忆焦点；Back顺序弹窗→页→侧栏→首页→退出 |
| 连续浏览、卡片/封面缓存 | INDEPENDENT_PASS（源码，符合ADR-080） | 8批缓存/3批在页/5分钟；封面48项/8MiB/2并发 |
| 关注更新可播放 | INDEPENDENT_PASS（源码） | 仅有效BV生成播放目标 |
| 队列更多层级 | INDEPENDENT_PASS（源码） | “更多”为播放器内层，Back先关 |
| 投屏显式授权/所有权 | PARTIAL | 需按“开始接收”；首个私网发送端自动获批（P3-02）；Home关闭会话、重进需重新开始 |
| 控制栏焦点/显隐 | INDEPENDENT_PASS（源码） | 5秒隐藏、首键只唤出 |
| 字幕弹幕/只读评论 | **FAIL（回复全文）** | P2-01 |
| 账号恢复目的页 | INDEPENDENT_PASS（源码） | 同账号重扫后恢复原页；返回栈单页（P3-04） |

桌面/源码结论不代表真实遥控、Voice Guide或电视渲染通过。
