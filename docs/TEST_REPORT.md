# 测试记录

2026-10-14（America/Toronto）：本委托已授权本地单元/合同/UI 测试，以下为实际运行记录。

历史截至0.0.31（后续结果以下方续跑和IMPLEMENTATION_STATUS当前摘要为准）：签名/安装/启动/source匹配和原生清理分项DEVICE PASS；0.0.13电脑关机冷启动/合成存储/声画、0.0.11输入/焦点、0.0.12 Voice Guide、0.0.19所测游客短片完整播放等历史USER PASS。Android受控候选既有部分声画和0.0.29长暂停PASS；0.0.30最新SDK错误回调/自动返回FAIL，恢复顺序待澄清，0.0.31指定时间重新缓冲与最近4次历史已部署但实际回跳待反馈。181个不同本地检查通过不能替代设备效果；完整W01/三端官方连接控制/账号/PGC/live/F19/全量v1.0.0仍未验收。历史工件与最新续跑分开保留。

## 本地结果（初始工件，后续见续跑）

| 命令/范围 | 实际结果 | 层级 / F/W |
| --- | --- | --- |
| `npm install --ignore-scripts` | exit 0；8 packages；npm audit 0 vulnerabilities | HOST 开发依赖，不能代表 vendor/native 依赖安全审计 |
| `npm run check` | exit 0；TypeScript strict；18 个模块依赖/平台边界通过 | SOURCE W01/W02 |
| `npm test` | exit 0；20 tests PASS，0 fail/skip | LOCAL 合同：W01/W02/W03/W05/W06 |
| `npm run probe:native:check` | exit 0；clang c11 Wall/Wextra/Werror syntax-only | HOST C 源码，不是 Samsung wasm link/runtime |
| `npm run build` | exit 0；本地 app/Worker/原创 WASM/config/icon/许可；source hash 清单 | BUILD 候选 W01 |
| `npm run package` | exit 0；真实 basic unsigned WGT ZIP + SHA-256 | PACKAGE 候选 W01；未签名/安装 |
| `python3 tools/verify-package.py` | exit 0；root/entry/identity/hash/禁止私密文件与常见密钥模式 | PACKAGE 静态检查；不是完整密钥/漏洞审计 |
| `npm run test:ui` | exit 0；5 tests PASS | DESKTOP Chromium 156.0.8078.4、1920×1080 |
| `npm run probe:native:build`（无显式参数） | exit 1；BLOCKED，要求 Samsung emcc 与 CA | 阻塞正确暴露，不作为 native build PASS |
| `python3 emsdk.py activate --embedded latest-fastcomp` | exit 1；arm64 未找到 sdk-releases-fastcomp matching tool | HOST 阻塞 |
| 官方 SDK clang / Node | exit 127；bad CPU type in executable（x86_64） | HOST 阻塞；没有 TV 结论 |
| `arch -x86_64 /usr/bin/python3 ...` | exit 1；Bad CPU type | HOST Rosetta 路径尚未就绪 |

初次新增弹幕 parser 的 TS 模式推断检查曾失败，已通过显式 Danmaku 泛型修正并重新执行上述静态/行为检查；最终无该失败。Python urllib 的 CA 链错误通过系统 curl 的默认 TLS 信任路径完成下载；没有关闭校验。

## 行为证据

- 账号切换/取消/任务结束后的旧 response 不接受；A/B 合成数据隔离。
- 写确认、pending/unknown 防重；异常归 unknown；查询失败不推断未应用；并发 reconcile 上锁；重建 snapshot 的 pending/checking → unknown。尚无真实持久 journal，不能宣称 crash-safe 账号写入。
- 分页重叠去重、reset 丢晚数据、失败后保留 cursor；目标 URL 只许必要 HTTPS host，凭据跨 origin redirect 拒绝。
- PlayerCoordinator 晚 prepare/time/end/error 无法操作新会话；seek 串行/取消；live 不接受普通 seek；屏保恢复。AvplayBackend 调用 IDLE listener→prepareAsync、1920×1080 rect、合法 stop/close，待真机联调。
- 字幕 s→ms 边界、时间偏移、倒退 seek、文本不执行；弹幕控制模式白名单、关键词/密度和实际媒体时间窗口。XML/protobuf/实际渲染未接入。
- CastSession 拒绝未批准/竞争发送端、陈旧 sequence、remote 接管后的 sender 命令和账号写/任意 URL；这不是官方协议兼容测试。
- Hide/resume revalidation 竞态不重建旧资源；非敏感设置损坏/quota 可恢复；Chinese composition/229/repeat 不确认。

## 桌面 UI 验证

流程：本地探针启动→真实 DOM 初始焦点→方向移动→返回弹窗→焦点归还→Worker/WASM 计算→标记保存/reload→中文输入/Back→脱敏记录。

| 检查 | 实际 |
| --- | --- |
| 页面 identity / 非空 / 无框架错误 overlay | PASS |
| 基础页/Worker 的 console 与 pageerror | PASS；无应用错误 |
| 截图可读性和焦点 | 已目检桌面截图；不能替代沙发距离/Voice Guide |
| 方向、模态隔离、调用点恢复 | PASS |
| Worker 真实 WASM | PASS，仅 19+23；无 socket 能力推断 |
| native 资源不存在的错误入口 | BLOCKED 正确显示；资源缺失 404 是预期，不叫原生成功 |
| 标记 reload / 结果不带 IME 内容 | PASS；localStorage 不算私密保护存储 |
| 中文 composition 防确认 | PASS 合成浏览器事件；真实 TV IME UNVERIFIED |

Browser 技能未列出，使用已安装 Playwright。截图置于仓库外：`/Users/weijiazhao/.codex/visualizations/2026/10/14/01a13a9e-4bc1-79f1-9f9b-4eb335722348/probe-desktop.png` / `probe-export.png`。设备、native、官方账号/发送端等未执行项另见 DEVICE_CAPABILITIES。

## 工件对应关系与设备复现

无 HEAD/commit。最终包 SHA-256、sourceSnapshotHash、源码 ZIP hash 在 ignored `dist/DELIVERY.json`；`dist/source-manifest.json` 对每个源码文件记录 hash。更新源码/文档后必须 build/package/delivery，脚本拒绝快照不一致。没有 hosted CI 结果。

真机 Case W01-P01–P10 见 W01_PROBE_GUIDE；填报模板 `tests/device/acceptance-template.json` 不是执行结果。已取得设备型号/平台/开发者模式连接元数据，尚无探针执行、固件/引擎、自己的 profile、发送端或账号权益数据，不能填 App 能力 PASS。

## Rosetta 授权后的原生构建（同日续跑）

用户明确授权 Rosetta 2 安装及继续编译。`softwareupdate --install-rosetta --agree-to-license` exit 0；receipt com.apple.pkg.RosettaUpdateAuto 1.0.0.0.1790234402。`arch -x86_64 /usr/bin/python3 emsdk.py activate --embedded latest-fastcomp` exit 0；官方 SDK 仍为固定 1.39.4.7。初始 bad CPU type/activation 失败是已解除的历史 host 阻塞。

| 检查 | 实际 |
| --- | --- |
| Samsung native build | exit 0；emcc 1.39.4.7、fastcomp clang 6.0.1、SDK Node 12.9.1、SDK Python 3.9.6；project-local EM_CONFIG/EM_CACHE/EM_PORTS |
| WASM | 1670521 bytes；WebAssembly.validate true，85 imports / 24 exports；不代表 Tizen host imports 可用 |
| 重复编译 | JS/WASM/CA data 三项 SHA-256 相同；生成 metadata UUID 按 CA hash 固定并登记修改 |
| CA / source archives | CA 与官方 sha256 文件一致；cURL/OpenSSL/zlib 下载 sha512 与 SDK port 声明相同 |
| Runtime/CSP 静态边界 | 无用户绝对路径、无 eval/new Function；保留当前 narrow CSP |
| `npm run package:native` | exit 0；真实 unsigned native WGT，0.0.2、BiliProbe1.Probe、公开 CA 和原始许可证随包，无签名/安装结果 |
| `python3 tools/verify-package.py --native` | entry/version/hash/CA/native/license 对应关系检查；不是签名、漏洞或设备验证 |
| `npm test` | 21 tests PASS，新增初始化 progress 不可标 PASS 的合同；原有 20 项继续通过 |
| `npm run test:ui:native` | 2 项桌面检查：Worker 本地 JS/WASM/CA 加载及实际初始化、主 UI 可操作、20 秒 deadline 失败、停止后重新执行基础 Worker |

桌面 native 运行实际：先收到 `UNVERIFIED native.wasm_initialized_network_unverified`，之后网络执行达到 worker 20 秒期限，显示 `FAIL worker.timeout`。仅加载/初始化/失败及资源停止检查通过，**没有 socket/TLS/cookie runtime PASS**，没有借桌面结果关闭 W01。

原始第三方许可在 `platform/wasm-network/licenses`，native 包内在 `third-party-licenses/`；完整依赖版本及源 hash 见 THIRD_PARTY_NOTICES。cURL 7.68.0/OpenSSL 1.1.1d/zlib 1.2.8 为 legacy SDK probe 依赖，不批准为最终真实会话产品网络栈。

最终 `dist/DELIVERY.json` 同时记录 basic 与 native 包及源码快照。Developer Mode 和只读连接已确认；用户说明旧证书属于第三方项目，排除复用，等待自己的新 Samsung profile 和实际 TV App 证据。没有侧载/真实账号写入/公开发布。

## CLI 安装阶段的 HOST 证据

官方 Tizen Studio 6.1 web-cli macOS installer 已从 download.tizen.org 下载，280301758 bytes、SHA-256 `1630194c222776093785b274554461f896243dfa6b59581928047816fab75a80`、内嵌 payload 校验通过。完整 SDK 与自带 JDK 配在 `.local/tizen-studio`，data 在 `.local/tizen-studio-data`，未覆盖用户全局 JDK/SDK/签名 profile。

`tizen version` exit 0 → CLI 2.5.25；`sdb version` exit 0 → 4.2.25；Java 1.8.0_322 可执行。`tizen package -h` / `tizen install -h` exit 0，已核对模板中的工作目录/output/profile/target/name 参数。未签名/安装、未申请/覆盖 author 身份。CLI 可运行只算 HOST，不代表 retail permissions。

## 签名准备与目标连接（同日续跑）

- 已获内部探针侧载授权下的只读 SDB connect 成功；capability 返回 profile_name:tv / platform_version:9.0。设备信息界面显示 UN58U8200FFXZC、Developer Mode On。原始输出在仓库外私密目录，地址/DUID 不进入公开记录。
- 用户说明现有证书属于其他开源项目；没有使用该身份进行签名/安装，保留原文件。等待用户创建自己的 Author/Distributor。
- 官方 Samsung Certificate Extension 2.0.75 安装命令 exit 0；隔离 VS Code 基础扩展 `tizen.vscode-tizen-csharp@10.4.3` 安装 exit 0。官方 overview 所链接 TV 辅助扩展安装 exit 1 / Extension not found，记录为工具阻塞，不宣称成功。
- Certificate Manager 3.0.0 主程序安装 exit 0；原始 launcher 启动后 Cua inventory 显示 org.tizen.cert.ide running，UI 绑定仍返回 Invalid app；窗口/向导/证书创建 UNVERIFIED。不是证书或签名通过。
- 创建操作、Samsung 登录、密码和条款由用户完成；具体步骤见 SAMSUNG_CERTIFICATE_GUIDE。设备连接不是安装、运行或任何 W01 能力通过。

## 用户创建 profile 后的第一次侧载

- 用户确认创建完成后，本机 CLI 确认 BiliSofa profile 存在/active，Author 与 Distributor 引用文件存在；未输出密码/私钥/DUID。
- 基础包签名 exit 0，签名文件 author-signature.xml / signature1.xml 均存在；私密签名包 SHA-256 `0db89f81fd325990c0242308718432a4c0f8333b49ca17093ca38c44b3df9c7c`，源快照 `e4c2dba8c6f49cd069eb89d8b4dddb28ef445fb40cd9361450e65443f6dcee13`，内部版本 0.0.1。签名包及原始日志在仓库外，未进入 dist/公开源码。
- 首次 CLI install 在 transfer 阶段失败，随后连接不可用；重新连接并使用无空格包名后 transfer 成功。传输问题是否由连接或文件名导致尚未隔离，不归因单一因素。
- 设备实际安装 FAIL：`install failed[118, -12]` / `Invalid certificate chain with certificate in signature`。未 run，未取得探针 UI/Worker/网络执行结果。
- 从包内公开 X509 证书读取有效期：Author 叶由 Samsung 签发，2026-10-14 至 2027-10-14；Distributor 叶/链均为旧 Tizen 证书，分别到 2022-10-27/2022-10-27。profile role 1 指向 SDK 默认 tizen-distributor-signer.p12。保留新 Author，待用户创建 Samsung TV Distributor 并加入本电视。
- `python3 tools/sign-probe.py basic` 实际 exit 1 / `profile.sdk_default_distributor`，在再次签名/安装前阻止该已知无效资源；不是设备能力测试通过。新工具不修改 profile、不读取/接受密码、日志和签名包留在仓库外。
- 发现 vendor package 签名命令会将 signature XML 和 .manifest.tmp 回写输入目录。重新 unsigned 打包的严格文件白名单实际阻止这些 extra 文件（exit 1），没有将它们带入公开包。仅将本次生成的两份 signature XML 和 .manifest.tmp 备份到仓库外并从 dist/probe 移除；新 sign-probe.py 改在仓库外的 unsigned 副本上签名，保留其他工作/证书不动。

## Distributor 修复后的真机结果

用户授权协助更新后，官方 SDK 单独生成 Public Distributor，Author/profile 的 Author 字段与文件 hash 保持不变。生成 API HTTP 200；新 Distributor 日期/Samsung 签发者及 Keychain 密码资源检查完成。两个 sign-probe.py exit 0，签名前后资源相同、全部嵌入证书当前有效。

- basic 0.0.1 install/run exit 0，平台 install completed / successfully launched；用户确认电视基础页面已显示。
- native 0.0.2 install/run exit 0，是同 ID/Author 更新；数据保持尚未验证。
- SDB app-specific debug 一次 20 秒 timeout，未取得自动 DOM/console/screenshot。用户随后反馈两项最终都显示 PASS；依据部署代码原生 PASS 要求五项结果全为 0，未取得最终 code/导出 JSON。初始化 UNVERIFIED 不能计 PASS。
- SDK 本地模块配置修复后 engine health HTTP 200；TLS guard 的合成自签证书负例真实拒绝 SDK opt-out，exit 0。该检查是开发工具 TLS 保护，不是 TV native HTTPS 结果。
- 精确已安装 signed 包 SHA-256/源码快照、权限假设、恢复和剩余门槛见 SIGNING_DEVICE_RECORD。文档后续更新产生的新 unsigned/source 工件与这些已部署包分开记录。

## 用户最终反馈与 LAN 诊断实现（同日续跑）

用户反馈 native 0.0.2 的两项最终均 PASS，登记 USER OBSERVATION。代码约束可推导五个合成分项全部成功，不能替代完整分项导出、真实账号/Set-Cookie、跨设备组播、独立冷启动或 F20 证明。包/源码配对保留在 SIGNING_DEVICE_RECORD。

0.0.3 候选新增固定 `/report` 短时监听、仅脱敏报告、瞬时地址不进入导出、方法/路径/大小/deadline/连接数限制及新操作取消旧地址查询。

| 新检查 | 实际结果 | 证据层级 |
| --- | --- | --- |
| npm run check / npm test | exit 0；18 模块边界，22 tests PASS | SOURCE/LOCAL |
| npm run probe:native:check | exit 0；clang Wall/Wextra/Werror | HOST 源码 |
| npm run test:native:http | exit 0；3 tests PASS：GET 正文后关闭、拒绝 POST/查询/绝对 URL/遍历、HEAD 不计 transfer、慢连接/超长头/总期限关闭 | HOST 真 socket；不是 Samsung/手机入站证明 |

Browser plugin not available，桌面交互采用已安装 Playwright；流程为页面→手机读取记录（地址不可用）→重新运行 WASM，以及晚到地址回调不覆盖新 Worker/地址不导出。截图在仓库外。后续实际编译、桌面测试及侧载记录继续追加。

0.0.3 本地最终续跑：npm run check / npm test exit 0（23 tests PASS，新增 WIFI_NETWORK status=ON / 地址不导出）；npm run test:ui exit 0（6 tests PASS）；npm run test:ui:native exit 0（2 tests PASS，桌面网络仍超时）；官方 Samsung emcc 编译及 unsigned 包校验 exit 0。原生和基础 UI 曾同时运行占用同一端口，native server EADDRINUSE exit 1；随后顺序运行通过，没有修改测试绕过。1920×1080 截图已目检：8 个按钮、真实焦点、主体/输入可读，没有错误 overlay/裁切。截图目录为仓库外 visualization 的 http-probe 子目录。桌面 localhost 身份/非空/console（基础正常路径）/交互检查均 PASS；网络资源缺失路径 404 及 native timeout 是预期，非成功网络能力。

0.0.3 私密签名工具 exit 0；设备更新安装/正常 CLI run 均 exit 0、平台成功，exact pairing 见 SIGNING_DEVICE_RECORD / dist/DEVICE_DEPLOYMENT.json。手机读取结果已请求、待反馈。当前 0.0.3 桌面 UI 最新重复验证仍为 6 PASS；UI code 的 WiFi status 修正已包含。

## 0.0.4 Socket Extension 兼容修复

用户反馈 0.0.3 手机入口 FAIL，未给最终代码，未收到 JSON。固定 Samsung SDK 源码明确 abort socket F_SETFL；当前原生分支采用 SOCK_NONBLOCK/accept4，主机分支保留本机机制。新增 Tizen contract harness：真实主机 sockets，要求创建/accept 的非阻塞 flags，直接调用 F_SETFL 时 abort，复用真实 GET/边界/慢连接/关闭测试；它验证原生分支兼容合同，不冒充 Samsung runtime。

0.0.4 npm run check / npm test exit 0，23 tests PASS；npm run probe:native:check 和官方 Samsung native 编译 exit 0。完整原生反馈/手机重试仍需设备证据。

0.0.4 npm run test:native:http exit 0，6 tests PASS（3 个真实 HOST 行为 + 同样 3 个带 Samsung 禁止 F_SETFL/要求 socket+accept flags 的回归合同），0 fail。

0.0.4 最终基础 UI exit 0（6 PASS），native UI exit 0（2 PASS，桌面 native network timeout）；目检仓库外 http-probe-fixed/probe-desktop.png，完整顶部结果代码可读、8 个按钮/焦点正常，无应用错误 overlay，基础正常路径 console/pageerror 无错误。签名、安装、CLI run exit 0/平台成功，准确工件见 SIGNING_DEVICE_RECORD。已向用户请求修复后入口实际反馈。

原创媒体准备：tools/media-probe.py generate/check，1280×720/24fps/H.264 Main、AAC48kHz/2ch、12秒低音量合成图案/440Hz。原始媒体不来自第三方内容；目前仅 HOST 文件元数据/hash/size/路径验证，不在 TV 包、不算媒体 PASS。

0.0.4 手机重试：用户反馈访问成功（USER OBSERVATION PASS），没有完整 JSON；之前 FAIL 保留为历史，当前成功属于 0.0.4，不冒充其他版本。0.0.5 默认手动模式、显式内部自动流程、取消后不自动续跑和 build 模式校验已实现，结果随后登记。

