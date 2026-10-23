# BiliSofa: all-function single-release plan

Date: 2026-10-14. Product release target: one complete v1.0.0. Canonical scope is docs/PRD.md. Architecture constraint is ADR-001: fully on-TV, no external runtime service.

User-approved revision: [ADR-003](../../adr/003-read-only-comments-danmaku.md) makes comments/replies and VOD/live danmaku read-only. F15/F16 remain traceability IDs merged into reading/display work; remove their editors, publishing/deletion/sending integrations and write acceptance. F03 plans app-contained pinyin-initial input/suggestions. Other planned writes remain.

## Work packages

| Work | Tasks and evidence | Dependency | Rough effort |
| --- | --- | --- | --- |
| W00 Initialization | Git/main, MIT, README, PRD, architecture, feature IDs, acceptance and open-source plan | User-approved initialization | Completed: skeleton/documents only |
| W01 Retail feasibility | Signed socket/cURL WGT; Worker, TLS/cookies, per-account requests, TCP listen, UDP multicast; real official casting discovery/control; MPD/4K/HDR playback. Evaluate .NET only if necessary | SDK/signing setup and actual TV | 1–3 weeks; decision gate |
| W02 On-TV foundation | Runtime boundary, account store, cast listeners, contracts, remote focus/search-input ownership, lifecycle, media adapter, meaningful CI | Chosen standalone route | 2–3 weeks |
| W03 Accounts/content | F01–F05/F07/F13, all account views and switching, queries/pagination, cloud progress, personal queues | W02 | 2–3 weeks |
| W04 Full media | F06/F17–F19, codecs/qualities/audio, speed, UGC/PGC/live, 4K/HDR where supported | W01/02/03 | 2–4 weeks |
| W05 Overlay/interaction | F08–F12/F14–F16: read-only comments/replies/danmaku, subtitles/settings/recovery; F11/F14 writes with confirmation/state re-read; no comment/danmaku editor or sending | W03/04 | Re-estimate after W01 and ADR-003; previous 2–3 weeks is historical |
| W06 Official casting | F20, discovery/protocol, content handoff, commands/state, account attribution, multiple sender/remote ownership, disconnect/recovery | W01 proves viable, W02/04 | 2–4 weeks |
| W07 Full acceptance/release | F01–F20 actual TV/official phones, fault/soak/upgrade/rollback, licenses/documentation, one v1.0.0 Release | All required work passes | 2–3 weeks |

Effort is provisional and candidate-dependent. The previous 13–23 week estimate included comment/danmaku authoring; re-estimate after W01 and ADR-003 rather than promising a fixed saving. Permissions/protocol authorization or unsupported hardware can block a requirement indefinitely. Two developers may work on independent work packages, with the same final gate. No automatic agent delegation is implied.

There is no MVP/base/expanded release. Test packages are internal evidence; no full-release claim until every required item passes. Do not move a blocked required feature to another version.

## W01 experiments

2026-10-16 execution clarification requested by the user: follow [the fixed W01 exit checklist](../../W01_EXIT_CHECKLIST.md) for six remaining functional gates, bounded device requests and stop conditions. Full content/sender/recovery matrices remain W04/W06; endurance and full acceptance remain W07. Earlier passes are reused where implementation is unchanged. This does not remove F01–F20 or mark known failures resolved.

- Prove the exact firmware and signed package installs, launches and remains usable after power cycle with no development server.
- Test Socket Extension in Worker: real bind/listen/accept, receive/send UDP and multicast discovery, not just symbol existence. Phone communicates directly with TV.
- Test cURL HTTPS certificate validation, redirect handling, readable Set-Cookie, separate cookie jars, CSRF request and account identity. Use deliberate user-approved testing actions.
- Prove same-account progress reads/writes; two accounts must not inherit a global browser cookie identity.
- Serve an in-memory MPD inside the TV process if needed; prove AVPlay can access it and reach media; compare with MSE.
- Use unchanged Android/iPhone/iPad official Bilibili apps for casting. Generic DLNA command tools alone are insufficient.
- Confirm foreground receiver cleanup and Home/sleep behavior. Auto-wake/cold-launch requires separate evidence and is not assumed.
- If WASM fails, prove .NET route against the same tests rather than assuming SDK support equals retail compatibility.

