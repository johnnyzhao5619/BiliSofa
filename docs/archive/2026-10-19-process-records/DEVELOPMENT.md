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


0.0.51 / W01合成HTTP会话：`npm run test:native:session`运行12项真实HOST loopback/cURL行为；九轮固定请求验证头、Set-Cookie、两jar隔离/清空和不跟随302。native hash同时覆盖probe-session.h共9输入，需真实Samsung重编译；session-worker.js明确进入basic文件名单，新stop导出须在native runtime存在。`BILISOFA_PROBE_AUTORUN=7 npm run build`为session-wire-report-once，默认manual；sign/install仍独立。新的loopback40326仅native内部使用，不向DOM开放新的CSP/WARP，不接收外部地址/真实会话。新UI入口在browse-tools；53模块strict及162单元/合同、95整组UI已通过，原生C/SDK/HOST通过；具体设备证据后补，不将旧依赖批准为真实账号栈。


### Isolated network dependency candidate (ADR-013)

`npm run probe:deps:fetch` explicitly fetches and verifies pinned official sources. `npm run probe:deps:build` builds modern static libraries under .local/network-upgrade; `npm run probe:deps:check` verifies recipe/lock and library hashes; `npm run probe:deps:link` links separate final WASM plus a no-network entropy/version self-test under build/network-candidate; `npm run test:ui:deps` tests that Worker and missing-Web-Crypto failure. None edits SDK ports, writes build/native, signs or deploys. Compiler, CA and media are the already provisioned project-local inputs; shell tools CMake/make/perl are host-only. License originals and output/source hashes are in the candidate manifest; the normal WGT remains legacy probe-only until separate approval gates.

First link correctly rejected an absolute build-source filename from OpenSSL error macros expanded in cURL. Candidate cURL now uses the supported OPENSSL_NO_FILENAMES macro; no binary string patching, disabled TLS checks or suppressed failure gate. Initial diagnostic/candidate logs retained in .local/network-upgrade and /tmp/bilisofa-network-*.log. CMake unused CURL_DISABLE_SMB warning is preserved: actual protocol list/self-test must assert HTTP/HTTPS only; the flag alone is not evidence.


0.0.53：按ADR-014，C bridge新增有界progressive pump和4MiB进度桶，源预检解析已在512字节中的moov大小；必须实际`npm run probe:native:build`，native源门禁覆盖原9文件。大索引只影响已知9–128MiB的cast初始prepare，20秒无进展及最长180秒、普通30秒/legacy15秒/seek30秒分别保留。UI准备阶段显示约索引/累计读；进度读不能调用忙碌AVPlay API。350项不同检查通过，准确分层见TEST_REPORT，未把HOST/桌面当TV播放。


0.0.54：仅平台/UI与诊断策略修正，同一已知大索引的PREBUFFER_MODE重新prepare采用与初始prepare相同的有限索引窗口和新操作进度看门狗；原生seekTo仍30秒。单元虚拟时间检查跨30秒、20秒旧进展拒绝、size绝对上限和取消，真实Worker UI检查手机Seek显示/恢复/Home晚回调。未修改九个原生C输入或Worker，无需重复Samsung编译；package:native仍逐文件核对源/产物/CA/许可证，部署前另与冻结0.0.53原生工件比较，不把旧SDK/网络测试冒充本轮运行。见ADR-014及TEST_REPORT实际结果。


独立现代网络验证：`npm run probe:deps:link`重新生成三套候选WASM；`npm run build`、`npm run probe:network:ui`、`npm run package:network`、`npm run verify:network`依次构建独立BiliNet001.Probe/0.0.1。`npm run test:ui:network`五项实际Worker流程与`npm run test:ui:deps`两项实际库自测须串行运行（均独占4173）。`python3 tools/sign-probe.py network`只签名私密包，不安装。获授权目标的安装/启动单独记录，`python3 tools/collect-probe.py collect --variant network`只读固定40322/report并核对deployed-network-manifest，写NETWORK_DEVICE_REPORT，不覆盖主探针报告/身份。36秒native/45秒父层/5秒ACK，固定TLS目标与预算见ADR-013；不是任意URL工具，不送账号。