0.0.5 default-manual 桌面 UI 7 tests PASS（显式自动流程 + 取消序列回归）；内部分别 build/manual 与 build/autorun=1、package、sign/install/run exit 0，collector exit 0。实际脱敏 TV 报告 source match，WASM PASS、native 五项 0、GET 后监听关闭，见 DEVICE_REPORT 和 DEVICE_CAPABILITIES；无法提取 Chrome major 不补造值。

0.0.6 新增 original synthetic media/loopback server、AVPlay UI adapter、暂停/继续/seek/Back/Home/结束清理。SOURCE check、23 项单元合同及官方 native build exit 0；声画和实际生命周期在设备测试前仍 UNVERIFIED。CSP/WARP 只新增固定 loopback origin 与 self AVPlay object，无广泛通配/远程脚本。依据官方 AVPlay guide（object/type、1920坐标、prepareAsync、2015+ 不用 avplay privilege），官方 screensaver guide（播放状态控制）；来源复核 2026-10-14。

0.0.6 npm run test:native:media exit 0，3 个 HOST 真 socket 测试：重复 MPD/binary 正文、固定路由/方法/HEAD/查询/代理/越界请求、超大文件后下一请求/总期限关闭；使用合成字节，不声称声画解码。

0.0.6 npm run check / npm test / C syntax exit 0；23 项单元/合同 PASS。HTTP helper 重构后 npm run test:native:http exit 0（6 PASS）；npm run test:native:media exit 0（3 PASS）；基础 UI exit 0（9 PASS，包含平台缺失入口和合成 AVPlay/Worker modal/pause/seek/Back/清理 fixture）；构建/基础及原生 package exit 0。合成 fixture 不进入 runtime，不能证明电视声画。

0.0.6 原生包初次完整 verify 曾 exit 1（Public CA data mismatch），sign-probe 在 unsigned integrity gate 阻止签名，没有部署。官方 SDK file_packager 实际将 CA 和 embed 媒体一起写入 data；实查 CA prefix 与按固定顺序拼接的全部媒体 tail 完全一致。修复 manifest 的 dataLayout + verifier 连续范围/单文件上限/全部 hash/无尾随 bytes 校验，不绕过 gate。

0.0.6 最终 source 855c1ec… 的基础 UI 再次 exit 0（9 PASS）；native UI 2 PASS（桌面网络仍 timeout）；完整 native verify、delivery 与 sign exit 0；TV install/run exit 0 / 平台成功。43 项本地检查=23 单元/合同 +6 HTTP/SDK兼容 +3 loopback文件服务 +9 基础UI +2 native加载/停止，不是43项产品或真机验收。最新媒体桌面 screenshot 已目检：1920×1080、9按钮、真实焦点、完整结果码、主体/IME及footer，无裁切/错误overlay；DOM身份/非空/正常路径console/交互检查通过，合成AVPlay scene 只证明状态/focus/cleanup。截图在仓库外 media-probe 子目录。

0.0.6 用户实际反馈：绿色矩形渐入/渐出正常（USER OBSERVATION VIDEO PASS），没有声音，重复运行返回 `mpd.listener_failed_stage_12`（bind FAIL）。因此媒体总验收 FAIL/开放，不将该画面通过推广到音轨或重入。旧实现停止服务依赖 Worker.terminate，C 服务同步循环不能接收 stop；已发现缺少 fd closure ACK 的资源生命周期错误。

0.0.7 修复候选采用 20Hz cooperative Worker main loop、0-time socket poll，让固定 stop 控制可运行；先 close client/listener/cancel loop，再发 stopped ACK，父层最多等3.5秒后才 terminate。新运行等待 ACK，排队代次拒绝旧启动；ACK 未确认时阻止重试并报告 restart_required。每连接仍最多2秒，HTTP/MPD fixed paths/bounds/TLS 未弱化。音频增益从0.08调到0.8（默认 sine峰值0.125，样本峰值由约-40dBFS提高到约-20dBFS），新增只含 type/count 的轨信息和 manifest/video/audio asset已送出标记，均非音频解码 PASS。native transient 合成测试与 Home 的整机清理仍各自需实证。

0.0.7 同时纠正音频 init/segment Content-Type 为 audio/mp4（此前统一 video/mp4）；MPD codec仍为 AAC，路径/大小白名单不变。HOST 媒体传输回归覆盖 audio MIME 正文；无声的唯一原因仍待修复后实机验证，不按代码推测计PASS。

0.0.7 回归：TypeScript/C syntax/Samsung build exit0；26项单元/合同PASS（停止消息白名单、关闭ACK后才重用、旧排队任务/晚事件拒绝、清理未确认禁止复用）；HTTP6、media3、cooperative-stop2 HOST checks PASS；基础UI9及nativeUI2 PASS。nativeUI加载/实际初始化/callMain/timeout/停止仍是DESKTOP，不是TV媒体结果；停止ACK HOST测试在进程存活时验证，避免进程退出替代主动fd释放。

0.0.7 HOST cooperative-stop 最终4 checks PASS，增加 client/listener close fault注入：任何关闭返回错误都不发 stopped ACK，且同进程阻止服务重用。服务关闭失败锁存，避免无fd记录后的再次stop伪造确认；父层也阻止未知关闭后的重用。音频文件 HOST 实际 decode/volumedetect数据如下（不是TV声音证据）：{"exit": 0, "dBFS": {"mean_volume": "-26.0", "max_volume": "-21.1"}}。

0.0.7 Audio读数通过adapter限定只读isMute/getVolume和非秘密类型/数值范围，未增加tv.audio旧权限（官方文档5.0后deprecated；目标9.0）；optional读取失败不改变音量/静音。

## 0.0.7 合成声画与资源重用实测

manual 0.0.7 已签名、更新安装、CLI 启动（exit 0 / 平台成功）。signed SHA-256 `801c39daaf6dfd41c31f0e375b93f8d0c62c27db77f6e12c63b14882e3202627`，source `5613ce6aa32a89c67e0c0d3557b20910534ab0f5b8ac4bc3680e87430962116f`。准确包、部署日志、源码 ZIP 均留仓库外，未公开签名身份。

用户先确认画面和声音，第二次测试暂停/继续、跳到5秒、Back后重新进入均通过，未再出现 `mpd.listener_failed_stage_12`。记 USER OBSERVATION PASS（W01-P12 / 合成 H.264/AAC 样本），保留0.0.6无声/重入失败历史。没有自动TV截图/音频采集；不推广到真实UGC/PGC/live、多轨/倍速/4K/HDR、Home/休眠或F20。

用户读数 `avplay.tv_mute_false_volume_16` 表示电视未静音、音量16，正常只读元数据。0.0.8 将进度、读数和能力待验收分开显示，导出保留原始verdict与kind，不把读数或初始化改成能力PASS。

0.0.8 分类显示回归：npm run check / npm test / npm run test:ui / npm run test:ui:native 均exit0；26单元/合同、9桌面UI、2native桌面加载/停止检查通过。报告kind可选且白名单校验，旧报告仍可解析；只读mute=false/volume=16在UI显示“读数”，原始UNVERIFIED保留，初始化显示“进度”，能力未实测显示“待验收”。当前37项重跑，原生C/音频工件未改变；0.0.7的13项HOST socket检查不冒充本次重跑。桌面截图已目检，无裁切或错误overlay；native桌面网络timeout仍非TV能力结果。

0.0.8已实际签名/安装/CLI启动；用户反馈保存/Home/退出重开流程marker0→1，非敏感标记退出重开保持USER OBSERVATION PASS。Home停声/媒体复用细项和断电/电脑关机仍待明确实测，不能由标记或source测试推导。

0.0.9候选新增只处理原创随机合成值的KeyManager save/get/remove探针：专用本次alias、不枚举其他alias、不授予其他App权限，不保存真实账号；5秒deadline、取消/晚回调清理、未知结果禁止新写，清理后getData明确NotFound才可复用。API往返PASS只证明该行为，跨App隔离/加密/重建持久性仍待证明。未添加自Tizen3.0起禁用声明的旧keymanager权限。实际验证与部署随后记录。

0.0.9本地结果：TypeScript strict/19模块依赖边界exit0，30项单元/合同PASS，10项基础桌面UI PASS（含KeyManager合成fixture/取消/导出不含值），2项native桌面加载/停止PASS。42项重跑不等同产品/设备验收，13项原生HOST socket历史检查未在本次重复跑。10按钮1920×1080截图已目检，无裁切/overlay；正常路径console/DOM身份/交互通过。C/媒体资产与0.0.7一致，package:native严格检查源/二进制/许可hash后复用编译产物；显式autorun新增单次合成KeyManager→report，默认仍manual，无账号写入。

## 0.0.9 自动真机 KeyManager/网络报告

实际部署：内部`guest-synthetic-report-once`模式，signed SHA-256 `e6fe5133fa9c19d0019c49c3ae0a75e04d9e66fbeeef465bb8a1d6ca7e103a27`，source `8042ae3f5934300494c05784dd7908871aa36436a3f4c16aafa92231be8e62a8`。首轮install exit1，SDB设备列表为空；重连报告connected后再次install/run均exit0 / 平台成功。失败/重连/成功的原始日志及精确签名包/源码ZIP在仓库外保留，不把最初失败隐藏或归因证书。

collector exit0，source匹配，来自授权开发电脑固定`/report`（无代理/重定向，非手机身份）；GET后复查监听关闭。报告固件仍`T-KSU2EFAKUC-0090-1300.9`、model读数`U800FD`、平台9.0、Chrome major unavailable。WASM PASS、`native.tcp0_udp0_multicast0_tls0_cookies0` PASS、`keymanager.synthetic_roundtrip_cleanup_only` PASS。KeyManager PASS要求同调用写入的随机合成非秘密值读回相等，删除后getData明确NotFound；未枚举别名、读取真实会话或调用setPermission。

report.marker=1，结合0.0.8用户保存/退出重开marker1，证明这一次相同ID/Author CLI 0.0.8→0.0.9更新保留非敏感标记；不推广至卸载/回退/断电/私密会话。报告`kind`将进度/读数与能力分开，原始verdict未机械提升。`keymanager.isolation_persistence_protection_not_proven`继续待验收。

完整脱敏报告在ignored `dist/DEVICE_REPORT.json`，私密副本按source命名。后续文档/默认manual unsigned重建产生新源码hash，与此次已安装的auto工件分开；原生C/媒体编译产物未改动。

## 用户反馈与范围调整（2026-10-14，0.0.9后续）

W01 Home子项USER OBSERVATION PASS：播放合成声画时Home停声、返回探针后可再次正常播放。工件配对与DEVICE_CAPABILITIES一致；未自动取证后台socket/休眠/冷启动。中文输入未取得可用证据，用户反馈貌似不支持系统中文键盘，不能推断全部地区/固件不支持。

用户随后明确评论/回复/点播与直播弹幕仅查看，见ADR-003。历史F15/F16写操作、中文composition/编辑相关合成测试记录保留，其通用防重/状态机仍可能服务其他写功能；不据此增加产品写入口或要求对应真实账号测试。后续验收F10/F15阅读分页/安全文本/焦点，F08/F16/F18弹幕显示/观看设置/同步，并验证无对应编辑/发送/删除请求。F03单独验证首字母输入/候选和搜索。

本次只修改规划/文档、project.json元数据和脱敏观察记录；不改应用代码、不安装新词库/运行时依赖、不重新运行应用测试/打包/签名/侧载。原0.0.9运行包、签名hash和已保存源码快照保持原对应关系，不代表包含此次新规划。文档链接与功能合同一致性核查结果另记。

本次文档/合同核查PASS：92个仓库内相对链接0缺失；PRD和交接提示词均保留F01–F20，F15/F16/F18明确只读；project.json同步只读追踪元数据。对比此前dist/source-manifest，apps/packages/platform/tests/tools文件hash0变化；44个原始基线文件0缺失。未将这些文档检查计为应用或设备测试。

## 0.0.10 F03本地首字母输入候选

SOURCE：npm run check exit0，TypeScript strict/23模块边界；LOCAL npm test exit0，33项单元/合同PASS。新增词行/消息白名单、词序/去重/上限、所有65105上游行可解析、最多单flight+单replacement、旧请求/停止后事件隔离；失败回复也受同一版本/Scope/固定错误码合同约束。

DESKTOP：Browser plugin not available，使用已有Playwright；固定http://127.0.0.1:4173、1920×1080，npm run test:ui exit0，12项PASS。流程：打开首字母模态→方向/确认选N/H→选择真实随包词库中的你好→确认仅返回关键词→导出不含关键词；另覆盖ZG/Back分层/合成visibility清理/404后重试/系统IME229及Done焦点。身份/非空/正常路径console/无错误overlay/交互均通过，截图已目检：11主按钮、新输入页无裁切/重叠，方向键路径通过。TV专用固定画布，本次不主张手机布局验证。

47项本地检查由33单元合同、12桌面UI、2native桌面加载/停止组成。native C/媒体未变化，HOST socket13项历史检查未重复；原生桌面network仍timeout，不当作TV网络能力通过。实际新包侧载与本机输入结果另记。新功能只提供本地词语候选/关键词选择，没有B站热搜/目录/搜索接口，不关闭F03；评论/回复/弹幕仍只读。

数据：AOSP固定commit49aebad1c1cfbbcaa9288ffed5161e79e57c3679，原始词库/通知hash核验，生成64816词，JSON1052146 bytes，Worker解析上限2MiB；包校验必须匹配派生数据、许可和build元数据，未放宽CSP/权限。截图在仓库外initials-search目录，不含账号/地址。

## 0.0.10 手动首字母输入探针实际部署

signed SHA-256 `3d1d20fed6c8b03089ea7e2a4b9d6f86cff6d3b65d362487a5f8fc06d0ffad1d`，source `0ec50e9da11a244111db59c2ca00d08c99cc59b0b267528c486ade7d18720326`，manual模式。原Author/Public Distributor保持，签名资源/派生词库/原始许可/build元数据校验通过；install/run均exit0 / 平台成功。准确已安装源码ZIP/私密签名包/原始日志保留仓库外，dist/DEVICE_DEPLOYMENT.json为脱敏部署清单。

新版输入显示/选词/Back焦点与Voice Guide尚待用户实际反馈，不从桌面或安装成功计为TV PASS。历史0.0.9合成网络/KeyManager报告、0.0.7声画及0.0.9 Home用户通过记录保留各自工件配对。后续文档重建的unsigned/source与本次已安装快照分开。

独立游客搜索路线初探（HOST，非TV）：对Bilibili官方域名的公开候选`/x/web-interface/search/type`执行一次无cookie/无客户端keys、标明BiliSofa-W01/0.0.10的读取，TLS校验开启，正文限65536 bytes/15秒。curl exit22，HTTP412、3400-byte非JSON正文，未得到搜索列表；浏览工具也未能打开该URL。原始头/正文仅在仓库外，公开只记状态/大小，不转储Set-Cookie或捕获。未重试绕过/借用其他客户端身份。该结果不证明TV同样失败或必须外置网关，不据此固定接口/运行时；真实请求/会话路线待W01继续验证，本地词候选不替代真实结果。

## 0.0.11 候选第一列焦点修复（F03/W01/W02）

0.0.10用户反馈：输入和你好候选显示正常，其他操作通过；2行4列候选的第一列始终不可达。记USER OBSERVATION FAIL（方向可达性），没有把显示通过当成整体输入通过。准确0.0.10工件仍为SIGNING_DEVICE_RECORD所列signed/source配对。

修复前新增directional-only regression实际exit1：从键盘按预期入口不能聚焦candidate0。独立桌面诊断又确认candidate5（第二行第二列）按Left跳到search-delete，而非candidate4。此前候选选择测试用了click，未覆盖这条纯方向路径，是已有验证覆盖缺口；该诊断不冒充TV DOM抓取或全部原因的证明。

0.0.11在SearchInput生成显式网格邻接：候选4列、键盘10列、工具/底栏按各自顺序；Left/Right同排边界停留，Up/Down保列或夹紧不完整行，工具上返首个有效候选，禁用项跳过。数据刷新清理失效焦点，翻页只恢复一次candidate0。通用FocusRouter保留几何fallback；InputRouter仍唯一键入口，补旧方向名称/37–40兼容并让IME保有输入所有权。无新依赖、权限、外部服务或账号写接口。

实际检查：npm run check exit0（TypeScript strict/23模块边界）；npm test exit0（33项PASS）；npm run test:ui exit0（14项PASS）；npm run test:ui:native exit0（2项PASS）。共49项本地检查，未重复13项历史HOST sockets检查。新的纯方向用例从主屏出发，方向/Enter进入搜索、输入N、遍历两行八格、两行第一列/边界、翻页/恢复/选词，候选区无click或强制focus；补5候选部分行/禁用翻页/刷新恢复/旧键名键码。

DESKTOP环境http://127.0.0.1:4173、Chromium/1920×1080，Browser plugin not available，沿用Playwright。身份/非空/console/无错误overlay/方向交互检查PASS；两张仓库外initials-focus-fix/candidate-first-column-{top,bottom}.png已目检，第一列DOM焦点与高亮一致，无裁切。手机布局/Voice Guide/新TV交互未由这些桌面检查证明。TV修复确认待侧载后用户回传；完整F03内容检索仍未接入。

## 0.0.11 候选网格焦点修复包实际部署

manual 0.0.11 signed SHA-256 `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe`，source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。原Author/Public Distributor保持，签名预检/unsigned完整性通过；install/run均exit0 / 平台成功。准确源码ZIP/签名包/原始日志仓库外归档，脱敏部署清单在dist/DEVICE_DEPLOYMENT.json。

49项本地检查PASS：33单元/合同、14桌面UI、2native桌面加载/停止；第一列修复的TV交互待用户回传，不由安装成功或桌面检查推断PASS。用户反馈0.0.10输入/你好显示/其他操作通过、第一列不可达FAIL的证据保留；后续文档重建unsigned/source另有hash，不归到这次已安装工件。


## 0.0.11 真机候选导航回归通过（F03/W01/W02）

用户对本轮步骤明确回复“已修复，全部验收通过”：NH后从键盘上移进入首候选你好、向下进入第二行第一项男孩、两行第2项向左返回第1项、选中你好，均记USER OBSERVATION PASS。工件为signed `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe` / source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。已更新该部署清单并仓库外保存脱敏用户观察；保留0.0.10第一列FAIL历史。当前输入回归关闭，真实内容搜索/热搜/历史、Voice Guide和其余W01门槛仍开放。


## 0.0.12 合成 KeyManager 退出重开探针（W01/W02，F01/F13前置）

新增固定专用alias的非秘密值两阶段探针，普通存储只记本探针nonce/启动随机代次，不接收会话/任意alias。先预查alias不存在、先持久记录合成期望再异步写，读回一致后仍UNVERIFIED并要求退出重开；新document才可核查值保持、删除、再次getData明确NotFound及清理journal，全部成功才PASS。同document/Home恢复不算重建。拒绝覆盖已有alias，saveData重名语义未假定；journal≤256字符且严格schema。损坏/存储拒绝/值不符/清理不明阻止错误结论，超时/取消结果未知并阻止同进程新写，晚回调仅清理归属数据。无枚举、跨App授权、实际credentials或新权限。

新增显式BILISOFA_PROBE_AUTORUN=2，仅执行合成持久性→短时报告，不跑真实账号或媒体。首次报告确实GET成功后探针自行退出，开发电脑可CLI重新打开同一工件；第二次启动检查后保持页面。manual为默认，不自行退出。完整保护存储、加密、跨包隔离、断电/电脑关机、升级与回退不由此探针宣称通过。未选择产品PrivateSessionStore或固定最终runtime。

