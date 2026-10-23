# Standalone architecture

## Required user flow

Install BiliSofa on the TV → launch → scan login QR → browse/watch/interact directly. The development computer can be shut down. Official phone/tablet casting uses the TV's receiver while the app is running; the phone is the sender, not a permanent server.

## W02 selected route: one WGT, Web UI + WASM Worker

| Component, all inside TV | Responsibility |
| --- | --- |
| TvShell / FocusRouter | Pages, remote, IME, return stack, lifecycle |
| BiliClient / SessionManager | QR flow, per-account sessions, requests, CSRF/signatures, identity and expiration |
| WASM NetworkRuntime | Tizen Sockets Extension/cURL, necessary headers, HTTPS, local HTTP manifest delivery, TCP/UDP receiver |
| WriteCoordinator | Deliberate writes, duplicate guard, state re-read, unknown-result handling |
| PlayerAdapter | AVPlay and Shaka/MSE, supported codecs/qualities/speed, actual playback state |
| OverlayTimeline | Subtitles, danmaku and comments synchronized to player |
| CastReceiver | SSDP/DLNA/NirvanaControl candidates, official sender commands, state and ownership |
| LocalStore / Diagnostics | On-device private session/settings, redacted local diagnostics |

## Read-only content boundary

[ADR-003](../../adr/003-read-only-comments-danmaku.md) removes comment/reply authoring, comment deletion and VOD/live danmaku sending. Their modules only receive/query, parse and render; they expose no editor or corresponding write command. F15/F16 remain tracking IDs merged into F10/F08/F18. Search owns app-contained pinyin-initial input/candidate selection. WriteCoordinator continues to serve retained actions such as likes, collections, follows, coins and progress; this scope change does not authorize real-account testing.

W02 seventh batch wires the public `ContentRuntime` to the existing anonymous popular Worker; pages supply typed routes, not URLs or credentials. `RetainedWrites` is the application's durable write gate under a verified account request lease, replacing the old in-memory-only write model at the composition boundary. It persists and reads back pending before dispatch, retains unknown across account removal/restart, and never treats cancellation as remote rollback. No mutation endpoint or private content route is added in this batch. See [ADR-033](../../adr/033-content-and-durable-write-boundary.md) and [delivery/evidence](../../W02_NETWORK_APP.md).

WASM module and JS/UI communicate by bounded messages. Socket/cURL work runs in a Worker. Do not transfer complete credentials through UI events or general debug logs. Maintain a separate cookie/session context per account. Credentials only go to specifically required Bilibili destinations; signed media URLs should not automatically receive account cookies.

Networking runs on the TV. A possible loopback HTTP MPD endpoint, if the player requires it, is internal to the app rather than an external LAN service. Validate loopback reachability, port ownership, cleanup and binding. Casting receiver listeners use the TV LAN interface only when the feature is enabled and running.

Render externally supplied text as text. Bound protocol body sizes, connection counts, message rate and memory. Validate media URLs/redirects before use to avoid an arbitrary proxy or resource access endpoint. Keep TLS certificate validation enabled.

Package: prefer one WGT including UI, worker, WASM and required libraries/assets. Pin dependencies and package all runtime code locally. No mandatory remote JS bootstrap.

## Alternative candidate: Tizen .NET application

Tizen .NET is an official development route. Evaluate managed HttpClient/CookieContainer and TCP/UDP socket behavior, TV UI and media APIs as a second standalone candidate. It may require a TPK and different UI/player integration; a .NET component cannot simply be dropped into a WGT.

Before selecting this route, prove package installation/persistence on the actual retail device, UI/media behavior, accessible privileges, account isolation and casting. Do not rely on native library interop that requires ungranted partner privileges. Prefer one complete TPK with one visible App entry if selected.

## Decision gates

The official API listing is evidence of a candidate, not proof for the exact TV. Verify certificate/privileges, worker operation, socket listen and multicast, cURL TLS/headers/cookies, account flows, local MPD and official casting on the retail TV before locking the implementation route.

