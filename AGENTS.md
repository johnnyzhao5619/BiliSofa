# BiliSofa project instructions

## Read by task

- Product/architecture: [PRD](docs/PRD.md), [architecture](docs/ARCHITECTURE.md), [plan](docs/IMPLEMENTATION_PLAN.md), [ADR-001](docs/adr/001-standalone-tv-runtime.md).
- All implementation: [engineering rules](docs/ENGINEERING.md), [structure](docs/PROJECT_STRUCTURE.md).
- UI/input: [TV UI](docs/TV_UI.md). Platform/media/network/package: [Tizen practices](docs/TIZEN_PRACTICES.md).
- Platform claims: [source register](docs/research/tizen-best-practices-2026-10-14.md). Device/release: [acceptance](docs/ACCEPTANCE.md), [open-source plan](docs/OPEN_SOURCE.md).

## Product invariants

- One standalone Samsung TV app covering F01–F20 in one complete v1.0.0. Internal tasks/test builds are not separate product releases. Never silently remove required features.
- User-approved scope in [ADR-003](docs/adr/003-read-only-comments-danmaku.md): comments, replies and VOD/live danmaku are view-only. F15/F16 remain read-only tracking IDs; no comment/reply editor, comment deletion or danmaku sending. Search retains app-contained pinyin-initial suggestions; other planned account writes keep their existing boundaries.
- Daily operation needs no always-on computer, NAS, LAN gateway or project-hosted cloud service. TV-contained workers/modules are allowed if packaging, permissions and behavior are proven.
- F20 uses unchanged official Bilibili Android/iPhone/iPad senders. Smart View, generic DLNA, URL handoff and screen mirroring alone do not prove compatibility.
- The repository is a document skeleton. Runtime/toolchain choice awaits W01 on retail UN58U8200FFXZC. An API listing, simulator or another TV's result is not this device's proof.

## Implementation boundaries

- Remote-first UI has one focus owner (actual DOM focus for Web, native focus for .NET), a return stack and IME ownership. Centralize Tizen/Samsung globals in adapters; no page-level key listeners or direct AVPlay calls.
- Explicit account/session, player and lifecycle state. Cancel/invalidate stale account/media requests and reject late callbacks. Query unknown write outcomes before user-controlled retry.
- Socket Extension calls run in a Worker. Browser networking restrictions do not prove that all Tizen runtimes require an external server.
- Preserve upstream licenses/notices; MIT covers original code. Do not relabel CC-BY-NC documents/data. Record authentication routes rather than embedding another client's identity/keys uncritically.
- No credentials, Samsung keys, DUIDs, personal addresses or raw captures in source/logs. Keep TLS validation, destination scoping and bounded parsing; outside text is never executable content.
- Separate source/API/browser/emulator/device evidence. Device proof is required for codecs/rate/HDR, sockets, casting, Voice Guide, lifecycle and persistence.
- Match current user authorization. Research/document/skill work does not itself authorize SDK installation, business implementation, TV deployment or GitHub publication. Do not add/run application tests unless the user requests testing or verification.

## Reviewable changes

Name F/W IDs, behavior, permission assumptions, recovery and evidence. Update contracts/ADRs when boundaries change. Keep unverified requirements open; do not claim builds/device passes without actual results.
