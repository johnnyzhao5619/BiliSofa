# Third-party notices / 第三方声明

当前说明：**BiliSofa 0.65.1 基线及 0.66.0 服务配置预览**；0.65.1 软件基线 `e7bc3740e0fed2f9b2c89f9a83755398fa11faf7`。更新：2026-10-26。原创代码和文档使用 [MIT](LICENSE)，以下组件保留各自版权、许可及必要通知。

本说明依据锁文件、打包配方和两版未签名 WGT 的许可目录整理，**不是已完成的全仓历史、漏洞或完整权利审计**。旧版 W01 探针的 OpenSSL 1.1.1d / curl 7.68.0 / zlib 1.2.8 不能当作当前产品依赖；历史原文保存在[归档](docs/archive/2026-10-26-open-source/THIRD_PARTY_NOTICES.md)。

## 当前电视包的第三方组件

| 组件 | 版本 / 来源 | 许可及随包文本 | 修改 / 用途 |
| --- | --- | --- | --- |
| qrcode-generator | 2.0.4；[upstream](https://github.com/kazuhikoarase/qrcode-generator)；Copyright (c) 2009 Kazuhiko Arase | MIT；`third-party-licenses/qrcode-generator-MIT.txt`，源文本在 `platform/third-party/qrcode-generator-LICENSE.txt` | 无上游修改；电视本地生成二维码，不调用远程二维码服务 |
| AOSP PinyinIME dictionary | commit `49aebad1c1cfbbcaa9288ffed5161e79e57c3679`；Copyright 2009 The Android Open Source Project；[来源与哈希](packages/search/data/README.md) | Apache-2.0；完整 `search-NOTICE` | 原词库保留在源码；确定性派生词表用于本地首字母候选，不包含 Bilibili 内容语料 |
| curl | 8.23.0；[官方源归档](https://curl.se/download/curl-8.23.0.tar.xz) | curl license；`third-party-licenses/curl-COPYING.txt` | 有本地 Tizen close-drain 补丁；不是未修改的官方二进制 |
| OpenSSL | 3.5.9；[官方源归档](https://github.com/openssl/openssl/releases/download/openssl-3.5.9/openssl-3.5.9.tar.gz) | Apache-2.0；`third-party-licenses/OpenSSL-3-LICENSE.txt` | 固定构建配置，提供 TLS / crypto；不沿用旧版 OpenSSL + SSLeay 许可 |
| Samsung Emscripten generated runtime | 固定 SDK 1.39.4.7；[官方入口](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/download.html) | MIT / University of Illinois-NCSA 等原声明；`Emscripten-LICENSE.txt`、`Emscripten-AUTHORS.txt` | 随包生成 JS / WASM，保留原作者通知；不随源码分发整个 SDK |
| musl / compiler-rt / libcxxabi | 上述固定 SDK 的 runtime；原始文本见[许可目录](platform/wasm-network/licenses) | 各自原许可；`musl-COPYRIGHT.txt`、`compiler-rt-LICENSE.txt`、`libcxxabi-LICENSE.txt` | 具体归属以完整文本为准，不统一改标 MIT |
| Mozilla CA root data | curl 转换快照 2026-09-25；[数据](https://curl.se/ca/cacert-2026-09-25.pem)及[说明](https://curl.se/docs/caextract.html) | MPL-2.0；`third-party-licenses/MPL-2.0.txt` 和 `NOTICE.txt` | 未修改公开根数据，预置在 `.data`；不是私钥或用户会话 |

`third-party-licenses/` 下文件名均指实际 WGT 路径，除表格明确注明的根目录 `search-NOTICE`。curl / OpenSSL 的源归档 SHA-256、补丁输入 / 输出 / 补丁 SHA-256 固定在[依赖锁](platform/wasm-network/dependencies/network-candidate.lock.json)；补丁位于该目录的 `patches/`。CA SHA-256 为 `a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505`。

打包时还包含 BiliSofa `LICENSE` 和 `THIRD_PARTY_NOTICES.md`。现存冻结的 0.65.1 WGT 嵌入的是文档更新前的历史声明，完整组件许可文件已在包内；公开时需同时提供本版声明作补充。不要只替换包内声明后继续使用旧哈希。当前产品配方不链接旧 zlib port；仓库保留的旧许可 manifest 用于历史 runtime 文本和探针溯源，不能单独充当当前 BOM。

## 开发工具，不在电视包中分发

TypeScript 5.9.3（Apache-2.0）、esbuild 0.28.2（MIT）、Playwright / @playwright/test / playwright-core 1.64.1（Apache-2.0）、@types/node 与 undici-types（MIT）用于本地构建、类型或测试；精确解析版本和 integrity 以 `package-lock.json` 为准。开发依赖不会因为项目采用 MIT 而改用 MIT。

Tizen Studio、SDB、Certificate Manager、Samsung Certificate Extension、Samsung SDK 编译器、宿主 FFmpeg / x264，以及 Playwright 浏览器均为独立开发工具。其原许可随官方工具保留；未把整个工具或其宿主可执行文件作为本项目电视包组件分发。实际公开源码 / 附件仍须确认没有误带本地 SDK 和缓存。

## 研究来源，不代表捆绑其应用实现

| 来源 | 已记录的上游许可 / 定位 | 处理 |
| --- | --- | --- |
| [titlog/bilibili-tizen](https://github.com/titlog/bilibili-tizen) @ `76003faf3ae1a647a92c532b968e4896427530cb` | MIT；研究来源 | 研究不等于已复制；若引入代码另记范围并保留 notice |
| [asdf17128/bili-webos](https://github.com/asdf17128/bili-webos) @ `e38ed9a83f12d9561a2ecf129c30af615dfc1ee1` | MIT；研究来源 | 同上，不宣称其完整应用已在本包中 |
| [bilibili-plugins/bilibili-api-collect](https://github.com/bilibili-plugins/bilibili-api-collect) | 来源声明 CC-BY-NC 4.0；接口研究 | 不将文档语料 / 数据集复制为 MIT；也不是 Bilibili 接口授权 |
| [Macast-plugins / nirvana](https://github.com/xfangfang/Macast-plugins) @ `e4a18457aa7addd3a46041420d277343b66647ee` | F20 协议研究，详见[来源记录](docs/research/f20-nva-candidate-2026-10-15.md) | 未捆绑该项目 Python runtime、客户端密钥或其包身份；未来代码复用须逐组件审查 |
| [OCF / UPnP 规范](https://upnp.org/specs/av/av1/) | 互操作协议字段研究 | 原创有界解析 / 序列化，不把标准正文 / schema 当作 MIT 素材分发，也不声称 DLNA / UPnP 完整认证 |
| [Shaka Player](https://github.com/shaka-project/shaka-player) | Apache-2.0；曾评估候选 | 当前包不捆绑；今后若加入另保留完整许可及适用 NOTICE |

Bilibili 的视频、封面、头像、字幕、评论 / 弹幕以及 Bilibili / Samsung 商标不因本项目而转为 MIT。原创实现、协议事实、上游复制、平台授权必须分别说明；进一步边界见[许可说明](docs/LICENSING.md)及[协议风险](docs/BILIBILI_TERMS_RISK.md)。

## 后续变更

引入依赖或素材时记录精确版本 / 提交、来源、许可、版权、修改和实际包内位置，并保留完整许可文本。发布前对照真实附件核对，不把研究候选、宿主工具或旧探针混作当前 runtime。
