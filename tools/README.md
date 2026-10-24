# Development tools

Build/type/test/unsigned packaging tools are executable. `build.mjs` bundles only original local probe resources and records source hashes; `package.py` creates a deterministic unsigned WGT; `verify-package.py` checks package identity/entry/hash and private-file boundaries. `native-probe.py` separately checks C syntax or invokes an explicit Samsung compiler with a CA bundle. No command implicitly signs, installs, connects a TV or publishes.

These tools run on the development computer. Shipped local probe resources need no dev server; actual installation/independent cold-start acceptance is still unverified. See docs/DEVELOPMENT.md and docs/archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md.

`python3 tools/sign-probe.py basic` (or `native`) explicitly uses the user's BiliSofa profile and writes signed packages/logs outside the repository. It rejects the SDK default Distributor, expired/not-yet-valid embedded certificates, non-Samsung leaf issuers and altered packaged resources. It does not change profiles, accept passwords, install or run a package. Certificate date/issuer checks do not establish chain trust; the TV must accept the signature separately.

`media-probe.py generate/check` prepares/checks original synthetic media with host ffmpeg/ffprobe, no downloads/accounts/deployment. `collect-probe.py collect` explicitly reads the single private authorized target fixed diagnostic route, without proxy/redirect, with bounds and the shared TS schema + expected source match; it is never an account/network proxy. Internal `BILISOFA_PROBE_AUTORUN=1` only enables one guest/synthetic run at startup (0.0.9 also writes/reads/removes one owned nonsecret KeyManager value); default build remains manual, mode is verified in package metadata. Native packaging checks exact CA/media data layout and embedded fixture provenance.

`initials-data.py` checks the pinned AOSP dictionary/notice and derives local search-word data (no downloads in build). Basic/native packaging and signing reject data/notice/provenance mismatches. Search word queries run in a separate local Worker; no Bilibili search request, comment/danmaku authoring or credential operation is added.


`npm run test:native:cast-source`：HOST mock-cURL策略、512byte范围回调、TLS/redirect选项与取消/未知清理的13项测试（含候选确认、私有转移与失效），不访问网络，不是TV/CDN证明。0.0.25 native源码校验覆盖新增probe-cast-source.h在内的八个C文件；修改任何一个须实际SDK重编译。


0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。