同一独立网络App的HTTP会话自动包：`python3 tools/package-network-probe.py --session`生成BiliNet001.Probe/0.0.2；`npm run verify:network`同时核对版本/automation/network-mode元数据，sign与install仍单独执行。主probe版本保持0.0.54、主网络依赖未替换，两个独立自动模式的源码/签名/报告分轮归档。


当前会话诊断包版本0.0.3（`--session`），在0.0.2基础上只补固定native原因/父层失败分类和未知清理poison，不改变九轮HTTP或依赖。无新SDK编译；package/verify额外核对recipe、lock、已链接库manifest与当前静态库，以拒绝新recipe混用旧WASM。旧0.0.2会话FAIL保留。


独立网络005/006兼容候选按ADR-015：probe:deps:build先校验官方archive与本地patch/input/output摘要，重建带BILISOFA_TIZEN_NO_CLOSE_DRAIN的cURL；OpenSSL库保持字节一致。随后必须probe:deps:link生成新WASM和离线符号表，不能将旧WASM与新recipe混用。`--session`生成005会话自动包，默认生成006 TLS自动包，分别签名/安装/收集，并按精确source/WASM归档。修正只限独立候选，不修改SDK或已装主0.0.54。


0.0.55现代主媒体候选按ADR-016：`npm run package:native:modern`显式选择已经链接的现代完整probe，不覆盖build/native；默认package:native仍为legacy 0.0.54。`python3 tests/native/candidate-packaging.test.py`六项真实输入/改动注入检查验证C/最终WASM/许可证/合成媒体/stale recipe拒绝，未编辑实际输入。native与isolation stage切换网络版本时只重建各自生成的native/许可证目录，未知其他文件仍拒绝；原签名包和冻结源码留存。签名前须build/package/verify/delivery完成，collect必须等install/run及deployed manifest落盘。现代主媒体尚待官方发送端实测，不等于批准账号凭据。


0.0.56/ADR-017：package:native:modern为现代换源候选，新C入口cast_transition_enable/buffer/begin必须重新执行probe:deps:link；package gate同时核对三导出、九C输入/链接manifest/静态库/CA/media/license。default legacy仍是内部对照0.0.54（C修改后也须probe:native:build），不能把其当前dirty源码与历史已装054混称相同。真实Worker定向命令为`npm run test:ui -- tests/ui/cast-receiver.spec.ts --grep handshake-session`；原生换源并入`npm run test:native:cast-source`。manual/auto6仍分离，签名/安装/取证必须按顺序执行，未自动账号写入或发布。


0.0.57仅补ADR-017固定SetURI观测与退出状态：`packages/contracts/src/cast-offer-diagnostics.ts`提供offerObservationCode/decodeOfferObservation及offerTraceCode/decodeOfferTrace。每run最多32观测，报告最近4，字段和位序固定，不使用已经满32位的RECEIVER_FACTS扩容。`packages/cast/src/offer-diagnostics.ts`解释已有决定，不能执行源批准或请求。消息上限增加33，无C/原生工件变化，打包仍显式`package:native:modern`。真实Worker新增policy/prepare-hold/offer-cap模式，先测数据留存和原政策未放宽，再签名/设备核对；未把取证包叫修复包。


0.0.58/ADR-018：现代内部版本为058，新增一个精确官方Bilibili专用CDN主机，需重新执行`probe:native:build`和`probe:deps:link`，不能复用057 WASM。源码/依赖/CA/许可与输出hash门禁保持，打包用`package:native:modern`。新本地覆盖在cast-soap/cast-offer-diagnostics、cast-source-probe及cast-receiver的handshake-akam/session-akam/session-akam-denied模式。相同4173端口的完整UI、依赖selftest和native UI必须串行执行，不复用错误服务或放宽reuseExistingServer；首次依赖selftest与完整UI并发端口占用按失败记录，待完整UI结束后重跑。


