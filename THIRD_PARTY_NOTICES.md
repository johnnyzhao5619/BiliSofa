# Third-party notices

No third-party application source has been copied into the tracked application implementation. The following remain research/possible reuse sources:

| Source | License | Planned treatment |
| --- | --- | --- |
| titlog/bilibili-tizen, 76003faf3ae1a647a92c532b968e4896427530cb | MIT | Preserve original notice for any copied module |
| asdf17128/bili-webos, e38ed9a83f12d9561a2ecf129c30af615dfc1ee1 | MIT | Audit portable modules; retain copyright |
| shaka-project/shaka-player | Apache-2.0 | Keep license and applicable NOTICE if bundled |
| Samsung SDK/extensions | Vendor terms, to verify per SDK | Record package license and redistribution conditions before bundling |
| bilibili-plugins/bilibili-api-collect | CC-BY-NC 4.0 declared by source | Cite as research; do not copy the document corpus and relabel MIT |

Before adding a dependency or vendor file, record its exact version, source, license, attribution and modifications here. Original project MIT does not relicense dependencies or third-party trademarks/content.

## Installed development dependencies, 2026-10-14 (W01/W02)

All are exact versions in package-lock.json. No third-party runtime is bundled by the basic probe; TypeScript/esbuild transform original project code. Full installed licenses remain in node_modules and the source URLs below. No upstream modifications.

| Dependency | Version | Source | License | Use |
| --- | --- | --- | --- | --- |
| typescript | 5.9.3 | https://github.com/microsoft/TypeScript | Apache-2.0 | Static checking |
| esbuild / @esbuild platform binary | 0.28.2 | https://github.com/evanw/esbuild | MIT | Local build and test loader |
| @playwright/test / playwright / playwright-core | 1.64.1 | https://github.com/microsoft/playwright | Apache-2.0 | Desktop UI tests only |
| @types/node | 24.10.1 | https://github.com/DefinitelyTyped/DefinitelyTyped | MIT | Development type definitions |
| undici-types | 7.16.0 | https://github.com/nodejs/undici | MIT | Node type definitions |

Chromium for Testing 156.0.8078.4 (Playwright build 1248) and FFmpeg build 1013 are installed by Playwright in the host cache for tests, not distributed in the TV package. Their upstream bundled notices remain with the downloaded tools.

## Samsung SDK, private development-only download

- Source: https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/download.html
- Official macOS archive: emscripten-1.39.4.7-mac.zip (downloaded 2026-10-14 into ignored `.local/`).
- SHA-256: `aef131c53c5c01c521862c25ee4331708ba9bda0951a3fea105675c58b34e810`.
- Original archive contains Emscripten MIT / University of Illinois-NCSA notices and multiple dependency licenses. No SDK code/binary is included in the basic WGT or public source.
- W01 native generated runtime/dependency notices are now retained under `platform/wasm-network/licenses` and bundled into the separate native WGT. This is probe redistribution preparation; final product security/permissions/runtime selection remains open. Tool download/host execution is not device proof or authorization to relabel vendor code.

## W01 native probe bundled components

| Component | Exact version / provenance | License and retained notice |
| --- | --- | --- |
| Samsung Emscripten/Tizen generated runtime | Official macOS SDK 1.39.4.7, archive hash above | MIT / University of Illinois-NCSA; Emscripten LICENSE/AUTHORS and Samsung attribution |
| cURL | 7.68.0, official SDK port; curl.haxx.se/download/curl-7.68.0.tar.bz2 | curl license; COPYING retained |
| OpenSSL/libcrypto/libssl | 1.1.1d, official SDK port; openssl.org/source/old/1.1.1/openssl-1.1.1d.tar.gz | OpenSSL + original SSLeay licenses and required acknowledgements retained |
| zlib | 1.2.8 / emscripten-ports version_1 | zlib license retained |
| musl / compiler-rt / libcxxabi | System runtime in the fixed Samsung SDK | SDK's original COPYRIGHT/LICENSE texts retained |
| Mozilla CA root certificate data | Unmodified 2026-09-25 curl conversion, SHA-256 a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505 | MPL-2.0; full license, stable CA source URL and attribution retained; public roots preloaded into probe.data |

