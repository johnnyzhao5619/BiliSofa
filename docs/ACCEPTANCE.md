# Acceptance register

Status: all feature results below are UNVERIFIED. Repository initialization is not implementation acceptance.

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
| F11 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F12 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F13 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F14 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F15 | UNVERIFIED | Read-only comments/replies with F10: sorting/pagination/recovery/safe text/focus; no editor, publish/reply/delete action or corresponding write request |
| F16 | UNVERIFIED | Read-only VOD/live danmaku with F08/F18: display/settings/timeline/recovery; no editor/send action or corresponding write request |
| F17 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F18 | UNVERIFIED | Actual live content/quality/recovery and read-only live danmaku; no live-danmaku send; other planned live functions retained |
| F19 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |
| F20 | UNVERIFIED | Target-TV result, source/API evidence where applicable; actual OS/firmware/account/content conditions |

## Cross-cutting gates

- Official casting from unchanged Android/iPhone/iPad Bilibili apps, actual media playback and bidirectional control. A discovered name is not success.
- Target TV resolution, HDR, sound, speed, subtitles and danmaku synchronization; desktop/emulator results are separate.
- At least two accounts, login/expire/switch/logout, true source-end reads and retained writes with no cross-account leakage; comment/reply/danmaku reads must not trigger their excluded write endpoints.
- At least 30 ordinary videos plus available PGC/live/high-quality samples. Two-hour mixed-play endurance, network interruption, Home/sleep, rapid navigation, version upgrade and rollback.
- Network parsing limits, approved UI acceptance of casting, TLS validation, credential scoping, no repeated ambiguous writes, no arbitrary content execution.
- App stays functional after installation/development machine shutdown and power cycle.

Each test record must contain: feature ID, steps, expected/actual behavior, TV/firmware, sender App/OS version, account/content entitlement and region, anonymized evidence, PASS/FAIL/BLOCKED. Required failures remain unfinished.

## Tizen engineering gates (UNVERIFIED)

- UI: direction-only Smart Remote navigation, one actual/visual focus, list restoration, dialog ownership, search-input/candidate/Back ordering and Voice Guide; no required numeric/colored key. Full Chinese comment/danmaku editing is excluded.
- Lifecycle: foreground→Home/input switch→resume, long hidden interval/expired URL, network change, sleep/power cycle and full process recreation; no duplicate listeners/socket/player or lost essential state.
- Package/security: minimal privileges and signer level, actual CSP/WASM compatibility, no required dev server, private session storage, scoped credentials/redirects, bounded LAN parsing, stable upgrade identity/data migration.
- Performance: record cold-start interactive time, key feedback, first frame, seek recovery, dropped frames, peak/mixed-play memory and two-hour growth; budgets derive from target-device baseline.
- Media/network/cast: separate DOM/MSE, AVPlay, Worker and retail-device evidence; include actual resolution/HDR/rate/audio and all three official sender platforms.

Evidence record additionally includes package SHA-256, source revision, build/tool versions, signer profile identifier without secrets, local test date and redacted attachment locations. These are planned gates, not completed tests. See [TV UI](TV_UI.md), [platform practices](TIZEN_PRACTICES.md) and [source register](research/tizen-best-practices-2026-10-14.md).
