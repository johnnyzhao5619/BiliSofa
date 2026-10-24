# Standalone runtime research, 2026-10-14

The earlier external Node gateway solved browser header/cookie, MPD and casting listener tasks. It was a convenience option, not proven necessary for Samsung TV hardware. It violates the user's clarified standalone requirement and is superseded.

## Fresh official evidence

1. Tizen Sockets Extension API lists bind/listen/accept, TCP/UDP and IPv4 multicast. It requires the internet privilege and Worker-thread use. This is stronger than standard browser networking and makes on-TV receiver/network runtime a concrete candidate.
   https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html
2. Samsung's cURL CLI guide builds cURL/SSL in WASM, runs through a Worker, packages WGT and installs it on a TV. It is a candidate for request-header/session control within the TV process.
   https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html
3. Samsung Tizen .NET guidance supports actual-device testing for 2019+ models; native .so interop has additional partner/signing restrictions. This is an alternative to evaluate, not a prevalidated replacement.
   https://developer.samsung.com/smarttv/develop/faq/tizen-net-tv.html
4. General specs describe Tizen/.NET model-year frameworks; actual upgraded firmware must still be queried on the target TV.
   https://developer.samsung.com/smarttv/develop/specifications/general-specifications.html
5. Official .NET CookieContainer documentation describes per-client cookie contexts; Tizen device behavior still needs testing.
   https://learn.microsoft.com/en-us/dotnet/api/system.net.cookiecontainer

## Limits and status

No SDK installed, socket package compiled, retail-device deployment, authenticated API test or cast test was performed during initialization. API availability on a documentation page does not establish this TV's actual permissions or behavior.

Normal browsing/playing does not inherently require a home server. Casting discovery/control and multi-account session handling require more powerful on-device networking than plain JS; use documented extensions or .NET rather than assuming they must live outside the TV. A receiver runs while the app's lifecycle permits it; closing the app or powering off the TV is not a promise of persistent receiving.

References from prior rounds are preserved in history. Their networking claims and mandatory gateway recommendation must not override current ADR-001.

## Tizen development practices

The [2026-10-14 official-source research](research/tizen-best-practices-2026-10-14.md) adds remote/IME/Voice Guide, lifecycle, media, configuration/security, performance, signing and evidence practices. It preserves the standalone runtime candidate and does not establish retail-device compatibility.


## F20 接收协议证据准备

2026-10-14一手[Bilibili投屏帮助](https://www.bilibili.com/blackboard/activity-U_aG4BWWl.html)核查及当前证据矩阵见[F20_PROTOCOL_EVIDENCE](F20_PROTOCOL_EVIDENCE.md)。帮助页的使用条件不提供完整接收协议；开放平台入口抓取无正文，不从中推断不存在SDK/授权路线。本机官方发送端未验证，底层socket/合成媒体结果不关闭F20。
