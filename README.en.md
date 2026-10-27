# BiliSofa

**Watch Bilibili from your sofa, on a Samsung Tizen TV.**

[简体中文](README.md) · [Quick install](docs/QUICK_INSTALL.en.md) · [Download 0.66.0 preview](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [0.65.1 baseline](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1) · [Service terms risks](docs/BILIBILI_TERMS_RISK.md)

BiliSofa is an independent, remote-control-first Bilibili client for Samsung Tizen TVs. It started with a practical frustration: there was no usable Bilibili app on the overseas Samsung Tizen TV I used, making big-screen viewing inconvenient.

The app runs on the TV. A computer is needed for installation and updates, but everyday viewing requires no always-on computer, NAS, LAN gateway or project-hosted cloud service. Internet access to Bilibili and its CDNs is still required.

This community project is not affiliated with, endorsed by or certified by Bilibili or Samsung. It connects to the mainland China Bilibili service; it is not a client for the separate international service and does not extend regional or membership rights.

## Purpose, content and rights

**The author provides this project free of charge for learning and testing, with no profit-making activity at present.** This describes the author's current operation and purpose; it does not add restrictions to the standard MIT license.

Runtime videos, audio, covers, subtitles, comments and danmaku come from **Bilibili and its associated delivery infrastructure**. The project does not host its own programme library or offer offline programme downloads, export or permanent saved copies. It is not intended to alter programme content or harm Bilibili or other rights holders.

Online playback still transfers media data and uses temporary buffering. The app also caches covers / lists, keeps local records and generates a local playback manifest. These facts rule out an absolute “no caching or processing” claim. Original UI, local dictionary data and synthetic diagnostic samples are separate from Bilibili programme content.

If Bilibili or another rights holder believes the project infringes its rights, please contact the author through [Issues](https://github.com/johnnyzhao5619/BiliSofa/issues). **The author is willing to promptly review concerns and take down affected releases or stop distribution / functions at any time.** See [rights contact](RIGHTS.md). Learning / testing, nonprofit operation and willingness to remove releases do not establish platform permission or immunity.

## Version and compatibility

The selected public release is **0.65.1**, with software fixed at commit [`e7bc3740e0fed2f9b2c89f9a83755398fa11faf7`](https://github.com/johnnyzhao5619/BiliSofa/commit/e7bc3740e0fed2f9b2c89f9a83755398fa11faf7). This is a public open-source version, without a claim that all v1.0.0 acceptance work is complete.

Recorded device evidence is specific to **Samsung UN58U8200FFXZC / Tizen 9.0** and the paths described in the records. The package requires Tizen 9.0. Other models and firmware versions are unverified. See the [release notes](docs/releases/0.65.1.md) for evidence and limitations.

The separate [0.66.0 preview](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0) adds user-entered website selection and local service configuration. Compilation and static package checks passed; TV runtime, installation and upgrade acceptance have not been performed for this build. Earlier device results do not apply to it. The frozen 0.65.1 baseline remains available separately.

## Features

- Browse recommendations, popular videos, rankings and categories; search videos, creators and series, with local pinyin-initial word suggestions.
- Watch on-demand videos and series with part / episode selection, queues, local resume, available quality / audio choices and 1× / 2× playback.
- Read subtitles, danmaku, comments and replies. Posting comments, replies or danmaku is outside the current scope.
- Sign in by QR code, access personal libraries and use retained likes, favorites, watch-later, following and series-following actions.
- Receive casting while the TV app is in the foreground and reception is explicitly enabled. Requested Android / iPhone paths have device records; the full iPad and sender-content matrix is incomplete. Official, unmodified Bilibili sender apps are used; this is not official certification.

Known limits include blocked article / following-feed sources, paused coin / triple actions, unverified two-way cloud progress, fractional speed limitations on the measured TV, and incomplete HDR, endurance and rollback evidence. Live features and real dual-account use are excluded from the current delivery. Account rights, region, source availability and device capability apply to every feature.

## Install and use

The documented route is **Developer Mode sideloading of a WGT signed with your own Samsung TV certificate**. This is not an Android APK or a promised TV-store, USB or TV-browser installation.

Download the [0.66.0 preview WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt), then follow the [five-step Apps2Samsung guide](docs/QUICK_INSTALL.en.md). No compilation is needed. The installer signs the package locally for your TV. This third-party route has not been independently tested with BiliSofa; an [official-tool guide](docs/INSTALLATION.md) is also available. Keep certificates, passwords, DUIDs and account cookies private.

On first launch of 0.66.0, enter `www.bilibili.com` (or `bilibili.com`) to enable the packaged service profile. Only this profile is supported; entering a website does not grant platform permission. Version 0.65.1 has no website-selection step. You can then start as a guest. For sign-in, scan the TV's QR code using your own official Bilibili app and review the confirmation. Removing a saved session does not delete your Bilibili account. Use directional keys, OK and Back to navigate; explicitly enable casting on the TV before connecting a phone on the same trusted LAN.

## Privacy and service terms

Requests go from the TV to Bilibili / its CDNs; the platform can still receive network and usage-related information. Sessions, preferences and viewing data are also stored locally. See [privacy](PRIVACY.md).

**Third-party access carries contractual and account risks.** The official terms restrict nonofficial access routes and software-based access to services, content and data without written permission. Free distribution, open source, self-building and personal use do not grant platform permission. Service blocking, account restrictions and rights complaints remain possible. Read the [risk review](docs/BILIBILI_TERMS_RISK.md) and its official sources before use.

## Build and contribute

```sh
git clone https://github.com/johnnyzhao5619/BiliSofa.git
cd BiliSofa
git switch --detach v0.66.0
npm ci --ignore-scripts
npm run build:app
```

This stages the Web UI; it does not produce a complete installable WGT. Native WASM modules and the pinned Samsung toolchain require additional preparation. A clean-machine, one-command full build has not been demonstrated. See [development](docs/DEVELOPMENT.md), [tools](tools/README.md) and [contributing](CONTRIBUTING.md). The app version is in `apps/tv/foundation-config.xml`; the root npm package is private build infrastructure.

Please include the app version, TV model, Tizen / firmware version and minimal reproduction steps in ordinary Issues, without personal data. Follow the [community rules](CODE_OF_CONDUCT.md); use [Security](SECURITY.md) for sensitive reports.

## License

Original code and documentation use the standard [MIT License](LICENSE), including permission for commercial reuse under its terms. Third-party components retain their own licenses; see [notices](THIRD_PARTY_NOTICES.md) and [licensing boundaries](docs/LICENSING.md). MIT does not grant third-party trademarks, media, API, account or distribution permissions, or guarantee continued service.
