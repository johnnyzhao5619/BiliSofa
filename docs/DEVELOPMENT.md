# 开发环境

2026-10-14 启动核查：macOS 27.0.1 (26A434)、Darwin arm64、Node v24.21.0、npm 11.19.0、Python 3.12.10、Apple clang 21.0.0 (clang-2100.3.34.2)。Tizen CLI/SDB/Samsung Emscripten/.NET 初始未发现；签名 profile 未确认。

当前是 W01 候选探针开发，最终运行时尚未固定。工程命令随实际构建结果在本文件更新。build/package 不隐式连接、签名、安装或发布。

## 已安装的项目工具

TypeScript 5.9.3、esbuild 0.28.2、Playwright 1.64.1；npm lockfile 真实安装生成，`npm ci --ignore-scripts` 可恢复。Chromium 156.0.8078.4 / build 1248 在用户 Playwright cache，不进入 TV 包。项目 runtime 无 npm 依赖和框架。

实际运行入口：

```sh
cd /Users/weijiazhao/Dev/BiliSofa
npm ci --ignore-scripts
npm run check
npm test
npm run probe:native:check
npm run build
npm run package
python3 tools/verify-package.py
npx playwright install chromium
npm run test:ui
python3 tools/delivery.py
npm run dev
```

`check`：strict TS、导入循环/反向依赖/platform globals 检查；`test`：Node test runner＋本地 esbuild loader；`test:ui`：启动仅绑定 loopback 的桌面服务并自动退出，Chromium 1920×1080，匿名合成输入。Browser 技能未在本会话列出，使用 Playwright。截图默认 `/tmp/bilisofa-evidence`；可显式设置 `BILISOFA_EVIDENCE_DIR` 到仓库外路径。不能把桌面 Chromium 156 结果当作电视 M120/当前固件证明。

产物：`dist/probe/` 为 WGT root；`dist/BiliSofa-W01-basic-unsigned.wgt`、`.sha256`、`source-manifest.json`、源码快照 ZIP、`DELIVERY.json`。全部 ignored。包身份 BiliProbe1.Probe，版本 0.0.1，基础包不含 native Socket/cURL。

CI `.github/workflows/ci.yml` 会真实执行相同 portable gate、build/package/UI 测试；actions 固定 SHA 来自当前远程 tag 核查。尚未发布或在 GitHub 运行，不能提供成功 CI 链接。

## Samsung SDK 隔离准备与阻塞

官方 macOS 1.39.4.7 下载并解压至项目 ignored `.local/sdk/emscripten-release-bundle/emsdk`，完整原始 ZIP 保留。没有覆盖用户已有 signing/Emscripten 身份。hash 见 THIRD_PARTY_NOTICES。

系统 curl 默认 TLS 验证可下载官方 SDK 和 curl/Mozilla CA；Python urllib 默认 CA 在当前环境对 Samsung 入口报 `CERTIFICATE_VERIFY_FAILED: self-signed certificate in certificate chain`。未采用 `-k` / unverified context。

初次 activation 在 arm64 下没有匹配工具，x86_64 clang/Node 报 bad CPU type。用户随后明确授权安装 Rosetta 2；`softwareupdate --install-rosetta --agree-to-license` exit 0，receipt com.apple.pkg.RosettaUpdateAuto 1.0.0.0.1790234402。未使用 upstream emcc，未改 SDK 源代码，未覆盖全局 Emscripten/signing 配置。

原生构建已成功，实际隔离命令：

```sh
cd /Users/weijiazhao/Dev/BiliSofa
# 首次 SDK 激活（已执行；仅写 SDK 内配置）
cd .local/sdk/emscripten-release-bundle/emsdk
arch -x86_64 /usr/bin/python3 emsdk.py activate --embedded latest-fastcomp
cd /Users/weijiazhao/Dev/BiliSofa
export EM_CONFIG="$PWD/.local/sdk/emscripten-release-bundle/emsdk/.emscripten"
export EM_CACHE="$PWD/.local/emscripten-cache"
export EM_PORTS="$PWD/.local/emscripten-ports"
export BILISOFA_SAMSUNG_EMCC="$PWD/.local/sdk/emscripten-release-bundle/emsdk/fastcomp/emscripten/emcc.py"
export BILISOFA_SDK_PYTHON=/usr/bin/python3
export BILISOFA_CA_BUNDLE="$PWD/.local/cacert.pem"
npm run probe:native:build
npm run build
npm run package
npm run package:native
python3 tools/verify-package.py --native
npm run test:ui:native
python3 tools/delivery.py
```