## Engineering and release

Choose build/package tooling only after runtime gate. Preserve reference modules with their licenses. Establish contracts, account generation guards, request cancellation, idempotent read retries and ambiguous write status queries. Never execute arbitrary danmaku/remote update code.

Public GitHub repo planned: OWNER/BiliSofa or owner-approved lowercase equivalent. Create it when GitHub publication is requested. CI later verifies type/static checks, real parsing/state tests, TV UI navigation, packaging and license/credential inspection. Device-account writes and private signing remain outside untrusted PR CI.

Complete release contains fixed source, package for user signing, target-TV locally signed package, licenses, build/sign/install instructions, compatibility and acceptance matrix. Preserve author signing identity and an upgrade rollback procedure. No signing private key/device session in public artifacts.

## Practices applied to work packages

- W01: capture actual model/firmware/engine and privilege matrix; prove Worker/CSP/socket/cURL, package persistence, media, search input/pinyin-initial candidates, Voice Guide and visibility transitions. Full comment/danmaku Chinese editing is no longer a gate. See [platform rules](../../TIZEN_PRACTICES.md).
- W02: establish [dependency boundaries](PROJECT_STRUCTURE.md), [coding/state/resource rules](../../ENGINEERING.md), FocusRouter/InputRouter and the [TV UI contract](../../TV_UI.md); measure a device performance baseline before setting budgets.
- W03–W06: each feature includes empty/loading/error/recovery and focus/Back behavior; F03 also owns search input/candidates. Account generation applies to reads and writes; unknown-write handling applies only to retained write features. Comment/reply/danmaku modules remain read-only.
- W07: add cross-cutting UI/lifecycle/security/package evidence to existing F01–F20 gates. Required items remain UNVERIFIED until actual results. This documentation update does not execute those tests.

2026-10-17 execution: W01 user-assisted investigations are archived with explicit deferred cloud-progress/high-quality evidence; W02 begins on the validated WGT/Web + on-TV WASM/AVPlay route under ADR-027. This is not a full W01 PASS or release waiver. W03/F07 and W04/F19 acceptance remain open; no repeated account write is authorized.

W02首批导航/资源所有权源码及独立合成预览已交付，本地261单元/合同与11浏览器检查通过，未完成正式平台装配/性能/TV验收，详见[W02_FOUNDATION](../../W02_FOUNDATION.md)。

W02第二批：保护存储/账号代次与导航生命周期装配已实现并通过本地285单元/合同、18浏览器、94模块边界；正式扫码/Worker/媒体、设置/本地续播隔离、性能与TV应用包继续开放。见[W02_ACCOUNTS](../../W02_ACCOUNTS.md)。

W02第三批已接正式身份Worker、扫码/保护保存/账号启用与移除页面，并实际SDK编译/打包独立内部账号WGT（未签名/未装机）；见[W02_IDENTITY_APP](../../W02_IDENTITY_APP.md)。媒体/接收器装配、偏好/本地续播隔离、性能及新组合真机门槛仍开放，不跳过到完整产品验收。


2026-10-17 W02第四批：已接通内部账号应用中的游客热门/首P播放和MediaSession解码器＋原生ACK关闭门槛，形成0.2.0未签名WGT；本地合同/UI/打包负例见[W02_MEDIA_APP](../../W02_MEDIA_APP.md)。接着完成CastSession装配、按账号偏好/本地续播、通用网络/写协调及新包真机性能门槛；本批不关闭W02/W04/W06或扩大W01人工回归。


