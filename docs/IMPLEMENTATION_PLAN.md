# BiliSofa: all-function single-release plan

Date: 2026-10-14. Product release target: one complete v1.0.0. Canonical scope is docs/PRD.md. Architecture constraint is ADR-001: fully on-TV, no external runtime service.

User-approved revision: [ADR-003](adr/003-read-only-comments-danmaku.md) makes comments/replies and VOD/live danmaku read-only. F15/F16 remain traceability IDs merged into reading/display work; remove their editors, publishing/deletion/sending integrations and write acceptance. F03 plans app-contained pinyin-initial input/suggestions. Other planned writes remain.

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

- W01: capture actual model/firmware/engine and privilege matrix; prove Worker/CSP/socket/cURL, package persistence, media, search input/pinyin-initial candidates, Voice Guide and visibility transitions. Full comment/danmaku Chinese editing is no longer a gate. See [platform rules](TIZEN_PRACTICES.md).
- W02: establish [dependency boundaries](PROJECT_STRUCTURE.md), [coding/state/resource rules](ENGINEERING.md), FocusRouter/InputRouter and the [TV UI contract](TV_UI.md); measure a device performance baseline before setting budgets.
- W03–W06: each feature includes empty/loading/error/recovery and focus/Back behavior; F03 also owns search input/candidates. Account generation applies to reads and writes; unknown-write handling applies only to retained write features. Comment/reply/danmaku modules remain read-only.
- W07: add cross-cutting UI/lifecycle/security/package evidence to existing F01–F20 gates. Required items remain UNVERIFIED until actual results. This documentation update does not execute those tests.