本地实际检查：TypeScript strict/24模块边界PASS；39单元/合同PASS；16桌面UI PASS（新增合成重开/清理/脱敏及自动报告后退出、手动取消）。native加载/停止、打包、签名与电视结果另记。无C/媒体/网络依赖变化，不重复历史HOST socket测试。


## 0.0.12 合成持久性真机双阶段通过

已实际签名/安装/CLI启动synthetic-persistence-report-once 0.0.12：signed SHA-256 `952e914ee70edb16212f37e8857f4f4f0ae6958f55017e8faefd952a5290aa63` / source `57c584c953ba5a2dcbdd138a0ca8a0520674e79524a48306ca287ef3e6346687`。install/run均exit0/平台成功；同Author/Public Distributor。第一份source匹配TV报告为`keymanager.persistence_prepared_exit_reopen_required`，GET后探针调用自身exit；随后CLI重开相同签名包成功，第二份source匹配报告为PASS `keymanager.synthetic_document_restart_read_cleanup_only`。值一致、remove后get明确NotFound、合成journal清除全部核查。两次GET后40322均关闭；客户端均授权开发电脑，未冒充手机。原始日志/签名包/准确源码和两份脱敏报告在仓库外归档。设备固件/平台读数未变化，marker1保持。

本次合计57项本地检查PASS（39单元/合同、16桌面UI、2native桌面加载/停止），1920×1080十二按钮截图已目检，无裁切/overlay，DOM焦点/正常console/交互通过。C/媒体未改且包完整性通过，13项HOST socket历史检查未重跑。读取/清理是本次合成退出重开证据，不证明进程PID更换、断电、升级/回退、加密或跨App隔离，不据此开始保存真实cookies或关闭W01。下一步恢复默认manual工件供人工Voice Guide/独立运行核查，mode/hash另记。


## 0.0.12 manual 人工验收工件

自动双阶段取证后，已恢复默认manual模式并实际同版本更新安装/CLI启动（均exit0/平台成功）：signed SHA-256 `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。manual没有自动写/报告/退出；运行界面保留首字母导航修复及独立存储重开按钮。准确源码归档与私密包保留，新的部署清单为device-native012-manual-deployment.json，自动测试原清单/两报告均另存不覆盖。自动模式的持久性PASS属于前一配对；手动工件的Voice Guide/电脑关机冷启动仍UNVERIFIED，已请求实际Voice Guide反馈。后续文档重建的unsigned/source与此已安装快照区别记录。


## 0.0.12 Voice Guide / Back 真机反馈

用户对主页面和NH候选间方向移动的Voice Guide检查明确反馈“朗读与焦点一致，Back 正常”，记USER OBSERVATION PASS；对应manual signed `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。已更新部署与仓库外脱敏观察。关闭该探针主界面/首字母候选的朗读与Back项，不扩展为尚未实现产品页面的全量无障碍验收。冷启动/电脑关机、保护存储隔离、真实内容与官方三端投屏仍开放。


## 0.0.13 跨包只读合成观察候选（W01/W02、F01/F13前置）

新增开发专用第二包BiliIsola1.Probe（package BiliIsola1），与主探针BiliProbe1.Probe及最终单App产品身份分离。只尝试getData读取主探针固定合成alias，带明确packageId；不枚举、save/remove别包数据、setPermission或输出返回值。运行时先核对自身appInfo.id，不符则不读。NotFound/SecurityError只作UNVERIFIED观察，其余错误不能冒充隔离；意外读成功明确FAIL。

主探针自动持久性模式新增运行身份核对。三阶段要求主包先save/read确认、独立观察包不可读、主包再启动确认同一合成期望仍在并删除/确认NotFound。离线工具核对三份报告source/签名包/实际身份代码/automation/型号固件/严格先后时间及一小时窗口；缺一项不输出PASS。实验限定相同Author的不同包单次合成读取，不能扩展为所有威胁下的保护存储/加密/真实会话验收。

签名/验证/collector增加显式isolation变体，构建输出独立WGT，保留原Author与Public Distributor且无新权限/依赖；所有网络仍在Worker。未变更C/媒体，helper复用已验证native短时报告服务，GET后退出供主包再启动。别包观察的签名/报告路径独立，公开日志不含alias返回值、LAN地址或凭据。临时观察包不进入日常运行依赖。

桌面新增测试发现导出文本Back原先硬编码返回ime，独立观察包没有ime时落到首按钮。改为本地data-return-focus-id，输入框仍回ime，导出回export；主包/观察包均覆盖Back→退出弹窗→取消恢复调用点，未新增页面键监听。首轮观察UI 2通过/1失败，修复后4项通过；保留失败记录，未把fixture提升为真机。

已实际TypeScript strict/26模块边界PASS，42单元/合同PASS，16主包桌面UI及4观察UI PASS；1920×1080观察布局/导出已目检，无裁切/overlay，单焦点/正常console/脱敏通过。native加载停止及真正签名/三阶段TV结果另记。


## 0.0.13 跨包合成读取隔离真机通过

主包signed SHA-256 `f356bc696920f9729acc8f75383d690c9ed6c0ccde2a73d9b521eac683d07ef1`、观察包signed `0d8e4117804ac756ec17d1d026f8193386122b8188c4fef8f5343eb6f61e6794`，共同source `7ebe69086b15d726d03a8fdb8faef5ba673c5d992d4575d9f5ba42a3110d0997`，两包均使用原Author/Public Distributor、install/run exit0/平台成功。before→observer→after时间2026-10-15 00:00:09→00:00:36→00:00:52 UTC（本地2026-10-14）。主包自身身份确认后保存/读回；观察包实际身份BiliIsola1.Probe确认，带packageId查询固定合成项返回NotFound；主包再CLI启动，读回同一journal期望、删除/明确NotFound及journal清除PASS。三次source/工件/固件/平台/身份/顺序均匹配，GET后监听全部关闭。开发电脑client身份明确，不冒充手机。

离线核对输出DEVICE REPORT PASS `keymanager.same_author_different_package_synthetic_read_isolation_only`，ISOLATION_RESULT.json与三报告仓库外保留。三报告不齐时工具曾实际exit1/UNVERIFIED，补齐后exit0/PASS。此结论只覆盖相同Author不同包固定合成项读取，不代表加密、root/篡改保护、任意其他App、真实多账号、断电或原子更新通过，仍不保存真实cookies。

本轮64项本地检查PASS：42单元/合同、16主包桌面UI、4观察UI、2native加载/停止。最初观察UI Back恢复一项FAIL已修复并回归，未隐藏；C/媒体未改且完整性核对，13项历史HOST socket不重复。44个启动基线文件0缺失，无HEAD/remote、未commit/push/公开发布。自动工件准确源码/私密包与原始安装日志均已归档。

临时观察包清理首轮exit1：按CLI帮助的package ID传BiliIsola1，返回package not exist，无App被删除。复核Samsung TV官方CLI文档后改传完整application ID BiliIsola1.Probe，实际exit0 / uninstall completed。仅移除本次新装观察包，主探针/已有App/证书保留；首轮失败与修正日志及两份清单均在仓库外。


## 0.0.13 当前manual工件与待人工独立运行

跨包实验后已恢复默认manual并实际安装/CLI启动，均exit0/平台成功：signed SHA-256 `5f6d72988c2c078fd603eca5295832895a323d029cebc3797f17568e125e0818` / source `7abca084fc175f14f1ec99b94b2aaaeb8383cb0be21444a868b0de657f9a64d8`。精确源码/包仓库外归档；device-native013-manual-deployment.json及dist/DEVICE_DEPLOYMENT.json记录当前工件。没有自动写入/报告/退出；临时观察包已成功卸载。历史三报告/隔离PASS仍只对应7ebe6908…自动配对，未归到本manual新hash。

已给用户具体电脑关机/电视正常重启（开机标志）→手动启动→合成存储读回PASS→本地MPD声画的步骤，等待USER OBSERVATION，不把CLI重开当冷启动。用户测试期间不更新电视上的包。声画/首字母/Voice Guide的历史通过仍按原版本记录；真实账号/完整搜索/PGC/live/F19及官方三端F20、最终网络依赖和持久写ledger等仍开放。后续只因本段文档重建的unsigned/source另有hash，不宣称已安装。


## 0.0.13 电脑关机后的电视正常重启/存储/声画通过

用户对已列步骤明确回复“全部通过，请继续”：合成KeyManager准备后退出，开发电脑关机，电视正常重启并有开机标志，再独立启动主探针、合成值读回/清理PASS、电视内MPD绿色渐变与声音正常，记USER OBSERVATION PASS。对应manual signed `5f6d72988c2c078fd603eca5295832895a323d029cebc3797f17568e125e0818` / source `7abca084fc175f14f1ec99b94b2aaaeb8383cb0be21444a868b0de657f9a64d8`。脱敏反馈仓库外保存，当前部署清单已更新。此项证明所测探针流程在该条件下独立运行；不扩大为真实登录/内容/互动/F20全产品验收，不将正常重启推断为拔电/写中断原子性或全部升级回退通过。


## 0.0.14 游客热门真实读取候选（W01/W02/W03/F02）

固定无账号GET `https://api.bilibili.com/x/web-interface/popular?ps=4&pn=1`，HOST实测curl exit0 / HTTP200 / 6035bytes / API code0 / 4条，正文/headers在仓库外，公开只记录结构/计数。此为2026-10-14本地时区一手端点观察，不是官方稳定接口承诺或TV证据；历史HOST search HTTP412继续单独保留。未借用官方客户端appkey/身份、浏览器cookie或账号。

新增原创原生guest-popular入口：page1–10、固定host/path/ps4，无调用方URL/headers/cookies；TLS peer/host+固定CA保持开启，redirect/proxy禁用，新cURL句柄无cookie engine/共享jar；8秒总超时/4秒连接，正文128KiB、headers16KiB。CURL句柄/headers/global清理后才发固定GUEST:closed事件，Worker经导出getter读取有界WASM内存并UTF-8/JSON解析，原始正文/头不进stdout/postMessage/诊断。原生page再次核查。新header加入所有native源hash检查，Samsung SDK已实际重编译，四个getter与HEAPU8导出确认。

契约只含guest scope/page与最多4条规范化BV/title/owner/durationSec/views；4KiB Worker消息、严格字段与状态/code一致性，HTTP/API/解析/传输错误不混作空结果。取消先拒绝旧结果，等待关闭帧才启用替换Worker；20秒请求deadline、12秒清理期限，无确认则阻止复用/要求重开，不伪造关闭。

新增只读“读取游客热门”模态：2×2摘要、分页/重读/空态/错误/返回、显式方向邻居、选择摘要、Back恢复调用点/Home取消晚结果。外部标题仅textContent；诊断只输出固定状态和条数。没有内容播放入口、个性化/排行榜/分区/登录或热搜；F02整体和最终NetworkRuntime/安全网络依赖继续开放。默认build仍manual，显式BILISOFA_PROBE_AUTORUN=4仅一次guest热门→短时report，Back/手动操作/Home取消剩余自动步骤，不执行账号写入。

实际检查截至本段：strict/30模块边界PASS，47单元/合同PASS，20基础桌面UI PASS；HOST HTTP6、media3、stop4与guest原生边界2全部PASS。两张1920×1080桌面截图已目检，主屏/热门页无裁切或overlay、单DOM焦点/安全文本/正常console/交互通过；桌面匿名fixtures不是TV数据。native桌面加载/停止、观察UI、正式包完整性及TV结果随后记录。源码中首次strict因optional字段赋undefined不符报错，已改为显式union；不把当时命令末尾测试exit0当作静态检查通过，修复后独立check exit0。


## 0.0.14 游客热门真实TV读取通过

显式guest-popular-report-once实际签名/安装/CLI启动，均exit0/平台成功；原Author/Public Distributor，signed SHA-256 `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`。collector exit0，TV报告source匹配，`guest.popular_http200_api0_items4` PASS；即电视内原生HTTPS实际取得HTTP200/API0并成功规范化4条游客热门。固件/平台读数同前、marker1保持；授权开发电脑读取固定/report，GET后端口关闭，客户端非手机。精确源码/签名包/原始日志与脱敏报告在仓库外归档。没有把title/UP主/BV/原始正文/headers送入诊断。

本轮88项本地检查PASS：47单元/合同、20主包UI、4观察UI、2native桌面加载/停止、HOST HTTP6/media3/stop4/guest原生参数及内存2。strict/30模块边界与C syntax另外通过，Samsung重编译成功，basic/native/isolation三unsigned完整性通过。桌面native网络超时仍是既有桌面限制，不改变TV实读结论。44基线0缺失，无HEAD/remote、未commit/push/发布。新包的合成声画/Voice Guide/冷启动未从0.0.13直接继承为新实测；其原工件用户通过记录保留。

当前电视停在0.0.14真实游客热门页，已准备人工检查4卡可见/方向选摘要/下一页/Back重入；未回传前popularUiDeviceAcceptance保持UNVERIFIED。该自动工件首开只读一次guest并短时报告，不自动写账号；默认build仍manual。后续仅因文档更新重建的unsigned/source另有hash，不伪装为当前已安装工件。F02仅游客热门读取部分有TV证据，个性化/排行榜/分区与内容播放、F03真实检索、账号/媒体权益/官方三端投屏及完整W01/v1.0.0继续开放。


## 0.0.14 游客热门TV交互通过

用户对四张真实卡片标题/UP主、方向确认选卡摘要、下一页更新内容、Back回主页面再进入明确反馈“全部验证通过，请继续”，记USER OBSERVATION PASS。准确工件为signed `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`，guest-popular-report-once模式。脱敏观察/部署清单已更新。F02热门读取/摘要/分页有TV交互证据；其他推荐/排行/分区及实际内容播放不由本次反馈宣称完成。


## 0.0.15 游客首P播放源检查候选（W01/W03/W04/F04/F06）

日期：2026-10-15（用户本地时区）。新增固定guest-view/playurl GET，详情绑定同BV/首P的安全整数CID→字符串；仅普通公开vupload，拒绝已知pay/ugc_pay/互动/preview/DRM/付费充电等标记。qn16只选唯一AVC id16与AAC id30216，校验时长、mime/codec/尺寸/带宽/SegmentBase的相邻有界范围；不从其他返回track推定账号权益。播放签名URL只留Worker瞬时变量，验证HTTPS/无userinfo/443/bilivideo.com真实子域/m4s/唯一deadline及1分钟–24小时有效期；未知备份域名不自动放行。

原生边界再次核查BV/CID/CDN/有效期，固定规范公开视频页Referer，不借用官方客户端身份/keys。两轨分别只GET bytes0–511，16KiB头/512bytes正文/TLS验证/redirect与proxy关闭/无cookie；必须206、精确Content-Range 0–511及ftyp，CURL完全清理后才固定GUEST:closed。多阶段Worker逐次等待关闭再调下一次main，阶段间处理stop。4KiB IPC仅规范化摘要/固定code，不传CID/URL/signature/原始JSON/header；父适配器取消后拒绝晚结果，等确认再换Worker，无确认阻止复用。原热门与新入口共用ScopedGuestWorker管理该所有权。

热门选卡后可按方向到“检查游客播放源”，成功显示首P摘要；错误保持返回入口，Back/Home取消所属读取。显式autorun=5只读一次热门第一条及播放源/小范围，再短时report；没有真实媒体自动播放或账号写。默认build=manual。本步尚未新增40324监听、WARP/CSP或接通真实AVPlay；电视内媒体桥后续按ADR-004实现，当前F06真实声画继续UNVERIFIED。

strict/35模块边界、53单元/合同、21主包桌面UI、HOST guest边界4已实际通过；新UI用实际Worker配合匿名native shim覆盖四阶段、源动作方向/Back、URL不进DOM，不能视作真实TV/API证据。已有HOST HTTP/media/stop、native桌面和观察UI回归及签名/TV结果随后记录。首次strict因共享类抽取的parseQ/parseR重命名未完成报错，已修正并独立重跑通过。第三方旧TLS依赖仅用于W01探针，仍未接入credentials。


## 0.0.15 真实TV游客源检查通过

source `e76620edb780788e52c31310906d695dc413238c30afbdb628350e3b513d3e24` / signed `54522f6e0614c4492328ff1f58e87cb27b5a713da4b76a3da3d84ffbefd982ae`，guest-video-source-report-once。首次安装60秒、重试40秒均超时；SDB devices曾保留device行，但capability查询超时，原地址connect失败。用户确认电视开机/IP未变；TCP26101可达且路由en0，CLI version正常。确认无其他已列设备后只重启本机SDB服务，重连成功；未改证书/卸载App/重启电视。随后同包install/run exit0且平台成功。准确源码快照/签名包/失败与恢复日志私密归档，不抹除失败历史。

collector exit0，source匹配，U800FD / T-KSU2EFAKUC-0090-1300.9 / Tizen9.0 / marker1；guest热门HTTP200/API0/4条及 `ugc.source_ranges_ok` 均DEVICE REPORT PASS：同一公开首P的详情/播放计划符合约束，视频与音频各512bytes、206/精确Content-Range/ftyp通过。开发电脑读取报告后listenerClosedAfterGet=true；不是手机或真实AVPlay声画验收。未请求账号写入。新的播放源动作TV方向/Voice Guide尚未反馈，F04/F06全量与媒体桥继续UNVERIFIED。


## 0.0.16 电视内真实媒体桥候选（W01/W04/F06）

新增原创probe-bridge.h，经cURL multi、4个64KiB缓冲与pause/resume推进；每次随机token、固定loopback40324、仅owned manifest/video/audio路径。原生另校验两条HTTPS CDN/BV/过期与规范数值metadata，自行生成MPD，SegmentBase/init范围对齐。GET/HEAD/单Range≤2MiB，open/过大end截至上限，4KiB请求/16KiB上游headers/4并发/512连接/20秒客户端/15秒上游/min(180秒,签名期限减5秒)租期；TLS peer/host/CA保持，redirect/proxy/cookies关闭，未知编码/不匹配长度/非206范围不转成成功媒体。只新增显式loopback WARP/CSP，无权限等级扩大。

ready IPC只含摘要和本次local lease URL，不含外部CDN签名；Ready不等于关闭。共享父Worker在Ready后保持运行，Back/Home/错误关闭播放器并等待native释放cURL/multi/fd再ACK；失败17/abort不冒充closed，阻止复用。界面选卡后新增明确“播放游客360P · 首P”，默认及自动取证模式均不自动播放真实内容；Back恢复同页同卡，Home停声且不自动续播。本包最长3分钟是内部探针预算，不缩减完整F06需求，完整选P/画质/PGC/live/F19继续开放。

目前strict/36模块边界、56单元/合同、23主包桌面UI已实际PASS。实际Worker+匿名native shim+模拟AVPlay覆盖四阶段→Ready→显式播放、pause/seek、Back选择保持、再次播放、Home清理及signed URL不入DOM。HOST桥验证有真实socket/multi与匿名HTTP上游，单Range逐字节、2MiB背压完整性、manifest仅owned URL、cookie/header隔离、未知路径/token/POST/多Range拒绝、上游忽略范围失败、partial请求stop与关闭错误无假ACK；不是TV播放证据。HTTP fixture guard仅测试编译定义，Samsung构建不定义。SDK最终重编译/其余回归、签名/部署/实际声画结果随后追加。


0.0.16打包前补充：56单元/合同、23主包UI、2native桌面加载/停止、4观察UI、HOST HTTP6/media3/stop4/guest4/bridge8共110项检查PASS；strict/36模块边界/C syntax、Samsung SDK实际重编译和三unsigned完整性另外通过。桥新增负向验证上游Content-Length/Content-Encoding不匹配时502，关闭错误没有成功ACK。实际Worker+模拟播放器另覆盖prepare失败返回原卡并显示ugc错误、再次明确播放与Home停止。1920×1080的4卡/选卡/两动作截图已目检，无裁切；它是匿名桌面fixture，不是TV画面。W01 runtime决策/真实声画/Voice Guide新入口/长期运行/F20继续开放。


