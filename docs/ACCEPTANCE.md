# Acceptance register

Current execution: [R01–R15 closure register and final T1–T8 grouped checks](PRODUCT_CLOSURE.md), with the [TV product design](TV_PRODUCT_DESIGN.md), under ADR-070. This page retains full-feature gates; it does not create a second independent manual test campaign. Productization has implemented and user-tested groups. The U5 grouped device acceptance V1–V6 passed on 0.51.3 ([report](acceptance/2026-10-23-u5-final/REPORT.md)); full v1.0.0 acceptance remains open while R08/R12/R14 are paused, image/text dynamics are blocked and the conditional items in that report are unverified. The last independent acceptance (installed 0.43.0) used [this brief](archive/2026-10-23-superseded/THIRD_PARTY_ACCEPTANCE_PROMPT.md) and produced [this report](acceptance/third-party/2026-10-22T213335-0400/REPORT.md); a new acceptance needs a brief written for its own build.

Status: full-feature acceptance remains incomplete. Minimal USER PASS groups and frozen package evidence are maintained in [implementation status](IMPLEMENTATION_STATUS.md) and the [test report](TEST_REPORT.md); UNVERIFIED below means the full feature gate is still open, not that no implementation or device evidence exists. Live features/dependent branches are EXCLUDED from current delivery by the latest user instruction ([ADR-068](adr/068-current-scope-and-reversible-interactions.md)); keep prior evidence/code, and hide current entries in the next candidate.

Current scope follows the user-approved [ADR-003](adr/003-read-only-comments-danmaku.md). Comments/replies and VOD/live danmaku are view-only; F15/F16 retain IDs but no longer require authoring, deletion or sending. Removing those requirements is not a PASS.

Required product proof: disconnect/shut down every development computer and external runtime service, then launch and use BiliSofa on the TV. Ordinary router/Internet and official casting phone are allowed.

| Feature | State | Evidence required |
| --- | --- | --- |
| F01 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F02 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F03 | UNVERIFIED | Target-TV pinyin-initial input, suggestions and actual search; hot/history/type filters, clear/Back/focus and empty/error recovery |
| F04 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F05 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F06 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F07 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F08 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F09 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F10 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F11 | Requested normal paths USER PASS; final faults OPEN | 0.43 follow/restore, exact-folder cancel/add/remove/restore and Back/Home USER PASS; like/watch-later inherit prior evidence. Do not repeat writes; identity/unknown fault integration remains separate |
| F12 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F13 | Current delivery EXCLUDED by user | ADR-069: real dual-account functionality/A-B acceptance not required; retain code/evidence and single-account identity, storage, session/lifecycle security |
| F14 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F15 | UNVERIFIED | Read-only comments/replies with F10: sorting/pagination/recovery/safe text/focus; no editor, publish/reply/delete action or corresponding write request |
| F16 | UNVERIFIED / live EXCLUDED | Read-only VOD display/settings/timeline/recovery with F08; live-dependent acceptance excluded under ADR-068; no editor/send action or corresponding write request |
| F17 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F18 | Current delivery EXCLUDED by user; prior browse PASS/playback FAIL retained | ADR-068; current entry hiding pending; excluded is not PASS or a promised future version |
| F19 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F20 | UNVERIFIED / live EXCLUDED | Unchanged official Android/iPhone/iPad senders: non-live playback/control/recovery remains required; live-dependent acceptance excluded under ADR-068 |

## Cross-cutting gates

- Official casting from unchanged Android/iPhone/iPad Bilibili apps, actual media playback and bidirectional control. A discovered name is not success.
- Target TV resolution, HDR, sound, speed, subtitles and danmaku synchronization; desktop/emulator results are separate.
- Single-account login/expiry/re-login/logout, protected storage, guest/account separation and stale-request rejection; real A/B account functionality and acceptance are excluded by ADR-069. True source-end reads and specifically authorized retained writes remain required; comment/reply/danmaku reads must not trigger excluded write endpoints.
- At least 30 ordinary videos plus available PGC/high-quality samples for W07; live-dependent samples are excluded under ADR-068. Two-hour mixed-play endurance, network interruption, Home/sleep, rapid navigation, version upgrade and rollback.
- Network parsing limits, approved UI acceptance of casting, TLS validation, credential scoping, no repeated ambiguous writes, no arbitrary content execution.
- App stays functional after installation/development machine shutdown and power cycle.

Each test record must contain: feature ID, steps, expected/actual behavior, TV/firmware, sender App/OS version, account/content entitlement and region, anonymized evidence, PASS/FAIL/BLOCKED/DEFERRED. Required failures remain unfinished; DEFERRED requires an explicit scope decision and is never PASS.

## Tizen engineering gates (UNVERIFIED)

- UI: direction-only Smart Remote navigation, one actual/visual focus, list restoration, dialog ownership, search-input/candidate/Back ordering (Voice Guide removed as a requirement by ADR-089); no required numeric/colored key. Full Chinese comment/danmaku editing is excluded.
- Lifecycle: foreground→Home/input switch→resume, long hidden interval/expired URL, network change, sleep/power cycle and full process recreation; no duplicate listeners/socket/player or lost essential state.
- Package/security: minimal privileges and signer level, actual CSP/WASM compatibility, no required dev server, private session storage, scoped credentials/redirects, bounded LAN parsing, stable upgrade identity/data migration.
- Performance: record cold-start interactive time, key feedback, first frame, seek recovery, dropped frames, peak/mixed-play memory and two-hour growth; budgets derive from target-device baseline.
- Media/network/cast: separate DOM/MSE, AVPlay, Worker and retail-device evidence; include actual resolution/HDR/rate/audio and all three official sender platforms.

Evidence record additionally includes package SHA-256, source revision, build/tool versions, signer profile identifier without secrets, local test date and redacted attachment locations. These are planned gates, not completed tests. See [TV UI](TV_UI.md), [platform practices](TIZEN_PRACTICES.md) and [source register](research/tizen-best-practices-2026-10-14.md).