2026-10-17 W02第五批：前台ReceiverLink/CastWorkspace已装配账号应用，形成内部0.3.0未签名包，见[W02_CAST_APP](../../W02_CAST_APP.md)。首源握手/控制权/状态/代次换源有本地合成证据；五分钟/四源内部限制与新包真机验证未关闭。W02后续为账号隔离偏好/本地续播、通用内容网络/写协调、诊断及新包性能基线；W06完整会话/断连与发送端矩阵不并入本轮重复W01。


2026-10-18 W02第六批：账号隔离的普通偏好/本地首P续播与有界摘要诊断已装配，内部0.4.0未签名包及本地验证见[W02_LOCAL_APP](../../W02_LOCAL_APP.md)。下一步为通用内容网络与保留写操作协调正式装配，再做新包有界真机组合/性能基线；云进度未知授权不重复，W03–W07全功能未验收项保持。

2026-10-18 W02第七批：有限内容route接通既有匿名热门，持久化保留写意图门禁已通过账号租约装配；内部0.5.0本地验证及新ID签名/安装/启动见[W02_NETWORK_APP](../../W02_NETWORK_APP.md)。下一步按该页固定三组做新应用装配验证，并单列量化性能缺口；不重跑W01样本矩阵。W03扩展其余内容/私有route，W05接具体保留写参数、接口与授权验收，旧云进度未知意图不解锁。

0.5.0用户首组已部分通过：焦点/成功卡声画续播/Home/设置重开通过，首次获取源失败换卡成功。0.5.1按ADR-034补首错脱敏取证，已安装/启动，只请求一次精确取源观察，不重测已通过项目；未复现也保留原失败并继续账号/投屏的独立装配组，见[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)。

2026-10-18 W02新ID人工最小组合已收束，发送端未指明的平台结果不扩展到三端。W03首批固定匿名排行榜/有界缓存/翻页/刷新/媒体返回已接通，见[W03_RANKING_APP](../../W03_RANKING_APP.md)。接口HOST出现API-352，保留失败且无自动重试；只有实际TV读取/一次功能检查，不重复W01。个性化、分区、搜索、动态/个人库、会话替换与真实两账号/云端验收继续开放。


2026-10-18追加：W03第二批在同一应用接通首字母输入与匿名video搜索（ADR-036），见W03_SEARCH_APP。0.6.0最小组已通过不再重复；0.7.0仅安排一组新搜索检查。F03热搜/持久化历史/UP/PGC/live搜索仍开放，真实两账号/云端等不因本批关闭。


2026-10-18追加：W03第三批0.8.0补F03本地历史和显式同词重试、F12清理/设置、F13分区删除屏障及F06播放前范围超时一次恢复候选。见ADR-037与W03_HISTORY_RECOVERY_APP；412与音轨首失败仍保留，不转入重复真机媒体探针。仅一组本地历史持久化/开关/清空验收，完整F03其他类型/热搜及W03–W07继续。


2026-10-18追加：W03第四批按ADR-038增加F03公开热搜入口/十词快照/六词分页/显式刷新/选词进入既有搜索。0.8.0历史组USER全部通过，不再重复；0.9.0只请求一次新增热搜组，首搜HTTP412和完整其余搜索类型仍开放。见W03_HOT_SEARCH_APP。


2026-10-18追加：W03搜索修复按ADR-039迁移当前匿名WBI协议，以公开nav材料构造查询；0.9.1仍第5次恢复不算稳定。只做一次新协议首搜/成功后前后页的必要功能检查，不重复历史或热搜UI。HTTP拒绝若仍在即停止这组，继续不受影响的工作；完整功能范围保持。


2026-10-18追加：W03/F03按ADR-040增加固定匿名bili_user搜索、四UP分页/UID摘要及一条搜索附带预览接既有媒体，见W03_USER_SEARCH_APP。0.9.2最小组USER通过不重复。本批只验新增UP功能；完整F04主页/投稿、F03 PGC/live与其余W03个人内容/会话、云端及W04–W07保持开放。