## 0.0.16目标TV部分真实播放证据与首播问题

实际installed/run均exit0/平台成功，guest-video-source-report-once；source `8ee04fda0300e20e098f2cbf60107e3fb8171342c9048223c63f1a9e6371919a` / signed `e237999b2da18c8568f31b169e2f961bd921bad8ce7ee8db65eeefae26c23e09`。精确源码/签名包/部署日志在仓库外保留。自动/report两次未取得，不标report PASS；SDB能力查询仍响应，debug尝试未取得调试入口；不凭空断言启动失败或源hash缓存错误。

用户反馈游客热门可见、点击真实视频可播放；首次播放失败，手动检查游客播放源后可播。只记画面USER OBSERVATION PASS与首播USER OBSERVED FAILURE，声音、暂停/seek/Back/Home、跨2MiB窗口连续播放尚未确认。用户关于地址动态刷新的推测保留为推测；实现每次播放本就重取详情/playurl并校验两轨，不据此断言根因。当前可播放工件保留，不伪装为完整F06通过。已请求主页面开启短时诊断以提取失败代码。

后续0.0.17候选增加有界原生事实进度：manifest/video/audio首次完整传输与首个HTTP/cURL问题代码，不含URL/headers；ready后父Worker最多接8条进度，关闭仍需独立ACK。另收紧两轨无Range GET为400、Range unit按大小写不敏感处理，避免主动发送未请求的206。新工件另配hash，不覆盖0.0.16观察。修改是协议/诊断改进，尚未宣称修复首播。


0.0.17诊断候选继续本地准备：对Ready后的manifest及两轨首次完整范围响应、首个HTTP/cURL问题发固定有界事实，不把这些进度标为声画PASS；HEAD不记正文传输。collector保留被拒source的已脱敏报告于私密目录，并优先使用实际部署清单核对expected source，避免“最新已签名”和“当前已安装”不同工件混淆。0.0.16当前仍保留在电视，等待用户开启诊断；0.0.17未安装时绝不继承0.0.16画面结论。所有44个基线文件仍存在，未commit/push/发布。


## 0.0.16手动报告已读取；0.0.17有界重新获取

用户开启诊断后collector exit0，source/signed准确匹配0.0.16：`ugc.playurl_invalid_response`（首次未通过播放数据解析/校验）、后续`ugc.source_ranges_ok`、两次`avplay.tracks_video1_audio1`及两次`ugc.native_closed_confirmed`。USER OBSERVATION画面可播放，与DEVICE REPORT轨道读数/原生清理分开成立；音频轨存在不等于用户听到声音。报告经开发电脑读取、监听关闭true；先前自动报告未取得的历史保留。现有证据定位到playurl数据校验，未定位具体字段，不能归因为签名过期、CDN或电视启动失败。

0.0.17针对已证实失败点：只在真实播放的playurl校验失败（或源过期/时长不一致）且原生读取已经关闭后，750ms退避，最多一次重新读取view→playurl→两轨范围，仍按原权益/TLS/域名/codec/范围规则校验。API业务拒绝/付费/互动/未知协议不以自动重试绕过；第二次失败显示FAIL与具体阶段，Back可取消退避，不自动重播已开始的内容。每次播放使用新状态，不要求用户先点检查。过期来源与时长不一致单列code，但不把此次根因猜作其中一种。桥Ready前仍预留签名有效期；真实媒体最长3分钟仅为探针限制。诊断八条保留最近失败（或一次重新获取）与最近清理事实，避免后续进度挤掉根因。

桌面实际Worker+匿名native shim已验证“首个playurl异常→一次重新读取→直接播放”，重复异常只重新获取一次后失败，以及退避时取消，未以宽松解析伪造成功。0.0.17设备结果待实际部署/反馈，不继承0.0.16画面。无账号写入，未更换Author/profile或引入外部服务。


## 0.0.17已签名安装，直接首播验收待用户

manual，source `dab113be9bbeb2a8fb0f1eed6f31a8a9e243b9334e3e52ef47b9274be2aeffe1` / signed `c37add0baf461495dc006ae9e1d7b253b2337a163acc7020871fb77835acfc71`，install/run exit0且平台成功；未自动播放真实内容。原Author/Public Distributor，准确source ZIP/manifest/DELIVERY与signed WGT均私密保存；部署清单已更新，collector expected优先绑定该真实部署而非下一份待部署签名。0.0.16可播放工件及报告完整保留。

当前本地累计113项PASS：57单元/合同、25主包UI、2native桌面加载/停止、4观察UI、HOST HTTP6/media3/stop4/guest4/bridge8；strict/37模块边界、C syntax、Samsung SDK实际编译、三unsigned完整性与签名预检另外通过。没有远程CI结果或commit。已请用户不点预检直接播放、连续90秒声画、pause/seek/Back同卡与重播/Home，并在失败时回传ugc代码。未反馈前firstPlaybackRecovery/mediaPlayback均UNVERIFIED，不继承0.0.16画面或0.0.13合成声画结论。


## 0.0.17 用户声画/控制反馈与未解决首播（W01/W04/F06）

2026-10-15，准确已安装manual工件source `dab113be9bbeb2a8fb0f1eed6f31a8a9e243b9334e3e52ef47b9274be2aeffe1` / signed `c37add0baf461495dc006ae9e1d7b253b2337a163acc7020871fb77835acfc71`。用户反馈部分视频第一次加载仍无法播放，换另一个视频可播放超过100秒；声音、暂停/继续、seek、Home均测试通过。分别记USER OBSERVATION：可播放样本连续>100秒声画及上述控制PASS；全部样本直接首播FAIL。Back同卡/再次播放未单独确认，保持UNVERIFIED。尚未取得0.0.17匹配报告或具体失败代码，不把0.0.16的playurl_invalid_response直接归到本次失败。

显示总时长8:56是源媒体时长；当前桥最长180秒是内部探针租期。用户只报告>100秒，未证实到达180秒限制，也未反馈完整播完，因此完整时长播放UNVERIFIED。该限制不改变完整F06要求。现有可播放工件保留，继续采集失败事实并检查公开接口形状，不以延长重试或放松权益/TLS/域名校验推定修复。


## 0.0.18 同轨道合规备用源候选（W01/W04/F06）

0.0.17手动报告已通过collector读取，source/signed匹配原已部署dab113be…/c37add0b…，HTTP GET后监听关闭。报告包含`ugc.playurl_invalid_response` FAIL、一次有界重取、manifest/video/audio范围传输进度、`avplay.tracks_video1_audio1`及`ugc.native_closed_confirmed` PASS。这定位到播放计划校验，仍未取到具体失败字段或用户所选内容；不把HOST样本直接当作同一TV内容。首次collector未收到，用户随后开启报告后收取成功，失败尝试不抹除。

HOST当前固定匿名游客接口读取两页共8样本：7条取得可解析详情/playurl；旧解析器5通过、2因首选CDN不在allowlist而拒绝，第8条未取得完整详情（旧归类为API不可用；0.0.19复核为128KiB抓取截断）。两条的首选轨道之一为未放行CDN，但同一轨道backupUrl中有符合现有bilivideo.com策略的签名URL。候选解析器对同一份缓存响应7/7通过，其中2条使用备用源；这两条的video/audio各GET bytes0–511共4次，curl exit0、HTTP206、精确Content-Range、512bytes与ftyp均通过。正文、内容标识/签名地址与headers仅保存在仓库外私密附件，不进入源码、IPC、公开诊断。HOST不是TV验收或接口稳定性承诺。

只从同一已通过游客权益/codec/时长/SegmentBase校验的轨道选择primary或最多4个backup；每条地址均按原HTTPS、bilivideo.com真实子域、无身份/非标准端口、m4s、唯一deadline/有效期规则验证，签名字节保持原样。未通过的地址不发请求，不扩大native目的地或WARP/CSP，不切换未知域名、不重写协议/签名、不增加重试次数。无可用地址固定`ugc.playurl_cdn_unavailable`，不自动重试；过期仍按既有一次重取规则。Worker仅发不含地址的`ugc.source_backup_selected`事实；summary不带候选表。两轨仍分别512bytes范围取证后才启动桥。0.0.18保持manual与180秒内部租期；未修复完整F06时长/画质等未实现范围。


0.0.18打包前验证：本轮实际执行strict/37模块边界PASS，59单元/合同PASS、27主包桌面UI PASS、2真实打包native桌面加载/取消PASS，共88项本地行为检查。新增行为覆盖同轨备用源双轨范围/bridge选择、全部不合规候选在任何CDN请求前失败、原重取上限/退避取消与Back/Home回归。匿名native shim/模拟AVPlay不等于TV。原生C六文件hash与已编译Samsung SDK manifest一致，本轮复用已验证产物，未声称重新编译或重跑原生HOST全部测试。三unsigned完整性通过，准确签名/部署记录随后追加。44个初始文件0缺失；main无HEAD/remote，未commit/push/发布。


## 0.0.18 已部署，备用源TV回归待反馈

manual；source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。安装与CLI启动均exit0且平台成功，原Author/Public Distributor未变，collector expected已切换真实部署清单。精确source ZIP/manifest/DELIVERY在仓库外deployed-source归档，0.0.16/0.0.17签名包、原始日志和匹配报告保留。未自动播放真实内容，未执行账号写入。

已请求优先重试原失败视频及另外两条、直接首播/90秒声画，之后开启诊断。反馈前0.0.18 firstPlaybackRecovery与mediaPlayback均UNVERIFIED，不能继承0.0.17通过样本或HOST7条计划/4次小范围结果。0.0.17部分首播失败仍为开放问题；本轮88项本地检查通过是对应层证据。完整时长、完整F06/W01及单一v1.0.0仍未完成。部署后文档补记与已安装源码快照区分；后续unsigned重建不伪装为已部署。


## 0.0.18 首播/177秒通过，另有详情传输失败（W01/W04/F06）

2026-10-15用户反馈首播正常、连续177秒声画（源总时长4:24），记本次样本USER OBSERVATION PASS。准确manual source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。当前180秒桥租期与177秒反馈接近，但没有用户说明实际停止原因，不将其推断为完整播完或具体停止原因。仅明确一个样本，不推定另外两条全部通过或特定失败内容已回归。

collector exit0且source匹配、GET后监听关闭true。报告包含manifest/video/audio首次范围正文传输、avplay.tracks_video1_audio1、两次ugc.native_closed_confirmed，同时保留独立的FAIL `ugc.view_transport_23`。此次报告未含source_backup_selected，不能声称该播放一定走过备用源，也不能把另一条详情读取失败标为已解决。详情阶段curl23是本地写回调/接收处理失败类别，尚未区分正文超限、header超限或其他情况；代码会主动中止超限响应。继续用固定非敏感原因码收窄，不打印body/headers/URL，不以无界扩容或盲目重试掩盖失败。W01/F06全量及完整4:24播放仍开放。


## 0.0.19 有界大详情与短视频完整播放候选（W01/W04/F06）

