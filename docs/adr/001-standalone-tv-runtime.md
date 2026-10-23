# ADR-001: Standalone TV runtime

Date: 2026-10-14. Status: product constraint accepted; W02 implementation route selected with deferred evidence under ADR-027; full product acceptance remains open.

The user requires one installed Samsung TV app and no always-on PC/NAS/LAN service. All previously agreed F01–F20 features and one full v1.0.0 remain required.

Earlier planning chose an external Node gateway for Cookie/session control, media manifests and official-client casting listeners. That was a convenience architecture, not an established platform necessity. It overgeneralized standard browser restrictions to the entire Samsung platform.

Samsung's official Tizen Sockets Extension lists bind/listen/accept and IPv4 multicast, with the internet privilege and worker-thread execution. Its cURL sample builds a signed WGT and runs on TV. These provide a documented standalone candidate; retail UN58U8200FFXZC availability, security policy and practical behavior are not yet proven.

Decision: prioritize Web UI plus on-TV WASM networking/session/casting modules, packaged together in one WGT. Evaluate Tizen .NET as an alternative if the first route fails. Do not adopt an external gateway, sideloaded unrestricted daemon, root access, disabled security checks or a project-hosted credential service as an automatic fallback.

The application being open is the minimum casting prerequisite. Background receiving, automatic launch and power-on are separate lifecycle capabilities; do not assume a terminated app can listen.

If documented candidates cannot support a required function under the target device's available privileges, report the evidence and the blocked requirement. Do not silently drop official casting or change the no-external-service requirement.

Sources:
- https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html
- https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html
- https://developer.samsung.com/smarttv/develop/faq/tizen-net-tv.html

2026-10-17 implementation decision: [ADR-027](027-w02-runtime-and-deferred-evidence.md) adopts the measured WGT/Web plus on-TV WASM/AVPlay route for W02. User-skipped cloud-progress and unavailable high-quality proofs remain UNVERIFIED, not passed or removed. Historical candidate statements above describe the original investigation.
