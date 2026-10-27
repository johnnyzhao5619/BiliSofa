# BiliSofa project instructions

## Read by task

- Product/architecture: [PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [plan](docs/IMPLEMENTATION_PLAN.md), [ADR-001](docs/adr/001-standalone-tv-runtime.md).
- All implementation: [engineering rules](docs/ENGINEERING.md), [structure](docs/PROJECT_STRUCTURE.md).
- UI/input: [TV UI](docs/TV_UI.md), [TV product design](docs/TV_PRODUCT_DESIGN.md). Current remaining work and grouped acceptance: [closure register](docs/PRODUCT_CLOSURE.md). Platform/media/network/package: [Tizen practices](docs/TIZEN_PRACTICES.md).
- Platform claims: [source register](docs/research/tizen-best-practices-2026-10-14.md). Device/release: [acceptance](docs/ACCEPTANCE.md), [open-source plan](docs/OPEN_SOURCE.md).

## Product invariants

- One standalone Samsung TV app; retain F01–F20 tracking. The user explicitly excluded live features and dependent acceptance branches from the current delivery on 2026-10-21 ([ADR-068](docs/adr/068-current-scope-and-reversible-interactions.md)). Preserve live IDs/code/evidence; the entries are hidden (R02 CLOSED). The user also excluded real dual-account functionality/acceptance from current delivery under ADR-069; preserve existing code and single-account security. Other required features remain in the complete v1.0.0 scope. Internal tasks/test builds are not separate product releases. Never silently remove required features.
- Public release selection (2026-10-26, [ADR-118](docs/adr/118-public-open-source-0651-baseline.md)): the user selected 0.65.1 at `e7bc3740e0fed2f9b2c89f9a83755398fa11faf7` as the public open-source version. Prepare it with explicit limitations; complete v1.0.0 acceptance remains open. Keep the exact software baseline separate from later documentation commits and changed artifact hashes.
- User-approved scope in [ADR-003](docs/adr/003-read-only-comments-danmaku.md): comments, replies and VOD/live danmaku are view-only. F15/F16 remain read-only tracking IDs; no comment/reply editor, comment deletion or danmaku sending. Search retains app-contained pinyin-initial suggestions; other planned account writes keep their existing boundaries.
- Daily operation needs no always-on computer, NAS, LAN gateway or project-hosted cloud service. TV-contained workers/modules are allowed if packaging, permissions and behavior are proven.
- F20 uses unchanged official Bilibili Android/iPhone/iPad senders. Smart View, generic DLNA, URL handoff and screen mirroring alone do not prove compatibility.
- Runtime is WGT/Web with TV-contained Worker/WASM/cURL and AVPlay under ADR-027; current delivery/acceptance is tracked in IMPLEMENTATION_STATUS.md. An API listing, simulator or another TV's result is not this device's proof; implementation is not full acceptance.

## Implementation boundaries

- Remote-first UI has one focus owner (actual DOM focus for Web, native focus for .NET), a return stack and IME ownership. Centralize Tizen/Samsung globals in adapters; no page-level key listeners or direct AVPlay calls.
- Explicit account/session, player and lifecycle state. Cancel/invalidate stale account/media requests and reject late callbacks. Query unknown write outcomes before user-controlled retry.
- Socket Extension calls run in a Worker. Browser networking restrictions do not prove that all Tizen runtimes require an external server.
- Preserve upstream licenses/notices; MIT covers original code. Do not relabel CC-BY-NC documents/data. Record authentication routes rather than embedding another client's identity/keys uncritically.
- No credentials, Samsung keys, DUIDs, personal addresses or raw captures in source/logs. Keep TLS validation, destination scoping and bounded parsing; outside text is never executable content.
- Separate source/API/browser/emulator/device evidence. Device proof is required for codecs/rate/HDR, sockets, casting, lifecycle and persistence. Voice Guide is not a requirement (user decision 2026-10-23, [ADR-089](docs/adr/089-voice-guide-not-required.md)); keep existing ARIA but do not gate on it.
- Match current user authorization. Research/document/skill work does not itself authorize SDK installation, business implementation, TV deployment or GitHub publication. Do not add/run application tests unless the user requests testing or verification.

## Reviewable changes

Name F/W IDs, behavior, permission assumptions, recovery and evidence. Update contracts/ADRs when boundaries change. Keep unverified requirements open; do not claim builds/device passes without actual results.