复核0.0.18 HOST第8条私密抓取：旧文件恰好131072bytes、JSON被截断；此前“详情API不可用”的归类不准确。固定原BV以最多1MiB观察预算重新GET，curl exit0/HTTP200/API0，完整169738bytes、一条page、包含合集metadata；新版parser可规范化为6字段详情。没有证据证明它就是TV失败的同一内容；0.0.18 `ugc.view_transport_23`的精确原因仍未回传。curl官方将23定义为接收数据写入/写回调错误；当前主动限额回调也会产生此码，不能当成解码/账号错误。参考[libcurl错误码](https://curl.se/libcurl/c/libcurl-errors.html)及[WRITEFUNCTION](https://curl.se/libcurl/c/CURLOPT_WRITEFUNCTION.html)，2026-10-15核查，未使用旧SDK不支持的新错误返回常量。

原生只将guest-view正文预算提升至512KiB；popular/playurl仍128KiB，两轨前置范围仍512bytes、headers仍16KiB。C固定最大静态缓冲512KiB，TS入口和Worker读取分别匹配路由预算，规范化后才进4KiB IPC，附加合集正文/内容ID/URL不进入诊断。C getter只返回固定拒绝原因1正文超限、2头超限、3范围头无效；curl63也明确归正文超限。Worker将其变为stage_response_too_large/headers_too_large/range_invalid，其他传输码保持；不解析部分正文，不重试超限或放宽TLS/目的地/权益。

内部桥租期从固定180秒改为min(max(180秒,本次媒体时长+60秒),900秒,两轨签名期限各减5秒)；用于把已知4:24/8:56短视频播完。父Worker deadline为17.5分钟，覆盖最长15分钟租期与有界源获取；Back/Home/完成/错误仍立刻关AVPlay并清理native后ACK。4客户端×64KiB、2MiB单Range、512连接、20秒客户端/15秒上游及32MiB WASM预算未变，无无限续期/后台播放。UI显示实际播放时间/源总时长和最长15分钟；暂停也计租期。不宣称完整F06、长片/URL更新/两小时耐久或全产品范围已完成。版本0.0.19仍manual，无真实内容自动播放、账号写入或新增权限。


0.0.19桌面验证过程：首轮单元59/60，一项新边界fixture按字符填充而忽略中文UTF-8额外字节，已改按字节预算构造，独立重跑60/60通过。首轮UI27/28，原seek断言仍期待“5.0 秒”，新UI为“5.0 / 12.0 秒”；修正断言后目标播放管线1/1通过，包含自然完成→原卡→重播→Home。截图发现主探针背景穿透播放HUD，随后增加media-active仅隐藏main，结束/错误/Back/Home先恢复main再归还焦点，不改变原AVPlay compositing/背景或全局键处理。最终全UI回归与新SDK native加载另记。

该UI流程为热门→选卡→显式播放→实际Worker/匿名native shim/模拟AVPlay→暂停/seek→Back→错误恢复→自然完成→原卡重播→Home。Browser plugin not available，使用项目已有Playwright，固定http://127.0.0.1:4173、1920×1080；TV界面不做手机viewport验收。桌面无Samsung解码插件，不能由“Couldn't load plugin”或模拟time读数作TV解码/声画证据，图片仅检查HUD/主界面显示与DOM焦点。源代码与TV证据均按各自工件记录。


0.0.19打包前最终检查：104项实际本地行为检查PASS（60单元/合同、28主包桌面UI、HOST guest5/bridge9、2native桌面加载/取消），另有strict/37模块边界、C syntax、固定Samsung SDK实际重编译通过，新_guest_reject_reason导出确认，32MiB固定堆未放宽。新UI截图1920×1080已目检，主界面不再穿透播放HUD，控制/焦点未裁切；自然结束→原卡→重新播放→Home已在实际Worker/匿名native shim/模拟AVPlay路径通过。未把合成time/desktop插件占位当作TV媒体结果。原HTTP/media/stop及isolation行为本轮未重跑，历史结果按原工件保留。44初始文件0缺失；main无HEAD/remote，未commit/push/发布。最终三unsigned/hash/签名/设备结果另记。


0.0.19前端QA（桌面）：

| 检查 | 结果与证据边界 |
| --- | --- |
| 页面身份/非空/初始console/框架错误遮罩 | PASS，已有首页回归；本地4173，1920×1080 |
| 播放HUD/主界面隔离/焦点 | PASS，实际Worker+匿名native/AVPlay fixture，截图/tmp/bilisofa-ugc-019-desktop.png已目检 |
| pause/seek/Back/错误恢复 | PASS，同卡恢复与重播 |
| 自然完成/重播/Home | PASS，播放器完成回调模拟，原生关闭帧模拟；非TV完整时长 |
| 原生JS/WASM/data CSP加载与停止 | PASS，打包native 2项；桌面Tizen sockets超时未伪造为通过 |
| TV新工件声画/完整时长/新详情错误分类 | UNVERIFIED，待部署及匹配反馈 |

命令npm run check、npm test、npm run test:ui、npm run probe:native:check、npm run test:native:guest、npm run test:native:bridge、带固定SDK环境的npm run probe:native:build、npm run test:ui:native；部分首轮失败、修正和目标重跑见上段，不将中途失败删除。


## 0.0.19 已部署，完整短视频验收待用户（W01/W04/F06）

manual，source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`。首次CLI安装exit1，原始日志显示包传输失败，未进入证书验证；SDB设备列表无连接，get-state/capability exit1，但授权目标TCP可达。重新connect exit0，get-state=device/capability均exit0；未重启电视、改证书或重启本机SDB服务。重试同一签名包install/run均exit0且平台成功。第一次失败记录/两次日志、精确源码archive与签名包私密保留，只有成功后才更新deployed manifest供collector核对。

已请用户正常播放4–8分钟普通视频，核对超过180秒/自然结束返回原卡/重播，再开启诊断；尚未回传，不继承0.0.18首播/177秒为新工件完整时长结论。0.0.19 mediaPlayback/fullDurationPlayback/detailLimitRecovery保持UNVERIFIED。104项本地检查与SDK/包预检分开，W01完整门槛和单一v1.0.0仍未完成。测试期间保留该电视工件，不因后续文档补记重新侧载。


## 0.0.19 所测普通视频完整播放/回卡/重播通过

2026-10-15，用户明确反馈超过180秒正常声画、自然结束回原卡、重播全部通过。记所测普通游客视频USER OBSERVATION PASS；用户未另报本次确切总时长/BV/样本数，不自动记为4:24、8:56或全样本通过。准确source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`，manual。

collector exit0/source匹配，HTTP GET后listenerClosedAfterGet=true；包含ugc.source_backup_selected、游客热门HTTP200/API0/4条、manifest/video/audio范围传输、avplay.tracks_video1_audio1和ugc.native_closed_confirmed。本报告未含失败条目；八条报告不证明无限历史或所有视频。备用源选择这一固定事实已在本机证实，不将其与未导出的特定BV/每次播放强行对应。0.0.18的详情curl23仍保留历史；大详情目标样本回归、长片/URL续期/两小时混播、完整F06/W01/F20仍未关闭。


## 0.0.20 发现探针实现与本地验证（W01/W02/W06/F20）

2026-10-15：新增自身身份的五分钟前台发现窗口，界面/Worker/native分层，原InputRouter/DOM焦点统一归属，Back/Home停止并等原生关闭ACK。仅允许固定设备/服务XML和ConnectionManager固定MP4格式查询；拒绝NVA SETUP和实际媒体控制，不执行账号写入。候选NVA拆包/编码与CastSession防重放合同独立存在，未接上接收监听。网络、内存、请求/队列/回复和诊断预算见F20_PROTOCOL_EVIDENCE；无新依赖、权限、WARP/CSP例外或外部服务，未借用客户端身份/keys。三端App版本按用户原文记录，OS和实际兼容性仍待验证。

实际126项本地行为检查全部PASS：69单元/合同（含5项NVA wire和4项发现IPC/身份/清理）、31主包UI、HOST cast10/guest5/bridge9、2 native桌面加载/取消。strict/43模块边界、C语法和固定Samsung SDK重编译亦exit0，cast_stop已随native构建导出；32MiB固定堆不变。HTTP/media/stop和isolation原行为本轮未重跑，保留各旧工件结果，不计入126。测试没有真实账号写操作、发送端流量或TV媒体模拟冒充。

UI流程：主页面→发现窗口→实际Worker/匿名native shim进度→Back回入口→重入→Home关闭；另测地址缺失和取消地址读取后晚回调不启动Worker。Browser plugin not available，采用项目现有Playwright，本地http://127.0.0.1:4173、1920×1080。页面身份/非空/无框架遮罩/相关console健康/真实DOM焦点/交互均PASS；发现窗口与主页截图已目检，无新增裁切或重叠（/tmp/bilisofa-cast-020-desktop.png、/tmp/bilisofa-evidence/probe-desktop.png，合成设备状态）。未按手机viewport验收TV界面；桌面无Samsung sockets，native网络超时按FAIL事实保留，加载/清理检查通过不等于网络能力PASS。

44份初始文件0缺失；main无HEAD/remote，未commit/push/发布。0.0.19精确签名/部署和用户完整短片通过均保留；0.0.20构建、签名、安装、启动及官方三端结果随后按各自证据记录，当前不能宣称官方投屏发现/连接/播放通过或W01完成。


## 0.0.20 已签名安装/启动，Android发现待用户（W01/W06/F20）

2026-10-15，manual，source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，application BiliProbe1.Probe。沿用自有Author/Public Distributor，签名前后资源一致、证书日期/issuer预检PASS；三unsigned完整性及source配对PASS，安装/启动最终exit0且平台成功。第一次exit1发生在包传输阶段，未到证书验证；SDB列表无绑定、get-state/capability exit1，授权目标TCP可达。仅重新connect原目标后state=device/capability0，重试同一签名包install/run成功，未改证书、重启SDB服务/电视或固件。原失败日志和两次记录均私密保留。

成功后才更新deployed-native-manifest供collector匹配；精确部署source ZIP/manifest/DELIVERY及unsigned native归档在仓库外deployed-source/完整hash，签名包私密保存。0.0.19包/源码及用户完整短片通过证据仍保留，不被新包覆盖为失败或继承到未测投屏。之后文档更新重建的unsigned/source不重新侧载；精确已装身份仍以上述hash为准。

已请用户先在电视启动五分钟发现窗口，再用Android官方9.12.0-b28383822普通公开视频TV列表检查自身接收端名称，点击一次记录结果，返回开启诊断；尚未回传。iPhone6.6.0-91300300和iPad3.75.1-37501100资源已确认，OS未知，后续分别测。安装/启动PASS不等于发现/连接/声画/控制通过；三端F20以及W01整体仍UNVERIFIED，未发布v1.0.0。


## 0.0.20 发现启动失败与0.0.21兼容修正（W01/W06/F20）

2026-10-15，用户反馈电视显示cast.failed_13。对应已部署manual source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，记USER OBSERVATION：发现监听启动FAIL；未取得本次匹配报告，原stage13合并了接口选项/TTL/入组，不能从该code唯一断定某syscall或errno。手机发现未到达，不记Android协议失败，三端F20保持UNVERIFIED。

复查[Samsung官方Socket选项表](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)（2026-10-15）：列出TTL、ADD/DROP_MEMBERSHIP，没有IP_MULTICAST_IF。本机固定Samsung1.39.4.7的library_tizen_sockfs.js同样没有该选项映射，getLevelAndOptionString对未知项抛ENOPROTOOPT；direct SocketsHostBindings路径委托TV实现，未取得其源码，不能把旧adapter报错当作本次TV已导出errno。原探针无条件设置IF是明确的兼容缺口，之前HOST fixture跳过整段组播配置，没有覆盖它。

0.0.21去掉不在支持列表内的IP_MULTICAST_IF调用，接收仍用经校验的本机RFC1918地址加入固定组，出站NOTIFY使用TV的IPv4路由；目标239.255.255.250、TTL1、私网peer校验/限流、监听范围和全部资源预算不变。多接口出站路由/真实跨设备发现仍待TV证据，不声称已固定出站接口。TTL失败改131，入组失败改132，清理未知17仍不能ACK/重用。没有忽略失败或改ANY入组，没有增加权限、放宽CSP/TLS/目的地、修改SDK或引入外部服务。

新增显式内部auto=6（cast-startup-report-once）：开始一次发现启动检查，收到native ready立即停止，等待原生关闭ACK后开放固定脱敏报告；15秒启动预算，用户操作/Home取消后不继续自动报告，旧自动回调不关闭新手动窗口。只证明bind/TTL/join和清理，不测试官方端可见/连接/实际播放；无视频自动播放/账号写入。默认npm run build仍manual，部署auto=6必须显式构建并写入包metadata；手动“五分钟发现”入口保留。


0.0.21打包前实际117项行为检查PASS：69单元/合同、35主包UI、HOST cast11、native桌面2；另有strict/43模块边界、C语法、固定Samsung SDK重编译PASS。新增HOST选项fixture模拟SDK支持集，验证1字节TTL=1、原选定入组接口、TTL失败不继续入组、入组失败阶段和成功状态；不发送LAN组播。四项新增UI验证ready→关闭ACK→报告、131/132不得伪造清理PASS、取消自动后新手动发现不被旧回调关闭。此前HOST fixture跳过组播配置的覆盖缺口现有明确回归。没有把fixture或源码缺口断言成TV修复通过。

Browser plugin not available，沿用项目Playwright，http://127.0.0.1:4173、1920×1080。完整35项回归含页面身份/非空/console/CSP/焦点、Back/Home及新自动余序；视觉布局未改变，原发现窗口截图仍为匿名native shim证据。native桌面实际WASM/CA加载与停止两项PASS，桌面网络timeout仍非TV支持证明。HOST guest/bridge/HTTP/media/stop和isolation本轮未重跑，不计入117；各历史证据保留。签名与本电视auto启动/清理结果另记，官方三端依然待验证。


## 0.0.21 已部署，发现启动/清理本机通过（W01/W06/F20）

2026-10-15，auto=6 cast-startup-report-once，source `7828bbd82c20a67cda472fa05c81c39f7ca59df16b58a553816d344832c8e7a1` / signed `fa3598d16bd1e25dbd2dbcfaea7deed07ef5fac7f650d81485e5d795ab011d71`。自有Author/Public Distributor；安装前显式目标get-state=device/capability0，无需重连，install/run首次均exit0且平台成功。未改SDK/证书或电视配置。原0.0.20失败、0.0.19可播放包及历史报告保留；已部署manifest只在成功后切到新工件。

collector exit0，source/signed匹配，TV报告cast.ready进度、cast.native_closed_confirmed PASS，HTTP报告GET后监听关闭true。该C ready只在TCP40325/UDP1900绑定、TTL1、指定接口入组和时钟成功后发出，随后ACK仅在native socket/drop membership清理成功后发出；因此记所测TV发现启动和清理DEVICE REPORT PASS，修正后未再见原stage13。原stage13精确syscall/errno未导出这一边界仍保留，不将候选定位伪装成旧包已取到独立errno。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0、marker1；Chrome主版本仍不可提取。启动报告已另存私密device-native021-startup-report.json，避免之后同source手机/手动报告覆盖它。

自动检查收到ready立即关闭，没有证明NOTIFY实际接收、手机可见、连接或媒体投送。已请用户手动开启五分钟窗口，用Android官方9.12.0-b28383822查找自身BiliSofa W01 Discovery并点击一次，最后开启报告；尚未反馈。iPhone/iPad同样保持未测，完整F20/W01/v1.0.0未完成。精确已装source ZIP/manifest/DELIVERY与unsigned native私密归档；之后文档重建的manual unsigned不重新签名/侧载，已装身份继续以上述hash/auto=6为准。


## 0.0.22 SOAP边界与私有RPC本地验证（2026-10-15）

实际136项不同本地行为检查PASS：81单元/合同；35主包UI整组+4项新增SOAP Worker定向UI；14 HOST cast；2 native桌面加载/取消。39项UI由整组及新增定向两次组成，不称一次全组39。首次SOAP单测77/78，一项匿名fixture的replaceAll误改xmlns前缀，已缩窄为标签前缀替换，78/78后追加3项响应测试至81/81。strict及46模块依赖边界、C语法、固定Samsung1.39.4.7实际重编译均通过，32MiB固定堆不变。

覆盖恶意XML/编码/命名空间/动作参数、CDATA和单次实体解码、URL期限/目标策略、seek/控制权；HOST覆盖getter只读私有正文、状态/长度/过期回复拒绝及擦除、两个连接反向完成不串序号、停止pending请求原生关闭ACK。桌面实际cast-worker.js配匿名native heap/getter shim验证无媒体查询、候选MP4拒绝701、坏命名空间/空动作402、重复/过期RPC忽略、Back清理；报告不含fixture URI/token/标题。原HTTP/media/stop/guest/bridge/isolation本轮未重跑，不计入136。native桌面仍不能执行Samsung网络扩展，加载/取消通过不代表网络通过。

0.0.21三端反馈与两次手动报告source/signed匹配：Android/iPhone可见为用户观察；iPad仅AirPlay未见，应用/入口/权限待核查。累计报告不能按请求归属iPhone/iPad。各私密原件分别保存，原自动启动报告不被覆盖。0.0.22真机RPC、响应与发送端媒体尚未验证；准备包不记安装或F20通过。


## 0.0.22 已签名部署，监听启动/清理取证通过（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。source `a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6`；unsigned native `7a2d192bb9f09b484259b4cfacf0879a32a5898c1c7f7d12d53c70aa7f8c83f6`；signed `3a12818dcb16f2f4614ae88d9a267b9a9fb85ee84730dc3b74ed2cd500b3050c`。自有BiliSofa Author/Public Distributor有效性预检通过；SDB get-state=device/capability exit0，install/run首次均exit0且平台明确成功，没有重连/改证书/重置TV。已装source ZIP/manifest/DELIVERY/native unsigned在仓库外deployed-source按全source hash冻结，旧包/三端报告保留。

collector exit0、source/signed匹配，cast.ready及cast.native_closed_confirmed PASS，报告GET后监听关闭true，marker1。新Worker已走RPC enable后启动，所以新导出存在且未在初始化abort；未收到真实SOAP，不把它当作getter/响应/媒体执行通过。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0；引擎主版本仍未提取。启动报告另存device-native022-startup-report.json防后续同source覆盖。

已请用户仅用Android官方普通视频TV入口选择一次，再开报告，等待请求分类反馈；本包仍拒绝媒体，不要求播放。iPad应用/入口/本地网络权限问题另待补充。Android/iPhone发现用户PASS来自0.0.21，不继承为0.0.22连接/媒体/控制PASS；完整F20/W01/v1.0.0继续开放。本段文档补记之后的unsigned/source重建不再次侧载，电视身份仍以上述精确hash为准。


## 0.0.22 Android请求实机证据；0.0.23本地验证（2026-10-15）

0.0.22 source a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6，collector exit0/hash匹配：cast.soap_transport_query、cast.soap_control_rejected、cast.soap_invalid及native_closed_confirmed，报告GET后关闭true。只证明有效解析和响应交给native，不证明手机完整收取/播放。用户未读清短暂提示；报告为内容依据。iPad明确HD/视频TV/本地网络允许，原因未定位。

0.0.23共141项不同本地行为检查通过：84单元/合同、41主包UI（全组先40/41，修正一项fixture后定向1/1）、14 HOST cast、2 native桌面加载/取消。失败fixture误将64条普通本地导出当8条HTTP报告；已分别验证64上限和实际传给HTTP Worker的8条compact报告，摘要完整包含33类事实。不是修复产品导出限制。其余40项未因fixture修改重复跑，无单次41/41声明。strict/46模块依赖、C syntax、Samsung1.39.4.7实际重编译均通过，32MiB固定堆不变。原HTTP/media/stop/guest/bridge/isolation本轮未重跑，不计入141。

新增行为：七阶段不含原文、精确已知offer头分类、拒绝控制细分；XML standalone合法/非法/DTD/encoding矩阵；summary bit31/32、全部33事实、去重/未知位拒绝及故障共同保留；实际Worker五项私有getter RPC，包括standalone查询。匿名41进度预算/UI压力路径检查最近4条留存、后续服务请求不清除、Back焦点、8条报告summary与新租期清空。1920×1080截图/tmp/bilisofa-cast-023-desktop.png已目检，四条结果/返回按钮未裁切；这是桌面匿名fixture，不替代TV可读性/Voice Guide。无真实账号写入、真实源自动请求或模拟TV播放证据。


## 0.0.23 已签名部署与启动取证（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。已装source `fc307c543cd0875fb39428fac0da7f2619974d5314f41e292e6d096d3ab7b0f2`；unsigned native `6474647172edf60bef6b8f5343813dc4b5bbf78266a0427195b31741550561f8`；signed `f623df00af754b161ed89101ec9ac15eeaa2a1ed384440e50e29aec44f1a26a7`。自有BiliSofa Author/Public Distributor预检通过；目标get-state=device/capability exit0，install/run首次均exit0且平台成功，无重连/证书改动/电视重置。源码ZIP/manifest/DELIVERY/native unsigned按全source hash在仓库外冻结，旧版本/报告均保留。

collector exit0、source/signed匹配，cast.ready/native_closed_confirmed，HTTP报告GET后关闭true、marker1；分别记本机监听启动与原生清理DEVICE REPORT PASS，不把它扩大为新SOAP分类/声明兼容/媒体执行通过。startup报告另存device-native023-startup-report.json。已请用户Android同一普通视频选择一次并开诊断，不需追读提示；iPad暂不重复，原因仍开放。

本轮141项不同本地检查与真机启动证据分开；W01/F20/完整v1.0.0未完成。文档补记后的manual unsigned/source重建不再次签名/侧载，已装身份始终以上述工件为准。main无HEAD/remote，未commit/push/公开发布。


## 0.0.24 完整offer结构/策略分类验证（2026-10-15）

148项不同本地行为检查PASS：88单元/合同、44主包UI整组、14 HOST cast、2 native桌面加载/取消；均exit0，未发生本轮测试失败。另有strict/46模块边界、C syntax、Samsung1.39.4.7实际重编译通过，固定32MiB堆。原HTTP/media/stop/guest/bridge/isolation本轮未重跑，不计入148；桌面native网络仍不支持，不把加载/取消通过写成Tizen网络PASS。

新增4项单元行为组覆盖全部参数形状、URI目的地/格式/期限矩阵、metadata四类、共享4KiB门槛与非offer/坏XML不分类；supported与现有validateSoapMediaOffer对照，任何缺失/额外/嵌套/属性等inspect成功也不能让parse接受。实际Worker新增3项：缺metadata、额外字段、嵌套metadata，检查正确固定事实、原402拒绝、私有getter/回复所有权、Back清理、诊断无fixture URI/token/标题/未知字段。压力UI覆盖全部60事实、68预算、v1位图、64条本地导出和8条HTTP报告保留summary。1920×1080匿名截图/tmp/bilisofa-cast-024-desktop.png已目检：四条结果与返回未裁切；截图命名由旧023改024，测试行为无改动。

0.0.23 Android实机summary解码为transport_query/offer_invalid_arguments/stop_rejected，与独立事实一致，报告GET后关闭true；已有source/signed匹配原件另存，启动原件保留。只证明该拒绝分支，不猜测缺的是哪个参数、不声称已取得播放源或播放。0.0.24新分类/兼容/媒体验收仍分别开放。


0.0.24已签名安装/启动，匹配自动报告证明cast.ready/原生关闭ACK、报告GET后关闭及marker1。已装source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276` / signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`；详情与私密冻结工件见SIGNING_DEVICE_RECORD。新offer完整分类待Android再触发一次，不继承为媒体/完整F20通过。文档补记的manual重建包不重新侧载。


## 0.0.25 参数兼容与HTTPS源范围探针（2026-10-15）

实际165项不同本地行为检查PASS：93单元/合同、47不同主UI（先46整组；新增候选策略/unsafe case后19项F20定向通过，含新增1项，未称一次47整组）、14 HOST cast、9新HOST cast-source、2 native桌面加载/取消。strict/46模块、C syntax、固定Samsung1.39.4.7重编译通过；32MiB固定堆不变，新_cast_source_buffer/_cast_source_begin导出存在，C源hash覆盖八文件。原HTTP/media/stop/guest/bridge/isolation本轮未重跑，不计入165。native桌面仍不支持Samsung网络扩展，加载/取消不证明TV/CDN。

新HOST source fixture最初setup编译失败：系统curl头已定义easy_setopt/getinfo宏，被mock重复定义且Werror拒绝；fixture显式undef后9/9。尚未运行用例前一并修正raw fixture的CRLF转义；未修改产品curl/TLS设置来通过测试。九项覆盖目的地/无效输入不触网、512bytes/16KiB/Content-Range与长度/压缩/超宽整数边界、TLS与协议/redirect/proxy/CA/timeout选项、单次预算、HTTP403/证书失败/坏ftyp、setopt错误、取消先关闭、未知cleanup不发成功ACK。全部mock-cURL、无实际网络，不代替真实证书链。

单元/实际Worker覆盖扩展字段与2200字符metadata丢弃、一般parser保持拒绝、HTTP候选只换scheme/保留签名字节、异常host/格式/期限不发source_begin、固定source IPC和TLS失败保留。最新19项F20 UI包含全部86种预算内进度压力、真实Worker+私有native heap shim，source结果/策略与60位固定事实在8项报告中保留，Back恢复及原始URL/metadata/字段/地址不导出。/tmp/bilisofa-cast-025-desktop.png 1920×1080匿名截图已目检，四条新结果/返回按钮无裁切；source_pass画面为fixture，不是TV网络或媒体PASS。

0.0.24报告按精确source/signed另存，累计三种差异不视作一条已捕获报文。0.0.25真实兼容、TLS范围、取消/cleanup和播放分别待本机证明；即使source_pass也只通过容器头范围检查，不关闭F20。


0.0.25已签名安装/启动并取得匹配的ready/原生关闭ACK、报告GET后关闭与marker1证据。已装source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8`；精确冻结工件见SIGNING_DEVICE_RECORD。auto6未创建source cURL，参数兼容、HTTPS/活跃句柄取消及媒体仍待Android真实触发；不扩大启动PASS。文档补记manual重建不重新侧载，HD和完整F20/W01/v1.0.0继续开放。


## 0.0.25 Android HTTPS 源范围实机通过（2026-10-15）

用户开启诊断后collector exit0；source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8` 精确匹配。报告有 `cast.source_policy_supported`、`cast.source_upgrade_planned`、`cast.source_started` 和 **PASS `cast.source_pass`**，随后 `cast.native_closed_confirmed`；GET后监听关闭true、marker1。摘要 `cast.soap_summary_v1_8000400408002010` 解码为transport_query、uri_offer_rejected、stop_rejected、offer_args_extra、offer_uri_http、offer_metadata_oversized。

记DEVICE REPORT PASS：参数兼容越过原arguments拒绝；同址HTTPS候选在本电视完成TLS校验、HTTP206/0–511范围、512bytes与ftyp头检查，source句柄完成清理，最终发现监听清理确认。未记声画、手机收到成功回复、连接、控制或活跃source中途取消通过；SOAP仍拒绝媒体，完整F20/W01开放。私密报告独立保存在device-native025-android-https-report.json与observation，startup原件保留；原始CDN URL已经擦除，下一包需要一次新投送。


## 0.0.26 TV确认投送候选声画探针（2026-10-15）

189项不同本地行为检查PASS：96单元/合同、54整组主UI、13 HOST cast-source、12 HOST bridge、14 HOST cast。strict/46模块边界、C syntax及Samsung1.39.4.7实际重编译通过（32MiB固定堆）；打包和native桌面加载另记，尚未借用为TV声画。HTTP/media/stop/guest/isolation本轮未重跑，不计入189。

第一次53项UI运行49通过、4失败，均是旧cast-state“最近四项”文案断言，与新确认入口的“检查通过”提示不一致；修改预期并保留histories/源私密性/Back断言后53/53。随后新增一项实际Worker上游固定故障码映射、93种去重进度压力，54/54整组exit0。没有修改native TLS/URL策略或屏蔽运行时错误来通过。

新增7项真实bundled Worker+匿名native/AVPlay shim，检查确认前不open/play、单次确认、暂停/继续/seek、Back、Home、自然完成、取消晚prepare、桥启动失败、上游403/curl22与候选过期。旧查询/媒体SOAP仍被明确拒绝，未伪造手机连接。源URL仍不在IPC/导出。13项mock-cURL源检查新增私有候选保留、无批准不启动、批准后转移、60秒过期擦除、Back擦除；12项桥HOST新增仅cast.mp4的HEAD/单range、2MiB背压保真、期满先关闭监听，全部仅loopback匿名数据。实际网络TLS证明只来自0.0.25TV报告。

UI环境http://127.0.0.1:4173、Chromium 1920×1080；Browser plugin not available，使用项目Playwright。identity/非空/无框架overlay/console及交互检查通过。/tmp/bilisofa-cast-026-confirmation.png与/tmp/bilisofa-cast-026-desktop.png已目检：四项历史/两个按钮和播放器控制无遮挡；桌面AVPlay object显示Couldn't load plugin是无TV插件的预期，此处仅测试shim界面，不是视频播放截图。TV产品固定横屏，本轮无手机布局/OS读屏/实际声画证明。

新ADR-006记录60秒私有候选、显式TV确认、最长3分钟、单loop native子桥、没有新权限/常驻服务及完整接收仍需CastSession/三端状态控制。全部工作仍未commit/push/公开发布。

0.0.26 native桌面两项另已通过（21.1秒、exit0）：Samsung JS/WASM/CA本地加载、严格CSP及执行中取消/新Worker；桌面不具备Tizen网络扩展，未称网络通过。本轮总计191项不同本地行为检查（189+2），不是191项TV验收。基本/native/isolation三个unsigned gate及delivery source ZIP冻结均通过，正式签名/安装另行记录。


## 0.0.26 实际签名安装与启动取证（2026-10-15）

已装auto=6（cast-startup-report-once）、BiliProbe1.Probe：source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56`，signed SHA-256 `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`，unsigned native `59f50ccde7ccb1410d83ab24f191b68e6fbd3f36ab6c208a8523ded66506b322`。全部191不同本地行为检查/strict/C/SDK、三个unsigned gate与source ZIP冻结通过。原Author/Public Distributor保持，仅用BiliSofa profile；未改电视固件、其他证书/账号。

SDB首次get-state exit1，原授权地址connect exit0，state复查/capability exit0；install第一次exit0且install completed，run exit0且successfully launched。保留首次连接失败私密日志，不记作安装失败或证书故障。collector exit0，精确source/signed匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1。设备仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0；engine major仍不可提取。

只登记DEVICE REPORT PASS监听启动/原生清理；auto6未创建source或媒体桥，不证明活跃桥/AVPlay清理或实际声画。已请求用户一次Android新投送→TV确认→90秒声画/暂停/seek/Back→诊断；未获反馈项保持UNVERIFIED，SOAP接收/手机控制/HD发现/完整F20/W01/v1.0.0继续开放。

精确已装source ZIP/manifest/DELIVERY/unsigned frozen于仓库外deployed-source/d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56，签名包/raw logs/private metadata在仓库外；startup原件另存device-native026-startup-report.json，后续手动报告不能覆盖它。文档补记后的默认manual重建工件不再次签名或侧载，不能替代上述已装身份。main无HEAD/remote，未commit/push/公开发布。


## 0.0.26 无法播放反馈与确认窗口证据（2026-10-15）

用户反馈“无法播放”，未说明按钮是否亮/是否进入播放器，也未提供cast错误码。两次collector均exit0，精确source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56` / signed `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`匹配；均含source_pass、source_policy_supported、media_expired、summary_v1_800044060a002010与native_closed_confirmed，GET后关闭true。第二份是同一页面累计记录，不能当作第二次独立播放尝试。startup原件保留，手动报告另存device-native026-no-play-report.json/observation。

登记USER OBSERVATION FAIL（无法播放、阶段未明），不记播放器解码失败。报告未见AVPlay started/prepare_failed或media_ready；native media_expired只在尚有ready候选、未移交桥时发出，因此本次未证明已接纳电视确认。不能据此责怪用户未操作、推断遥控故障或CDN失效；原根因仍开放。

代码审查发现后续手机轮询/发现事件会覆盖“检查通过，请电视确认”提示，过期后也可被覆盖。0.0.27修复保持就绪/过期提示、明确左右邻居，保留60秒/不自动播放；新增TV确认发送和Worker接纳固定回执、10秒未就绪关闭与明确故障。所有回执无外部payload，8项诊断保留两阶段回执；进度94（原93+approved），SOAP位序不变。只改善操作和定位，不声称已经修复媒体解码。C/SDK、源策略/媒体桥不变，0.0.27复用0.0.26已编译原生字节；新UI/Worker需重新验证/打包/签名/本机反馈。


## 0.0.27 确认提示保持与分层回执验证（2026-10-15）

本轮152项不同本地行为检查PASS：97单元/合同、55主UI整组（29.5秒），strict/46模块边界PASS；无本轮失败用例。新增单元检查两种确认回执在8项报告中跨16次轮询仍保留；UI对全部8种受控播放场景均在source_pass后注入后续手机查询事件，确认“按左选择”的动作提示保持。新confirmation-timeout用Playwright clock推进10秒，确认未收到桥ready时记录明确FAIL、停止原生并恢复入口，不产生播放。原有Back/Home/prepare晚回调/真实Worker私有SOAP与94条进度压力均通过。

HOST/native网络用例本轮未重跑，不计入152；八个C源hash与既有Samsung编译manifest匹配，C、CA、native JS/WASM/data不改动，不声称本轮重新SDK编译。152是本地行为验证，0.0.26用户无法播放仍FAIL且阶段未定；新UI修复不是媒体解码修复或完整F20证明。

Chromium/http://127.0.0.1:4173/1920×1080，Browser plugin not available，项目Playwright。identity/非空/无overlay/console/交互均有检查，确认页和控制页人工目检；原生object的desktop无插件占位预期，不作为真实声画。当前fixture截图后续使用027文件名，避免覆盖026历史命名。

0.0.27 native桌面本地加载/CSP/取消再开另2项通过（21.1秒），本轮154不同本地检查。打包原生三文件与0.0.26已装签名包逐字节相等，八源hash匹配；仅UI/Worker与package版本/文档改变，未重新编译C或把历史HOST结果计作本轮运行。确认页目检“按左选择”保持、按钮高亮/两项布局无遮挡；截图026本轮生成件另存027名。TV媒体仍待新包反馈。


## 0.0.27 安装超时后实际版本恢复取证（2026-10-15）

已签名auto=6/BiliProbe1.Probe：source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218`，signed SHA-256 `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`，native unsigned `948b43c7224f5d7fe79291e516e99e16e1b8bb5cfe4ace3e68718155da90f86f`。154不同本地检查、strict/46模块与三个unsigned gate/source ZIP冻结通过；C/CA/native三文件与0.0.26相同且hash核对通过，本轮没有宣称重新SDK编译或重跑HOST网络。

安装前get-state=device/capability exit0；唯一一次install在60秒被外层timeout终止（exit124），私密日志确认传输完成、停在安装阶段，无install completed/失败确认。后续get-state/capability均exit0；只读TV应用列表含目标条目但没有版本，通用pkgcmd查询虽exit0/空输出亦不算版本证据。无残留安装Java进程，未kill其他进程、重启SDB/电视、改证书或重试安装。

随后只启动当前BiliProbe1.Probe，CLI exit0且successfully launched。临时让collector按新signed manifest（未提前更换deployed）校验，exit0、实际报告build精确为新source；cast.ready/native_closed_confirmed、GET后关闭true、marker1，固件/model/platform不变。此后才更换deployed manifest。记DEVICE BUILD VERIFIED已更新/正常启动和监听/清理PASS，安装CLI成功回执仍UNVERIFIED（保留exit124），不是伪造install exit0。源码/unsigned/manifest/DELIVERY按全source冻结于仓库外，startup原件另存device-native027-startup-report.json。

新包只在TV确认后尝试媒体，没有自动播真实内容；新版固定提示/两阶段回执/播放/活跃桥清理仍待用户实际反馈，未把启动报告提升为这些PASS。已请求先验证按钮可选/能否进入播放页/起播并开启诊断，不再要求尚未起播时做90秒及控制。0.0.26“无法播放”USER FAIL与阶段未明、候选过期的事实保留。完整F20/W01/v1.0.0继续开放，无commit/push/发布。后续文档默认manual重建不再次侧载，电视维持上述auto6签名工件。


## 0.0.27 已确认进入播放器、AVPlay准备失败（2026-10-15）

用户明确反馈“进入播放页但无声画，诊断已开启”。collector exit0，source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218` / signed `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`匹配。报告source_pass、candidate_confirm_sent、media_approved、media_ready、**FAIL cast.avplay_prepare_failed**、summary_v1_8000400402002010及native_closed_confirmed，GET后关闭true、marker1。startup保留；手动原件另存device-native027-prepare-failure-report.json/observation。

本次TV确认/Worker接纳/桥监听启动分项DEVICE REPORT PASS，原生关闭通过（已批准的桥监听）；USER声画FAIL，AVPlay启动链路DEVICE REPORT FAIL（旧catch同时覆盖open/prepare/play，不能独立区分）。未见具体请求类型、AVPlay枚举/异常名或媒体轨道，不能推断必为codec、TLS、HTTP拒绝或活跃媒体transfer取消；不把0.0.26候选过期继续套用到此次失败。完整F20/W01保持开放。

源码复核发现原progressive桥不接受无Range GET/后缀Range，且开放范围只答2MiB；这些是可用HOST复现的兼容缺口，当前没有TV请求类型证据证明它们就是此次根因。0.0.28补齐HTTP响应和请求分类/AVPlay固定错误枚举，再以新包实测，不提前宣称修复声画。


## 0.0.28 渐进MP4 HTTP兼容与错误分类（2026-10-15）

204项不同本地行为检查PASS：100单元/合同、56整组主UI、21 HOST bridge、13 HOST cast-source、14 HOST cast，均exit0；strict/46模块与C syntax、Samsung1.39.4.7实际重编译通过。32MiB固定堆，八C源hash随新编译校验。native桌面/打包/签名/TV结果另记，尚不计入204；HTTP/media/stop/guest/isolation本轮未重跑。无本轮实际测试用例失败；一次轮询已完成的旧session ID返回Unknown process id，只是工具状态查询，不计作应用失败或重新执行用例。

21桥HOST中新增完整GET200/准确Content-Length无Content-Range、3MiB通过两个≤2MiB上游范围逐字节拼接、open完整206/后缀/超文件末尾/HEAD本地无正文、非法range416且不上游、唯一Content-Length0/拒绝正文、上游total漂移、128MiB/256窗口预算和活跃响应取消时listener/cURL关闭。legacy DASH全部原用例仍通过。13源mock校验512范围total仅在成功后移交并擦除；14cast socket/RPC/cleanup回归通过。HOST使用匿名loopback/mock，不把它算TV/CDN或音视频解码通过。

56UI整组通过（30.6秒）。随后修正取消时请求摘要保留合并，28项F20定向通过（12.1秒），含prepare错误后队列中的get_full/head摘要仍为0x11、失效scope不启动播放器、标准错误name/不泄露原始message、99进度压力及8项报告。没有把两轮相同用例相加成84项。单元新增固定异常/枚举、晚错误隔离、请求摘要未知位拒绝和≤8报告。Chromium1920×1080/http://127.0.0.1:4173，Browser plugin not available，项目Playwright；截图/tmp/bilisofa-cast-028-*只证明fixture界面，desktop插件缺失仍非真实播放。

0.0.27实际prepare失败证据独立保留。补齐HTTP兼容是候选修复，尚无证据断言TV用的是哪一种请求或一定是codec/HTTP问题。ADR-007记录范围/128MiB与256窗口新预算/未放宽TLS与账号边界，完整W01/F20仍开放。

0.0.27错误标签复核：startCastMedia旧catch同时覆盖await open和同步play，cast.avplay_prepare_failed仅证明启动链路失败，不足以区分prepare或play阶段；此前按标签解释为单独prepare失败的文字以此修正。0.0.28新增phase区分和独立play失败UI用例；不改写用户“进入播放页但无声画”及原始报告。

0.0.28后续阶段修正：旧标签不能独立区分prepare/play，新增同步play失败用例，29项F20定向通过（12.9秒），本轮主UI共57个不同用例（先56整组，最后29定向含新增1），没有声称一次57整组。HEAD必须忽略Range的最后语义补丁另增HOST用例并再次SDK编译；最终结果与打包随后补记。

0.0.28最终本地验证共208个不同检查PASS：100单元/合同、57不同主UI（56整组+后续29项F20定向，含新增play-error）、22 HOST bridge、13 HOST source、14 HOST cast、2 native桌面。HEAD忽略Range用例加入后桥整组22/22（37.3秒）并SDK再次实际重编译；活跃响应取消测试改为有界读取后单独重跑通过，不累计为新增用例。最终native桌面加载/CSP/取消2/2（21.2秒）通过，不冒充Tizen网络。三个unsigned gate/source hash/许可布局均通过，32MiB固定堆无增长。最终TV声画待新包反馈，不以208项扩大验收。


## 0.0.28 HTTP兼容候选实际部署与启动（2026-10-15）

auto=6/BiliProbe1.Probe，source `e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60`，signed SHA-256 `896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d`，native unsigned `c7e8b1bd872be4ec71def203fd9f9a230ce57c74dbe838e1753c3150e5a9272f`。208不同本地检查及strict/C syntax/实际Samsung重编译/三个unsigned gate/source ZIP冻结通过；相同Author/Public Distributor，无新权限、证书或固件变更。

get-state=device/capability exit0，无需重连；第一次install exit0且install completed，run exit0且successfully launched。collector exit0，TV build与新source匹配，签名工件配对；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup独立保留device-native028-startup-report.json。准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结在仓库外deployed-source，私密签名包/raw日志保留，不混入后续默认manual文档快照。

启动自动模式未创建源cURL/媒体桥或AVPlay；只通过新包监听/清理，不扩大为HTTP请求实际类型、分段续传、声画或活跃transfer取消的TV证明。已请求Android同一视频重新投送→TV确认候选，正常时可继续90秒/暂停/seek/Back，最终开诊断。真实请求类型/声画/手机控制、HD发现、完整F20/W01/v1.0.0继续开放。0.0.27无声画与旧catch混合prepare/play的边界已更正并保留，未提前记为HTTP根因或声画修复。

文档补记后默认manual重建不再签名/部署，电视维持上述精确auto6工件；无HEAD/remote、未commit/push/公开发布。

## 0.0.28 声画反馈及控制失败（2026-10-15）

W01/F06/F20：用户确认TV已检查候选声画正常；首次暂停/继续退出、第二次正常，首次跳5秒成功，进度超过5秒再次跳5秒卡住后返回投屏发现。独立记录声画USER PASS、控制FAIL；未明确连续90秒，不计90秒通过。部署源码e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60、签名896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d。实际读取报告HTTP PASS且GET后监听关闭，含cast.media_issue_206_28（上游206/cURL超时）、source_pass、avplay_started、media_requests_v1_02（开放Range）、native_closed_confirmed。原始脱敏报告及用户观察保存在仓库外device-native028-controls-report/observation.json；首个暂停独立失败未被8项摘要保留，不将其根因推断为已证实。

0.0.29候选按ADR-007修复渐进MP4背压总超时和seek期间控制叠加；真实TV回归尚未完成。未接通手机控制，完整F20/W01仍开放。

## 0.0.29 控制回归候选实现与HOST验证（2026-10-15）

W01/F06/F20：按ADR-007将progressive总transfer timeout改成非背压上游无数据deadline；保留connect/TLS/精确Range/固定堆及lease/字节/窗口预算。只改渐进MP4期限，不将旧游客DASH的整片验收外推。PlayerCoordinator在已排队/执行seek期间不发play/pause，UI重复seek忽略且显示跳转中，关闭代次不能释放新会话busy状态。首次pause独立根因尚未证实，保留原AVPlay合法状态检查。

实际static strict/46模块边界PASS、101单元合同PASS、58整组主UI PASS（31.8秒，含待完成seek期间重复遥控/暂停隔离）、26 HOST bridge PASS（62.9秒，含真实16秒背压+时钟跨旧20秒期限后全部字节恢复并重新取较早范围，真实上游停滞仍206/28，放弃连接再Range、背压时硬租期关闭），13 HOST source PASS、14 HOST cast PASS（20.0秒）。C syntax PASS，Samsung Emscripten1.39.4.7实际重新编译，固定32MiB堆。native桌面/最终打包/签名/安装/设备反馈随后独立补记；不提前算TV控制通过。UI使用项目Playwright（无可用Browser插件），anonymous native/AVPlay shims不是TV解码证据。

0.0.29 native桌面2/2通过（21.8秒）：本地JS/WASM/data/CSP加载与取消后新Worker。合计214个不同检查通过（101+58+26+13+14+2）；桌面Socket Extension能力仍不伪造，旧native HTTP/media/guest/isolation组本轮未重跑。三个unsigned完整性/许可/source配对gate已通过一次，最终auto6部署快照重新生成后再核查。

## 0.0.29 实际签名部署与控制待回归（2026-10-15）

W01/F06/F20内部auto6，BiliProbe1.Probe，source `ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b`，signed SHA-256 `e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3`，native unsigned `8d64a8eaeccd4175de038bdecf46db231e3ee016187ae00085d21ac4716d9a9b`，source ZIP `834bc897873860f71c3746ee63396e855f35d1b381ace59c7068317ae65c1dea`。214不同本地检查PASS、strict/46模块/C syntax/真实Samsung SDK编译及三个unsigned gate通过；相同自有Author/Public Distributor，无新增权限。

设备state/capability exit0，首次install exit0且install completed，run exit0且successfully launched。collector exit0，实际build与新source匹配；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。启动原件仓库外device-native029-startup-report.json，准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结于deployed-source，签名包和raw工具日志留私密目录。

仅证明部署/发现监听启动/清理；自动模式未播放真实内容，不证明新的暂停/回跳修复或手机控制。已请求同一视频起播20秒→暂停20秒→继续→两次回跳5秒→Back并开启报告，待用户反馈；0.0.28声画USER PASS与控制FAIL独立保留。W01/完整F20/v1.0.0仍开放，不将TV确认候选播放当官方连接控制验收。文档补记后默认manual重建不再次部署，电视维持上述精确auto6包。main无HEAD/remote，保留所有未提交文件，未commit/push/公开发布。

## 0.0.29 暂停通过、回跳仍间歇失败（2026-10-15）

W01/F06/F20：用户确认起播20秒后首次暂停20秒再继续正常，记录USER PASS；回跳5秒在两次播放中分别出现首跳失败、首跳成功/第二跳失败，卡住后返回发现页，记录USER FAIL。collector exit0，source ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b / signed e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3匹配，HTTP报告/GET后关闭true，avplay.seek_failed、source_pass、media_requests_v1_02和native_closed_confirmed。手动报告/观察另存仓库外device-native029-seek-report/observation.json，startup不覆盖。通用catch丢掉SDK/timeout原因，不能提前锁定根因；无206/28条目也不扩大为全程网络通过。90秒未明确反馈，完整F20/W01仍开放。

0.0.30候选按ADR-008拆分prepare15秒/seek30秒有界等待、仅渐进MP4 IDLE显式配置4秒起播/恢复和10秒缓冲、固定SDK原因/缓冲/目标tick分类；已结束且活动状态不变的seek失败保留播放页允许手动重试，未知/超时仍关闭，不自动重试。真实回跳修复仍待新包反馈。本轮C/native源未改，不声称SDK重编译；重用0.0.29已实际编译且C source hash匹配的固定32MiB WASM，需继续通过包hash门禁。

## 0.0.30 seek策略与诊断本地验证（2026-10-15）

107单元/合同PASS（3.8秒），含IDLE配置与缺API回退、SDK callback/throw与安全错误分类、状态丢失不可重试、20秒回调不提前结束、30秒无回调清理/实际目标tick诊断及晚回调隔离、8条报告保留最新seek与旧失败/清理。strict/46模块/C syntax通过。主UI首轮61/62（41.6秒），seek-timeout夹具连续推进主页面虚拟时钟，在Worker真实20ms ACK前先耗尽5秒清理期限；修正夹具先等待Worker ACK再推进晚回调，15项全部F20候选媒体定向回归PASS（13.2秒）。合计62个不同主UI用例已通过，不声称一次62整组通过，也不把夹具故障算作TV故障。新增4项为seek明确拒绝后保留页面/重试、20秒成功、30秒超时后晚回调、seek中Home清理。1920×1080浏览器截图确认错误反馈与按钮/焦点可见，不能证明TV声画；Browser插件不可用，沿用项目Playwright。

原生C/WASM桥本轮未改；此前26 HOST bridge/13 source/14 cast结果仍是0.0.29历史证据，本轮未重复计数。native桌面/包/部署随后补记，暂停20秒USER PASS仍配对0.0.29；0.0.30真实回跳效果未验收。

0.0.30 native桌面2/2 PASS（21.1秒），本轮共171个不同检查通过（107单元合同+62不同主UI+2native桌面）。C source/hash、native byte/媒体/许可门禁及三类unsigned完整性/source ZIP门禁通过。原生桥字节复用0.0.29固定32MiB SDK构建；未重复native HOST组或宣称新编译。最终auto6签名/部署及TV反馈独立记录。

## 0.0.30 实际部署与seek待验收（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47`，signed SHA-256 `61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4`，native unsigned `1daefa1ae7b078e639127c834b19c45e1f19e5f3ee56a07f97af40b615a944f0`，source ZIP SHA-256 `c005cf2689246fd42b0e29572b00f3fe97dc3bea342c31a8be56aff30ef37465`。171不同本地检查通过（107+62不同UI+2native桌面，初始夹具问题和定向复核见TEST_REPORT），三类unsigned/source/许可门禁通过；C及native JS/WASM/data/manifest与冻结0.0.29逐字节一致，本轮无SDK重编译声明。

state/capability exit0，首次install exit0且install completed，run exit0且successfully launched；相同自有签名profile/Author/Public Distributor，无需重连或新权限。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup原件独立保存仓库外device-native030-startup-report.json；精确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结，签名包/raw日志仍私密。

自动启动未播放媒体或触发seek，不证明新缓冲/回跳修复。已请求同一内容两次进度过10秒回跳5秒，单次最多等30秒、首跳失败即可结束并开报告；无需重复0.0.29已通过的20秒暂停。新包声画/回跳仍待用户反馈；完整W01/F20/v1.0.0继续开放，手机控制仍拒绝。后续文档默认manual重建不重新部署，精确部署快照与本地文档包分开；main无HEAD/remote，无commit/push/发布。

## 0.0.30 最新seek报告与0.0.31候选（2026-10-15）

W01/F06/F20：collector exit0、精确匹配source d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47 / signed 61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4，HTTP/GET后关闭true，最新FAIL avplay.seek_callback_invalidvalueserror_b0_t0、source_pass、media_requests_v1_02、native_closed_confirmed。手动原件单存仓库外device-native030-seek-report/observation.json，startup不覆盖。SDK callback错误不等于应用30秒watchdog，且未证明URL失效或参数5秒本身非法。用户“两次恢复声画和进度，等待超过30秒后失败，失败时自动返回”的顺序已请求可选澄清；保留原话，自动返回USER FAIL，尚不将两次恢复都记PASS。

按ADR-008新增0.0.31：仅PLAYING的受控渐进MP4可用PREBUFFER_MODE目标起点重新准备/播放；同owned URL/Worker/3分钟租期不变，不叠加或自动重试原SDK seek，不新取源、不延租、不增加decoder。paused/缺接口仍走原SDK候选，未扩大这些验收。最近4次seek常量结果历史与详细故障/清理共同进入8项报告。C/WASM本轮未改，候选实际声画/两次回跳与后续播放仍待新包验证，完整W01/F20开放。

## 0.0.31 从目标时间重新缓冲与操作历史（2026-10-15）

实际strict/46模块和C syntax通过；113单元合同PASS（3.9秒），含两次PREBUFFER_MODE同源重建/旧tick失效、取消与新source代次、配置不支持不fallback、30秒上限/晚回调、暂停仍native seek不出声、8条报告含最近4次历史且不重复固定Range摘要。新增取消测试初次strict发现回调保存声明误调用，修正后strict与113整组通过，不当作TV故障。66整组主UI PASS（40.0秒）：新增prebuffer两次重建仍只approve一次、配置失败、超时后晚ready、重建中Home；原控制/Worker/Back/界面回归同时通过。native桌面2/2 PASS（21.5秒），合计181个不同检查；全部桌面/匿名shims，不能证明零售TV支持或跳到真实目标的声画。

原生C/native JS/WASM/data未改，复用已SDK重编译且受门禁校验的0.0.29字节，32MiB堆/网络预算/源与有效期不变；本轮不重复算26/13/14 HOST native组，不声明新SDK编译。basic/native/observer三种unsigned/hash/source ZIP/许可布局门禁通过。配置异常最后增加固定SDK name分类（无message/stack/URL），随后重跑113单元与19项媒体定向；实际结果随后补记。未授权账号写入、commit/push/公开发布。

0.0.31最后配置异常固定枚举补丁后：strict/46模块、113单元整组（3.85秒）及19项候选媒体定向（17.5秒）再次PASS。仍计181个不同检查，不把重复执行累加。native桌面/完整66主UI在补丁前已通过，补丁仅细化错误标签，配置拒绝路径已在后续19项覆盖。此后仅补文档/包metadata，不修改已测runtime行为。

## 0.0.31 指定时间重新缓冲候选部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114`，signed SHA-256 `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，native unsigned `0ae308207ba0853f9aec4ff3cf55a9910d4a022124d12aeda9eb850a9d368983`，source ZIP SHA-256 `4f39bf53d6ecb03799a265b428e31dc338332842b5f6726065f83abd305232a7`。181不同本地检查PASS（113合同单元/66整组主UI/2native桌面；最后配置异常枚举补丁另重跑113及19媒体定向），strict/46模块/C syntax、三个unsigned/source/许可门禁通过。C和native JS/WASM/data/manifest与冻结0.0.30逐字节一致，没有新SDK编译声明。

state/capability exit0，首次install exit0且install completed、run exit0且successfully launched，无需重连/新权限/改证书。同自有profile/Author/Public Distributor。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后监听关闭true、marker1；model U800FD / firmware T-KSU2EFAKUC-0090-1300.9 / platform9.0，engine major未知。startup私密原件device-native031-startup-report.json；准确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结deployed-source，签名包/raw日志仍在仓库外。

仅自动发现启动/清理通过，没有自动播放或PREBUFFER_MODE设备证明。已请求同一视频两次过10秒跳到5秒，第二次后正常播放35秒以核查后续自动返回；单次最多等30秒，首跳失败可结束并开报告，不要求重复长暂停。0.0.30最新SDK InvalidValuesError与用户自动返回FAIL保留，两次恢复的具体顺序待可选澄清，未擅自记PASS。0.0.31实际起播/两次重定位/后续35秒声画仍待反馈，paused/全F06、官方手机控制/三端完整F20/W01/v1.0.0继续开放。后续文档默认manual包不重复部署，电视维持上述精确auto6。main无HEAD/remote，原有所有未提交文件保留，无commit/push/发布。


## 0.0.30澄清与0.0.31回跳失败（2026-10-15）

用户确认0.0.30前两次回跳恢复声画/进度，第三次失败并自动返回；前两次USER PASS、第三次USER FAIL，整体未通过。0.0.31两次独立尝试均首跳失败回零售探针主页面，USER FAIL。collector实际匹配source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114` / signed `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，HTTP读取/GET后关闭通过，FAIL `avplay.seek_restart_callback_pending`、history_f、source_pass、media_requests_v1_02、native_closed_confirmed。stage pending不能区分同步prepare拒绝/非READY回调等，未定位SDK或网络根因；无native错误条目不证明网络始终通过。手动报告另存私密device-native031-seek-report.json，0.0.30/31观察另存，startup不覆盖。

按ADR-008准备0.0.32：恢复原生seek默认策略，PREBUFFER仅保留显式HOST实验，增加固定SDK阶段/状态与原生桥有界flow/limit分类；TV确认后自动三次回跳及后续35秒时间轴检查，再等清理ACK开启报告。Back/Home可取消；自动时间轴只记UNVERIFIED，不替代声画。无新增权限、URL重获/延租、账号写入或手机控制接通。实际新包部署/验收另记，完整W01/F06/F20开放。


## 0.0.32 文档复核、原生seek与自动控制取证（2026-10-15）

W01/W02/F06/F20。实际strict/47模块边界PASS；121单元/合同PASS（3.72秒）；72整组主UI PASS（49.7秒），新增三跳+35秒、第三跳拒绝、Back/Home取消、首播错误与清理ACK丢失六项自动检查。后续补焦点/截图断言的六项定向再PASS（11秒）；最后仅状态按钮名称同步，再按实际执行结果补记。截图1920×1080已目检，新增入口/确认操作无重叠，真实DOM返回焦点已检查。使用项目Playwright，无可用Browser插件；匿名AVPlay/native夹具没有解码真实媒体。

原生桥28 HOST PASS（67.6秒；包含真实16秒背压、现有范围/窗口/取消与新增有界快照/字节/租期分类），HOST source13 PASS、cast14 PASS；C语法及Samsung Emscripten1.39.4.7实际重新编译PASS，固定32MiB堆/原权限和TLS。最后修正剩余租期分桶的向上取整，已再编译并重跑28项桥检查。native桌面/三类包门禁及TV结果随后独立补记，不提前计入。

初始桌面夹具失败保留：新版SDK错误态已IDLE，只close而无需非法stop，修正测试预期；自动夹具遗漏必需pause导致adapter不可用，补齐；另有addInitScript早于虚拟时钟的interval混用真实/模拟时间，改为play后创建ticker。修正后完整72项通过。不是TV根因，也没有通过改产品阈值掩盖失败。新增清理未知测试促使自动报告显式检查closedCleanly，未知清理保持错误且不创建报告Worker。

新增有界flow/limit IPC（最多102进度、8项紧凑报告）与自动检查的批准/取消/超时/真实时间轴边界见ADR-008。PREBUFFER仅保留HOST显式实验；默认工厂始终原生seek。当前0.0.31真机FAIL保留，0.0.32尚未获得声画/回跳设备结果。无账号写入/新增权限/外部网关/公开发布。

0.0.32最后按钮状态文案同步后strict/47模块、6项自动控制定向再次PASS（10.9秒）。native桌面2/2 PASS（21.1秒）：本地JS/WASM/data初始化/严格CSP/停止与新Worker行为通过，桌面Socket执行本身仍按预期超时FAIL，不冒充设备网络通过。本轮共250个不同检查PASS（121单元合同+72主UI+28桥+13source+14cast+2native桌面），重复运行不累加。三类unsigned包、源码ZIP/hash、native C source/CA/许可和边界门禁全部通过。44个原始基线文件0缺失；main无HEAD/remote，未commit/push。最终auto6签名/设备安装启动另记，尚不宣称新回跳声画通过。


## 0.0.32 已部署，自动三跳实际结果待取证（2026-10-15）

250不同本地检查及实际Samsung重编译/三类unsigned/source/许可门禁通过。首次连接状态失败后仅重连已有授权TV成功；install/run exit0且平台成功。auto6 source `d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd` / signed `f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852`，source匹配报告为cast.ready/native_closed_confirmed，GET后关闭true，marker1。准确unsigned/源码ZIP/私密归档见[SIGNING_DEVICE_RECORD](SIGNING_DEVICE_RECORD.md)。仅启动/清理通过，新的回跳/声画未验收。已请求TV确认自动三跳+35秒观察，Back/Home可取消，清理确认后自动开报告。官方手机控制仍拒绝；完整W01/F06/F20/v1.0.0继续开放。


## 0.0.32 自动检查失败与0.0.33诊断修正（2026-10-15）

用户启动TV批准的自动流程后，collector实际读取精确匹配source d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd / signed f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852的报告：自动FAIL avplay.control_check_failed_network，SDK FAIL avplay.seek_callback_invalidvalueserror_b0_t0_sp，history_se。仅证明第一次seek成功回调、第二次明确可重试拒绝且SDK仍PLAYING，不等同用户确认声画；流程按故障结束并清理。错误快照flow_e_c2_p0_w4_m6_l5、停止flow_s_c0_p0_w4_m6_l5、source_pass、请求摘要02、native_closed_confirmed；HTTP/GET后关闭true。快照为2连接、0背压、4窗口、累计向上取整6MiB、剩余时间桶5；无字节/窗口/租期触顶证据，不能据此确定根因或证明网络全程正常。原件私密device-native032-auto-seek-report.json，startup独立保留。

源码复核定位诊断丢失：CastProbeView仅在UI代次有效时记录media_issue，关闭期间到达的底层固定错误被忽略；紧凑报告还可能让后来的media_stopped遮住较早issue。0.0.33候选把本次已验证issue与flow/limit一并保存到该run的局部集合，native ACK后才汇总；compact单独优先issue与limit，再考虑stopped，SDK/历史/清理仍保留。没有放宽late回调执行UI/播放的边界，没有改seek策略、网络预算、权限或C/WASM源。该修正只补证据完整性，不能宣称修复播放器。新包真实底层错误与回跳仍待取证，完整W01/F06/F20开放。

0.0.33实际strict/47模块PASS、122单元/合同PASS、73整组主UI PASS（50.3秒），新增关闭后真实Worker进度中的固定issue仍进入脱敏报告，且stopped不盖掉issue。既有自动三跳/Back/Home/初始错误/清理未知均回归。C源和原生JS/WASM/data未改，后续包门禁需逐字节核对0.0.32实际SDK构建，不重复宣称HOST桥或SDK重新编译。native桌面与实际部署随后补记；此处不把0.0.32失败改为PASS。

0.0.33 native桌面2/2 PASS（21秒），合计197个不同本地检查PASS（122+73+2）；不重复计入0.0.32的HOST桥/source/cast历史检查。四个native文件JS/WASM/data/manifest与已安装0.0.32逐字节一致，C source/CA/媒体/许可门禁及三类包/源码ZIP门禁通过；没有重新SDK编译声明，网络能力仍与桌面加载分开。最终签名安装/启动和真实媒体错误需独立证据。


## 0.0.33 已部署并开始自动取证（2026-10-15）

197不同本地检查、strict/47模块和三类包/源码/许可门禁通过。首次install/run exit0且平台成功，source `83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354` / signed `4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82`，启动报告匹配、cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP见SIGNING_DEVICE_RECORD。C/WASM不变。用户已开始相同自动流程，真实结果等待collector；这是证据留存修正，不是回跳修复证明。


## 0.0.33 首次自动尝试停在prepare（2026-10-15）

collector实际匹配source 83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354 / signed 4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82。FAIL cast.avplay_prepare_timeout（15秒应用有界等待），source_pass/TV确认/批准/请求02、停止快照flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，HTTP GET后关闭true。没有进入自动seek；没有原生issue/错误快照e，不能作为上一轮第二跳的同一原因，也不能证明底层网络正常。原件单存私密device-native033-auto-attempt1-prepare-report.json，startup不覆盖。

保持同一0.0.33/相同策略，已请求再启动一次相同自动流程，无新安装或放宽超时/预算。此轮起播FAIL、回跳UNVERIFIED，完整W01/F06/F20仍开放。


## 0.0.33 同包复测仍prepare超时，0.0.34有界观察候选（2026-10-15）

用户确认重新启动后，第二份匹配同source/signed报告仍为cast.avplay_prepare_timeout、source_pass、请求02、flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，GET后关闭true；未进入seek。第二份原件单存私密device-native033-auto-attempt2-prepare-report.json，不覆盖首次/启动报告。这是本次两次prepare失败，未取得关闭期底层issue，不能改写0.0.32的第二跳SDK错误为同一根因。

0.0.34仅cast候选prepareAsync观察延至30秒（legacy合成/游客仍15秒，seek仍30秒），超时增加关闭前实际SDK状态和最后buffering标志。30秒是有界观察实验，不是“延长超时已修复”结论。三星文档中buffering timeout只定义onbufferingcomplete，4秒缓冲表示媒体累计量，不承诺prepareAsync在10或15秒内返回；本轮官方资料复核见ADR-008。原生上游无数据15秒、3分钟租期及资源/TLS范围保持，可先呈现真实网络错误；不自动重试。

另修正自动流程在prepare中被native issue关闭时的报告路径：即使mediaPlayer已被清空，只要仍同automation epoch且非用户Back/Home/新操作，仍等待清理ACK并自动报告。取消/新owner仍不能自动打开报告或复活player。新实际效果仍待测试/部署与真机报告，不先宣称修复。

0.0.34实际strict/47模块PASS、124单元/合同PASS、74整组主UI PASS（50.8秒）。新增cast20秒后READY而不自动play、legacy15/cast30独立deadline/关闭前b与state/晚回调隔离，以及prepare未完成时真实Worker发native issue仍自动报告的UI用例。官方API复核和预算选择见ADR-008；无C/WASM变更/SDK重编译声明。三类包门禁/native桌面随后独立补记，新候选TV首播/回跳仍未验收。

0.0.34 native桌面2/2 PASS（21.1秒），共200个不同本地检查（124+74+2）。原生四文件与0.0.32实际SDK编译/0.0.33已安装包逐字节一致；C源、CA、媒体、许可、三类unsigned及源码ZIP/hash门禁通过。未重跑0.0.32 HOST桥/source/cast或宣称本次SDK重编译。新cast prepare观察窗口与报告路径仍需真实设备取证，主机夹具不算修复设备故障。


## 0.0.34 已部署，准备等待与回跳实际结果待取证（2026-10-15）

200不同本地检查（124+74+2）、strict/47模块、三类包/source/许可门禁通过。C/native字节复用0.0.32已实际编译的四文件。首次install/run exit0且平台成功；source `3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94` / signed `af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731`，source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。只证明启动/清理，不证明延长cast prepare有界观察已修复。已请求相同自动流程，真实报告待读取；完整W01/F06/F20/v1.0.0仍开放。


## 0.0.34 实际起播、第二跳失败及原生超时证据（2026-10-15）

用户明确“开始播放了”，记所测实际起播USER OBSERVATION PASS；未明确确认本轮全部声画/三跳。自动报告与之后用户重新开启的手动报告均实际读取并匹配source 3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94 / signed af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731。history_se、SDK InvalidValuesError_b0_t0_sp、control_check_failed_network，整体FAIL；source_pass/请求02/native_closed_confirmed，HTTP GET后关闭true。

首次完整保留独立native FAIL cast.media_issue_0_28：上游尚无HTTP状态时超时，不是HTTP403或已证实的解码失败。flow_e_c2_p0_w5_m7_l5（2连接、0背压、5窗口、累计向上取整7MiB、剩余30秒桶5）。不能据此认定所有SDK回跳错误都由同一原因造成，亦非资源上限证据。起播观察30秒未构成三跳通过。auto/manual原件分存私密device-native034-auto-seek-report.json / device-native034-manual-seek-report.json，startup保留。

0.0.35候选只对已批准匿名progressive GET，在本次范围尚无HTTP头/状态/正文的curl28超时，排队250ms后新连接重发同一范围。每个下游连接最多一次、整租期最多三次；重复消耗原窗口预算，保持原URL/Range、TLS/CA/host、3分钟/签名租期、128MiB/256窗口/512连接/4×64KiB边界。不重试部分正文、HTTP/范围/格式/证书错误，不重试seek/prepare/写操作，不重取URL或延租。进度retry_1/2/3只是已排队而非恢复证明，最大105帧/8条报告。新包实际效果仍待设备证据。


## 0.0.35 零响应GET重连候选本地验证（2026-10-15）

strict/47模块/C syntax PASS。126单元合同PASS（3.73秒）；75整组主UI PASS（53.1秒），新增固定retry IPC/自动报告/原SDK只发三次seek；最后无history首播报告pin/8条硬上限补丁后，重跑126单元及9自动控制定向（13.9秒）PASS。重复运行不累加。32 HOST bridge PASS（76.54秒），新增无HTTP响应首个超时重发同范围字节完全一致、第二次超时终止、跨客户端共享最多三次、backoff期间stop无迟到请求；原有收到206后的无数据仍终态超时、真实16秒背压/精确Range/资源与目的地边界检查继续通过。HOST上游为匿名HTTP夹具，不算TLS或TV证据；原生TLS校验代码保持开启，实际新路径仍待TV验证。HOST source13 PASS（0.32秒）、cast14 PASS（20.08秒）。

Samsung Emscripten1.39.4.7实际重新编译PASS，固定32MiB堆；native source hash已覆盖新bridge。新增FRESH_CONNECT只用在一次零响应重连，不改其他正常窗口复用。native桌面、三类包/source/许可门禁及签名/TV结果随后独立补记；不提前算真实声画/回跳修复。官方错误码/新连接选项来源见ADR-008，未复制第三方实现。

0.0.35 native桌面2/2 PASS（21.1秒），总262不同检查PASS（126单元合同+75主UI+32桥+13source+14cast+2native桌面）。重复运行不累加。strict/47模块/C syntax、实际Samsung SDK重新编译、固定32MiB堆、三类unsigned/source/CA/媒体/许可门禁均通过。native桌面通过的是本地加载/CSP/停止/重入，Socket执行仍不是桌面能力PASS。新路径实际网络恢复/三次回跳/声画仍待签名TV结果。


## 0.0.35 已部署，有限重连与三跳待实际验收（2026-10-15）

262不同本地检查、strict/47模块/C syntax/真实Samsung SDK重编译及三类包/source/许可门禁通过。首次install/run exit0且平台成功，source `0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510` / signed `7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1`；source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1。准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。仅启动/清理通过，已请求同一自动流程验证零HTTP响应超时的有限重连与三次seek；完整W01/F06/F20继续开放。


## 0.0.35 单样本三跳/35秒声画通过（2026-10-15）

source 0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510 / signed 7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1。实际匹配报告history_sss、avplay.control_check_complete_timeline_only、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。SDK三次回调和真实目标tick/后续35秒进度均按driver完成；原报告自动结论仍UNVERIFIED timeline_only，不改写为声画PASS。最后SDK成功摘要t0只表示回调操作窗口内未见目标±1500ms tick；driver在回调后继续观察目标区间，因此不矛盾。

用户对刚才自动三次回跳及后续播放明确反馈“声画正常，没有卡住”，本所测公开视频的三跳声画/后续无卡住记USER OBSERVATION PASS。流程结束主动回主页面为预期，不等同此前故障返回。flow_s_c1_p0_w10_m16_l4；没有media_retry进度或native错误，不能宣称重连支路被触发、恢复已证明或新代码为通过原因。重连真实分支/更多样本/长期稳定/完整F06、官方手机连接控制/三端F20与W01继续开放。auto报告/用户观察私密分存device-native035-auto-seek-report.json / device-native035-user-observation.json，startup不覆盖；历史失败完整保留。下一步推进真实官方手机会话/控制，不用这次TV确认候选结果冒充手机连接通过。


## 0.0.36 已确认 SOAP 手机控制候选（2026-10-15，W01/W02/W06/F06/F20）

已实现ADR-009：native仅在当前有效RPC暴露私有IPv4所有者给Worker；原始URI只在Worker租期内使用。UI不接收原始URI/对端。电视确认后同一发送端/同一URI可接受SetURI；其他对端、URI变动、旧/过期状态帧与remote控制权都拒绝。暂停/继续/seek/Stop/同源重播经过PlayerCoordinator，3秒快照新鲜度、2秒接受ACK、最多24命令，seek接受与完成/声画分开。查询反映实际状态和时间，未知时长0；适配器可读真实getDuration。停止解码器不延长原媒体租期，Back/Home/错误最终清理全部资源。

本轮137单元/合同PASS（3.75秒），50模块strict/依赖/平台边界PASS。新增7会话/IPC、4播放器控制测试覆盖单owner/URI、过期/旧帧、backseek、单flight/重复ID/ACK截止、remote接管交还、Stop/同源Play、晚prepare/seek取消和SDK不重试。HOST cast14 PASS（20.26秒），新增有效RPC peer getter及失效/停止后归零断言。C syntax和Samsung Emscripten1.39.4.7实际重编译通过；固定32MiB堆，权限/TLS/CA与媒体字节/期限/窗口预算不变。

新增5浏览器联调使用实际打包Worker/SOAP/parser/UI/coordinator与匿名native/AVPlay shim，覆盖完整控制/真实查询、外来peer/新URI拒绝、seek时Back晚回调、remote接管/交还、Home恢复。它们不是实际TLS、解码或官方手机证明。原75主UI也重跑，最终整组结果随后补记。初次夹具漏Play的Speed=1被正确拒绝402，已修正夹具；快速查询在prepare中返回TRANSITIONING是实际状态，夹具在完成后再核对PLAYING。没有为通过测试伪造状态。

设备/签名/工件身份另补SIGNING_DEVICE_RECORD。官方App首次未批准仍可能701，需要电视起播后手机重新选择同一条视频；官方端可能换URI或需要未接通协议，尚待实际证据。物理音量/静音仍501，GENA/NVA会话、换P/PGC/live/三端恢复等未实现/未验证；本候选不能关闭完整W01/F20。0.0.35所测三跳声画USER PASS与其未触发重连支路保持原记录。

0.0.36最终整组主UI80/80 PASS（59.8秒）、native桌面2/2 PASS（21.3秒），合计本轮233不同实际检查（137单元合同+80主UI+14 HOST cast+2 native桌面），重复运行不累加。基础/native/isolation unsigned及source ZIP/CA/媒体/许可/禁止私密文件门禁exit0；真实Samsung SDK已编译新getter。native桌面只证明加载/CSP/停止重入，desktop Socket执行仍非PASS。原桥/source的既有HOST证据沿用对应版本，不算本轮重新运行。


## 0.0.36 已确认 SOAP 手机控制候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2`，signed SHA-256 `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`，native unsigned `918d9e8f0614d7425b1aa8d22f3b9e486cc85e82799ad05343c9749c67bb9917`，源码ZIP `58d883bfbce9493b745e8096bda8a91d3eb606018fbaf9c4e0ad00b0f6e4e4ce`。本轮233不同实际检查PASS（137单元合同/80主UI/14 HOST cast/2 native桌面），strict/50模块/C syntax/真实Samsung SDK重编译及三类包/source/CA/媒体/许可门禁通过。HOST与桌面假后端不作官方手机或解码证明。

state/capability exit0，首次install/run均exit0且平台成功；沿用自有BiliSofa Author/Public Distributor，无重连/证书/权限/固件变更。collector UTC23:31:59精确source/signed匹配，cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。原startup另存仓库外device-native036-startup-report.json，部署源码/manifest/DELIVERY/native unsigned按全source冻结，签名包和原始日志私密保留。

此报告仅证明部署/前台发现启动/原生清理，未发送媒体，也未测试新peer getter的真实发送端语义或官方手机控制。已请求Android一次新入口投送：TV确认起播后，手机如未连接仅重选同一接收器一次，测手机暂停/继续，然后Back开诊断。SetURI/命令接受/声画/连接是不同证据；URI变化、额外协议或手机超时均可能阻塞，尚不记通过。iPhone/iPad HD/完整F20及W01仍开放。0.0.35所测三跳声画USER PASS及未触发重连边界保留。无HEAD/remote/commit/push/公开发布；后续默认manual本地包与本精确auto6部署分别配对。


## 0.0.36 官方Android连接/暂停继续通过，暂停态遥控跳转失败（2026-10-15）

匹配source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2` / signed `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`。用户明确“手机已连接＋暂停继续有效”，记本轮未修改官方Android、普通UGC单样本连接及手机暂停/继续USER OBSERVATION PASS。用户同时反馈手机暂停后，遥控器“跳到5秒”导致退出：该组合USER FAIL。不是完整手机seek/Stop/状态显示、恢复、更多内容或三端F20通过。

实际报告UTC23:34:39：avplay.seek_callback_invalidvalueserror_b0_t0_sh（错误回调时SDK仍PAUSED，e为可手动重试拒绝）、history_e、独立native cast.media_issue_206_28、flow_e_c2_p0_w7_m12_l4、media_retry_1、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。原生错误是收到206后的上游超时；旧重连只覆盖尚无HTTP头/正文，不覆盖本次状态。首次观测retry_1仅证明排队，未导出每连接关联，不能判定该重试恢复到了206或证明所有SDK错误根因。原件/用户观察另存私密device-native036-phone-paused-seek-report.json / device-native036-phone-user-observation.json，startup保持。

发现0.0.36手机快照每200ms在seek期间读getDuration，违反Samsung seekTo异步期间不得调用其他API的规则；这是SOURCE缺口，不能直接断言本次全部错误都由它造成。0.0.37在coordinator正在prepare/seek时使用缓存时长，adapter也拒绝pending期间读duration。native新有限续读只对完全校验的206+curl28，从start+received继续原窗口，保留已收到但未送出的缓冲与原下游响应头；2次/客户端、3次/原租期共享，250ms退避和原固定URL/TLS/CA/期限/窗口/字节限额不变。不重试SDK或写操作。细节见ADR-008追加。

旧8条报告在history路径会漏receiver_summary，0.0.37已修正优先级，仍最多8条。历史报告不补造已丢失会话事实；本轮手机连接控制通过依据是用户实测。新包效果须新设备结果，不提前记修复PASS。

## 0.0.37 本地回归：异步SDK互斥与206有限续读（2026-10-15）

140单元/合同PASS（3.75秒）、strict/50模块及C syntax PASS。新增快照/adapter两层测试：prepare/seek期间不调用getDuration，暂停seek使用缓存时长并保持PAUSED，回调后才恢复读取；receiver摘要/SDK失败/native206超时/关闭在8条中保留，resume IPC只接受1..3。81整组主UI PASS（约1分钟）；新增手机暂停→遥控seek仍暂停→遥控继续→交还手机，实际Worker/协调器配合匿名AVPlay/native shim；最后定向补验固定resume消息映射，重复不增计数。它们不是真实解码或手机证据。

37不同HOST bridge PASS：36整组（87.42秒）及新增1项混合分支（3.41秒）。覆盖完整校验206头后无正文的续读、部分正文在start+received精确接续不重复、64KiB以上前缀和原窗口end/下一窗口边界、续读total不匹配立即终态、同连接2次与全租期3次、零响应重连与206续读共享计数、stop退避取消、真实16秒背压和原范围/方法/资源门禁。HOST是匿名HTTP夹具，TLS/TV路径不得据此记PASS。14 HOST cast（20.24秒）、13 HOST source（0.19秒）均重跑PASS。

Samsung Emscripten1.39.4.7已对新C实际重新编译，固定32MiB堆，CA/媒体/依赖来源保持。未加MSG_PEEK断连推断，避免把合法HTTP半关闭误当作整个消费端已断开。没有通过扩长总租期或SDK自动重试掩盖失败。三类包/source/许可与native桌面结果随后单独补记；真实暂停组合效果仍待新包验收。

0.0.37 native桌面2/2 PASS（21.1秒），本轮合计287不同检查实际通过：140单元合同+81主UI+37 HOST bridge+14 HOST cast+13 HOST source+2 native桌面。全量UI后定向暂停/接管/resume IPC用例1 PASS（2.5秒）不重复计数。三类unsigned/source/CA/媒体/许可/禁止私密文件门禁通过。native桌面仅加载/CSP/停止，Socket网络执行结果不假装PASS。真实新路径的暂停seek/续读支路效果继续等待设备。


## 0.0.37 暂停组合修正候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12`，signed SHA-256 `e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc`，native unsigned `963f3a8de43d48ff2865615a14ba4a0c0075fd8ec2fde000e42f26df24f6134f`，源码ZIP `ff99417214cac205fbaff11b992f6fae4b7b51c2522092d9949f72c07318b399`。287不同本地检查PASS（140单元合同/81主UI/37 HOST桥/14 HOST cast/13 HOST source/2 native桌面）；strict/50模块/C syntax、真实Samsung SDK重编译/固定32MiB堆及三类包/source/CA/媒体/许可门禁通过。默认manual重建与本精确已装auto6冻结源码分开配对。

state/capability首次exit0，首次install/run exit0且平台成功；同自有Author/Public Distributor，无重连/权限/证书/固件变更。UTC23:42:46匹配source/signed报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup原件单存私密device-native037-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结。

该自动检查没有媒体/真实手机命令，仅启动/清理DEVICE REPORT PASS。0.0.36手机连接/暂停继续USER PASS和暂停遥控seek USER FAIL独立保留；已请求0.0.37只测手机暂停→遥控seek保持暂停→恢复5秒附近声画→交还手机控制，最后开诊断。修正调用互斥和有限续读仍须本机新结果；全F06/F20/W01、iPhone控制/iPad HD路线与账号/PGC/live/F19等开放。未commit/push/发布或执行账号写入。


## 0.0.37 手机连接/电视声画未通过，0.0.38起播握手候选（2026-10-15）

用户先反馈“手机无法投屏播放”，随后明确“电视也没有声画”。0.0.37本轮官方Android连接/起播USER FAIL；暂停/遥控seek/交还控制未到达，不记为其新修正通过。匹配source ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12 / signed e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc，UTC23:49:01报告receiver_summary_v1_04201仅approved/control_denied/denied_stale，SOAP摘要为transport_query/uri_offer_rejected/stop_rejected/extra scalar/HTTP URI/oversized metadata，source_pass、avplay_started API调用、请求02、native_closed_confirmed，HTTP GET后关闭true。没有实际时间tick/声画证明；没有独立decoder/native错误保留也不能证明它们正常。原件/用户观察私密另存device-native037-phone-start-report.json / device-native037-phone-user-observation.json，startup与0.0.36局部USER PASS独立保留。

源码发现确定的时序缺口：首次UI准备帧后，200ms状态心跳原在prepare完成/播放后才启动，prepare可等待30秒，接收器却在3秒后拒绝“旧快照”。原始stale码未细分，不能断言本次必为该唯一支路。0.0.38在prepare等待期间也发送协调器真实状态、缓存时长和递增帧号，不读busy SDK。已批准的同一URI幂等确认无需查询解码器；首次TV自动播放意图在原30秒准备窗口内可幂等接受Play而不再次分派SDK，查询只报TRANSITIONING。Pause/Seek/Stop在准备中仍拒绝；真正开始播放后继续3秒快照门禁，不延长180秒/签名租期、不接受新URI或不同peer。

新增固定快照发送/Worker接收/应用/拒绝、具体stale原因（missing/old/expired/clock）、本地inactive及实际时间tick/变化事实。只有实际backend时间事件能产生tick事实，它不等于声画PASS。29事实用receiver_summary_v2_8hex汇总，v1报告仍可读取；IPC上限161/报告最多8条。无history时也固定保留media flow/清理，避免被早期批准提示挤掉。C/WASM网络策略/SDK字节保持0.0.37，不从本次失败推翻或宣称206续读已证实。

## 0.0.38 起播握手和快照链本地验证（2026-10-15）

143单元/合同PASS（3.76秒）、50模块strict/依赖/平台边界PASS。新增批准后首UI帧前同URI幂等握手/Play意图、30秒有限准备窗口只报TRANSITIONING、不重复SDK分派、准备后3秒门禁/时钟回退/租期错误区分、v2快照与时间事实/无history流量/关闭的8条诊断保留。83整组主UI PASS（约1.3分钟）；新增真实打包Worker配合6秒prepare假后端，在第4秒SetURI/Play/查询仍被正确接受/报告准备中，准备结束后实际一次play及Pause，另测第4秒Home取消、迟到ready不重播。旧暂停seek SDK互斥与控制权回归继续通过。

C源/真实SDK工件与0.0.37逐字节相同：JS/WASM/data/manifest四文件直接对已装签名ZIP核对一致。本轮未重新编译SDK或重跑HOST网络检查，不把旧HOST数加到本轮。新TS入口已实际构建，三类unsigned/source/CA/媒体/许可/禁止私密文件门禁通过。native桌面结果随后补记；即使通过也仅证明加载/CSP/停止，不能代替官方手机/实际解码或完整F20。

0.0.38 native桌面2/2 PASS（21.1秒），合计本轮228不同实际检查（143单元合同+83主UI+2 native桌面），重复不增计数；三类包/source/CA/媒体/许可门禁exit0。native网络Socket在desktop仍非能力PASS。没有新SDK/C编译或HOST网络重跑声明。下一门槛为新TV样本的手机连接/真实声画，未提前记时序修正为设备通过。


## 0.0.38 起播状态/握手候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `4ce22544ca976c6d1d2ef564643d7b2752acd67d5021dcde76be69a8e63f7b28`，signed SHA-256 `aac28c1e7ce688c78105ac2cce4fccf55ef56399fb24b7649fd897db138502af`，native unsigned `7ee6bf1ab3118c01bd51d3fc7ebae8f289d269f0c024dad778ae1807a0bea8a5`，源码ZIP `ecc3ff868625b1a8ea8dad4c138cfa264a0a10b90f94ba57487fb450044b9ff6`。228本轮不同实际检查PASS（143单元合同/83主UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。C与JS/WASM/data/manifest四个原生工件已对已装0.0.37签名ZIP逐字节核对相同；本轮没有SDK重编译或HOST网络重跑声明。

初次SDB get-state exit1后，只重连同一个已授权目标，重查state/capability均exit0；首次install/run exit0且平台成功。沿用自有BiliSofa Author/Public Distributor，未改权限/证书/固件。UTC23:58:31精确匹配source/signed的报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup原件私密device-native038-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结，工具原始日志与签名包保密。

此为启动/清理分项DEVICE REPORT PASS，没有实际投送或解码。已请求0.0.38只验证官方Android连接、电视画面与声音，准备最多30秒，起播后观察约20秒再开诊断；暂停组合暂不重复。0.0.37手机/电视均未成功起播USER FAIL、0.0.36手机连接/暂停继续USER PASS分别保留。新时序修正仍待实测，完整W01/F06/F20及三端/账号/PGC/live/F19保持开放；无HEAD/remote/commit/push/公开发布。后续默认manual文档重建不重复侧载，运行时五文件与本精确auto6配对。