059/ADR-019：现代内部包版本059，新增原生范围超时分层及UI真实进度监视。C bridge结构/输出改变须重跑probe:native:build与probe:deps:link，现代库/CA不重编译；运行`test:native:bridge`、`test:native:cast-source`和实际cast/media UI。新增定向命令`npx playwright test tests/ui/cast-receiver.spec.ts --grep handshake-session-timeout`包含恢复、从未推进、恢复后停滞、暂停继续、Home取消；这只是合成SDK/原生夹具，不是TV成功。进度监视使用已发布缓存/真实tick，不读busy SDK。原生隔离事实带g1..g4，仅closed:false接受；UIprogress/unconfirmed是本地派生记录，不接受为Worker payload。

## W01/G2合成HTTPS及保护存储（独立网络包007）

见ADR-020。固定现代库不重编译；新的session-https.c需`npm run probe:deps:link`实际链接。`npm run probe:host:network`用现有Homebrew OpenSSL构建HOST专用curl，`npm run test:native:https-session`验证真实合成wire，HOST库不进入WGT。先`npm run check`/`npm test`，再build、package、package:native:modern、`npm run package:isolation -- --https-vault`和delivery；随后probe:network:ui、`npm run package:network:https-session`/verify:network、test:ui:network。每次source改动重建快照；默认package:network仍是006 TLS模式，不能误当007 HTTPS包。

007 HTTPS成功后保存随机合成秘密（KeyManager），journal只有boot和SHA256；读取报告后自行退出。先冻结/收集prepared报告，再签名/运行配对的只读observer并取报告，最后重开007核对秘密摘要并删除。每个阶段单独归档source/signed/identity/时间；NotFound/SecurityError本身不是隔离PASS，须与owner前后存在一起解释。未知save/cleanup不重复写、不宣称已删除；不把测试证书或合成路由加入产品CA/目标。无真实cookies/账号写操作。主059不因此自动侧载更新。

G3独立账号候选008：只读固定GET见ADR-021，`probe:deps:link`同时链接account/probe.js/wasm/data；`probe:network:ui`编译独立account UI/Worker，本地QR依赖由platform/third-party/qrcode-generator.lock.json核对，`npm run package:network:account`/verify:network只取对应entry并带MIT。`npm run test:native:account`用HOST TLS CONNECT_TO夹具，`npm run test:ui:account`只跑账号入口；不要把008 entry跑成007 TLS/HTTP UI，也不要以fixture代表实际扫码。签名/侧载仍独立步骤，008不隐式批准真实进度写入；默认必须在TV选开始扫码，恢复slot可用时新document自动只读核对。

## G3一次进度写回候选011

ADR-022：`npm run test:native:progress`只运行临时HOST TLS夹具的合成POST，绝不访问真实账号；`npm run test:ui:account`同时覆盖只读与写回确认界面。`probe:deps:link`现在显式链接selftest/validation/https-session/account/progress-post/probe六个程序，所有C输入和最终文件摘要受门禁。account原生仍仅固定GET，progress-post是单独能力，二者均本地打包；普通主探针不加载它。原四组WASM与010保持，新增程序另记录精确map。

`package:network:account`生成011/account-progress-preview-manual，使用同一BiliNet001升级身份，启动仅只读预览。真实进度写回必须在具体目标/旧值/15秒预览和明确授权后，由用户点击电视确认按钮触发；build/sign/install/collect不提交业务POST。普通存储bilisofa.w01.progress-once.v1是非秘密防重复意图，不含UID/cookies；未知、拒绝或完成都不自行删除来重试。最终“清除电视测试会话”只删除本探针固定KeyManager账号项并核对NotFound，不重置防重复意图，也不调用其他账号/互动写入。


G3只读核查：`python3 tools/package-network-probe.py --account-reconcile`生成当前013候选；仅在原生链接/界面/源码snapshot配对后打包，仍须verify/sign/授权目标部署分开执行。`python3 tests/native/account-readback.test.py`是HOST loopback真实TLS/固定GET/WBI签名夹具，不访问真实账号，不证明TV结果。012/013无进度POST原生模块；原011单次未知意图不能清除或重发。


