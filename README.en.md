# BiliSofa

A planned standalone Bilibili client for Samsung Tizen TVs, designed for remote controls and sofa viewing.

Status: W01 basic and native-network candidate unsigned WGTs exist, with portable state contracts. The official Samsung Socket/cURL WASM now builds through authorized Rosetta 2. Internal probe 0.0.9 has been signed and installed on the target, with partial synthetic network/storage/media/lifecycle evidence; the complete client and W01 gates remain unfinished. See [status](docs/IMPLEMENTATION_STATUS.md), [development](docs/DEVELOPMENT.md), [tests](docs/TEST_REPORT.md) and [probe guide](docs/archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md).

The complete v1.0.0 target includes browsing, accounts, personal content, playback, subtitles, read-only comments/replies/danmaku, retained interactions, bangumi, live streams, supported 4K/HDR and casting from the official Bilibili apps. Per the user-approved [ADR-003](docs/adr/003-read-only-comments-danmaku.md), there is no comment/reply editor, comment deletion or VOD/live danmaku sending. Search plans app-contained pinyin-initial input and suggestions; other planned interactions retain their scope.

Daily operation must run entirely on the TV, with no always-on PC, NAS, LAN gateway or project-hosted cloud service. A computer is only needed for development, signing, installation, updates and debugging.

The preferred candidate is a Web UI with an on-TV WASM networking module. Tizen .NET is an alternative to evaluate. Retail-device support, permissions and media behavior still require validation.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md). Original project code is MIT licensed; third-party components retain their own licenses. Independent project, not affiliated with Bilibili or Samsung.

## 开发约束 / Development guidance

- [AGENTS 入口](AGENTS.md)
- [电视 UI、遥控焦点与输入](docs/TV_UI.md)
- [编码、异步、安全与性能](docs/ENGINEERING.md)
- [目录与依赖方向](docs/PROJECT_STRUCTURE.md)
- [Tizen 平台、媒体、生命周期与签名](docs/TIZEN_PRACTICES.md)
- [官方最佳实践研究与来源](docs/research/tizen-best-practices-2026-10-14.md)