实际 compiler：Samsung emcc 1.39.4.7、激活的 fastcomp clang 6.0.1、SDK Node 12.9.1、系统 Python 3.9.6（build wrapper 是 Python 3.12）。32 MiB 固定 heap，Worker-only；输出 `build/native/probe.js` / `.wasm` / `.data` / `manifest.json`，WASM 1670521 bytes，WebAssembly.validate true。重复编译三个文件 SHA-256 一致。

生成 output 使用相对名称，不含用户绝对路径。packager 随机 UUID 按未修改 CA 内容 hash 规范化并登记修改；未开启 preload cache。SDK/cache/ports 均隔离于 `.local`；一次直接版本查询生成的用户 cache marker 已仅移除本次生成项，其余用户文件保留。native wrapper 对版本查询也默认隔离 cache/ports。

第三方原始 LICENSE/COPYRIGHT、MPL、OpenSSL acknowledgements 在 `platform/wasm-network/licenses`；严格 hash 校验后由 `package:native` 整合，basic package 继续拒绝 extra native files。native 当前内部版本 0.0.25，与 basic 0.0.1 同 app/package ID，升级要求保留 author；0.0.8→0.0.9单次CLI更新marker1保持已取证，其他数据/回退仍未验证。

CA： https://curl.se/ca/cacert.pem，2026-09-25 快照，2026-10-14 下载 188900 bytes / 121 certificates；SHA-256 `a41b5d356aea97a529fe27e0f7316d2f9d946d75927476cf9cf1b90637d00505` 与官方校验文件一致。仅公开根证书数据随 native probe.data 打包，MPL-2.0 与稳定源 URL 保留；无私钥/session。

native 桌面测试证明本地 Worker JS/WASM/CA 加载、实际 WASM 初始化、严格 CSP、主 UI 可操作和停止后新 Worker。桌面无零售 Tizen sockets，网络执行 20 秒 timeout 记 FAIL；未叫网络 PASS。生成 runtime 的旧依赖不作为最终产品安全选型；native 支持与安全门槛仍需 W01 真机及最终网络栈处理。

## 签名/安装 CLI 已准备