### W01/G4 独立公开直播候选

`python3 tools/link-live-probe.py`仅链接新的匿名live WASM，不改主投屏原生工件；`npm run build`冻结当前源后，`python3 tools/package-live-probe.py`生成BiliNet001 0.0.14（替换已清除会话的013，原件仍须私密保留），`python3 tools/verify-network-probe.py`按版本调度专用门禁。该包不含账号/二维码/进度POST/投屏Worker。实际签名/安装仍是显式独立操作。

相关本地检查：`node --import ./tools/register-ts.mjs --test tests/unit/live-hls.test.ts`、`python3 tests/native/live-probe.test.py`、打包后`npx playwright test --config playwright.live-validation.config.ts`。HOST TLS fixture仅本机合成数据，浏览器模拟SDK；均不证明电视真实直播。固定room6目前解析到7734200，官方API的base_url已有query、extra为独立query字段且host无末尾斜杠；按URL结构拼接，禁止从字段标签推断固定形态或打印临时签名地址。


015独立直播中转候选见ADR-024，原014直接SDK样本中途断流失败保留。当前`link-live-probe.py`只链接live-relay.c与共享live-probe.c到build/live-relay-candidate，`package-live-probe.py`仅生成BiliNet001 0.0.15，WARP/媒体CSP仅新增loopback40325，不开放媒体互联网目的地。`python3 tests/native/live-relay.test.py`验证HOST TLS+真正loopback服务；源快照用BiliSofa-W01-live-source-snapshot.zip，与主060归档分开。签名/部署继续显式步骤，构建不改变已装主应用。


## W02独立基础预览（2026-10-17）

路线实施决定见ADR-027，预览构建/浏览器检查/打包命令与证据见[W02_FOUNDATION](../../W02_FOUNDATION.md)。新增build:foundation、test:ui:foundation、package:foundation-preview，均不签名/安装/调用真实账号。输出dist/foundation-preview及独立preview.zip，不覆盖已装060/018配对。默认build/package仍是既有W01工具；不能据当前dirty源码重新构建的包替换旧设备证据。

W02第二批合成账号沿用基础预览命令；内存账号不会调用KeyManager或B站。正式多账号平台实现、状态合同、行为和未完成项见[W02_ACCOUNTS](../../W02_ACCOUNTS.md)。打包器拒绝平台模块输入，预览ZIP不是WGT。

正式账号路径的内部WGT命令：`npm run native:identity`显式使用已配置SDK/固定依赖编译；`npm run build:app`构建UI和Worker；`npm run test:ui:app`串行跑实际代码与合成native/KeyManager边界；`npm run package:app`只生成未签名包。HOST TLS测试为`npm run test:native:identity`，依赖已建好的`.local/host-network/manifest.json`与固定静态库。没有依赖时记录工具阻塞，不使用外部服务代替。完整步骤/权限/未验收见[W02_IDENTITY_APP](../../W02_IDENTITY_APP.md)。


W02第四批沿用`build:app`/`package:app`，当前生成`dist/BiliSofa-W02-media-unsigned.wgt`（BiliSofa01.TV/0.2.0），旧账号WGT不覆盖。`test:ui:media`覆盖真实JS Worker/生产解析/SDK适配器与合成C/AVPlay边界；与其他4173浏览器套件串行。`python3 tests/native/foundation-packaging.test.py`仅变动生成stage并逐例恢复，需先成功打包；不会签名/安装。完整来源、限制、验证与W02剩余项见[W02_MEDIA_APP](../../W02_MEDIA_APP.md)。


W02第五批当前`package:app`生成`dist/BiliSofa-W02-cast-unsigned.wgt`（BiliSofa01.TV/0.3.0），旧0.1/0.2 WGT保留。新增`npm run test:ui:cast-app`运行实际接收器JS/生产协议与合成C/SDK发送端，不访问真实电视/账号；与4173其他套件串行。构建不部署，现有W01签名脚本身份白名单不应被绕过来冒充本新应用。完整步骤与未验收见[W02_CAST_APP](../../W02_CAST_APP.md)。


