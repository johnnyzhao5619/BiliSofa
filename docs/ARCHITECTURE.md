# Standalone architecture

## Required user flow

Install BiliSofa on the TV → launch → scan login QR → browse/watch/interact directly. The development computer can be shut down. Official phone/tablet casting uses the TV's receiver while the app is running; the phone is the sender, not a permanent server.

## Preferred candidate: one WGT, Web UI + WASM Worker

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

[ADR-003](adr/003-read-only-comments-danmaku.md) removes comment/reply authoring, comment deletion and VOD/live danmaku sending. Their modules only receive/query, parse and render; they expose no editor or corresponding write command. F15/F16 remain tracking IDs merged into F10/F08/F18. Search owns app-contained pinyin-initial input/candidate selection. WriteCoordinator continues to serve retained actions such as likes, collections, follows, coins and progress; this scope change does not authorize real-account testing.

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

Follow [structure and dependency directions](PROJECT_STRUCTURE.md), [state/resource rules](ENGINEERING.md), [remote UI contracts](TV_UI.md) and [Tizen platform constraints](TIZEN_PRACTICES.md). These define the candidate implementation; runtime choice and hardware capabilities remain gated by W01.


W01/W04媒体候选补充：[ADR-004](adr/004-tv-contained-media-bridge-probe.md)规定电视内有界媒体桥；0.0.15先落地固定guest详情/playurl及两轨512bytes源检查，签名CDN URL不跨Worker/UI边界、不进入普通存储或诊断。此时未部署真实媒体桥或扩大loopback配置，最终runtime继续由W01门槛决定。
