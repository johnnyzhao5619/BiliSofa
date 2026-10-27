# BiliSofa

**An independent third-party Samsung Tizen TV client, provided for learning and testing.**

[简体中文](README.md) · [Quick install](docs/QUICK_INSTALL.en.md) · [Download 0.66.0 preview](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [Service terms risks](docs/BILIBILI_TERMS_RISK.md)

BiliSofa is an independent, remote-control-first Bilibili client for Samsung Tizen TVs. It started with a practical frustration: there was no usable Bilibili app on the overseas Samsung Tizen TV I used, making big-screen viewing inconvenient.

The app runs on the TV. A computer is needed for installation and updates, but everyday viewing requires no always-on computer, NAS, LAN gateway or project-hosted cloud service. Internet access to Bilibili and its CDNs is still required.

This community project is not affiliated with, endorsed by or certified by Bilibili or Samsung. It connects to the mainland China Bilibili service; it is not a client for the separate international service and does not extend regional or membership rights.

## Download and install

| Version | Download | Status |
| --- | --- | --- |
| 0.66.0 | [Unsigned WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [release and checksums](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0) | Website configuration preview; TV installation and runtime acceptance are still open |

**No compilation is needed.** Installation requires a computer, TV Developer Mode and your own valid Samsung TV signing certificate; the downloaded WGT must be signed before installation. Follow the [five-step guide](docs/QUICK_INSTALL.en.md) or the [Samsung official-tool guide](docs/INSTALLATION.md). Apps2Samsung is an independent third-party tool; this installation path has not been independently tested with BiliSofa. The package requires Tizen 9.0; compatibility depends on the device and firmware.

Documentation bundled in release assets is a snapshot from publication; the README and installation guides on the repository’s main branch receive later updates.

On first launch, 0.66.0 asks for `www.bilibili.com` or `bilibili.com` to enable a service profile already packaged locally. Entering a website does not grant permission, and addresses remain in packaged configuration and platform declarations.

## Purpose, content and rights

The author currently provides the project free of charge for learning and testing, **with no profit-making activity** and no software, subscription or viewing fee. This describes the author's present purpose and operation; the standard MIT license governs original code and does not grant third-party rights.

Programme video, audio, covers, subtitles, comments and danmaku accessed by the app originate from Bilibili and its delivery infrastructure. The project does not host a programme library or offer user-facing offline programme downloads or exports. It is not intended to alter programme content or harm the platform, creators or other rights holders.

Online playback still transfers media data and uses temporary buffering. The app caches covers and lists, keeps local records and generates a playback manifest. These facts do not support a claim of zero caching or processing, or that all relevant rights have been cleared. Original UI, local dictionary data and synthetic diagnostic samples are not platform programme content.

Bilibili, Samsung and related names and marks belong to their respective owners. References identify the compatibility target and content source; they do not imply permission, affiliation, partnership, sponsorship, endorsement or certification. The project currently provides no public evidence of Bilibili authorization for its interfaces, content or branding.

If Bilibili, a creator or another rights holder believes the project, package or project materials may infringe their rights, please contact the author through [GitHub Issues](https://github.com/johnnyzhao5619/BiliSofa/issues). The author is willing to promptly review concerns and take down affected releases or stop distribution or functions at any time. Identify the affected material and concern without posting identity documents, private contact details, credentials or other sensitive information; request a private channel if needed. See [rights contact](RIGHTS.md).

## Before use

This is unofficial third-party software. Section 5.6(3) of the [Bilibili user agreement](https://www.bilibili.com/blackboard/protocal/licence.html) restricts software-based access to platform services, content or data without prior explicit written permission. This creates a **real contractual risk** for the access used by this project; its application and legal consequences depend on the agreement, actual conduct and applicable law. Requests may be refused, services may stop working, accounts may be restricted, and rights complaints may arise.

Learning, testing, free or open-source distribution, entering a website and a takedown contact do not replace platform permission or eliminate copyright, trademark or contractual risks. Read the [terms risk review](docs/BILIBILI_TERMS_RISK.md), [privacy notice](PRIVACY.md) and platform terms. Respect content, membership and regional restrictions; do not use the project to bypass payment, digital rights protection or access controls. For public distribution and jurisdiction-specific issues, the author should seek written permission from the platform and advice from qualified counsel.

The project is provided as-is; the [MIT License](LICENSE) sets out the license and disclaimer for original code, subject to applicable law. This statement does not exclude liability that cannot lawfully be excluded or guarantee that third-party services remain available.

## Version and compatibility

The available version is the [0.66.0 preview](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0). Compilation and static package checks passed; TV runtime, installation and upgrade acceptance have not been performed. Older device results do not establish acceptance for this version. The package requires Tizen 9.0; compatibility varies by model and firmware. See the [preview notes](docs/releases/0.66.0-service-configuration.md).

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

On first launch of 0.66.0, enter `www.bilibili.com` (or `bilibili.com`) to enable the packaged service profile. Only this profile is supported; entering a website does not grant platform permission. You can then start as a guest. For sign-in, scan the TV's QR code using your own official Bilibili app and review the confirmation. Removing a saved session does not delete your Bilibili account. Use directional keys, OK and Back to navigate; explicitly enable casting on the TV before connecting a phone on the same trusted LAN.

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