W02第六批当前`package:app`输出`dist/BiliSofa-W02-local-unsigned.wgt`（BiliSofa01.TV/0.4.0），历史0.1–0.3工件不覆盖。`npm run test:ui:local-app`覆盖实际应用本地Storage/JS Worker与合成身份/媒体边界；需要与其他4173套件串行。浏览器reload可证明该浏览器分区保存，不能当作TV进程/断电/升级证明。完整命令、schema上限、失败/清理恢复见[W02_LOCAL_APP](../../W02_LOCAL_APP.md)。

W02第七批当前`package:app`输出`dist/BiliSofa-W02-network-unsigned.wgt`（BiliSofa01.TV/0.5.0），前六批原件保留。显式`python3 tools/sign-foundation-app.py`核查当前包来源、固定ID/版本、自有profile与签名输出，签名包/厂商日志仅放仓库外私密目录；不改旧W01签名白名单。显式`python3 tools/deploy-foundation-app.py`只对既有授权私密目标核查state/capability并安装、启动固定新ID，任一步未知就退出、不自动重试。签名产物规范化为无空格文件名，字节/hash不变。已执行结果与最小验收组见[W02_NETWORK_APP](../../W02_NETWORK_APP.md)，构建/签名/平台安装返回与用户功能/性能证据保持分层。

W02 0.5.1当前`package:app`输出`dist/BiliSofa-W02-source-diagnostics-unsigned.wgt`，显式sign/deploy固定新版本，其余命令保持。0.5.0原件/用户首组结果和首次失败保留；新MediaFailure不读取SDK/原生原文，仅传规范化既有码。相关故障注入、具体hash及一次取源观察边界见[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)。

### W03 0.6.0排行榜

`npm run native:catalog`实际链接独立catalog；`npm run test:native:catalog`为本机TLS夹具，需既有HOST网络依赖；`npm run build:app`新增catalog-worker；`npm run test:ui:catalog`使用合成原生边界。浏览器suite按序运行（共用4173）。`npm run package:app`当前输出`dist/BiliSofa-W03-ranking-unsigned.wgt`；显式sign/deploy固定0.6.0同一ID，旧0.5.1保留。无新SDK/依赖/权限/账号写授权需求，实际证据与API-352见[排行榜交付](../../W03_RANKING_APP.md)。


2026-10-18追加：0.7.0命令：native:search实际Samsung链接；test:native:search需已配置HOST网络TLS夹具；test:ui:search检查新输入/搜索。build:app固定生成本地词库/NOTICE并打包initials-worker/search-worker，package:app当前输出dist/BiliSofa-W03-search-unsigned.wgt；sign/deploy固定0.7.0。所有浏览器suite共用4173，串行运行；包负例会改生成stage，须在浏览器suite之外执行。


2026-10-18追加：0.8.0 build:app/package:app当前输出dist/BiliSofa-W03-history-unsigned.wgt；显式sign/deploy固定0.8.0。test:ui:media含确认关闭/缺ACK等8恢复场景，最慢场景等待既有12秒原生关闭期限；test:ui:search含历史分区/设置/账号移除等5新流程。C/SDK/native未改，不重编译它们；包负例必须与浏览器suite分开运行。见W03_HISTORY_RECOVERY_APP。


2026-10-18追加：W03热搜：npm run native:hot-search使用既有本地Samsung工具链/锁定库单独链接；npm run test:native:hot-search仅HOST本地TLS。npm run test:ui:search含热搜真实Worker/合成C与原搜索历史。各UI组共享4173必须依次运行，包负例需在UI结束后执行。新增native后构建/打包/签名/部署依次独立，当前内部0.9.0。


2026-10-18追加：内部0.9.1搜索格式修复不需native重链接，build:app/package:app沿原20项原生来源校验。test:ui:search新增单秒数字时长/固定字段错误的真实Worker检查，UI串行，打包负例在其后运行；版本和详细事实见W03_SEARCH_FORMAT_FIX。