2026-10-18追加：0.10.0 UP搜索/信息/翻页及音频/控制USER通过，画面失败，优先修复已本地复现的嵌套弹窗遮挡。0.10.1只补播放期inert背景绘制/退出恢复与单一声画补验，不扩大搜索/账号/原生范围；见W03_USER_PREVIEW_FIX。


2026-10-18追加：0.10.1画面修复USER通过收束；UP投稿固定匿名路由HOST412作为外部阻塞保留，不绕行/重试。继续不受影响的F03番剧搜索，0.11.0仅四卡查询/只读摘要/历史语境及返回，见ADR-041与W03_PGC_SEARCH_APP。W04完整PGC播放/选集、F03直播及其余W03保留。


2026-10-18追加：0.11.0番剧最小组USER通过收束。0.12.0继续F03固定匿名live_room搜索/房间摘要、分页和历史语境，见ADR-042与W03_LIVE_SEARCH_APP；完整直播播放/实时状态归W04，完整F03/F04/W03仍未关闭，UP投稿412不绕行。


2026-10-18追加：0.12.0直播搜索最小组USER全部通过，停止重复。按ADR-043继续F02固定公开分区排行榜0.13.0，限定官方榜单配置的14个UGC分区；当前HOST API-352不推定真实可用。有限剩余项目/外部阻塞见W03_REMAINING_CHECKLIST，不要求重复旧搜索/账号/投屏组。


0.13.0 USER反馈：动画/舞蹈分区读均API -352，翻页交互无异常但不能推定未加载卡片的分页/刷新通过；停止该组。0.14.0按ADR-044推进独立F05稍后再看只读列表与账号租约/关闭装配，历史/收藏/队列和完整W03继续开放，不重复分类UI或旧搜索测试。


2026-10-19：0.14.0稍后再看只读最小组USER通过，具体空/非空/分页可用分支未说明，不扩大推断。下一批0.15.0按ADR-045新增云端历史只读及私有游标快照；保留云进度写入跳过、分类API-352和收藏/队列缺口，仅安排新历史一次必要组。


2026-10-19：0.15.0云端历史只读最小USER组通过，具体空/非空/实际分页分支未明，停止重复。下一批0.16.0按ADR-046实现收藏夹导航窗口/内容分页/摘要只读，仍不含收藏写入/播放队列；只安排新增功能最小组。


2026-10-19：0.16.1收藏3项边界补验USER通过，旧失败保留且该组收束。0.17.0按ADR-047推进F04官方网页导航关注更新摘要/分页/刷新，只读；主动态页HTTP412不重复请求，导航API匿名HTTP200/API-101为独立来源。全文图集/完整F04及F05队列保持OPEN，不以导航摘要替代。


2026-10-19：0.17.0关注更新最小USER组通过，不重复。0.18.0按ADR-048推进F05本机身份队列、管理/重开与匿名首P串行换项，云端私人库入队/完整连播仍OPEN。仅新增队列TV最小组，原生/账号源协议未改，不回到W01重测。


0.18.1当前联网恢复及原本机队列最小组USER通过，旧全局失败/原因未确认保持。0.19.0按ADR-049衔接稍后再看/历史/收藏的普通UGC首P显式本地入队，不新增云端写入或重复旧声画组。


0.19.0私人列表显式入队最小USER组通过，停止重复；F04现行普通参数仍API -352（旧412保留），继续独立F01账号详情0.20.0/ADR-050。无新增身份请求/权限/存储迁移，真实过期/双账号与完整W03保持。


2026-10-19流程调整：按用户最新要求，以完整F模块完成开发与本地回归后统一TV验证，不再把单入口/控件/取证小包逐个交用户测试。当前F06整模块开发中，完整门槛/现有差距见[F06模块交付](../../F06_MODULE_DELIVERY.md)；0.20.0详情USER PASS已归档，不部署部分F06、不重复旧组，未宣布W03或F06完成。