If both candidates are blocked, record the exact limits and ask the user to decide any product constraint change. No external gateway architecture is authorized as the product baseline.

## Engineering boundaries

Follow [structure and dependency directions](PROJECT_STRUCTURE.md), [state/resource rules](../../ENGINEERING.md), [remote UI contracts](../../TV_UI.md) and [Tizen platform constraints](../../TIZEN_PRACTICES.md). These define the candidate implementation; runtime choice and hardware capabilities remain gated by W01.


W01/W04媒体候选补充：[ADR-004](../../adr/004-tv-contained-media-bridge-probe.md)规定电视内有界媒体桥；0.0.15先落地固定guest详情/playurl及两轨512bytes源检查，签名CDN URL不跨Worker/UI边界、不进入普通存储或诊断。此时未部署真实媒体桥或扩大loopback配置，最终runtime继续由W01门槛决定。

2026-10-17: [ADR-027](../../adr/027-w02-runtime-and-deferred-evidence.md) selects this route for W02 based on exact-device evidence and user-deferred gates; F07/F19 and full media/cast matrices are not accepted by this decision. AVPlay is the primary measured backend. Evaluate an additional media backend only for a concrete unmet required capability.

W02 multi-account foundation: [ADR-028](../../adr/028-protected-multi-account-foundation.md) defines protected fixed slots, identity-gated authority, bounded confirmed cleanup and TvShell composition. The real QR/Worker adapter and new device storage layout remain unverified.

W02 identity composition: [ADR-029](../../adr/029-identity-worker-and-account-package.md) isolates QR/nav-only Worker/native transport from W01 progress probes, releases private results only after native closure, and packages the account UI with protected storage under an independent internal app identity. General content/media transport and target-device acceptance remain open.

W02 media composition: [ADR-030](../../adr/030-owned-media-in-account-app.md) introduces one-use MediaSession with independent decoder/native closure facts. The account app mounts anonymous guest playback through the existing shell resource owner; no account cookie crosses into guest workers. Product playback limits, cast composition and new-device acceptance remain open.

W02 receiver composition: [ADR-031](../../adr/031-foreground-cast-workspace.md) places the existing bounded official-sender protocol behind ReceiverLink and CastWorkspace in the single TvShell. Source generations require decoder ACK, native bridge closure and independent new-source readiness. Account credentials never enter this anonymous receiver; new app/device acceptance and product-length sessions remain open.

W02 local profiles: [ADR-032](../../adr/032-local-profile-and-resume.md) separates bounded ordinary preference/viewing records from protected credentials. Pages capture a fixed verified-account or guest partition; actual media observations are flushed before teardown and natural completion removes the matching local bookmark. Diagnostics accepts only a fixed vocabulary without user/content identifiers. Cloud writes, opaque cast-source attribution and new-device persistence remain open.


W03私人内容按ADR-044引入可选AccountRuntime.readWatchLater与platform/account-runtime；AccountWorkspace提供身份租约，独立library Worker/C仅nav→固定稍后再看GET，规范化DTO无凭据/URL/媒体权限。未知关闭阻止复用，失效账号隐藏DOM；UI关闭等待原生操作而非包含shell失效转换的上层读取，以免资源互等。


W03收藏只读沿ADR-046：账号私有lane在nav核对后读取固定导航/collection3分页，folder ID仅platform内存，UI持快照代次的临时选择引用；嵌套owner逐层Back，未知关闭禁止复用。


W03/F04关注更新沿ADR-047共享私有账号lane，固定feed/nav GET、内存不透明游标与四卡页；更新导航摘要与完整图文动态保持不同实现状态，不把账号源端链接交给页面。


W03本机队列沿ADR-048：普通KV按固定身份存有限BVID/标题与连播开关，media/queue持显式运行的不可变快照和代次，每次换项等待MediaSession解码器与原生双关闭。匿名源每项重取，无凭据交接/云写入。