2026-10-18追加：0.9.2需npm run native:search重链接变更的search.c，然后build:app/package:app；其余16条native保持，不重编译。test:native:search的11 HOST TLS检查覆盖新固定nav/WBI参数/签名。所有UI suite串行，打包负例在其后执行；工具不默认安装。见W03_SEARCH_WBI_APP。


2026-10-18追加：0.10.0沿npm run native:search实际重链接，仅在既有模块增加固定UP类型；test:native:search当前12项HOST TLS。build:app/package:app输出dist/BiliSofa-W03-user-search-unsigned.wgt，显式sign/deploy固定0.10.0同一ID。test:ui:search含6项新增UP检查（总25）；全部UI suite串行，包负例在其后运行，未装入额外运行时或账号路由。见W03_USER_SEARCH_APP。


2026-10-18追加：0.10.1 UP预览绘制修复仅CSS/版本/回归，无native重链接。build:app/package:app当前输出dist/BiliSofa-W03-user-preview-fix-unsigned.wgt；sign/deploy固定0.10.1。新增遮挡回归先对0.10.0失败，再修复通过，截图只有合成色块层并不证明视频解码。UI串行、包负例在全部UI后执行；见W03_USER_PREVIEW_FIX。


2026-10-18追加：0.11.0需npm run native:search重链接变更search C；test:native:search当前13 HOST TLS项。test:ui:search含5项新PGC与既有搜索/UP绘制；UI suite串行，全部结束后再跑包负例。package:app当前输出dist/BiliSofa-W03-pgc-search-unsigned.wgt，sign/deploy固定0.11.0同一ID；其他16 native保持，见W03_PGC_SEARCH_APP。


2026-10-18追加：0.12.0需native:search链接search C，test:native:search包含新增live_room固定签名用例；build:app/package:app输出dist/BiliSofa-W03-live-search-unsigned.wgt，sign/deploy固定0.12.0。UI suite共享4173必须串行，包负例在全部UI后运行；其他16条native保持，见W03_LIVE_SEARCH_APP。


W03分区榜：修改冻结事实后运行`python3 tools/category-data.py`生成双方白名单；build:app/native:catalog/package:app均要求`--check`通过。原始官方JS仅用于人工阅读字段，不能在构建或电视执行。native:catalog重新链接；identity/search/hot-search/native保持已有已验证产物。见W03_CATEGORY_RANKING_APP及有界剩余清单。


W03/F05新增native:library/test:native:library/test:ui:library；build:app包含本地library-worker.js，package:app验证library的CA/输入hash/固定路由/无写端点。原五个native模块不重新链接。私人数据只在合成fixture或用户电视内读取，不能抓取真实Cookie到主机。UI测试仍串行使用4173。


W03历史：test:ui:history使用真实生产Worker/Parser加合成C边界；与其它4173套件串行。native:library重建固定history/cursor GET，其余五个native模块保持；test:native:library增量验证history初始/uint64游标/拒绝注入。真实账号仅在电视读取，原始页面/JS/匿名响应在私密证据目录，不把账号历史/游标放日志或source ZIP。


W03收藏候选：npm run test:ui:favorites（合成数据，生产Worker/解析）；npm run test:native:library包括固定收藏导航/collection3分页与非法ID/page拒绝。shared4173的各界面suite须串行。实际TV须按W03_FAVORITES_APP的一组检查，HOST/浏览器不算真实账户。


W03关注更新：npm run test:ui:follow-updates 使用合成heap与生产Worker/解析；shared4173各界面suite串行。npm run test:native:library 包含固定更新GET/offset百分号编码/1024字节最坏编码容量/非法输入拒绝，HOST非真实账号。实际USER最小组见W03_FOLLOW_UPDATES_APP。


W03本机队列：npm run test:ui:queue（生产媒体Worker/适配器＋合成heap/decoder）验证持久化/焦点/双关闭/换项/Home/账号与失效；普通KV固定bilisofa.queue.v1.<owner>，不清防重放journal。所有4173套件串行，TV唯一步骤见W03_LOCAL_QUEUE_APP。