`platform/wasm-network/licenses/manifest.json` fixes notice hashes and versions. The native package contains these files under `third-party-licenses/`; no private signing/session material. [CA source/license](https://curl.se/docs/caextract.html), corresponding source https://curl.se/ca/cacert-2026-09-25.pem.

SDK port source archives were fetched and verified against their built-in SHA-512 values:

- curl: `ad7390fd700cb74db356a39e842dab011823b87d4047687f2a8c2e0f2920a4f8c6c193ba56391489a75939cc5c39a4dccec4e4ceeac516eb7394f03e0fb7aeae`
- OpenSSL: `2bc9f528c27fe644308eb7603c992bac8740e9f0c3601a130af30c9ffebbf7e0f5c28b76a00bbb478bad40fbe89b4223a58d604001e1713da71ff4b7fe6a08a7`
- zlib: `77f7d8f18fe11bb66a57e358325b7422d721f7b506bd63293cfde74079f958864db66ead5a36c311a76dd8c2b089b7659641a5522de650de0f9e6865782a60dd`

No upstream source edits. Generated JS uses relative package output names and replaces the packager's random metadata UUID with the CA content hash for reproducible files; original notices retained. Runtime versions are legacy SDK dependencies and are not approved as the final authenticated product network stack. The probe uses only a fixed guest HTTPS URL/synthetic cookie engines, keeps TLS verification enabled, and remains device-unverified.

## Tizen CLI development tools only

Official Tizen Studio 6.1 web-cli macOS installer: https://download.tizen.org/sdk/Installer/tizen-studio_6.1/web-cli_Tizen_Studio_6.1_macos-64.bin ; SHA-256 `1630194c222776093785b274554461f896243dfa6b59581928047816fab75a80`. Includes CLI 2.5.25, SDB 4.2.25 and Corretto JDK 8.322.06.1. The complete SDK/installer license files remain unmodified in ignored `.local` under vendor/Open Source terms. sdk.info is local install configuration, not a vendor source change. These tools/binaries are not distributed in public source or either WGT; original project MIT does not cover them. No certificates generated, profiles replaced, signing or TV connection performed.

## W01 synthetic media preparation

Original generated green rectangle/fade and low-volume sine fixtures use host FFmpeg 9.0.1 (libx264 encoder), commands in tools/media-probe.py. FFmpeg/x264 executables/libraries are development tools and are not redistributed in the TV package. No third-party video/audio/content/font files are imported. Internal WGT embeds only the generated DASH manifest/H.264/AAC segments, with SHA-256 in native/manifest.json; generated output remains a capability sample rather than Bilibili playback/entitlement evidence.

## F03 local search-word data (internal 0.0.10)

The unchanged AOSP PinyinIME dictionary and AOSP-NOTICE are retained in `packages/search/data`, pinned to commit `49aebad1c1cfbbcaa9288ffed5161e79e57c3679` (Copyright 2009 The Android Open Source Project; Apache-2.0). Source URLs, original hashes and deterministic transformation are recorded in that directory's README. No upstream IME application/engine code is copied. Original BiliSofa matching/Worker/UI code remains MIT; upstream data and derived word lists retain Apache-2.0 attribution.

Both WGT variants now bundle `search-words.json` (64,816 deduplicated word/initial pairs, SHA-256 `c723c86e502613bdaf3c613b5638ece0fe38772d92165b48f2d3ca140ba3256b`) and the complete unchanged `search-NOTICE` (SHA-256 `b5830d96fb5a7e7e7ebcc295f352846b4b998e78fdc8f9aa68e134d2e4b39986`). The 3,570,346-byte UTF-16 upstream dictionary stays in the source snapshot, not the WGT; the derived JSON is 1,052,146 bytes. Build/sign gates verify data and notice hashes. This list supplies local word suggestions, not Bilibili content, hot-search results, or an input editor for comments/danmaku.


## F20 protocol research and original candidate parser (0.0.20)

Macast-plugins author xfangfang, nirvana/nirvana.py at commit `e4a18457aa7addd3a46041420d277343b66647ee` (self-reported 0.33), source SHA-256 `8a8678f2894aca5be4ad01f20e19bcb8b6e27f4f8bc4303a0e8eb0d7fb62b3b3`, was inspected as first-party implementation evidence. No Python source, client keys, package identity or third-party runtime from that project is bundled. The NVA candidate decoder, anonymous vectors and discovery probe are original BiliSofa code based on observed wire facts; interoperability remains unverified. The upstream root MIT license does not complete a per-component audit for any future code reuse. Exact links, license hash and scope are retained in docs/research/f20-nva-candidate-2026-10-15.md. UPnP terminology/specification research is attributed in docs/F20_PROTOCOL_EVIDENCE.md; the probe is not a certified or complete renderer.


## F20 original SOAP parser and probe replies (0.0.22)

Original MIT BiliSofa code uses wire facts researched in OCF UPnP AVTransport v1 (https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf), including argument names, faults and no-media state. No specification XML, implementation code, keys or new third-party runtime is copied. The bounded XML/time/action subset and limited service descriptions are not a claim of complete UPnP/DLNA conformance or certification; real sender/media compatibility remains open.


0.0.23 original parser compatibility research additionally checked XML 1.0 declaration grammar (https://www.w3.org/TR/xml/) and the SOAP profile/encodingStyle rules in UPnP Device Architecture 1.1 (https://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf). No document text/schema or implementation source was copied. iPad HD/Lebo research is documentation only; no SDK, proprietary identity or dependency was downloaded or bundled.


0.0.25 adds original BiliSofa cURL multi source-probe code, with the same fixed bundled SDK/cURL/OpenSSL notices above and no additional dependency. It tests only a scoped HTTPS CDN candidate, one 512-byte range per foreground lease; no account headers/cookies/identity or HTTP fallback. API facts were checked against curl_multi_perform, CURLOPT_URL and SSL verification documentation linked in ADR-005. No upstream implementation/schema is copied. Legacy SDK dependencies remain probe-only, not an approved authenticated product stack.


0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。


0.0.28 W01/F20内部候选：progressive HTTP与有界续段见docs/adr/007-progressive-mp4-http-probe.md（docs内为adr/...）。八个C文件修改后已实际Samsung SDK重编译；仍为probe-only旧网络依赖，不批准真实账号产品栈。无新依赖/权限/外部服务/复制客户端身份或实现；新增HTTP/API事实仅按官方RFC/Samsung枚举，保留原第三方许可。TV新包声画仍需用户反馈，不能把prepare失败或HOST通过更改为实际播放PASS。