官方 [Tizen Studio 6.1 CLI installer archive](https://download.tizen.org/sdk/Installer/tizen-studio_6.1/) 的 macOS 包已下载：280301758 bytes，SHA-256 `1630194c222776093785b274554461f896243dfa6b59581928047816fab75a80`，内嵌 payload MD5 校验通过。完整 SDK 解压在 `.local/tizen-studio`，未执行会改用户 `.package-manager/jdk` 的 installer wrapper。标准 sdk.info 将 SDK/data/JDK 指向项目 `.local`；未修改 vendor tool 源码，SDK 与工具许可证保留在其原始位置，不随公开 WGT/源码 ZIP 分发。

实测可运行：Tizen CLI 2.5.25、SDB 4.2.25、SDK OpenJDK Corretto 1.8.0_322。`tizen version`、`package -h`、`install -h` exit 0；参数模板已对照实际 help。随后已获授权执行 sdb devices/connect/capability，只读确认 tv/9.0；原始输出保存在仓库外。后续已完成自己的 Author/Public Distributor、实际签名/安装/启动，见 SIGNING_DEVICE_RECORD。

```sh
/Users/weijiazhao/Dev/BiliSofa/.local/tizen-studio/tools/ide/bin/tizen version
/Users/weijiazhao/Dev/BiliSofa/.local/tizen-studio/tools/sdb version
```

现在 Developer Mode、连接及用户自己的 BiliSofa profile 已确认且已用于成功安装。原有第三方证书不导入/使用/覆盖。创建步骤见 SAMSUNG_CERTIFICATE_GUIDE；签名、安装步骤单独见 W01_PROBE_GUIDE；build 不隐式部署。侧载已授权，账号真实写入与 GitHub 公开发布未授权。

官方 Package Manager 的 `install --accept-license --no-java-check cert-add-on` 与 `install --accept-license --no-java-check Certificate-Manager` 均 exit 0。Samsung Certificate Extension 2.0.75、Certificate Manager 3.0.0 已在本项目 SDK 安装，包管理器从 0.5.61 更新到 0.5.67；vendor 依赖更新均在隔离 SDK，CLI 实测仍 2.5.25。主程序通过原始 launcher 启动，Cua inventory 显示 org.tizen.cert.ide 正在运行，但 UI 绑定返回 Invalid app，窗口/创建未验证；未改 vendor 源码或弱化安全校验。

备用 VS Code 基础扩展 tizen.vscode-tizen-csharp 10.4.3 已安装在 `/Users/weijiazhao/.local/share/BiliSofa/vscode-extensions`，独立 user-data-dir 同级 `vscode-user`；随后为可操作界面将同一官方扩展安装到正常 VS Code，其他扩展保留。官方文档所链接 samsungtvsdk.tv-vscode-tizen 安装返回 Extension not found，未用不明来源扩展替代。

用户完成新 profile 后，实际基础包签名 exit 0，但电视 install 118/-12 证书链失败。包内公开 X509 检查确认新 Samsung Author 有效，Distributor 仍为 SDK 2022 年过期的默认证书。该历史阻塞已通过官方 SDK 单独更新 Public Distributor 解除，Author 保留；两个探针均安装/启动成功。更新后可显式执行 `python3 tools/sign-probe.py basic` / `native`：拒绝 SDK 默认 Distributor，检查所有嵌入证书日期/Samsung 叶签发者，验证签名前后资源相同，日志/签名包/manifest 留仓库外；不隐式 install/run。证书日期/签发者预检不等于证书链信任通过。

cert manager 的 vendor 依赖更新后，SDB 实测版本 4.2.36；原 4.2.25 为安装更新前版本。install/run 使用显式私密 serial，避免按非唯一设备名称部署；传输失败时先重新核查连接，未知安装结果不得自动重复。

新增 `npm run test:native:http`：主机 C/socket 行为测试，临时随机 loopback 端口和合成报告；不连接 TV/Bili、不读账号。native 编译输入 sourceSha256 现在覆盖 probe.c + probe-http.h（按固定顺序拼接），防止仅更新 header 后误用旧 WASM。0.0.3 内部探针带限时 LAN 报告入口，默认仍由用户点击开启；无后台或外部服务依赖。

0.0.3 手机失败后，0.0.4 修复 Samsung socket 非阻塞调用兼容：SDK 禁止 socket F_SETFL；使用 SOCK_NONBLOCK/accept4。主机回归增加同一 forbidden-call 合同，真实 TV 仍单独复测。当前媒体合成样本只在 ignored build/media-probe（原创彩条/运动/低音量 440Hz，12 秒，720p24 H.264 Main/AAC48k 2ch），未接入/安装媒体探针。

原创媒体准备命令：`python3 tools/media-probe.py generate` / `check`。实际固定主机 FFmpeg 9.0.1，输出和 manifest 在 ignored build/media-probe；格式/hash/路径/尺寸检查不等于 AVPlay/TV 声画通过。工具及 x264 编码器未打包到 TV。

内部自动取证：`BILISOFA_PROBE_AUTORUN=1 npm run build` 后单独 package/package:native/sign/install/run；仅启动一次 wasm→native guest/synthetic→固定 http report。默认 build 不自动运行；build.json/HTML meta 显式记录模式，package 校验一致性。`python3 tools/collect-probe.py collect` 从仓库外单一授权 target 读取固定端点，45 秒 bounded retry，禁用代理/重定向，3072/4096 字节及共享 TS 合同校验、源码 hash 匹配；脱敏输出在 ignored dist/DEVICE_REPORT.json，私密取证副本仓库外。开发电脑客户端不代替手机/官方投屏验证。

0.0.6 native build 会先检查 build/media-probe/manifest.json，再仅将固定 MPD/segments embed 到 Worker MEMFS（probe.mp4 不 embed）；该 SDK 的 probe.data 实际写入 CA + embedded media；dataLayout 精确记录连续 offsets/hash，校验所有 bytes，无额外内容。每文件 256KiB 包上限；C sourceSha256 覆盖 probe.c + probe-http.h + probe-media.h。先 `python3 tools/media-probe.py generate`，再原有 Samsung 编译/package 命令。`npm run test:native:media` 为真 HOST socket 固定文件/二进制/大小/deadline 测试，不播放媒体。新声画按钮只使用 AVPlay adapter 的固定 loopback URL，没有任意 URL 输入。

0.0.7 原生 source hash 再包含 probe-service.h；Samsung build 导出 callMain 与原生 probe_stop。HTTP/MPD 服务以固定20Hz Worker main loop/poll0运行，可接收白名单 stop；close后的ACK验证前不终止Worker。native Socket transient 合成分项和其他整机生命周期仍分别验证。`npm run test:native:stop` 在主机进程仍存活时检查端口已关闭且同进程能再次bind，非进程退出假阳性。

0.0.9内部自动模式按WASM→guest/synthetic native→KeyManager合成save/get/remove→固定脱敏report执行一次；用户新操作/Home会取消余序。默认build保持manual。新KeyManager行为见W01-P13；探针PASS不能等同持久保护会话验收。

0.0.10 build自动执行`python3 tools/initials-data.py`，校验packages/search/data两份上游文件hash，确定性生成search-words.json/search-NOTICE并本地打包initials-worker.js。此Worker不使用Socket Extension，不增加权限；native C/媒体编译产物与0.0.7一致，严格核对后复用。数据来源和变换在packages/search/data/README.md。词库JSON限2MiB、最多65105行，消息4KiB、最多64候选，首字母24字/关键词32字、5秒超时。只验证关键词输入，未接入B站内容检索。


合成持久性专用内部取证：`BILISOFA_PROBE_AUTORUN=2 npm run build`，再分别运行package/package:native、delivery、显式sign/install；该模式首次持久写入+GET报告成功后自行退出，CLI重开同一包后再次collect。默认`npm run build`仍manual；`=1`保持旧guest/synthetic序列。模式被写入HTML/build.json且签名前核对。`测试存储退出重开`按钮提供同一合成流程；同document重复只提示需重开，不能提升验收。


跨包合成观察开发流程：默认build还在build/isolation生成与sourceHash配对的helper bundle，不装入basic包。`npm run package:isolation`显式验证native输入并生成独立isolation WGT；`npm run test:ui:isolation`运行4项桌面fixture。`python3 tools/sign-probe.py isolation`单独签名；`python3 tools/collect-probe.py collect --variant isolation`只从授权TV固定端点读取并匹配独立签名manifest。主包before/观察包/主包after三报告仓库外命名见`tools/check-isolation-evidence.py`；检查通过仍限定同Author不同包的合成读取。只安装本项目明确签名身份，不枚举其他App数据。


Samsung TV CLI特别约束：run/uninstall的`-p`使用完整application ID（例如本次临时helper为BiliIsola1.Probe），本地通用help写pkgid不能照搬为包前缀。实际0.0.13helper清理首轮包ID返回不存在，修正application ID后uninstall completed。仅清理本次自行创建且已核对签名部署记录的helper；不得借此卸载其他项目/用户App。


游客热门候选：`BILISOFA_PROBE_AUTORUN=4 npm run build`显式构建一次guest-popular→report模式；默认manual不自动请求。新增guest-worker.js随basic/native本地打包；basic缺native manifest会返回guest.native_unavailable，不能当作实网能力。C源码新增probe-guest.h，native-probe/package-native的source hash覆盖五个源文件，必须重新Samsung编译，不能复用0.0.13二进制。`npm run test:native:guest`实际执行2项不联网的C参数/内存边界检查。


## 0.0.20 发现探针开发

默认仍manual，新增cast-worker.js本地打包，无新增依赖/权限/CSP/WARP例外。C输入hash固定顺序覆盖probe.c、probe-http.h、probe-media.h、probe-service.h、probe-guest.h、probe-bridge.h、probe-cast.h共7份，必须用既有固定Samsung SDK重编译；不能复用0.0.19 WASM。导出cast_stop，32MiB固定堆不变。`npm run test:native:cast`运行10项真实HOST loopback UDP/TCP匿名行为测试，测试宏禁用LAN组播并只允许loopback；生产编译无该宏。官方发送端发现须另外测试。`npm run check`、`npm test`、`npm run test:ui`、`npm run test:ui:native`与原build/package/sign/delivery命令维持分离。具体网络预算/命令拒绝见F20_PROTOCOL_EVIDENCE。


近期0.0.19/0.0.20首次部署均遇SDB无绑定导致包传输失败，原授权地址仍可达；重新connect并核查get-state=device/capability成功后同包安装/启动通过。今后安装前先核查显式目标状态；原始连接/设备输出只保留私密日志，失效时恢复同一已授权绑定，不改profile/重置电视或自动重复未知安装结果。CLI成功与实际页面、发现、播放验收分别记录。


0.0.21修正Socket选项兼容：IP_MULTICAST_IF不在官方/旧SDK adapter支持表，探针改为显式接收入组+TTL1、出站系统IPv4路由。新增固定131/132阶段码。显式`BILISOFA_PROBE_AUTORUN=6 npm run build`生成启动→关闭ACK→报告模式，不投送/播放/执行账号写；default仍manual。打包/校验/签名分别运行，native版本0.0.21；isolation仍强制独立只读mode3。C7文件hash与32MiB预算不变，必须重编译，不能使用0.0.20二进制。


0.0.22：SOAP原生RPC getter只在Worker内部读取原始请求，stdout/IPC/诊断仅固定事实。`npm test`81项；`npm run test:native:cast`14项；主包UI35项后新增SOAP定向4项；`npm run test:ui:native`2项。本轮总136项不同检查，不把分次运行写成单次全组。默认manual，`BILISOFA_PROBE_AUTORUN=6 npm run build`保留监听启动→原生关闭ACK→报告的内部检查。包/签名/部署分别执行；真机未执行项保持UNVERIFIED。


0.0.23内部探针：33项append-only SOAP事实、41项去重进度上限；关闭生成cast.soap_summary_v1_的16位hex固定摘要。用contracts/upnp.ts的decodeSoapProbeSummary解码，不从code推断顺序/次数/发送端。HTTP报告最多8项并保留最新有效摘要/故障，本地导出仍64项。实跑84单元/合同、41不同主UI（40通过+fixture修正后定向1）、HOST cast14、native桌面2，总141；strict/SDK/C另记。默认manual，显式auto6仅监听启动/关闭取证，媒体依旧拒绝。


0.0.24：inspectSoapOffer仅Worker内部固定分类，原parse/接收政策不变。append-only60事实、68去重进度、双uint32 v1summary；解码不得把URI第一拒绝分支当完整策略已过。实跑88单元/合同、44主包UI、14 HOST cast、2 native桌面，共148；C/strict/SDK另记。default manual/显式auto6继续分离，签名/部署仍独立执行。


0.0.25新增`npm run test:native:cast-source`九项HOST mock检查；八个C文件含probe-cast-source.h参与hash，SDK源码变更须重编译，包验收须包含两项source导出。scope仍在cast Worker，source只从probe兼容parser和HTTPS候选政策进入native。每窗口一次512bytes，不自动重试；候选policy与最终source结果在8项report保留。93单元/合同、47不同主UI（46整组+19定向含1新case）、HOST cast14/source9、native桌面2，总165；strict/C/SDK另记。默认manual，显式auto6只证明监听启动/关闭，不触发真实源。


0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。


0.0.28 W01/F20内部候选：progressive HTTP与有界续段见docs/adr/007-progressive-mp4-http-probe.md（docs内为adr/...）。八个C文件修改后已实际Samsung SDK重编译；仍为probe-only旧网络依赖，不批准真实账号产品栈。无新依赖/权限/外部服务/复制客户端身份或实现；新增HTTP/API事实仅按官方RFC/Samsung枚举，保留原第三方许可。TV新包声画仍需用户反馈，不能把prepare失败或HOST通过更改为实际播放PASS。

0.0.29 渐进MP4桥使用4秒connect、15秒未背压的上游无数据deadline；暂停读取不计该deadline，仍受3分钟签名租期与固定资源预算限制。legacy DASH期限未变。`npm run test:native:bridge`新增真实16秒背压后逐字节恢复/回跳范围、上游停滞、放弃旧请求、背压时租期关闭；HOST测试使用仅编译fixture的时钟推进/小socket发送缓冲，不进入TV包。SDK必须在C源变化后重新编译，不可只改TypeScript后沿用旧WASM。

内部0.0.30 seek诊断/有界等待/缓冲及恢复策略见ADR-008。此次仅TS/UI/工具包版本变化，C syntax gate通过，SDK原生字节复用0.0.29已重编译且源hash匹配的版本，没有重编译声明。node:test虚拟时钟测20秒成功/30秒超时；Playwright虚拟主页面时钟不控制Worker，推进晚callback测试时间前需等真实Worker关闭ACK，避免夹具把5秒清理期限提前耗尽。

内部0.0.31渐进MP4播放中回跳采用PREBUFFER_MODE重开同owned源，详见ADR-008追加。单一播放器/原网络lease，不是新URL或自动fallback；API检查、epoch失效、取消/30秒超时、暂停不出声与最近4次有界历史有独立tests。C/native源未改，签名前必须验证复用字节/源hash，不能声明新SDK编译。


### 0.0.36 手机控制候选

新增`packages/contracts/src/cast-receiver.ts`、`packages/cast/src/receiver.ts`与`apps/tv/src/app/cast-receiver-player.ts`，入口“官方手机控制探针”，合同/恢复见ADR-009。`npm test`覆盖会话与控制，`npm run test:ui -- tests/ui/cast-receiver.spec.ts`使用本地匿名native/AVPlay假后端，不是官方发送端或TV声画证明。Browser插件不可调用，本轮沿用项目Playwright；源码/浏览器/HOST与实际TV记录继续分开。新native getter由固定Samsung SDK实际编译，不能只复用0.0.35 WASM。默认build为manual；部署auto6仅做发现启动/清理自动取证，不自动投送或播放。
