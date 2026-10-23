# 测试记录

## F06整模块开发中的本地检查（2026-10-19）

当前源码实际执行：`npm run check` exit0（183模块边界）；`npm test` exit0，455/455单元与合同测试。日志：`.local/f06-module-check.log`、`.local/f06-module-tests.log`；本批源码/日志hash对应`.local/f06-module-local-evidence.json`。新增行为覆盖指定P的CID/时长、合集不可用项、实际轨道与能力/权益广告区别、URL/DRM/过期/大索引边界、预览确认/取消、双关闭换源/循环/错误不跳过、同步终态/旧回调/Home取消、静音暂停准备、倍速串行/seek后恢复以及分P存储隔离/删除。其余旧回归保留。

这些结果仅证明本地模型/解析/既有代码回归，不是完整F06或真实媒体/电视通过。生产Worker/native桥、源刷新、完整UI/队列衔接及模块级浏览器/打包门禁未完成；未新签名或部署，电视仍是已验收0.20.0。本模块完成后统一安排一组真机验收，不逐控件请求用户。

## W02第三批身份应用（2026-10-17）

300单元/合同、99模块strict/边界通过；实际账号UI/真实Worker＋合成C/KeyManager边界10浏览器流程及既有18导航流程通过；8 HOST TLS通过。身份C已实际Samsung编译，权限/来源/CA/许可证/内容及档案校验通过；两项负例拒绝。新WGT `BiliSofa01.TV`/0.1.0只含QR/nav GET，无固定视频/云写入。未签名、未装机、未真实扫码；旧060/018不变。详见[本批交付](../../W02_IDENTITY_APP.md)和[ADR-029](../../adr/029-identity-worker-and-account-package.md)。不能外推为新8槽/新ID真机账号、完整W02/F01/F13或产品验收。


## W02第二批：多账号基础（2026-10-17）

ProtectedAccountStore/AccountCoordinator/AccountWorkspace已实现，本地285单元/合同、18浏览器合成流程、strict/94模块边界通过；预览ZIP完整性及平台模块误入的负例门禁通过。不是新8槽、正式扫码Worker、多账号真机/Voice Guide或性能验收；没有TV部署、真实账号/云写入或GitHub CI运行。设计、行为与失败修复见[W02_ACCOUNTS](../../W02_ACCOUNTS.md)和[ADR-028](../../adr/028-protected-multi-account-foundation.md)。

旧探针浏览器115项在本轮前一个构建候选通过；之后仅补了共享SessionManager异常回包代次处理及对应单元检查，最终构建的受影响浏览器子集51项通过，不把旧115项强配为最终源码全量回归。原设备060/018证据不变。


## 2026-10-17最新阶段记录

018本地测试凭据最终删除USER/DEVICE PASS（UTC19:41:10.936239，精确配对见W01_EVIDENCE_INDEX）；两个未知意图保留。用户要求跳过本轮云进度，既有画质/权限不足项继续未验证。按ADR-027收束本轮W01探针、推进W02，不计全项W01或产品PASS。

W02首批导航/资源owner/shell与独立合成预览已实现；261单元/合同＋11浏览器通过，strict/89模块与预览ZIP门禁通过。详见W02_FOUNDATION；不是新的TV运行/媒体/Voice Guide/性能或真实业务验收，CI仅配置未运行。

2026-10-14（America/Toronto）：本委托已授权本地单元/合同/UI 测试，以下为实际运行记录。

历史截至0.0.31（后续结果以下方续跑和IMPLEMENTATION_STATUS当前摘要为准）：签名/安装/启动/source匹配和原生清理分项DEVICE PASS；0.0.13电脑关机冷启动/合成存储/声画、0.0.11输入/焦点、0.0.12 Voice Guide、0.0.19所测游客短片完整播放等历史USER PASS。Android受控候选既有部分声画和0.0.29长暂停PASS；0.0.30最新SDK错误回调/自动返回FAIL，恢复顺序待澄清，0.0.31指定时间重新缓冲与最近4次历史已部署但实际回跳待反馈。181个不同本地检查通过不能替代设备效果；完整W01/三端官方连接控制/账号/PGC/live/F19/全量v1.0.0仍未验收。历史工件与最新续跑分开保留。

## 历史设备反馈摘要（014/060时点，原文保留）

主060已安装，最后实际流720P/约0.785Mbps；独立014匿名直播已安装/启动/诊断关闭配对通过，用户确认直播基本声画/Back停声，报告有连接错误、30秒持续性时序待核对。G3同UID恢复/最终删除通过，唯一进度提交的目标未回读确认且禁止重发。历史059：G1单次切P/30秒声画/停止USER PASS，g2四阶段/关闭记录匹配；独立007 G2合成HTTPS/保护存储三阶段DEVICE PASS。G1/G2最小门槛PASS，真实账号结果以上述G3当前记录为准。325项不同相关本地检查证明候选行为，不替代TV声画。058早停206/28失败与源身份不确定性保留；六组固定门槛见W01_EXIT_CHECKLIST。

### 历史0.0.50反馈（原文保留）

0.0.50 Android手机定位约60秒/声画恢复、暂停继续、停止USER PASS；UTC14:04:57精确匹配报告有seek_target_hit、native_closed_confirmed，GET后诊断HTTP关闭。0.0.49完整218秒声画/双端进度另为USER PASS，但当时结束后清理unknown保留。投屏反馈采集时维持0.0.50；iPhone本轮发现/起播声画/时间/非零定位/暂停继续/停止USER PASS，14:09:12匹配报告有目标命中及cast关闭ACK；iPad通用版/HD最新用户均确认通过，并更正HD此前本地网络未启用；14:19:50最后匿名报告清理ACK通过，但定位window_missed、无hit，不能把一份报告归到两个App。旧14:11:48描述/服务请求不是手机身份或发现证明。该反馈轮仅文档及交付配对更新，历史251/321检查不重复计入0.0.51；最新设备状态见文末0.0.51。完整W01/F20开放。

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

## 0.0.38 新用户结果与0.0.39布局取证候选（2026-10-15）

用户反馈前两次reject，第三/四次连接成功但无视频。匹配source 4ce22544ca976c6d1d2ef564643d7b2752acd67d5021dcde76be69a8e63f7b28 / signed aac28c1e7ce688c78105ac2cce4fccf55ef56399fb24b7649fd897db138502af。私密device-native038-phone-prepare-report.json和user-observation分存。receiver v2_020c0005已包含approved/query_live/snapshot_sent/received/applied，未观察真实tick；AVPlay prepare_timeout_b0_si，flow_s_c1_p0_w5_m10_l5，source_pass/请求02/清理确认和GET后关闭。连接查询局部通过，实际起播FAIL，暂停组合未到达。没有独立网络错误，不证明网络或解码正常。

0.0.39仅在原512字节范围检查完成、擦除前，按最多32个顶层ISO BMFF头分类moov_first/mdat_first/fragmented/prefix_exhausted/invalid。支持32/64位尺寸及size0，检查头长、文件total与溢出，既有源PASS政策不变；不解析payload、不额外抓取、不记录原始字节/offset/URL，不凭ftyp或布局推断编码和声画。mdat_first仅表示在已读前缀先遇到mdat，不能证明moov一定在文件尾。保持30秒prepare和原所有网络预算；本候选是定位，不宣称起播已修复。报告在receiver路径保留布局与流量/错误/清理，最多8条；IPC161增至166。

用户“W01完成后更新tizen开发skill”的要求已登记docs/W01_LESSONS_FOR_SKILL.md，最终闭环后再应用到skill及验证，当前不提前记W01完成。

0.0.39本轮243不同实际检查PASS：144单元/合同（最后源布局优先级补丁后重跑）、83整组主UI（约1.3分钟）、14 HOST source（0.54秒，新增原生布局尺寸/顺序/extended-size/截断/overflow夹具）、2 native桌面（21.1秒）。strict/50模块/C syntax、实际Samsung SDK重新编译及三类包/source/CA/媒体/许可门禁PASS。整组UI后只改源布局报告优先级，已有单元回归覆盖；C/network策略未扩宽，未宣称HOST匿名/desktop Socket等于TV或声画通过。布局实际结果待新手机源检查，无需先重复30秒播放失败。


## 0.0.39 布局诊断包实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `fdcfa3698b489e6e7fc2240ad6128b7651ddbfd8c7cc4474bd9ac2c5c1b8f582`，signed SHA-256 `04b47df6904b38ee35b78c3859422b41c107ba227a80c97a41c333874d618efc`，native unsigned `6fc2813577c143f8cbcc83fd8c8b36402c6e91f9cedc237a1a1e7dacc4e9a6f7`，源码ZIP `b7e86446f0c860159650dd5af02a0eb3e8f3e9db37736a610e66e01309043dbe`。本轮243不同本地检查PASS（144单元合同/83主UI/14 HOST source/2 native桌面），strict/50模块/C syntax、真实Samsung SDK重编译及三类包/source/CA/媒体/许可门禁通过。只有源布局固定分类诊断，没有放宽媒体/TLS/租期或修改起播策略。

初次state失败后只重连同一授权目标，state/capability重查、首次install/run均exit0且平台明确成功；沿用自有签名资源。UTC03:44:22匹配source/signed报告cast.ready/native_closed_confirmed，HTTP GET后关闭true、marker1；设备环境保持U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup私密另存device-native039-startup-report.json；精确源码/manifest/DELIVERY/native unsigned按完整source冻结，未暴露地址或证书。

仅启动/清理分项通过，布局和实际起播尚待新源检查。已请求Android投送至源就绪后直接Back并开诊断，无需确认播放或重复等待30秒。0.0.38无视频/prepare超时FAIL保留，完整W01/F06/F20/v1.0.0仍开放；W01完成后再更新并验证tizen开发skill。原有工作保留，无commit/push/发布/账号写入。后续默认manual文档重建与已装auto6另作配对，不再次部署。


## 0.0.39 新源布局与单样本声画通过（2026-10-15）

UTC03:45:33实际读取并匹配source `fdcfa3698b489e6e7fc2240ad6128b7651ddbfd8c7cc4474bd9ac2c5c1b8f582` / signed `04b47df6904b38ee35b78c3859422b41c107ba227a80c97a41c333874d618efc`。固定布局为cast.source_layout_moov_first；receiver_summary_v2_1a0c0005含approved/query_live、snapshot_sent/received/applied、timeline_tick/changed，无本报告FAIL。flow_s_c1_p0_w3_m6_l6、source_pass/请求02/native_closed_confirmed，GET后关闭true。报告原件私密device-native039-layout-and-start-report.json，startup独立保留。用户随后明确“确认播放，声画正常”，本次样本实际起播USER OBSERVATION PASS；独立用户记录为device-native039-user-start-observation.json。

这次虽原请求只取源检查，用户实际确认了播放，故按真实观察登记。moov_first仅是本次512字节前缀的顶层顺序；不能归因此前0.0.38的不同请求/样本，不能证明完整文件/编码有效或间歇prepare失败已解决。0.0.39未改播放策略，不把局部成功解释为诊断代码修复了起播。保持同包，无新签名/侧载或扩大超时；下一项仅验证手机暂停→遥控5秒跳转保持暂停→恢复声画→交还手机控制。完整W01/F06/F20及三端验收开放，历史失败保留。


## 0.0.39 暂停回跳后声画未恢复，0.0.40候选（2026-10-15）

用户明确操作可进行，但“跳到5秒后无法恢复正常声画”，组合验收USER FAIL。UTC03:48:34报告匹配source fdcfa3698b489e6e7fc2240ad6128b7651ddbfd8c7cc4474bd9ac2c5c1b8f582 / signed 04b47df6904b38ee35b78c3859422b41c107ba227a80c97a41c333874d618efc。SDK seek_callback_invalidvalueserror_b0_t0_sh（PAUSED、操作窗口无目标tick），receiver_v2_1a0c001d包含批准/query/Play/Pause/快照及曾有实际时间推进；history_ssee是报告中的最近四个结果，不据此猜测每次物理操作顺序。media_retry_2仅排队重连事实，flow_s_c1_p0_w13_m17_l4、source_pass/native_closed_confirmed、GET后关闭true；无独立issue保留不等于网络正常。原件及用户观察私密分存device-native039-paused-seek-report.json / device-native039-paused-seek-user-observation.json，单样本此前声画PASS不覆盖本组合FAIL。

0.0.40仅对cast progressive暂停态有setStreamingProperty时，在同一原租期/源/loopback URL下重建AVPlay，IDLE以PREBUFFER_MODE准备目标位置，成功后SDK保持READY、逻辑仍paused，等待用户明确play才开始播放。不偷偷play/pause，不合成目标tick、不重新批准/换源/续租，不在原seek未完成时叠加恢复。该READY可再次收到暂停态seek；Back/Home/失败/30秒超时关闭并隔离晚回调。缺少接口时保留原native seek；PLAYING默认仍native seek，不恢复0.0.31的默认playing重建实验。合成/游客DASH、网络C/WASM和权限不改。此前PREBUFFER准备失败历史保留，本候选支持及效果须新真机结果，不先记修复。

0.0.40本地145单元/合同PASS（3.79秒），strict/50模块边界PASS；83整组UI PASS（1.3分钟）。新增/改写夹具覆盖暂停重定位保持SDK READY且不隐式play、再次暂停跳转、显式继续、Back取消晚回调、busy期间duration不调用SDK；打包Worker手机暂停→遥控seek→交还也通过，但均为假后端而非解码证明。原生JS/WASM/data/manifest与已装0.0.39签名ZIP逐字节相同，无C/SDK重编译或HOST网络重跑声明。

启动核查发现当前仓库已有用户提交610e8c2及origin；本轮保留现状且未commit/push。交付工具sourceRevision原硬编码NO_HEAD已改为读取实际HEAD，无HEAD才回退；源码snapshot仍覆盖完整当前工作区。该元数据修正不改变TV运行时。

0.0.40 native桌面2/2 PASS（21.0秒），本轮合计230不同实际检查（145+83+2）。三类unsigned/source/CA/媒体/许可/私密文件门禁通过；desktop Socket不记TV网络能力通过。新暂停重定位还需设备验证，完整W01/F06/F20保持开放。


## 0.0.40 暂停重定位候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `22ab74dfdbc631527424921dc4be66ff3af4ea1752826e2e4706ae41b1ba94d0`，signed SHA-256 `b33119dabfd6acc93492881354488cc3b0dcae96648fcf6ef24d30bc6d062e14`，native unsigned `b47ab91002a33f73ec9c6e76f3351f1bcf3ac4226e547f493243ce7cc2a011be`，源码ZIP `cb15de9c050fdde26bb481a75dfde17ac157300a123bead7dee43b2e980988e3`，sourceRevision基于HEAD `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty内容以源码hash为准）。230不同本地检查PASS（145单元合同/83整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。C与native JS/WASM/data/manifest已对0.0.39签名ZIP逐字节核对相同，本轮没有SDK重编译或HOST网络重跑。

state/capability首次exit0，首次install/run均exit0且明确平台成功，无需重连或更改签名资源/权限/固件。UTC03:52:09报告精确匹配source/signed，cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；设备仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup另存私密device-native040-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

只有启动/清理分项通过；暂停目标重准备保持READY、显式继续才play尚待本机验收。已请求同视频起播后手机暂停→遥控跳5秒→继续声画，再开诊断，先不重复交还控制/长时间或三次seek。0.0.39原生暂停seek拒绝与恢复声画失败保留，完整W01/F06/F20/v1.0.0开放；skill最终更新仍待W01关闭。保留现有HEAD/remote及所有工作，本轮未commit/push/发布/执行账号写入。默认manual文档构建与本已装auto6另配对，不重复部署。


## 0.0.40预缓冲成功仍IDLE被错误关闭，0.0.41候选（2026-10-15）

用户确认正常声画约15秒及手机暂停通过，遥控跳5秒失败后返回主界面，组合USER FAIL。UTC03:54:50实际报告匹配source 22ab74dfdbc631527424921dc4be66ff3af4ea1752826e2e4706ae41b1ba94d0 / signed b33119dabfd6acc93492881354488cc3b0dcae96648fcf6ef24d30bc6d062e14：FAIL avplay.seek_restart_ready_state_i、history_f、receiver_v2_1a0c0015，flow_s_c1_p0_w6_m8_l6、source_pass/请求02/native_closed_confirmed，GET后关闭true。该标签只在prepareAsync成功回调中检查状态时产生，故本次不是30秒超时，也不能称PREBUFFER_MODE未被接受；是应用要求READY而实际IDLE，随后自行失败清理。真实目标位置和恢复声画未到达。报告/用户观察私密分存device-native040-prebuffer-idle-report.json / device-native040-user-observation.json，startup保留。

复核Samsung官方AVPlay API，PREBUFFER_MODE成功回调表示预缓冲完成，区别于普通prepare完成；其示例使用预缓冲后play。普通play状态表并未明确列出预缓冲IDLE，所以以下是根据该语义与本机状态制定的窄范围候选映射，不声称已取得play-from-prebuffer-IDLE本机成功证明。0.0.41仅在本epoch明确设置PREBUFFER_MODE且成功回调实际IDLE时记录prebufferComplete；普通prepare仍须READY，尚无成功回调/旧epoch/close后的IDLE均不能play。暂停重定位可保持该预缓冲IDLE/READY，等显式继续才尝试play，随后仍要求SDK PLAYING。不偷偷play/pause、不伪造目标tick；held IDLE不调用getDuration，复用先前缓存时长。再次暂停seek可重准备，Back/Home/失败/超时清掉标记并隔离晚回调。

来源：https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html （2026-10-15复核）。不增30秒等待/网络预算，不重新批准/换源/续租，不启用默认playing重建；C/WASM和权限不变。新效果待本地和真机结果，0.0.40的READY假设失败完整保留，不能据此关闭W01/F06/F20。

0.0.41 strict/50模块PASS，147单元/合同PASS（3.75秒）、83整组UI PASS（1.3分钟）。新增复现实际PREBUFFER成功后SDK IDLE的夹具，覆盖保持暂停、不隐式play、再次重定位、显式继续、held IDLE不读getDuration、关闭/未回调的IDLE不能play；普通prepare成功仍非READY的既有拒绝用例保持通过。首轮新夹具错误复用了内部状态断言导致1项失败，修正夹具状态隔离后全147重跑通过；不把这次HOST夹具修正计为设备修复。Worker联调已切为真实观察到的IDLE成功回调，不再只测试假定READY。

C与native JS/WASM/data/manifest已逐字节对比已装0.0.40一致，无本轮SDK重编译/HOST网络重跑；实际IDLE预缓冲后的显式播放与目标声画仍未验收。三类unsigned/source/CA/媒体/许可门禁通过，native桌面加载检查随后补记。

0.0.41 native桌面2/2 PASS（20.8秒），本轮合计232不同实际检查（147+83+2）。仅本地加载/CSP/停止取证，desktop Socket不冒充TV能力；新预缓冲完成语义待真机结果，完整W01/F06/F20开放。


## 0.0.41 预缓冲完成状态候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `147ff8ea1da4ddab50fa47cea4b98ede8a7b93649c6b4754e8454ee868f0d0f9`，signed SHA-256 `6106e27f7a8c2d9079ef27643df73ed8cb9526713c7c304c4e8a2349fd21f8e8`，native unsigned `3bc1b7091d7aa21fe5e09c780e088e48062fd7d10fba1a129de1f1248b7a1118`，源码ZIP `83009e709a89baa4c3cd886516608fb4c9cd651bb1de1c59af71da6efc9850be`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。232不同本地检查PASS（147单元合同/83整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生四文件与已装0.0.40逐字节相同，没有新C/SDK编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC03:58:30实际报告精确匹配source/signed，cast.ready/native_closed_confirmed、GET后关闭true、marker1；设备环境保持U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup另存私密device-native041-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结，私密原件不公开。

仅启动/清理分项通过；已请求同视频正常起播→手机暂停→遥控5秒重定位不返回→明确继续核对真实声画与时间，再开诊断。暂停期间时间可保留原实际tick，不伪造目标进度。此次修正允许本epoch明确预缓冲成功后保留SDK IDLE完成标记，普通IDLE仍拒绝；尚不宣称真机恢复PASS。0.0.40本轮初始声画/手机暂停USER PASS、重定位返回主界面USER FAIL分别保留，完整W01/F06/F20及skill最终更新门槛仍开放。默认manual文档重建与本已装auto6另配对，不重复部署；无commit/push/发布/账号写入。


## 0.0.41 暂停重定位与继续声画单样本通过（2026-10-16）

用户对“正常起播→手机暂停→电视跳5秒保持暂停不退出→电视继续核对5秒附近进度与声画”明确反馈“验证通过”。本所测样本组合记USER OBSERVATION PASS。UTC04:00:23报告精确匹配source `147ff8ea1da4ddab50fa47cea4b98ede8a7b93649c6b4754e8454ee868f0d0f9` / signed `6106e27f7a8c2d9079ef27643df73ed8cb9526713c7c304c4e8a2349fd21f8e8`。avplay.seek_restart_held_b0_t0、history_r、receiver_v2_1a0c0015，source_pass/请求02/native_closed_confirmed，flow_s_c1_p1_w11_m19_l4，GET后关闭true。报告没有保留FAIL项，不能推广为所有阶段网络无故障或长期稳定。

held_b0_t0表示本次成功预缓冲后保持暂停、该操作窗口未见目标±1500ms tick；在显式继续前不制造tick是预期。receiver包含曾有时间推进，但未单独区分seek前后时间，不把它当作自动证明重定位后已到5秒；实际恢复声画和位置来自此次用户确认。流量停止快照p1表示一次连接处于背压，不是错误；没有资源触顶证据。startup与旧FAIL保留，报告及用户观察私密分存device-native041-paused-seek-pass-report.json / device-native041-paused-seek-user-observation.json。

维持相同0.0.41，不改播放策略、不新增侧载或重跑应用测试。下一项仅验证遥控器接管后交还手机，手机暂停/继续及实际拖动进度；其后官方Stop/断连恢复、多样本、iPhone/iPad、分P/PGC/live等继续开放。该本机样本证实成功预缓冲IDLE可保留并在明确继续后恢复，但不推导所有设备通用，也不宣称已修复所有间歇prepare或native seek。完整W01/F06/F20未关闭，用户要求的skill正式更新仍待W01完成。


## 0.0.41交还控制通过、手机拖动失败及0.0.42候选（2026-10-16）

用户确认交还控制和手机继续/暂停/继续通过，但手机拖动失败后返回主界面，分项USER PASS/PASS/FAIL。UTC04:09:44实际报告匹配source 147ff8ea1da4ddab50fa47cea4b98ede8a7b93649c6b4754e8454ee868f0d0f9 / signed 6106e27f7a8c2d9079ef27643df73ed8cb9526713c7c304c4e8a2349fd21f8e8，FAIL cast.avplay_error；receiver_v2_1a0c015d包含approved/query_live/Play/Pause/seek_accepted/command_failed及快照/曾有tick，证明本轮手机seek已到达，不是仅发现失败。media_resume_2为排队续读，不证明恢复；flow_s_c4_p0_w8_m7_l5、source_pass/native_closed_confirmed、GET后关闭true。SDK具体事件被pulse通用标签遮住；报告还夹有上一轮seek_restart_held/history_r，因为手机seek未记录本轮SDK/history且compact从整个页面历史选择。不得把旧held结果算作本轮手机seek成功或根因。私密device-native041-phone-seek-fail-report.json / device-native041-phone-seek-user-observation.json另存，之前暂停重定位USER PASS保留。

0.0.42只改本次手机seek的执行/诊断：若原逻辑状态playing，先由同PlayerCoordinator暂停，再走已验收的暂停重定位路径，成功且同owner/operation才显式恢复play；原paused保持暂停，不合成目标tick。ACK仍是接受分派，完成独立回传；busy拒绝叠加，Back/Home/换owner晚回调不恢复。手机seek失败关闭本次decoder且不自动重试/恢复，保留原receiver有界租期，允许用户Back；未延租/换源/重新批准。默认遥控playing原native seek策略不改。

手机seek新增started/succeeded/failed到本轮history和固定backend摘要；pulse记录实际允许枚举的SDK摘要，不再覆盖成泛化cast.avplay_error。每次新投屏run在内存标记诊断代次，compact只选当前代次，旧记录仍可在页面历史中保留；run号不进入公开报告schema，不增加8条/4096字节上限，不输出URL/参数/地址。C/WASM、网络预算/权限不变。本轮失败不能归因为HTTP或解码器的具体原因；候选效果待本地与TV验证，完整W01/F06/F20开放。

0.0.42 strict/50模块PASS，最终149单元/合同PASS（3.75秒）、84整组主UI PASS（1.3分钟）。覆盖playing手机seek先pause/重定位/仅同owner恢复，paused不自动play，取消/失败不恢复、busy期间不读SDK，以及当前run排除旧FAIL/history/布局。新增实际打包Worker+AVPlay错误事件夹具，具体seek_restart_event_player_error_connection_failed/history_f与停止decoder、无额外play、Back清理/脱敏均通过；既有controls含同源Stop/Play仍通过。

第一次整组UI为82/83，通过后Stop重开查询因新夹具残留offset5000而误处于预缓冲，修正匿名mock的open重置offset后，加入错误事件用例并最终全84重跑通过。没有将该夹具改动记为TV修复。C和native JS/WASM/data/manifest与已装0.0.41逐字节相同，无SDK/C重编译或HOST网络重跑；本地假后端仍非实际解码/官方发送端验收。三类包/source/CA/媒体/许可/私密文件门禁通过，native桌面结果随后补记。

0.0.42 native桌面2/2 PASS，本轮合计235不同实际检查（149+84+2）。desktop仅加载/CSP/停止，不冒充TV Socket或声画通过。新手机拖动路径仍待本机验收。


## 0.0.42 手机Seek协调候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `7d301b5a3bf9f418958a851204f88704b444908064c9343bd7af63ab2a649df0`，signed SHA-256 `a9d332c22ff0f114f1467abdc555800499d5e380ab71d5487503940abcdc51c0`，native unsigned `f9eaf3efe0444d0f820008ba9a111f1d1cc0849aa667ffebad10f97bb88b1333`，源码ZIP `81d114f22038a63b1104295fd1b64186ac3ebdcb621c58ed9e3955ba574c9b53`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，完整dirty内容以源码hash为准。235不同本地检查PASS（149单元合同/84整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生JS/WASM/data/manifest与已装0.0.41逐字节相同，无新SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:15:37精确匹配source/signed报告cast.ready/native_closed_confirmed，GET后关闭true、marker1；设备环境保持U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。新报告仅当前cast run，故不再携带更早W01-start条目；marker/环境仍在外层。startup私密另存device-native042-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，新手机playing Seek先暂停→重定位→同owner恢复及本轮SDK/history诊断仍待本机结果。已请求同视频正常播放15秒后直接手机拖动一次核对进度与声画，再Back开诊断，不重复交还控制/遥控5秒。0.0.41交还/手机暂停继续USER PASS、手机拖动USER FAIL与上一轮暂停重定位USER PASS分别保留。完整W01/F06/F20及skill最终更新保持开放；无commit/push/公开发布/账号写入。默认manual文档构建与本已装auto6另配对，不重复部署。


## 0.0.42手机Seek恢复声画但目标位置失败，0.0.43取证（2026-10-16）

用户反馈每次拖动只能到0.1秒附近，随后声画正常，分记恢复声画USER PASS、定位USER FAIL。UTC04:18:05匹配source 7d301b5a3bf9f418958a851204f88704b444908064c9343bd7af63ab2a649df0 / signed a9d332c22ff0f114f1467abdc555800499d5e380ab71d5487503940abcdc51c0，held_b0_t0/history_rr、receiver_v2_1a0c00d5含seek接受和完成，source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w9_m13_l5，GET后关闭true。报告无FAIL仅表示尚无目标命中核查，不能据此记完整Seek通过。两次重定位流程完成不等于到达期望位置；没有记录本次请求目标，故尚不能区分手机发出近零目标与SDK忽略offset。原件/用户观察私密分存device-native042-phone-position-report.json / device-native042-phone-position-user-observation.json。

0.0.43不改变媒体/重定位策略，仅在本次手机seek保留内存目标、成功后观察PlayerCoordinator的真实新tick。固定事实：目标>=3秒的seek_target_nonzero，首次真实新tick进入目标±1500ms的seek_target_hit，或已观察至少4秒且真实进度从首个新tick前进>=2秒仍未命中的seek_target_window_missed。旧tick/成功回调/目标值本身不能造命中；暂停/忙状态不采样，取消/Stop/失败清除本次观察。事实仅是有限窗口，不保证永远无法到达；若没后续tick则不产生miss。为避免从零正常播到短目标造成混淆，下一次真机请求选择约60秒目标并等约8秒取证。原请求数值只在内存比较，不输出原始媒体地址/参数/精确位置。

RECEIVER_FACTS 29→32，v2仍8位uint32 hex（已用满32位，后续不能继续移位追加），3条固定进度使IPC166→169；报告仍8条/4096字节，沿用按run隔离。所有事实从协调器事件取，不调用忙SDK；无C/WASM/权限/网络预算变化。旧0.0.41暂停重定位的用户通过观察保留，但不能推广为所有目标/路线正确。W01/F06/F20及skill最终更新继续开放。


0.0.43取证范围补充（2026-10-16）：用户明确手机始终显示0:00–0:00，无法知道拖动目标。因此撤销“下一轮选约60秒”作为当前前置动作，先检查时间/总时长回传，不能提前归因SDK忽略offset。Worker对活跃接收器实际回答的GetPositionInfo/GetMediaInfo等查询补记既有固定SOAP查询类型；新追加receiver_position_nonzero/receiver_duration_nonzero两个事实，仅检查本机生成回复中时间字段是否非零，不输出正文、URI、精确时间或原请求。UI显示缓存的真实总时长，并首次记avplay.receiver_duration_known；不额外调用busy SDK。报告在无seek历史时优先保留查询摘要/时长事实，用以区分TV尚未知时长与手机是否收到非零查询回复；仍不证明手机UI已采用或事件订阅已支持。SOAP事实保持<=64位，IPC最终为171而非之前候选169；RECEIVER_FACTS仍32位，不再追加。原目标命中观察继续保留，当前先不要求盲拖。

0.0.43最终151单元/合同PASS（3.75秒），strict/50模块边界PASS。85个不同主UI用例通过：最终整组84/85通过，唯一失败是新增最高位摘要断言误读textarea.textContent，改为toHaveValue后该用例定向重跑PASS（5.9秒），应用运行时未改变，不重复计数。更早的目标观察候选曾全85通过，后新增时长/查询取证后采用上述最终结果。新增请求60秒而真实从0.1秒递增的夹具，4秒有限窗口miss、v2最高第32位摘要及导出实际值均通过；命中与错误/取消路径由151单元与现有UI覆盖，不把假后端作为TV定位结果。

查询分类只使用已验证请求类型和本机生成回复中的固定时间标签，不上传正文/URI或精确位置；新SOAP两个非零事实/32位receiver/171进度预算与8条诊断保持边界。C及native JS/WASM/data/manifest与已装0.0.42逐字节相同，无新SDK/C编译或HOST网络重跑声明。三类包/source/CA/媒体/许可门禁通过，native桌面结果随后补记。

0.0.43 native桌面2/2 PASS；本轮共238不同实际检查（151+85+2）。desktop仅加载/CSP/停止，不冒充TV网络或手机时间/定位验收。下一真机动作只核对手机当前/总时长和查询，不盲拖。


## 0.0.43 时间/定位取证包实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `6d76b6ea5cabc94b1000b8a1674410bf5ea1673f801e22b4d9c79b1d6294b644`，signed SHA-256 `25a4a3d93f7db4789d6045cccefe7dc56a7cb37f40fcf536c6e4a8fa33ea37fa`，native unsigned `289bee66ac5c55c3bb93cd358f55df262e8bd1ec99e21cf5e2e49b13b32f274c`，源码ZIP `2b1cde5614c749139cd3f7c866d2f5c98bc7eb2be334cb6b5c2a64dafc85b141`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。238不同本地检查通过（151单元合同/85主UI用例/2 native桌面；最终UI为84整组加修正textarea断言后的1定向重跑），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生JS/WASM/data/manifest与已装0.0.42逐字节相同，无新SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:26:17精确匹配source/signed报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；设备环境仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup私密另存device-native043-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过。这包不改播放策略，只补真实目标观察、32位receiver事实、活跃查询类型/非零时间回复与TV已知时长，IPC最终171/报告8条。已请求同视频正常起播后等20秒，反馈手机当前/总时长是否仍0:00–0:00，Back开诊断，不再要求盲选60秒或拖动。0.0.42恢复声画USER PASS与目标位置USER FAIL、手机全零时间反馈均保留；不能先把根因认定为SDK忽略offset。完整W01/F06/F20及skill最终更新保持开放。默认manual文档构建与已装auto6另配对，不再次侧载；无commit/push/发布/账号写入。


## 0.0.43电视时间已知、非零查询回复已排队，手机仍全零；0.0.44服务描述修正（2026-10-16）

用户确认电视播放至少30秒，手机依旧0:00–0:00，手机时间显示USER FAIL。UTC04:29:23匹配source 6d76b6ea5cabc94b1000b8a1674410bf5ea1673f801e22b4d9c79b1d6294b644 / signed 25a4a3d93f7db4789d6045cccefe7dc56a7cb37f40fcf536c6e4a8fa33ea37fa，avplay.receiver_duration_known、receiver_v2_1a0c8205（批准/query/快照/实际tick/locked拒绝），SOAP_v1_8000400c32002010含position_query、receiver_position_nonzero、receiver_duration_nonzero，flow_s_c1_p0_w7_m14_l5、source_pass/请求02/native_closed_confirmed、GET后关闭true。固定事实是在cast_rpc_reply成功排队后产生，不证明每字节已到手机或手机已解析。仅能排除“TV始终未知时长/所有已排队查询回复全零”，不能断言手机SDK/UI根因。无新seek测试，上一轮定位FAIL保留。原件/用户观察私密分存device-native043-phone-zero-time-report.json / device-native043-phone-zero-time-user-observation.json。

源码发现AVTransport.xml仍为发现阶段空actionList/serviceStateTable，已实现的SOAP动作未声明。0.0.44在RPC启用时返回原创固定9898字节SCPD：11个现有动作、29个关联变量，InstanceID/方向/关联类型、GetPositionInfo完整8个输出及REL_TIME/1倍速范围；不声明未实现的Next/Record/事件功能，不接入任何新控制动作。RPC未启用仍保留旧发现描述；所有控制继续经TV批准/owner/lease。原生response固定容量8192→16384仅为容纳固定描述，两客户端共多16KiB静态缓冲；入站8192、body4096、RPC回复6144、连接/时间/网络目的地边界不变，无动态无界分配。

单一progressive媒体无跨轨绝对偏移，GetPositionInfo的AbsTime改为同一真实快照timeMs，不再返回NOT_IMPLEMENTED；RelTime/TrackDuration与原实际缓存不变，不制造时间。对完整多轨/playlist需另行建模，不能由该候选推导。SCPD与时间字段修正是合同缺口补齐，效果仍需本机验证，不把手机全零根因直接归给它。

官方依据：UPnP AVTransport:1 v1.01第2.2.23/2.4.5/第3节（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf，2026-10-16复核）。协议字段/类型按标准实现，未复制规范XML正文。位置由control point轮询，不应把它未经判断归为必须GENA推送；GENA仍未接通，不宣称完整UPnP兼容认证。C变更需真实SDK重编译与HOST描述解析/大小/HEAD验证，完整W01/F06/F20和skill最终更新门槛开放。

0.0.44 strict/50模块与C严格语法PASS，151单元/合同PASS（3.76秒）、85整组主UI PASS（1.4分钟），15 HOST cast PASS（22.39秒）。HOST新增实际HTTP获取活跃AVTransport.xml并解析完整11动作/29变量、全部参数关联、位置输出字段、固定9898字节与Content-Length/HEAD、未声明evented变量；其余入站/RPC/owner/停止/组播选项用例重跑通过。单元增加单轨AbsTime等于真实相对时间的核查。

新C已用Samsung Emscripten1.39.4.7真实重编译、固定32MiB堆。仅两连接响应静态缓冲合计增16KiB以容纳固定XML；入站/控制正文/媒体资源与TLS/权限边界未放宽。三类unsigned/source/CA/媒体/许可门禁通过，HOST匿名与桌面假后端不冒充手机解析或TV显示通过；native桌面结果随后补记。

0.0.44 native桌面2/2 PASS，本轮合计253不同实际检查（151+85+15+2）。desktop仅加载/CSP/停止；新服务描述与AbsTime的手机显示效果未验收，完整W01/F06/F20继续开放。


## 0.0.44 服务描述/单轨时间候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `1313ad83faedc03aa02b12c479f8e0bef6fc5bfd9acb0e72b8223261c490c1df`，signed SHA-256 `e242945b167f91ac75648fd2931689b0e754a92e5481631e18882a36e44eae86`，native unsigned `763666f8dd664f0d054b5a2ce4d57116e603ebc81de7ee58ce5393699bb5dd40`，源码ZIP `5ada9f3bb6992d2d8c144d6a843ad94ede9cb782b876c778dc96f3cd19954fd0`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。253不同本地检查PASS（151单元合同/85整组UI/15 HOST cast/2 native桌面），strict/50模块/C语法、实际Samsung SDK重编译与三类包/source/CA/媒体/许可门禁通过。固定32MiB堆，response静态容量调整有HOST XML/HEAD/长度证据，不把HOST当TV手机解析证明。

首次预检state exit0但capability exit1，未尝试安装；失败原日志另存native044-initial-state/capability.log和device-native044-attempt1-preflight.json。只disconnect/reconnect同一授权目标均exit0，第二次state/capability通过，首次实际install/run exit0且平台明确成功；deployment记录attempt2/installationAttempt1。没有改权限/证书/固件或扫描其他目标。UTC04:34:40报告精确匹配source/signed，cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密另存device-native044-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，新的SCPD动作/参数关联及AbsTime实际手机效果待验收。已请求同视频起播后观察20秒手机当前/总时长；仅时间正常时再拖到明显非零位置核对，仍全零则不盲拖，最后Back开诊断。0.0.43手机时间全零USER FAIL、TV已知时长和非零回复排队事实保留，不把“排队”冒充手机收到/解析。完整W01/F06/F20、GENA与三端/其他内容及skill最终更新仍开放。默认manual文档构建与已装auto6另配对，不再次部署；无commit/push/公开发布/账号写入。


## 0.0.44手机仍全零，0.0.45最小元数据候选（2026-10-16）

用户反馈仍0:00–0:00，手机时间显示USER FAIL；没有新拖动验收。UTC04:36:43报告匹配source 1313ad83faedc03aa02b12c479f8e0bef6fc5bfd9acb0e72b8223261c490c1df / signed e242945b167f91ac75648fd2931689b0e754a92e5481631e18882a36e44eae86。receiver_v2_1a0c0005、SOAP_v1_8000400c32002010仍包含位置查询及非零位置/时长回复排队；TV已知时长、实际tick、source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w7_m13_l5、GET后关闭true。服务描述和AbsTime改动未取得手机显示修复，不能记为通过。新原件独存device-native044-phone-zero-time-repeat-report.json，不覆盖startup/其他旧记录。

0.0.45候选补GetPositionInfo.TrackMetaData/GetMediaInfo.CurrentURIMetaData：仅用当前已批准原URI、固定通用标题/视频类型及真实缓存duration构造单item DIDL-Lite，不解析/透传发送端opaque metadata，不猜内容标题、不添加其他资源或外部请求。duration未知时省略res.duration属性；已知时与TrackDuration/MediaDuration同源。先转义URI进DIDL，再转义完整DIDL进SOAP，避免&/引号等穿越XML层。只在owner/新鲜度/租期检查后回答私密资源。

完整UTF8 SOAP仍<=6144字节：超限时省略生成元数据并用NOT_IMPLEMENTED，若连基础回复也超限则返回501，不扩大native RPC/入站预算。Worker只记固定receiver_metadata_generated/omitted事实，摘要SOAP62→64位（已满，后续须升级格式而非继续移位），receiver仍32位、IPC171→173，报告8条/4096字节。事实是成功排队，不证明手机解析。播放策略、C/WASM/权限/网络边界不改，不能先归因空元数据为唯一根因。

依据UPnP AVTransport:1第2.2.16/2.2.19及ContentDirectory:1的DIDL-Lite/资源duration定义（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf；https://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf，2026-10-16复核）。原创序列化，未复制标准XML/schema或新增依赖/客户端身份；不宣称UPnP认证或GENA已实现。完整W01/F06/F20与skill最终更新继续开放。

0.0.45 strict/50模块PASS，153单元/合同PASS（3.73秒）、85整组主UI PASS（1.4分钟）。新增/增强owner拒绝、DIDL双层转义、真实时长与未知时长省略、完整UTF8预算溢出/501界限；实际打包Worker的SOAP回复用浏览器DOMParser分两层解析，res.duration=00:04:00、URI还原&sign与无parsererror均通过。原始输入metadata仍不解析/回显。SOAP事实新增后64位已满，原“第63位未知”的旧断言按新合法字段更新，并保留超64位/非法形状拒绝及全表往返验证；首轮该预期失败，修正后全153重跑通过。

三类unsigned/source/CA/媒体/许可门禁通过，native JS/WASM/data/manifest与已装0.0.44逐字节相同。本轮无SDK/C重编译或HOST网络重跑，不把旧15 HOST数加进本轮。新元数据事实仅是排队，不能替代官方手机解析/显示的本机验收。native桌面结果随后补记。

0.0.45 native桌面2/2 PASS，本轮240不同实际检查（153+85+2）。desktop仅加载/CSP/停止，不冒充TV手机显示通过。完整W01/F06/F20保持开放。


## 0.0.45 有界DIDL元数据候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `cd21b46815b7d5e431588fead1f86d2d72fa1760c29a417febe0ddd3bbbe488b`，signed SHA-256 `6c455dfc60dbd5324421cc1ed2c517863ad9fdb56b962389f1d378798f2e7a46`，native unsigned `18fbc03d38189456830ce2eda07c1e6644196608a4ebec674175d57d92cd51f0`，源码ZIP `d90f54c3191301e0d8b4a8e1d77d4f16c60865b10e1ac7f4095559f576e8559a`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。240不同本地检查PASS（153单元合同/85整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生四文件与已装0.0.44签名ZIP逐字节相同，无本轮SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:41:50精确匹配source/signed报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密另存device-native045-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，最小DIDL元数据的手机显示效果未验收。已请求同视频正常起播后仅观察手机当前/总时长20秒，不拖动，Back开诊断。元数据只使用已批准资源、固定通用标题与真实时长，未知duration省略，SOAP整包6144字节门禁/安全回退与两个固定排队事实保持，IPC173/8条报告。0.0.44手机仍全零USER FAIL与非零查询排队事实保留；不能先判定空metadata为唯一根因。完整W01/F06/F20、GENA/三端及skill最终更新门槛开放。默认manual文档构建与本已装auto6另配对，不再次侧载；无commit/push/发布/账号写入。


## 0.0.45手机时间仍全零；0.0.46发送层取证候选（2026-10-16）

W01/F06/F20。用户反馈“仍全零＋诊断已开启”，时间显示USER FAIL，不记新的拖动通过。UTC04:45:16报告精确匹配source cd21b46815b7d5e431588fead1f86d2d72fa1760c29a417febe0ddd3bbbe488b / signed 6c455dfc60dbd5324421cc1ed2c517863ad9fdb56b962389f1d378798f2e7a46。receiver_v2_5a0c00f5、held_b0_t0/history_r、flow_s_c0_p0_w7_m12_l5、source_pass/requests02/native_closed_confirmed，GET关闭true、marker1。报告含本轮重定位历史，现有8条优先级因此未保留SOAP摘要/已知时长；不能据此推定生成元数据已发出或被手机解析。独立原件私密保存device-native045-phone-zero-time-report.json，startup与历次失败保留。

0.0.46候选不改变SOAP正文/播放策略，补原生发送层固定position_wire_v1两位hex位集：bit0完整响应已交本机socket，bit1该完整响应有非零RelTime，bit2非零TrackDuration，bit3生成DIDL，bit4某个已排队进度响应未完整写出即丢弃（包括显式关闭，不单独判网络故障）。只有成功的GetPositionInfo回复被标记；排队不产生完成位，完整响应头及正文写完后才合并内容位，失败/超时/关闭未完成不产生成功位。各位按一次会话累积，不保证来自同一个响应，不能当成对端接收/解析/显示证明。日志不含正文、目标时间、地址或原请求。

位集独立于已满64位SOAP/32位receiver摘要，最多5次新增位更新，IPC173→178，8条/4096字节报告保持。history分支在错误/SDK/网络失败及清理之后优先保留最新发送位集和SOAP摘要；无history同样优先保留。无新增权限、目的地、HTTP回调、GENA、协议动作、媒体自动重试或签名身份变化。本地/设备结果待真实执行后补，手机全零根因仍未确定，完整W01/F20与完成后skill更新继续开放。


0.0.46本地验证：154单元/合同、85完整UI（新增socket事实转发断言另定向1项通过）、17 HOST原生投屏网络、2 native桌面，共258个不同用例PASS。HOST新增完整响应写出后0f和排队后丢弃10两条检查，真实Content-Length/正文核对；原生C strict及Samsung Emscripten实际编译通过。native桌面仅WASM加载/CSP/stop，不证明TV socket；手机显示仍待新设备样本。首次本地运行暴露进度上限旧断言及新增Python用例放在main之后的缩进错误，均修正后重跑完整相关组通过。三类包/source/CA/媒体/许可门禁通过，原44路径均保留；未发布/账号写入。


## 0.0.46发送层取证包实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `6334f6c04cef546204526b1a0caa18da53e63cc3614e9b5ebe20d933c62a579f`，signed SHA-256 `bc9e5a3e182e9ef03fdc88bea5330a924038021d285b8b21c5cfe474f76664b1`，native unsigned `716c334bc84e637e32d1f6c7b9e2350aa28055e5798f451b6f2c164ee860792e`，源码ZIP `e16a7b669773b5104ee68c101fb63f0a4be5b94424fbc85cbd04e9f0a7d0ac3c`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty完整源码以snapshot为准）。258不同本地检查通过：154单元/合同、85 UI（新增Worker转发断言定向重跑1项通过，不重复计数）、17 HOST原生投屏、2 native桌面；严格类型/50模块边界、C严格编译、实际Samsung SDK编译、三类包/source/CA/媒体/许可证门禁通过。桌面/HOST不等于TV或官方发送端验收。

首次state/capability/install/run均exit0且平台明确成功，没有重连/改证书/权限/固件。UTC04:50:17报告精确匹配source/signed，cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密独存device-native046-startup-report.json，精确源/manifest/DELIVERY/native unsigned按完整source冻结。仅启动/清理分项通过，完整socket写入新位集尚无实际手机样本；“写入完成”仍不证明手机解析。

已请求同视频播放后仅观察20秒手机时间，不暂停/拖动，Back开诊断；0.0.45手机全零失败保留。不改变媒体策略或扩大网络/权限，完整W01/F06/F20、GENA/三端及W01完成后skill最终更新仍开放。默认manual文档构建与已装auto6另配对，无重复侧载/commit/push/发布/账号写入。


## 0.0.46时间全零结果与官方发送端调查（2026-10-16）

用户确认仍0:00–0:00，时间显示USER FAIL，无新的seek验收。UTC04:52:19精确匹配source 6334f6c04cef546204526b1a0caa18da53e63cc3614e9b5ebe20d933c62a579f / signed bc9e5a3e182e9ef03fdc88bea5330a924038021d285b8b21c5cfe474f76664b1；position_wire_v1_1f、SOAP_v1_8000400c72002010、duration_known、receiver_v2_1a0c0005，无本轮seek历史。完整socket写入、非零时间/时长及生成元数据已取得；也存在未完整写出即丢弃，可能为Back清理，不能单判网络故障。发送完成不等于对端接收/解析。source_pass、requests02、flow_s_c1_p1_w8_m15_l5、native_closed_confirmed，GET关闭true、marker1；原件独立保存device-native046-phone-zero-time-report.json。

保持0.0.46，未继续试装新包。官方公开下载包实为9.15.0（非用户9.12.0），只读检查标准SOAP路径发现一个具体候选：通常进度发布存在接收端时长与当前视频时长±5秒一致性窗口，以及TrackURI来源匹配。已请求手机本地/电视显示总时长来核对，不能先认定为根因；不伪造时长或升级发送端。详见[官方发送端调查](../../research/2026-10-16-official-cast-zero-time.md)。APK/反编译内容和研究依赖未进入产品/源码包，未安装手机App、登录或账号写入。完整W01/F20、条件skill更新仍开放。


## 0.0.46双方134秒样本：排除时长差异，核查源设置握手（2026-10-16）

用户确认手机/TV均134秒，约52秒回主界面；退出原因未由报告确证，不记SDK失败或人工Back通过。UTC12:43:49匹配报告wire1f、SOAP_v1_8000400c78002010、receiver_v2_1a0c0005，source_pass/knownDuration/requests02/flow_s_c0_p0_w2_m4_l5/native_closed_confirmed，GET关闭true、marker1；原件独存device-native046-duration134-report.json。时长差异候选本样本不成立。新发现：首次SetAVTransportURI仍返回500，TV批准自行起播后虽回答非零位置，但报告没有uri_accepted。官方9.15.0成功回调才登记当前视频、位置消费需该登记；本地合成序列复现首次500、TV起播位置200、精确源再投200、刷新query再投500/source_changed。尚非用户9.12.0根因验收，已请求同包起播后手机再选同一接收器一次来对照；优先于强行停止缓存对照。保持0.0.46，无新部署/权限/账号写入。详见research/2026-10-16-official-cast-zero-time.md最新段。


## 0.0.46强行停止与重投结果；0.0.47握手候选（2026-10-16）

用户强行停止Android后另选3:43视频，TV222.1秒、约53秒停播，手机仍00:00–00:00；重选同接收器后仍全零且无声画，均不记通过。UTC13:15:42最后重投报告匹配0.0.46 source6334f6c04cef546204526b1a0caa18da53e63cc3614e9b5ebe20d933c62a579f / signedbc9e5a3e182e9ef03fdc88bea5330a924038021d285b8b21c5cfe474f76664b1。receiver_v2_1a0ca225含Stop接受、source_changed/locked拒绝、无uri_accepted；wire0f、SOAP_v1_8000400c78002010、knownDuration、source_pass、requests02、flow_s_c0_p0_w2_m3_l3/native_closed_confirmed、GET关闭true、marker1。报告是最后重投的记录，不能把所有条目反推到之前强行停止那次。约53秒停止无明确SDK失败证据，Stop事实也不能单独确定该停止时点原因。原件/用户观察独立私密保存device-native046-force-stop-reoffer-report.json/-user-observation.json。

时长差异与仅靠强行停止清缓存不足以解释现象；重复投送确实被精确源变化门禁拒绝。0.0.47新增独立“允许一次官方投屏并播放”入口，电视先授权，首个合规源设置得到200，HTTPS检查通过后才自动起播一次；准备期不伪报PLAYING。旧后确认入口保留，不放开刷新URI/其他对端；失败/Back撤销授权、不自动重试。详见ADR-010。尚不宣称手机全零根因已验收，W01/F20与完成后skill更新仍开放。


0.0.47本地验证：155单元/合同、89完整UI、2 native桌面，共246不同检查PASS。4个新握手Worker/UI用例包含首源200、准备Play/TRANSITIONING、检查后自动单次起播、源验证失败不播放且不重新授权、Back后晚回调不播放、其他对端/刷新URI拒绝。定向4项先通过，完善拒绝/失败断言后完整89项通过，不重复计数。strict/50模块边界和三类包/source/CA/媒体/许可门禁通过。native桌面仅加载/CSP/停止；原生JS/WASM/data/manifest与已装0.0.46逐字节相同，无本轮C/SDK重编译或HOST网络重跑。新入口手机时间/超过53秒连续播放待真实验收，不把夹具当官方客户端证明。


## 0.0.47首次源握手候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `0e03ab29753ce3493aa8c8e36d94ce7bf4894ff3b85007cc12d190e9935ff7af`，signed SHA-256 `4e23e944891b6375d08646906b39048bf5ee5c3a843c5f4fc61c3a42c86cc949`，native unsigned `d4e9cf3009ef99da6c7677884b10d515b475e3da202fac5ccdc04cb00583aaaf`，源码ZIP `0905f28799e9d4630a01b11beb7f659e7251cbc7128049f78ec1518be1fcd7e7`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty完整源码以snapshot为准）。246不同本地检查PASS：155单元/合同、89整组UI、2 native桌面；strict/50模块及三类包/source/CA/媒体/许可证门禁通过。原生JS/WASM/data/manifest与0.0.46签名包逐字节相同，无本轮C/SDK编译或HOST重跑。

首次state0/capability1，未尝试安装，原0.0.46保留；私密保存attempt1预检与原日志。同一授权目标disconnect/connect均exit0，第二次state/capability0，首次实际install/run exit0且平台明确成功，deployment标记attempt2/installationAttempt1。未改证书、权限、固件或扫描其他设备。UTC13:24:00报告精确匹配source/signed，cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0、engine major未知。startup独存device-native047-startup-report.json，源/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过。已请求电视新入口“允许一次官方投屏并播放”，Android投一次后自动起播，不再电视二次确认或手机重选；起播约20秒核对手机时间，若恢复则继续至70秒核对是否停播，Back开诊断。本轮不暂停/seek。新源设置首次200与真实手机进度采用的因果验收仍待结果，不提前宣布全零修复；完整W01/F20与完成后skill更新仍开放。默认manual文档构建与已装auto6另配对，无重复部署/commit/push/发布/账号写入。


## 0.0.47时间恢复与62秒停止；0.0.48轮询预算（2026-10-16）

用户确认新电视预授权入口正常起播、手机/TV时间均正常：时间与停止前声画USER PASS；约62秒自动停止返回，70秒连续播放USER FAIL。UTC13:26:29报告匹配source0e03ab29753ce3493aa8c8e36d94ce7bf4894ff3b85007cc12d190e9935ff7af / signed4e23e944891b6375d08646906b39048bf5ee5c3a843c5f4fc61c3a42c86cc949。receiver_v2_7a0c00cf含uri_accepted/Play及Seek接受/完成/非零目标命中，无Stop接受；held_b1_t0/history_r、wire0f、SOAP_v1_0000000c78002010、media_stopped、flow_s_c0_p0_w5_m9_l4/native_closed_confirmed，GET关闭true、marker1。用户未手动拖动，不能将报告中的发送端恢复定位视作人工控制全验收。原件与用户观察独存device-native047-time-pass-stop62-report.json/-user-observation.json。手机全零恢复支持首次设置源握手缺口这一因果解释，不能扩展为完整F20通过。

定位到发现阶段遗留的累计128 HTTP连接上限：每次普通状态/进度轮询都新建连接，累计上限会调用cast_stop并连带关闭媒体桥；每秒约两次查询约一分钟即可达到。旧报告没有显式关闭原因，尚不能单靠本轮8条报告证明恰好第128次触发。HOST真实127次请求后达到旧128边界会停止，无播放器或手机Stop；新实现真实140余次请求及高于128的RPC继续成功，另注入1024边界验证仍关闭并发固定原因。此为已复现源码根因候选，具体TV修复效果待0.0.48。

0.0.48将有限监听累计预算128→1024（两并发客户端、5秒单连接、5分钟发现、最多3分钟媒体、TLS/URI与字节/窗口预算均不变）；接入前再次检查上限避免同tick越界。RPC ID的native/Worker正则/contracts上限同步1024，播放器命令仍最多24次，不把只读轮询当播放控制配额。新固定listener_limit_connections/lease在关闭前输出并在8条报告优先保留，IPC178→180；不输出地址、请求、URI或精确计数。原64位SOAP/32位receiver格式不变，不取消资源边界或延长媒体租期。


0.0.48验证：156单元/合同、89完整UI、20 HOST原生投屏、2 native桌面，共267不同检查PASS。含真实140余连接后的高ID RPC、旧128预算关闭对照、新1024边界关闭和固定原因、实际Worker处理129号RPC、原因报告留存、1025拒绝；原生C严格检查及实际Samsung SDK编译通过。首轮单元测试因旧129拒绝断言过时而失败，调整为1025并补新边界后完整156项通过。三类包/source/CA/媒体/许可门禁通过；native桌面仅加载/CSP/停止，不作TV持续播放证明。


## 0.0.48轮询预算修正实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `68d2b447f851c59d9f422e771e4265203af559e866a84e7df48f643441d2f71e`，signed SHA-256 `df8b531e6861abb81485dde1f94286f7c8d98166106275acc6bc282d055422a6`，native unsigned `16a2f4aa60d0f34ae1779ff2eb679e748ad281e20465e8a2a34480400c8c83bd`，源码ZIP `47625a76d3b6e2d06fe777a94af1aa26f8cac7f832b0b463cd82d18779cd0304`，HEAD `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty内容以snapshot为准）。267不同本地检查PASS（156单元/合同、89整组UI、20 HOST原生投屏、2 native桌面）；strict/50模块、原生C严格检查/真实Samsung SDK重编译、三类包/source/CA/媒体/许可证门禁通过。HOST预算对照不是旧TV工件运行；本轮TV具体持续播放效果仍待用户结果。

首次state/capability/install/run均exit0且平台明确成功，无重连或改证书/权限/固件。UTC13:31:45精确匹配source/signed报告cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup独存device-native048-startup-report.json，精确源/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，已请求同一新入口投送3分钟以上普通视频，连续实际观看90秒、核对手机时间/声画与自动停止，Back开诊断，不要求暂停/seek/手机重选。原0.0.47手机时间与停止前声画USER PASS、62秒自动退出USER FAIL保留；新1024预算/同步RPC上限/固定关闭原因的实机效果未提前记通过。完整W01/F20及完成后skill更新仍开放。默认manual文档构建与已装auto6另配对；无重复部署/commit/push/发布/账号写入。


## 0.0.48超过90秒通过，2:57触及媒体租期；0.0.49五分钟候选（2026-10-16）

W01/F06/F20。用户无操作投送全长3:42的视频，约2:57自动停止返回，播放期间手机与“电脑端”进度正常（沿用用户原话，不擅自改记电视显示）。连续90秒声画/手机时间USER PASS；完整3:42未播完。UTC13:37:27精确匹配0.0.48 source `68d2b447f851c59d9f422e771e4265203af559e866a84e7df48f643441d2f71e` / signed `df8b531e6861abb81485dde1f94286f7c8d98166106275acc6bc282d055422a6`：`cast.media_limit_lease`、receiver_v2_7a9c42cf、wire0f、SOAP_v1_0000000c78002010、flow_s_c0_p0_w5_m9_l0、held_b0_t0/history_r/native_closed_confirmed，GET关闭true、marker1。原件/观察私密独存device-native048-time-pass-stop177-lease-report.json / -user-observation.json。明确为现有三分钟媒体时限触发，不误记新的CDN/播放器故障；准备/恢复定位也消耗租期，媒体时间177秒不要求等于墙钟180秒。未见listener_limit_connections；跨过62秒旧故障并通过90秒支持预算修正，但单样本不等于任意轮询压力通过。

0.0.49仅将progressive投屏媒体硬租期和对应SOAP接收器许可180秒→300秒，均保留signed deadline提前5秒截断；准备和暂停计入时限，不续期、不自动换URL。TV说明同步五分钟（含准备/暂停），发现未投送仍5分钟，实际候选起播可按既有逻辑将监听截止延至桥截止+1秒。1024累计连接/RPC、两协议客户端/四媒体客户端、24播放器命令、128MiB/256窗口/512媒体连接、TLS/CA/精确源/owner/权限均不变。约2Hz轮询五分钟约600连接，留有1024预算余量；不是发送端频率承诺，更快/恶意访问仍可能提前耗尽。flow的l仍0..6，6表示剩余大于150秒的饱和桶，不改旧诊断格式或冒充精确时长。

新增HOST虚拟单调时钟验证跨过原180秒仍存活、300秒后关桥/清URL/句柄以及较短signed deadline截断；接收器单测验证跨180秒真实快照/查询/命令、300秒到期和短签名截止，重复offer/暂停不续租。HOST不等于电视长播或真实CDN验证。待真实编译/测试/签名安装后补结果，下一轮优先同一3:42视频自然结束，再验证官方手机Stop清理；完整W01/F20/三端和完成后skill更新仍开放。无commit/push/发布/账号写入。


0.0.49执行记录补充：首次整组UI误对auto6启动取证包运行，自动cast/报告与手动夹具相互竞争；4失败、1中断、31通过、53未运行，退出130，原始日志保留/tmp/bilisofa049-ui-auto6-mismatched-harness.log。该轮不计通过。已停止本次Playwright进程，改用默认manual完整构建再测；不为此削弱断言或修改产品启动流程。最终结果另补。


0.0.49默认manual整组UI最终89/89 PASS（1.4分钟），首轮auto6夹具冲突未计入成功。单元/合同157 PASS，HOST投屏20 PASS、HOST source16 PASS（其中新增虚拟时钟两项）、HOST媒体桥37 PASS；strict/50模块与原生C严格检查通过；真实Samsung Emscripten1.39.4.7、32MiB固定堆编译完成。native桌面两项及实际部署尚待执行，不计为已验收。


0.0.49 native桌面2/2 PASS（20.9秒），仅证明本地JS/WASM/data/strict CSP载入、取消和新Worker；桌面不伪装Samsung socket。合计321不同本地检查通过（157单元合同＋89 UI＋20 HOST cast＋16 HOST source＋37 HOST bridge＋2 native桌面），重复类型检查不计数量。实际签名/安装与TV长播结果仍需独立记录。


## 0.0.49五分钟短片验收候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `f110b36028a8297657c5f658aaa99d90e09f8941a776805fd39adcf8d2d6ac22`，signed SHA-256 `aab5c6e99fbb8efcf2f2161a390e52e0922663822fa2110eaacc6f77b92bd3d4`，native unsigned `85eb60586bf020181311f571b28ac348fe38eb50a5abb66e5bdc929e844702c2`，源码ZIP `8249e5e3f6b226e78e2a1d0e15b60dc97113657f3ed06f403a1f6c5ddfb4d721`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty源码以完整snapshot为准）。321不同本地检查PASS：157单元/合同、89整组UI、20 HOST投屏、16 HOST源/租期、37 HOST媒体桥、2 native桌面；strict/50模块、C严格检查、真实Samsung SDK重编译、三类包/source/CA/媒体/许可证门禁通过。首轮误对auto6运行手动UI夹具4失败后中断，日志保留且不计通过；恢复manual全组89通过，再构建独立auto6签名安装。

首次state/capability/install/run均exit0且平台明确成功，无重连或改证书/权限/固件。UTC13:44:39精确匹配source/signed报告cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup独存device-native049-startup-report.json，精确源/manifest/DELIVERY/native unsigned按完整source冻结；安装原始日志私密保留native049-*，deployment单列本轮启动/清理PASS。

仅0.0.49启动/清理实证通过，五分钟窗口及自然结束实际效果待用户反馈。已请求新预授权入口，手机投前从头播放同一3:42或3–4分钟普通视频，自动起播后无操作自然播完，核对超过3分钟声画/手机进度与结束页面，Back开诊断。不要求拖动/重连或重复三次回跳。0.0.48连续90秒/手机时间USER PASS、177秒触发原媒体租期的事实保留；不将该有意预算截断归为CDN/SDK故障。完整W01/F20/三端及W01完成后skill更新仍开放；默认manual文档构建与已装auto6另配对，无再次侧载、commit/push/发布/账号写入。


## 0.0.49完整218秒声画/双端进度通过；清理未确认（2026-10-16）

W01/F06/F20。用户确认完整播放218秒，无提前自动停止退出，手机与电视进度同步且正确：本样本完整声画/双方进度USER PASS。用户描述没有自动退出，不把它记成自然结束自动回主页面或再次重播/手机Stop/定位全部通过。UTC13:51:03报告精确匹配0.0.49 source `f110b36028a8297657c5f658aaa99d90e09f8941a776805fd39adcf8d2d6ac22` / signed `aab5c6e99fbb8efcf2f2161a390e52e0922663822fa2110eaacc6f77b92bd3d4`：cleanup_unknown_restart_required（FAIL）、receiver_v2_5a0c00cf、wire1f、SOAP_v1_8000400c7a002010、held_b0_t0/history_r、resume1/source_pass；GET后诊断HTTP关闭true、marker1。HTTP报告关闭不是cast socket清理证明，未见cast.native_closed_confirmed，本轮投屏清理FAIL/具体底层原因尚未确证。原件/用户观察私密独存device-native049-complete218-cleanup-unknown-report.json / device-native049-complete218-user-observation.json，startup独立保留。

源码核查发现独立预算缺口：原父层CastProbeWorker310秒硬超时不足以覆盖允许的5分钟发现等待＋最多5分钟媒体；存在合法native仍存活时被父层terminate并poison的路径。旧报告没有时间戳或首个失败原因，不能证明本轮恰由310秒触发，也不能把它归成播放器/网络断流。0.0.50将父层有限看门狗调整到610秒，native发现/媒体/签名截止、1024连接/RPC、24命令和所有流量/权限边界不变，不允许播放源续期。新增虚拟时钟验证310秒后仍可控制并在610秒硬截止poison；清理ACK依旧5秒，不延长ACK或忽略关闭错误。

清理未知保留固定原因：父层timeout/Worker error/非法消息/ACK timeout，以及Worker可先报告的native清理未确认/runtime abort/异常。只记录固定分类，不输出错误正文/地址；事实closed=false，不能冒充关闭ACK。失败分支也保存关闭期间network事实，8条报告优先保留具体原因与unknown结论，仍阻止未确认owner重用。新增三条IPC原因白名单，进度预算180→183，原SOAP64位/receiver32位格式不变。未改C/SDK/媒体策略；本地和真实部署结果另补。W01/F20/三端与完成后skill更新仍开放，暂缓人工拖动/Stop，先验清理修正与取证。


0.0.50本地先行结果：strict/50模块通过，160单元/合同全部通过，包括虚拟时钟跨原310秒仍有效、610秒timeout、非法回包/Worker error/5秒ACK timeout分类及poison后拒绝复用；清理事实不能冒充closed ACK。实际签名0.0.49中的native JS/WASM/data/manifest与当前build四文件逐字节一致，无本轮C/SDK修改或HOST网络重跑。0.0.49报告后、部署前13:56:31单一授权TV的40325 TCP未能连接，仅是较晚可达性记录，不证明历史关闭时点/UDP清理；40324仅loopback，LAN不可达本就预期，不作为清理证据。整组UI/打包/部署结果另补。


0.0.50最终整组manual UI91/91 PASS（1.5分钟），含新增native失败/runtime abort在关闭期间保留具体原因且poison后拒绝复用两项。合计251不同本地检查PASS（160单元/合同＋91 UI），strict/50模块通过。八个C输入与冻结0.0.49源码逐字节一致，native JS/WASM/data/manifest四文件与实际0.0.49签名包逐字节一致；本轮不重新运行C编译/HOST/CDN/native桌面，也不把0.0.49的321计为本轮。三类包与source/CA/媒体/许可门禁通过；后续构建auto6用于独立启动/清理取证，实际部署结果另补。


## 0.0.50父层时限与清理原因取证实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `50526dbd2218f3c22ea554a9efb7a1d966ffc58535a4dac45d850a0d42041f51`，signed SHA-256 `b0f9ed45aac3dffc4f29facfa3d12f843b072253906460e7e7e1d35fa557ac11`，native unsigned `1f73414b66650b266e26e19e60f48f67e43c4a11dd5e01ad2054fd713739376c`，源码ZIP `6cadc9ea666c9776efa5f9ccbc489b8dd60c0b616fe0c3b632f0b59d3b7493f8`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty内容以完整snapshot为准）。251不同本地检查PASS：160单元/合同、91整组manual UI；strict/50模块和三类包/source/CA/媒体/许可门禁通过。八个C输入及native JS/WASM/data/manifest与冻结已装0.0.49逐字节一致，无本轮C/SDK编译、HOST网络或native桌面重跑；0.0.49的321检查不冒充本轮。

首次state/capability/install/run均exit0且平台明确成功，无重连/证书/权限/固件修改。UTC13:58:53报告精确匹配source/signed，cast.ready/native_closed_confirmed、GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup独立私密保存device-native050-startup-report.json，安装日志native050-*、deployment保留真实结果，精确源/manifest/DELIVERY/native unsigned按完整source冻结。

仅0.0.50启动/清理已实证通过，不能以此注销0.0.49播放后清理unknown或确认其一定由310秒触发。已请求短控制测试：同一预授权自动播放入口，Android约20秒后手机定位约60秒、暂停继续、停止/结束投屏，最后TV Back开诊断；失败即结束开诊断，不重复完整218秒。新具体清理原因/控制/播放后清理待反馈，完整片结束后清理与三端/full W01/F20仍开放。0.0.49完整218秒声画和双端进度USER PASS保留；skill最终更新仍等W01完成。默认manual文档构建与已装auto6另配对，无重复侧载/commit/push/发布/账号写入。


## 0.0.50 Android手机控制及本轮清理通过（2026-10-16）

W01/F06/F20。用户对本次三项明确反馈“实际全部验证通过，功能全部按预期，正常”：手机定位约60秒后电视到对应进度并恢复声画、手机暂停/继续、手机停止/结束投屏后电视停声，均为本样本USER PASS；“功能全部”仅指本次请求步骤，不当作F01–F20或完整F20全部通过。Android版本沿用用户此前报9.12.0-b28383822，本轮未重新读取发送端二进制/OS。保持既有0.0.50 source `50526dbd2218f3c22ea554a9efb7a1d966ffc58535a4dac45d850a0d42041f51` / signed `b0f9ed45aac3dffc4f29facfa3d12f843b072253906460e7e7e1d35fa557ac11`，未装新包。

UTC14:04:57匹配报告receiver_v2_7a0c00ff包含uri_accepted、play/pause/stop/seek接受、seek_complete、非零目标及实际tick目标命中，未含command_failed或目标窗口miss；held_b0_t0/history_rrr仅为本轮三次重定位流程记录，不推定用户手动拖动三次。wire0f、SOAP_v1_0000000c72002010、flow_s_c0_p0_w10_m13_l6、source_pass、cast.native_closed_confirmed；GET后报告HTTP关闭true、marker1。清理为本轮cast原生关闭ACK DEVICE PASS，独立于报告HTTP关闭。未见本轮cleanup_unknown或cleanup_cause错误。原件/观察私密独存device-native050-android-controls-pass-report.json / -user-observation.json，startup与0.0.49失败原件保留。

不将本轮较短手机控制后的清理通过覆盖成0.0.49完整片结束后清理通过，也不能确证旧unknown一定是310秒。0.0.49完整218秒声画/双端进度、0.0.50手机控制/本轮清理分开记。0.0.50维持在电视，下一轮已请求iPhone官方App视频内TV→同接收器，先核对声画/20秒时间，时间正常才暂停继续/约60秒定位/停止，最后Back开诊断；失败即结束，不要求盲拖或更换App。iPad HD暂不重复，仍记录未发现；完整三端、分P/PGC/live、恢复/争用/性能与W01开放。仅更新文档与默认manual交付配对，无运行时代码/新测试/SDK/签名部署/账号写入/commit/push/发布。


## 0.0.50 iPhone官方发送端本轮播放/控制与清理通过（2026-10-16）

W01/F06/F20。用户对所请求iPhone步骤明确回复“实际全部验证通过，功能全部按预期，正常”：视频内TV发现/连接、本次普通视频声画与约20秒后双端时间、暂停/继续、约60秒定位/恢复声画及停止，记本样本USER PASS；不把“全部”扩大到分P/PGC/live、三端恢复或全产品。发送端版本沿用用户此前报6.6.0-91300300，本轮没有重新读取App/OS或手机身份。保持同一已装0.0.50 source `50526dbd2218f3c22ea554a9efb7a1d966ffc58535a4dac45d850a0d42041f51` / signed `b0f9ed45aac3dffc4f29facfa3d12f843b072253906460e7e7e1d35fa557ac11`。

UTC14:09:12精确匹配报告receiver_v2_7a0c00ff含Play/Pause/Stop/Seek接受/完成、非零目标及实际tick命中，未含command_failed/目标窗口miss；held_b0_t0/history_rrr为累积流程记录，不能推定用户手动拖三次。wire0f、SOAP_v1_0000000c72002010、flow_s_c0_p0_w9_m13_l6/source_pass/native_closed_confirmed，GET后报告HTTP关闭true、marker1。投屏原生关闭ACK为本轮DEVICE PASS，另有用户声画/控制反馈；报告读取客户端仍开发电脑，不冒充发送端。原件/观察独存私密device-native050-iphone-controls-pass-report.json / -user-observation.json，Android/startup及旧失败记录分别保留。

下一步保持0.0.50，已请求原iPad哔哩哔哩HD重查发现：此前HD只见AirPlay是在0.0.21阶段，之后0.0.44已补齐标准AVTransport服务描述及后续首源握手，故需要一次当前工件对照。不能认定HD一定只支持AirPlay，也不假设描述修正已经解决。无需升级/换App/重复权限设置；若可见只测20秒声画和双端时间，若仍仅AirPlay直接记录，最后Back开诊断。当前iPad仍未发现/未播放，三端完整F20、恢复/争用/内容范围、完整片结束后清理与其他W01门槛继续OPEN。0.0.49完整218秒通过与当时清理unknown继续分项保留，不以新短控制通过追认旧根因。仅文档与默认manual交付配对更新，无新代码/应用测试/SDK/签名/安装/账号写入/commit/push/发布；skill最终更新仍等W01完成。


## 0.0.50 iPad HD当前描述对照仍未发现（2026-10-16）

W01/F20。用户反馈原iPad哔哩哔哩HD从视频内TV入口仍只见AirPlay，发现USER FAIL、媒体/控制NOT REACHED，不因Android/iPhone通过而覆盖。UTC14:11:48匹配同source50526dbd2218f3c22ea554a9efb7a1d966ffc58535a4dac45d850a0d42041f51 / signedb0f9ed45aac3dffc4f29facfa3d12f843b072253906460e7e7e1d35fa557ac11：ready、description_request、service_request/native_closed_confirmed，GET后HTTP关闭true、marker1。描述/服务读取为匿名窗口内累积事实，不能归到HD身份；无媒体源或手机控制证明。原件/观察独存device-native050-ipad-hd-discovery-fail-report.json / -user-observation.json。排除“只要补齐原空AVTransport描述就一定可见”的充分解释，未确证HD只支持AirPlay或底层根因。

已核对App Store官方通用版哔哩哔哩ID736536022明确支持iPad，当前实时兼容字段为iPadOS15.0以上；安装支持不是投屏支持。仅询问是否已安装及版本，若仅HD先补iPadOS版本，暂不要求安装/卸载/升级；HD失败保留，不移除F20 iPad要求。官方帮助未公开HD接收协议；HD页面抓取失败不能当下架/停更证明。研究依据与后续候选见research/2026-10-16-ipad-official-senders.md。当前不修改TV协议/身份、不把AirPlay镜像替代完整官方投屏；继续保持0.0.50及Android/iPhone已通过证据，W01/完整F20开放。仅研究/文档与默认manual交付更新，无新应用测试/代码/签名/部署/账号写入/commit/push/发布。


## 0.0.50 iPad两版用户通过及权限更正；定位自动证据保留差异（2026-10-16）

W01/F06/F20。用户先反馈iPad完成所述测试全部正常，并更正先前HD未打开本地网络权限；追问后明确“通用版和HD版本都通过了”。记两版所请求普通视频发现/连接、声画/双端时间及手机控制USER PASS；用户最新权限检查覆盖此前“已允许”的陈述，旧FAIL仍作为当时环境结果保留，不继续当成已确证的HD协议不支持。实际测试的新版App版本/iPadOS/精确定位秒数未补，不能把历史版本号冒充新读取结果。

UTC14:19:50匹配0.0.50 source `50526dbd2218f3c22ea554a9efb7a1d966ffc58535a4dac45d850a0d42041f51` / signed `b0f9ed45aac3dffc4f29facfa3d12f843b072253906460e7e7e1d35fa557ac11`：receiver_v2_ba0c00ff，Play/Pause/Stop/Seek接受和seek_complete、非零目标、timeline推进；有seek_target_window_missed、无seek_target_hit。held_b0_t0/history_r、wire0f、SOAP_v1_0000000c72002010、flow_s_c0_p0_w7_m13_l6/source_pass/native_closed_confirmed，GET后HTTP关闭true、marker1。原生清理DEVICE PASS，但精确定位的自动窗口未命中，保留用户正常与自动差异，不擅自扩大容差或改写为自动命中通过。

只有一份最后窗口报告，诊断不含发送端身份，不能判定属于通用版还是HD，更不能复制成两份独立设备报告；两版通过来自用户明确确认。原件/观察独存device-native050-ipad-both-user-pass-target-window-report.json / device-native050-ipad-both-user-pass-observation.json。三端普通视频候选路线均有用户通过，完整F20（更多内容/分P/PGC/live、断连/争用/电脑关机投屏等）与W01其他网络/安全/媒体/性能门槛仍OPEN。0.0.49完整片后清理unknown、当前iPad自动定位差异均不抹除；W01结束后skill更新仍待。


## 0.0.51合成HTTP会话探针候选（2026-10-16）

W01/W02/F01/F13，见ADR-012。新增电视内单独Worker/loopback40326九轮真实HTTP交换，两个独立cookie jar、响应头/Set-Cookie回调、实际回传隔离、302不跟随、清空A后B保持；无真实账号/外部服务器/URL输入。所有终态须先销毁cURL和socket并擦除自有缓冲，未知清理不ACK且poison禁止复用。20秒总限、3秒阶段、2秒客户端、header8192/body128/request2048、静态response1024；父层25秒/关闭5秒，5条固定进度，不输出Cookie/URL/headers。默认manual入口与auto7一次取证，source gate覆盖第九C输入probe-session.h和新导出session_probe_stop。

HOST12真实行为测试、162单元/合同、strict/53模块及原生C检查与真实Samsung SDK编译已通过，整组UI/设备结果待补。首次package因新Worker未加入显式文件列表正确拒绝，已仅把session-worker.js加入required集合并重新build/package/source门禁通过，没有放宽未知文件门禁。HTTPS Set-Cookie/真实会话/生产TLS依赖与保护存储未由本探针证明，W01/F20继续OPEN。无新运行时依赖/权限/CSP/WARP、账号写入或外部网关。


0.0.51本地结果续记：95整组manual UI PASS（1.5分钟），含新真实Worker的成功、取消/ACK后重开、unknown清理poison、显式auto7报告四项。162单元/合同、HOST session12、strict/53模块、原生C严格检查与真实Samsung SDK编译通过；native桌面2项已通过（21秒；只证明桌面资源加载/取消，不证明TV socket）。首次package漏列新Worker正确拒绝已修正required精确名单，原失败日志/tmp/bilisofa051-package.log保留；无新依赖/权限/账号写。

0.0.51最终本地共271项不同检查通过（162单元/合同、95整组UI、12 HOST session、2 native桌面）。新增active取消夹具首轮假定单tick即accept导致return17，改为100×1ms有界等待并核对live/client/partial5字节/multi后通过；生产C未因该夹具调整。auto7交付门禁另捕获观察包只转换0–6标记的问题，已补显式7→3转换并重新验证；不放宽automation校验。


## 0.0.51 HTTP双会话真实线缆与关闭取证（2026-10-16）

W01/W02/F01/F13，auto7/BiliProbe1.Probe。source `6a172dccd8367938a395365a6fbcbc5598333f3dac68afe30975890653f31660`，signed SHA-256 `db15070cbcdbb87c8c27f65b08f29ed69e5bacce41f55ccb77cbb17acc0f9b47`，native unsigned `c6eaceb578dca4818f7db9d177eab16c8dab101184154af065d824c7613420cd`，源码ZIP `0c794fd5a3838d188fb95b94d6a5471714841ffea93ee40ccc5d0cad9b896378`；HEAD基线610e8c21ec50b13449cd88625a5f726db7d83450，完整dirty输入以冻结snapshot为准。自有Author/Public Distributor沿用，签名完整性/有效期预检通过，install/run实际exit0；首次旧SDB连接get-state失败，同一私密目标connect后state/capability通过，未扫描/重置设备。

UTC17:33:55.776329精确匹配报告含session.ready、headers_set_cookie_wire、two_jars_isolated_wire、redirect_not_followed、jar_clear_isolated_wire及最终PASS session.pass_all_closed；对应九轮loopback HTTP实际交换、两独立jar/响应头Set-Cookie可读、清空隔离与不跟随redirect，终态在cURL/socket/自有缓冲清理后发出。诊断GET HTTP PASS、读取后端口关闭true，非敏感marker1保持。私密原件device-native051-session-wire-report.json，签名/安装/报告及冻结源码均在仓库外；GET客户端为获授权开发电脑，不冒充手机测试。

本轮271项不同本地检查PASS（162单元/合同、95整组manual UI、12 HOST session真实HTTP、2 native桌面）；strict/53模块、C严格检查、实际Samsung SDK编译、三类包/source/CA/媒体/许可门禁通过。active取消夹具单tick假设失败与auto7观察包标记转换门禁失败已分别修正并保留原日志；没有放宽关闭ACK或包身份门禁。

仅HTTP合成会话分项DEVICE PASS，不证明HTTPS真实Set-Cookie、Bili账号/CSRF/进度写回、Secure/cross-site策略或保护持久会话；旧SDK依赖仍probe-only，不送入真实凭据。iPad两版USER PASS与0.0.50匿名定位窗口miss分别保留，完整W01/F20/v1.0.0仍OPEN。


## 0.0.51 Android第二P准备失败；0.0.52诊断候选（2026-10-16）

W01/F06/F20。用户在同一多P普通视频上确认第1P可播放并可拖动、第2P始终准备，第二P USER FAIL，播放中换P未测试。UTC18:19:21.072176匹配0.0.51 source6a172dccd8367938a395365a6fbcbc5598333f3dac68afe30975890653f31660 / signeddb15070cbcdbb87c8c27f65b08f29ed69e5bacce41f55ccb77cbb17acc0f9b47：cast.avplay_prepare_timeout_b0_si、source_pass、receiver_v2_020c000f、wire09、SOAP0000000c48002010、flow_s_c1_p0_w5_m10_l6及requests02（open Range）。约10MiB是累计读取向上取整桶，5个上游窗口、1个活动客户端、无背压暂停；它不证明文件总大小或编解码兼容。native_closed_confirmed与GET后HTTP关闭true。原件/观察独存device-native051-android-second-part-prepare-fail-report.json / -observation.json；最初HTTP双jarPASS报告单独保留。

报告8条优先级丢弃已有source_layout，现有证据不足以认定是分P身份、MP4布局、网络或解码根因。0.0.52仅调整prepare失败时优先保留布局/源/桥流量/网络issue/关闭结论，仍最多8条且只用固定代码；不扩prepare超时、不改变TLS/目标/播放器策略。新增回归同时覆盖随后清理失败覆盖prepare的情况；首轮新测试暴露该优先级后已修正，163单元/合同及strict/53模块通过。原生C/JS/WASM/data沿用0.0.51，现代依赖实验另隔离，不混入本包；需新一次真实P2请求取得缺失布局，未提前记修复。


## 0.0.52已部署；现代依赖仅HOST/桌面候选（2026-10-16）

W01/F06/F20：0.0.52 auto6，source `6fde497f0e05621ee9065308a837f3775fdee4d7ce561ec53c559b773162dc1e`，signed `de374e9f3a45250a876805d661f1541a3d24edd2ae493def712e3d7f06246b9b`，native unsigned `c772c0d824f166112272feba84cf6cba04aa6f2a8f902ae9e7b80065adc30964`，源码ZIP `1704010914633000c67022ae8ba03e5acc57cc1a2d63c26132cc9fa36e8851bc`。install/run实际exit0，UTC18:22:41匹配cast.ready/native_closed_confirmed，诊断GET后端口关闭true、marker1保持。自有Author/Public Distributor沿用，无权限/CSP/WARP/账号操作变化。原生JS/WASM/data/manifest与cast-worker/session-worker/probe-worker七文件对已装0.0.51逐字节一致；本包只改紧凑报告优先级。已请求同一P2一次重试，未收到前第二P仍FAIL/修复未证，不能由启动/关闭通过替代内容起播。

本轮163单元/合同、strict/53模块通过。新prepare报告回归首轮发现后续cleanup FAIL遮蔽prepare上下文，修正为独立保留prepare失败后通过；原失败日志/tmp/bilisofa052-unit.log保留。没有重跑/重复计入上轮95 UI、12 HOST session或旧native桌面结果。

W01/W02/F01/F13现代网络候选：官方SHA256固定cURL8.23.0/OpenSSL3.5.9，实际Samsung1.39.4.7已独立编译三个静态库并链接自测与完整probe两个最终WASM。未使用USE_CURL/SSL/CRYPTO/ZLIB旧port，动态自测读取真实版本且确认仅http/https；32MiB固定堆、本地JS/WASM/CSP，两个实际Worker桌面用例PASS（962ms），含移除Web Crypto后无crypto_random_pass/无终态成功的失败闭合。首轮WASM扫描发现cURL通过OpenSSL错误宏嵌入绝对源路径，被门禁拒绝；使用OpenSSL支持的OPENSSL_NO_FILENAMES重新编译后扫描通过，无修改vendor SDK/TLS验证或对二进制字符串补丁。详见ADR-013与build/network-candidate/manifest.json，工具入口已加入package.json。

165项不同本轮行为检查仅为163单元+2依赖桌面；静态检查/编译/包门禁另记，不把初版与重编译重复计数。现代候选未装进电视0.0.52，尚无TLS正/负例、TV运行/媒体/官方发送端回归或真实凭据批准。旧依赖仍probe-only；完整W01/F20保持开放。


## 0.0.52 P2仍准备超时，布局为moov_first（2026-10-16）

W01/F06/F20。用户重试同一第2P仍一直preparing、无播放，USER FAIL。UTC18:34:50.510624匹配source6fde497f0e05621ee9065308a837f3775fdee4d7ce561ec53c559b773162dc1e / signedde374e9f3a45250a876805d661f1541a3d24edd2ae493def712e3d7f06246b9b：cast.avplay_prepare_timeout_b0_si、source_layout_moov_first/source_pass、flow_s_c1_p0_w5_m10_l6、requests02、receiver_v2_020c000f、wire09、native_closed_confirmed；GET HTTP成功且读取后端口关闭true、marker1。新优先级已实际保留布局，但未修复起播。第一P通过不覆盖第二P；只有moov在mdat之前的前缀分类，不代表完整moov/codec/时基/PTS兼容，不能把“mdat在前”当根因，未记录bridge issue也不证明全部媒体传输正常。

原件/观察独存device-native052-android-second-part-moov-first-prepare-fail-report.json / -observation.json，启动清理报告另存。仍保持0.0.52，未更改prepare时限或播放/网络栈；已请求公开BV号及P2时长，准备在HOST以无账号固定Web读路由比较P1/P2元数据。HOSTWeb源不自动等同于官方发送端签名源，若不可取得继续记录门槛，不让用户发送CDN签名地址/Cookie。完整W01/F20开放。


## 0.0.53大索引候选的本地证据（2026-10-16）

W01/F06/F20，ADR-014。HOST对用户公开样本读取API0，P2=34688秒，qn16单MP4总长1487053789、前缀ftyp32/moov43183732（42MiB向上取整）；未取得完整moov或ffprobe codec/PTS，超时/分片失败保留私密，不把Web地址当官方发送源身份。0.0.52用户失败与DEVICE报告继续保留，不提前记修复。

本轮350项不同检查PASS：171单元/合同，95整组manual UI＋2个新增大索引真实Worker UI，38 HOST真实bridge，22 HOST源/调度边界，20 HOST cast，2 native桌面加载/取消。strict/53模块、C严格检查、实际Samsung SDK重编译通过。大索引动态prepare/20秒无进展/绝对180秒/取消及异常时间戳，32条累计读桶/两条size及pump进度预算，额外源事实回放和8条紧凑记录都有相应边界；桌面/CURL HOST不证明真实TV长片效果。

失败/修复记录：新44MiB夹具仍通告原3MiB而被502正确拒绝，原日志/tmp/bilisofa053-large-index.log保留；第二轮16KiB强背压fixture使吞吐案例过慢并主动终止，未计通过；性能专用fixture改1MiB socket buffer且通告真实总长，44MiB/20Hz实际用例PASS（整组38运行99.8秒，背压等原用例仍16KiB）。无TV socket buffer扩大。原生桌面首次与另一组Playwright同占4173未启动，保留日志并串行重跑2项PASS/21.1秒，未修改端口复用门禁。没有重复计入中间重复单元/SDK运行。

候选仍旧cURL7.68/OpenSSL1.1.1d探针依赖，不接入账号；现代依赖实验保持隔离。默认manual与auto6部署分离；签名/安装/启动/实际P2结果另记，当前尚不宣称DEVICE播放修复或W01/F20关闭。


## 0.0.53大索引候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `f3ee2b3fd279aaa1ea5f4e8450fecaba93f5e41aae7f5aee932a8bb6ed2d5430`，signed SHA-256 `8ff3af8136a13b1867890e7ff56be326840374d7e3ee12095ebd8b6b20a5a18f`，native unsigned `906b7662efd7c3b7fc9f5cfd7c871a37e39536474f257c6fc1289257c105351b`，源码ZIP `282dde2905149830df70fc58b22f96937f5da55662f7c901f12e3cd1c49f888e`。HEAD基线610e8c21ec50b13449cd88625a5f726db7d83450，dirty完整输入按source冻结于仓库外。首次state/capability/install/run实际均exit0且平台明确成功；沿用自有Author/Public Distributor，无新权限/CSP/WARP、电视固件或账号操作。

UTC18:57:32.416403精确匹配本版报告cast.ready、cast.native_closed_confirmed，诊断GET后端口关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，Web engine major仍未知。启动/清理DEVICE PASS，原件独存device-native053-startup-report.json，部署记录及原始native053日志私密保留。350项不同本地检查、strict/53模块、C严格检查、真实Samsung SDK编译、三类包/source/CA/媒体/许可证门禁通过；HOST/桌面结果不替代TV媒体验收。

公开样本BV1PkM66LESq的P2为34688秒（9:38:08），HOST匿名Web前缀含43183732字节moov（向上取整42MiB）。旧版约30秒累计读取10MiB后超时，支持大索引未读完的具体假说，但Web与官方发送源尚未证实相同，未取得完整codec/PTS，不能提前宣布根因已解决。候选保持原内存/目的地/TLS/字节/签名截止，增加有限进展驱动泵送；仅已知9–128MiB索引初次prepare使用至多180秒且20秒无进展终止，普通准备/seek不延长。当前仍旧探针网络依赖，现代cURL/OpenSSL实验没有混入。

已请求同一Android/P2重试：预授权自动播放入口，较大索引最多等待3分钟，可Back取消；起播后只看20秒声画/双端总时长，失败或完成后Back开诊断。不要求拖动或播放完整9小时。实际P2播放与读取尺寸仍UNVERIFIED，旧0.0.51/.52 P2失败保留；完整W01/F20及W01完成后skill更新继续OPEN。默认manual最终文档交付与已装auto6另外配对，无重复侧载、commit/push/发布或真实账号写入。


## 0.0.53 P2短暂起播通过、自动手机Seek重准备失败；0.0.54候选（2026-10-16）

W01/F06/F20。用户确认同一P2可以播放，约1秒后手机自动跳转中并最终报错：仅初次短暂起播USER PASS，随后手机Seek USER FAIL，未达到20秒稳定声画与双端时长验证。未捕获精确Seek目标，不能把用户“貌似之前的默认操作”确认为应用默认回片头或手机历史恢复策略。UTC19:04:47.794361精确匹配0.0.53 sourcef3ee2b3fd279aaa1ea5f4e8450fecaba93f5e41aae7f5aee932a8bb6ed2d5430 / signed8ff3af8136a13b1867890e7ff56be326840374d7e3ee12095ebd8b6b20a5a18f：receiver_command_failed、avplay.seek_restart_timeout_b0_t0、receiver_v2_1a0c014f、seek_history_f、wire0f、SOAP0000000c78002010、flow_s_c0_p0_w36_m70_l6、native_closed_confirmed；GET后HTTP关闭true、marker1。70MiB为累计传输桶，非文件/索引大小或去重覆盖证明；当前8条seek优先级仍丢弃source_init，不能据此声称TV源已确认为42MiB。原件/观察独存device-native053-second-part-started-seek-timeout-report.json / device-native053-second-part-observation.json；startup原件单独保留。

源码确认0.0.53仅初始prepare得到已知大索引窗口，手机Seek先pause再PREBUFFER_MODE重新prepare仍使用30秒上限，实际报告恰为seek_restart_timeout。这是明确的策略缺口，累计70MiB支持索引重读但不能排除其他SDK/CDN因素。0.0.54对同一已知9–128MiB源的seek_restart也应用size×4秒+10秒、最多180秒及20秒无有效新接收进展保护；每次操作独立起算，旧操作进展不能续命。直接seekTo、未知/小索引及所有native媒体租期/128MiB/签名截止不变，不自动重试或忽略发送端Seek。暂停保持与取消/晚回调隔离不变。

UI在重新准备期间显示索引与本轮累计接收，可Back取消；大索引Seek紧凑报告优先保留seek结果/清理原因/底层issue/索引/流量/原生关闭，仍最多8条，普通seek优先级不变。177单元/合同及strict/53模块通过，新边界覆盖跨30秒保持暂停、旧初次读取不能保活、绝对178秒、Home取消和直接native seek仍30秒、紧凑证据留存。整组UI/包/设备结果另记，未提前宣称修复或关闭W01/F20；未改C/依赖/权限或真实账号。


0.0.54本地最终276项不同检查PASS：177单元/合同、99整组manual UI（1.8分钟），包含新大索引手机Seek显示/恢复以及Home后禁止晚播放两项真实打包Worker组合。strict/53模块通过，日志/tmp/bilisofa054-unit.log、-check.log、-ui.log。未修改九个C输入或Worker，不重复运行/计入上一轮HOST/SDK/native桌面检查；原生source/产物与已装0.0.53逐字节比较及包门禁在签名阶段执行。未将桌面SDK shim算作本电视播放验收。签名/安装/启动和P2实际效果另补。


## 0.0.54已知大索引重准备候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b`，signed SHA-256 `4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302`，native unsigned `79978dd8af9ae93e2f92ed526d77fcf309b488bb481f2a0967f4eb3bac1dc8ee`，源码ZIP `4d3cf6cf09d19b5f44031d9d5d2ab6e74887dbd1a892cf748b2a705951af6863`。HEAD基线610e8c21ec50b13449cd88625a5f726db7d83450，dirty完整源码按source冻结。177单元/合同＋99整组manual UI＝276不同本地检查PASS，strict/53模块、三类包/source/CA/媒体/许可证及签名门禁通过；九个C输入与cast/session/probe Worker、native JS/WASM/data/manifest七工件对冻结已装0.0.53逐字节相同，没有本轮SDK编译/HOST网络或native桌面重跑，旧结果不重复计数。

首次state/capability/install/run均实际exit0且平台明确成功，沿用自有Author/Public Distributor。UTC19:09:53.925947精确匹配报告cast.ready/native_closed_confirmed、诊断GET后端口关闭true、marker1，启动/清理DEVICE PASS；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。私密原件device-native054-startup-report.json，部署日志native054-*、deployment/native-reuse记录与冻结源单独保留，无新权限/CSP/WARP、账号操作或固件修改。

本包仅修正已知大索引seek_restart仍走30秒的策略缺口；每次重新准备采用新起点/有效传输进展的有限索引窗口，仍保留20秒停滞/绝对至多180秒、native媒体5分钟/128MiB/签名截止与Back/Home取消，直接seekTo及未知/小索引仍30秒。已请求同一Android/P2自动起播，手机若自动Seek则等待至多3分钟后核对20秒声画/双端时长，若未自动Seek如实反馈，不额外拖动；最后Back开诊断。实际大索引Seek恢复仍UNVERIFIED，不把启动/清理或桌面通过替代播放修复。

0.0.53短暂起播USER PASS、随后的自动手机Seek超时USER FAIL及旧0.0.51/.52 P2准备失败保留；完整W01/F20仍OPEN，W01完成后skill更新继续跟踪。默认manual最终文档交付与已装auto6另配对，无重复侧载/commit/push/发布或真实账号写入。


## 0.0.54大索引P2与自动手机Seek本轮通过（2026-10-16）

W01/F06/F20。用户明确确认本次请求项目全部通过，记同一Android/P2起播、自动手机跳转恢复、后续约20秒声画与双端时长USER PASS，范围仅本次步骤，不扩展为9小时完整播放/重复seek/播放中换P/全部F20。UTC19:43:14.500763匹配source905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b / signed4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302：seek_restart_held_b0_t0、history_r、source_init_mib_42、source_layout_moov_first、receiver_v2_7a0c00cf、wire0f、flow_s_c1_p1_w52_m102_l6、native_closed_confirmed；GET后HTTP关闭true、marker1。

TV实际官方源的前缀索引尺寸已独立确认42MiB向上取整，与HOST公开Web样本尺寸一致，但相同尺寸不等于两个签名URL字节身份完全相同。重准备成功及用户声画支持30秒策略缺口修正；未含seek_target_hit/非零目标，不能宣称特定非零秒数定位已自动命中。102MiB累计读/52窗口接近128MiB内部预算，不能由这轮通过推断任意次数重读/9小时可用；p1只是关闭前流量快照，不覆盖实际关闭ACK。0.0.51/.52准备失败及0.0.53自动Seek超时分别保留。

原件/观察独存device-native054-second-part-automatic-seek-pass-report.json / -observation.json，startup与签名源另存，本轮未重装或运行新应用测试。当前0.0.54保持；下一步现代依赖独立测试包按ADR-013验证，不覆盖本包或送入真实凭据。完整W01/F20及W01完成后skill更新仍OPEN。


## 独立现代网络验证包：本地结果（2026-10-16）

W01/W02/F01/F13，BiliNet001.Probe/0.0.1，与已通过大索引回归的BiliProbe1.Probe/0.0.54分开。新增严格guest-only IPC/固定目标TLS验证、async cURL multi/取消清理及独立遥控UI/报告。179单元/合同、strict/57模块通过；独立实际打包Worker UI五项PASS（2秒：成功、TLS超时不得当负例成功、取消、Home、native未确认关闭后poison）；实际已链接现代库的Worker版本/随机数及缺WebCrypto失败闭合两项PASS（665ms）。共186不同本地行为检查，没有重跑/计入主探针99 UI或旧HOST网络。日志/tmp/bilisofa-network-validation-{unit,check,ui,deps-ui}.log。

真实Samsung1.39.4.7已链接三套最终WASM（selftest/validation/完整probe）、扫描本机路径/密钥模式/禁止字符串eval，固定库/源/CA/许可证门禁通过；validation仅带CA，完整probe保留原合成媒体供报告服务构建复用。各产物精确hash见build/network-candidate/manifest.json。无修改vendor SDK、关闭TLS或扩大主探针内存。新工具package:network/verify:network只输出独立WGT；签名/侧载与TV的正/负TLS真实结果另补，未提前记通过或允许真实凭据。

主探针0.0.54运行时代码保留；该轮用户P2通过与报告索引42/重准备完成/关闭ACK独立保存。现代网络验证包没有投屏/账号UI，不作为单一v1.0.0的另一个产品版本。


## 独立现代网络001：TLS正负例与原生关闭真机通过（2026-10-16）

W01/W02/F01/F13，独立BiliNet001.Probe/0.0.1，source6b611f77e0fea25f6f2335ce776308db3b108ac41c8c853d3e271a8480c845f2、signed8911ce37ac8d5c7686dcff030e1181fe1629844a3c6fd9bcad59c073c3de1122。实际首次state/capability/install/run均exit0且平台明确成功，自有Author/Public Distributor沿用，主BiliProbe1.Probe/0.0.54部署清单与签名包未改。独立精确源码/源清单/NETWORK_DELIVERY/unsigned已按source冻结，独立签名身份/设备日志私密保管。

UTC19:54:09.869238报告精确匹配source/signed，versions_curl8_23_0_ssl3_5_9、crypto_random、tls_positive_pass、tls_expired_pass、tls_hostname_pass、tls_selfsigned_pass与最终PASS network.pass_all_closed，全部四个TLS分项及原生清理DEVICE PASS；真实版本来自运行库、负例按CURL错误/verify固定原因，不把超时算拒绝。诊断GET后端口关闭true，marker0属于独立App不覆盖主包marker1。型号U800FD/固件T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。报告独存私密device-network001-tls-pass-report.json；主0.0.54 P2用户通过/匹配报告与旧失败另存。

186本地行为检查/strict57模块/真实SDK三套最终链接/扫描/独立包与签名门禁通过，不替代设备结果。现代库直接创建SOCK_NONBLOCK的默认socket路线已支持本轮正负例；不能由此推导任何fcntl/ioctl变体都支持。未测试会话真实线缆、媒体或官方投屏使用现代依赖；不批准真实凭据，不关闭完整W01。

下一步独立网络002/0.0.2仅增加session自动模式与按钮，复用现有九轮合成HTTP/两jar隔离/清空与不跟随redirect，编译的现代full probe保持不变；新UI支持Home/stop，任何未确认资源关闭阻止同App后续网络执行，报告仍可读取。主0.0.54保持，完成网络检查后恢复其前台；W01结束后更新skill继续跟踪。


独立网络002准备：新增session自动模式/nonce/停止与全App未知清理poison。整组独立Worker UI七项PASS（2.5秒，含新的HTTP双jar线缆事实转交及取消），strict57模块通过。本轮不同本地行为检查更新为188＝179单元/合同＋7独立UI＋2实际现代库Worker自测；相同五UI初跑不重复计数。库/三套WASM未改，不重复SDK链接/此前cURL网络检查。002实际会话线缆仍待设备，001TLS设备PASS不被替代。


## 独立网络002现代HTTP会话：未确认关闭（2026-10-16）

W01/W02/F01/F13，BiliNet001.Probe/0.0.2，sourcec536ec20372b848e3647b32c8d654747d22e9bebedcd80dcc6d308c137db1ea3、signedd762a1e1be5fe4974c4ca33ee9a9b900df2b759654ab7faafa0d48040c6f69a7、unsigned6f754349b1e62001274f840751a91afaad640917f8e9ec595f3de90172ecb75c、源码ZIP841357f439d26d4e2e41b166ef17c84681c3cd2177110c6d411e36d03aa6d49b。首次state/capability/install/run实际exit0，现代native/validation六工件与已装001逐字节相同，未重编译或更换库。

UTC19:58:02.997239匹配报告仅session.ready及FAIL network.cleanup_unconfirmed_restart_required，GET后报告HTTP端口关闭true、独立marker0。合成HTTP会话DEVICE FAIL/原生会话清理UNVERIFIED；不能把报告HTTP关闭当会话socket已关闭，也不能用001TLS通过覆盖。独存私密device-network002-session-unconfirmed-report.json与deployment，001TLS PASS/主054 P2 PASS保留。

当前摘要没有区分SESSION:failed:17、WASM abort、Worker异常、父层超时或非法消息；根因未确定。现代cURL默认外连TLS已成功，不能只凭旧F_SETFL故障猜测本轮相同。下一独立003先补固定原生原因与父层cleanupFailure分类，不输出SDK原文/请求/地址，不忽略未知关闭或允许复用。主0.0.54不覆盖，完整W01保持开放。


独立003本地调试记录：新纯SDK原因分类及致命progress不ACK/poison单测通过，单元/合同181项。首次strict因测试夹具delete必填属性TS2790失败，已改为直接构造精确frame后重跑；首次独立UI误用session自动包跑TLS模式导致5失败/2通过，已让每个用例显式选择tls/session模式，未放宽断言。修正后8项独立UI通过（2.8秒，新增F_SETFL abort原因在实际Worker中留存/脱敏/poison）；主整组UI与最终包执行结果另补。原失败日志/tmp/bilisofa-network-validation-check-003.log、-ui-003-final.log保留，不计通过。


独立003最终本地：181单元/合同、8独立网络UI、99整组主UI全部PASS；strict58模块通过。加上本轮001阶段未改自测WASM的2项实际现代库Worker自测，本轮共290不同行为检查，不重复计入旧轮次或初跑失败。主99 UI在公共ScopedGuestWorker新增可选fatalProgress后重跑（1.8分钟），默认非session策略保持；资源未知原因先保存、再poison，始终不伪造关闭ACK。C/库/三套WASM不变，003仍只补诊断，TV原因待新自动运行。


独立网络003：sourcea594cfc5b5b2b52c7a4af2217ab024ff3e0c22e28a4fdd636f0c7c81b523183e、signed72ef9ee47992ce766203309284fb0b30bafd22c9fc775e2f089ecbc162c9fc4f、unsigned85599c3a8915bdcfc1d30f53bd5507afc571c7c770e2e0652213a534d51bf0d2、源码ZIP3419fd0752ff56fe587c88fc92f1ca40502cb52b47a087fba60bebe90d9a229a。首次state/capability/install/run均实际exit0。UTC20:05:39.778740匹配session.ready、session.native_issue_runtime_abort、cleanup_cause_unsupported及cleanup_unconfirmed_restart_required，GET后HTTP关闭true/marker0。现代会话仍DEVICE FAIL、会话原生清理未确认；已排除仅父层超时的充分解释，但没有F_SETFL分类，不能把源码close drain候选宣称已确定根因。独立原件device-network003-session-runtime-abort-report.json，旧001TLS PASS/002FAIL及主054PASS保留。下一步004加入有限数值栈与离线symbol map，仍先补取证不改cURL行为；原始栈/错误文本不输出，非敏感数字位置须绑定精确WASM摘要。


独立004数值栈候选：182单元/合同及strict58模块通过；新增纯函数只保留最多两个有界WASM函数索引/偏移，抛弃路径、URL和任意文本，闭合frame不能ACK。父层先保留栈再按固定issue poison，最大会话进度7（正常5＋数值栈1＋原因1）。使用真实Samsung --emit-symbol-map重链三套WASM，符号表仅在build/及私密归档、没有打入WGT；必须按精确WASM SHA256解码，不能拿另一构建的函数号推断原因。004仍是诊断候选，cURL源码/库未改，不宣称修复002/003。


## 独立网络004：精确WASM栈确认fcntl（2026-10-16）

sourcef9c90d86b57cf371c47789f5ca808a1793435cdb1d2c82b64eda733b1fef7493、signed2cdd2991fb11b9e97092ffaece8f254614e9c4908d151c685c7b96781d1b2e1f、unsigned5863fc8210d680837f106f1808cf0d2d5cea4e06f7d8dc80e0da3cb38a06f34e、源码ZIP8349ebbd44cbf35c493cea0e3699cd0114191d7c25c0698e321730a20cef6013。首次state/capability/install/run均实际exit0。UTC20:10:24.468147匹配session.ready、native_stack_v1_4209_c8910_4430_d44a1、native_issue_syscall_fcntl、cleanup_cause_unsupported及cleanup_unconfirmed_restart_required，GET后HTTP关闭true/marker0。会话仍DEVICE FAIL，关闭未确认。

先从实际签名WGT取native/probe.wasm确认SHA256为1ba3b14648cc20e7bde2a8713a500eef0a3a9d62310d3bbf6009a74cfbf97661，再校验符号表SHA256297d12948c644605c46364e5914e667a54293fd2db2c3c6981f190962e5ae919，索引4209=_fcntl、4430=_curlx_nonblock。这是本机非阻塞标志调用的直接栈证据；关闭drain来源还结合固定源码/默认socket选项核对，修正因果需下一包会话A/B。不把仅两帧说成直接捕获了所有上层函数。原件device-network004-session-fcntl-stack-report.json及独立解码记录device-network004-fcntl-symbol-evidence.json私密保存，原始栈从未输出。

见ADR-015：给独立候选cURL明确宏，仅省略关闭时可选drain，仍由正常destructor关闭socket；不伪造fcntl/ioctl成功、不编辑SDK、不关TLS。官方archive/patch/目标输入输出SHA256同时固定，旧库和三套WASM保留history。正在重建候选静态库，后续session与四项TLS必须重跑；当前不提前记修复。主0.0.54与旧001TLS PASS/002–004失败均保留。


## 独立网络005：现代HTTP会话与关闭通过，采集先后错误单列（2026-10-16）

W01/W02/F01/F13，BiliNet001.Probe/0.0.5，source73eb8282a89d7142317392767b36e259471f3fb8e1ab48108797e591c694da34、signede70b521e9e13a5174d461252fc01ad259d13dcdfc79723ca31a3dd16cf0f2a83、unsigned78ddeabbb57e3058f3ff388df5464797e0d79918ab9b622782a2c90d47c69cbd、源码ZIP99449e21fec3bd4c25d40d6f75683dc8bfdeb1141cc106fdeea6a07bb5a4a970。state/capability/install/run实际均exit0。候选库按ADR-015重建，curl.a=e38f14bff5ec79d313ee22a305eca5859a64dc5ca8428d60502c815adadb409c，OpenSSL两库与未改候选逐字节相同。真实Samsung三套WASM/私密符号表重链、扫描/源/CA/许可证与独立包门禁通过，8独立UI/2实际库Worker自测在新产物上重跑PASS；181→182单元和主99回归的本轮分层记录保留，不重复计数。

本轮读取HTTP200正文经合同校验，但采集先于launch完成启动，collector一次性读到旧004期望。它正确将实际005报告暂存为rejected并最终exit1；该命令不记PASS。安装/launch完成后，以deployed/signed005 source精确重验暂存报告合同/build，恢复其实际TV结果：session.ready/headers_set_cookie_wire/two_jars_isolated_wire/redirect_not_followed/jar_clear_isolated_wire及最终session.pass_all_closed。九轮真实HTTP/Set-Cookie、两jar回传/隔离/清空、不跟随redirect及原生会话清理DEVICE PASS。另在恢复时核验报告端口已关闭，但这是较晚复查，不冒称GET后0.3秒复查；具体received/recovered/recheck时间见私密记录。

独存device-network005-session-wire-pass-report.json，含collectionCommandOutcome=EARLY_COLLECTOR_EXPECTED_004_AND_REJECTED_005及earlyExpectedSourceHash；原rejected、旧失败和所有冻结包保留，不修改collector门禁或要求用户重测。此次修正后的线缆通过，结合004_fcntl/_curlx_nonblock栈和仅cURL关闭drain的修改，支持该路径兼容修正。仍须006复验TLS正负例，不推导任意cURL配置/现代媒体/HTTPS会话或真实凭据已通过。主0.0.54未替换，W01保持OPEN。


## 独立网络006：兼容修正后TLS回归通过（2026-10-16）

W01/W02/F01/F13，BiliNet001.Probe/0.0.6，sourcec0c21080e4b34b434028f50acfed406d792fd86c5d8da7159e776eddf1ab49ab、signedf09ead6c5c5d2c52ab44d352b0071bf95cd61fd4bbb3578898e2bdf1327c3e35、unsignedce37e09dbbe06626fd982d6621a2926be10644ce5a52e496949cf1300d47a210、源码ZIPc8950f7197e3867fcc048474178b1e2009e1981682c75b2b86c0d5c94eaa42b3。state/capability/install/run首次实际exit0。与005同一已修正cURL/同一三套最终WASM，仅自动模式改TLS；没有再次换库/编辑SDK。

UTC20:18:15.712593精确匹配真实库版本/随机数、匿名TLS正例、过期/错主机名/自签名三负例及最终network.pass_all_closed，四TLS与原生清理DEVICE PASS，GET后0.3秒复查端口关闭true、独立marker0。原件device-network006-patched-tls-pass-report.json与005真实HTTP九轮会话PASS分开保留；002/003未知关闭、004fcntl栈及005提前采集错误均保留，不追认失败命令通过。

本轮不同本地行为检查291项：182单元/合同、8独立Worker UI、99主UI、2实际库Worker自测；主99在公共fatalProgress变更后重跑，随后数值栈格式仅经单元/独立UI覆盖。005修正后8独立UI与2实际现代库Worker在新WASM重跑，重复运行不额外计数；strict58模块、真实Samsung编译/三套链接、源/patch/静态库/CA/媒体/许可/无私密模式/包签名门禁通过，host网络测试不冒充本轮。

ADR-015的窄范围close-drain修正现在有真实会话与TLS正负回归支持。仅为独立候选，不自动批准真实凭据、HTTPS会话/保护存储、现代媒体或全部cURL选项；现代媒体/官方发送端尚未回归。W01/完整F20仍OPEN，skill最终更新仍等W01结束。

已在UTC20:18:36.469433通过CLI重新启动原BiliProbe1.Probe/0.0.54，launch实际exit0/平台明确成功，无重装，source905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b / signed4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302未改；恢复日志/元数据私密保存main054-restored-after-network006.*。这不是现代库已混入主包。下一门槛为已有合法手机播放/官方TV入口的PGC实际投送，默认manual当前源码含新增会话诊断，须与已装054按源码/运行时逐项配对，不能声称两个同版本所有字节相同。


恢复主054后的8秒自动报告采集未收到，命令exit1（main054-restored-after-network006元数据已注明）。CLI明确launch成功与“新启动/清理报告通过”分开：不追加后者，也不以未收新自动报告否定此前054的P2/手机Seek/启动清理证据。可能是保留实例恢复，但未实测原因，不把该推测记为事实。已请求当前主探针PGC一集20秒声画/双端时长，先不更换主运行库，失败直接Back开诊断。

## 0.0.54 Android PGC《凡人修仙传》P194（2026-10-16）

W01/F06/F17/F20。用户确认本集起播、音画同步、跳转/拖动/暂停均正常，分项USER PASS；没有明确补回双端总时长，不将它记作通过。选集/切P仍不支持。UTC20:26:04.771498报告匹配source `905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b`、signed `4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302`，receiver_v2_fa0c22ff含URI接受、Play/Pause/Stop/Seek接受及完成、实际时间推进、非零目标/hit，同时也含target_window_missed及denied_source_changed。多次操作窗口可同时出现hit/miss，不能据此声称所有目标精确命中或把miss抹除。history_rr、held_b1_t0、source_init_mib_1/moov_first、flow_s_c0_p0_w24_m45_l6、wire0f；native_closed_confirmed，诊断GET后关闭true、marker1。

原件与用户观察分别私密保存device-native054-pgc-fanren194-play-controls-source-change-report.json和device-native054-pgc-fanren194-observation.json。源切换拒绝是ADR-009/010当前单源授权规则，与源码相符；本报告没有内容身份/请求正文，不能单独断言哪次操作对应哪一集。PGC实际媒体样本通过不等于F17详情/选集/追番已实现，未测试长播/权益变更或所有PGC。

下一步先以ADR-016将独立005/006已验证的固定现代网络库接入明确0.0.55主媒体候选，复验启动/关闭与官方媒体；不变更换源授权，也不送入真实账号凭据。之后另做同owner换源的停止/关闭/代次隔离设计与验证，不能直接放开URI比较。W01、完整F20与完成W01后更新skill继续OPEN。

## 0.0.55现代主媒体候选：本地门槛（2026-10-16）

按ADR-016，显式现代打包已实现；182单元/合同、6项候选来源/篡改拒绝检查、2项实际现代WASM严格CSP加载/停止桌面检查，共190项不同本地检查PASS。strict/58模块、Python语法、固定依赖库/来源/补丁/CA/合成媒体/许可证/包和源码快照门禁通过。没有修改九个原生C输入或重编译库，复用独立005/006逐字节同一完整probe三工件；复用旧结果不作为本轮SDK/HTTP/TLS重跑。

首次isolation打包被Unexpected observer stage files正确拒绝，原因是从旧库切换现代库后生成目录内残留旧许可证；修正仅重建固定generated native和third-party-licenses子目录，未知其他文件仍拒绝。随后三类包与delivery通过、实际现代WASM桌面2项通过。没有修改SDK、TLS、地址策略、媒体预算或单源授权。真实主媒体/官方发送端尚UNVERIFIED，W01保持OPEN。

## 0.0.55现代网络主探针部署与启动（2026-10-16）

W01/W02/F06/F20、ADR-016。source `903790294aeadd76df2dc46af06a54d637275c81629646a729303213655d9b3e`，signed SHA256 `8c22210b846291c23ef64d28ebe84adfc3e30fdfcc905086dc6073385448e8f2`，unsigned `6543da4e9338e857c83ef2ac466f8b1440bec1f39eb6a31fb1529c1349c42e3a`，源码ZIP `08742f05f08e06a75fd184f12c490aebe9974196d782bb0207be3c3f1cbae1f8`。仍BiliProbe1.Probe，auto6，原Author/Public Distributor，权限/CSP不变；UTC20:31:27实际install与launch均exit0/平台成功。冻结源与包私密保留在deployed-source/903790…，旧0.0.54冻结源/签名/报告仍在。

UTC20:31:35.118517匹配本版source/signed报告：cast.ready仅为监听就绪进度，native_closed_confirmed为关闭DEVICE PASS，HTTP报告PASS/GET后端口关闭true，marker1保持；原件另存device-native055-modern-network-startup-report.json。不能把ready当作官方手机发现/媒体PASS。候选完整WASM `6604d65e31d174fc239420faf69f25421f56e3a964f1d7d3196ff2504a5255be` 与独立005/006相同，旧054为81aac444…；CA/合成媒体data及cast/probe Worker与054逐字节相同。主UI/session Worker含独立诊断阶段已测试的变更，不声称与旧054所有运行时代码相同。

190不同本地检查及strict/三类包/来源/签名前置通过，未本轮重编译C/库/重跑TLS。已请求用户在现代主包用同Android/同PGC单集核对20秒声画、双端时间/时长、约60秒定位、暂停继续/停止并开诊断。主现代媒体UNVERIFIED，选集/切P仍未支持；W01/完整F20及W01后skill更新继续OPEN。

## 0.0.55现代库PGC媒体/控制回归（2026-10-16）

用户明确“全部测试通过”，记请求范围内Android/同PGC P194的20秒声画同步、双端当前进度/总时长、约60秒定位恢复、暂停/继续/停止USER PASS。UTC20:50:05.959802报告匹配source903790294aeadd76df2dc46af06a54d637275c81629646a729303213655d9b3e / signed8c22210b846291c23ef64d28ebe84adfc3e30fdfcc905086dc6073385448e8f2，receiver_v2_7a0c00ff含非零目标hit、Seek/Play/Pause/Stop接受/完成及真实timeline推进，没有miss/command_failed；history_rr、held_b0_t0、moov_first/init1、flow_s_c0_p0_w21_m36_l6、wire0f/native_closed_confirmed、HTTP GET后关闭true/marker1。用户声画观察与自动事实分开，不推导所有PGC/长播/现代三端通过。

原件/观察私密独存device-native055-modern-pgc-controls-pass-report.json / device-native055-modern-pgc-controls-observation.json，startup另存。本轮未重复安装/应用测试；W01/F20继续OPEN。下一步按ADR-017推进同owner有界换源，保留原单源入口，不改变真实账号/权益边界。

## 0.0.56同发送端换集/切P候选：实现与本地验证（2026-10-16）

W01/W04/W06、F06/F17/F20，按ADR-017增加独立“允许本次投屏会话（可换集/切P）”入口，原“允许一次”不变。同owner/原权限/原租期内最多4源，每源复验TLS/206/512字节和签名期限；UI/Worker/native以代次串行关闭旧decoder和bridge，再建立新token的新桥。旧token拒绝、旧快照/回调失效、新时长不继承；累计128MiB/256窗口/512媒体连接/3次读取重连、24控制命令与1024发现连接不重置。准备/seek/remote锁/另一owner/过期/新源政策不通过则拒绝，关闭unknown禁止新桥。SDK真实NONE确认失败会关闭本次原生会话，当前进程媒体poison，保留旧decoder供幂等退出清理，重新打开App前不创建新媒体实例。

本轮187单元/合同、104整组manual UI、HOST cast20/source27/bridge38/session12、候选输入门禁6、实际现代WASM加载/停止2和实际库随机数自测2，共398项不同检查通过。之后补充decoder unknown的进程poison与保留清理句柄，五条换源UI定向回归通过（重复项不另计）；strict/58模块、C语法通过。现代selftest/validation/full probe实际Samsung SDK三次链接和legacy full probe实际重编译完成，固定库字节未变。

失败记录保留：首次HOST旧token测试读取了未设置的status字段，改为断言实际HTTP404；首次五条UI为3PASS/2FAIL，其中连续换源揭露play-receiver错误依赖首源已擦除的一次性offer，已限定该要求仅未有预授权receiver时使用；另一项为fixture未真正模拟close保持IDLE，修正夹具。修复后五条包括连续两次换源/新时长、Home取消晚回调、新源TLS失败不回放旧集、SDK未关闭禁止后续媒体、不同owner拒绝，均PASS，没有放宽NONE或旧token404要求。日志/tmp/bilisofa056-*，本地证据不替代官方App/本电视。

候选的实际换集/切P尚UNVERIFIED。TV端F17目录/选集/追番等仍未实现；本次只接收手机合法源的切换。未增加账号写操作、依赖、权限/CSP、外部服务或客户端身份；主现代库其他内容/三端、HTTPS会话/保护存储、直播/F19/性能及完整W01继续OPEN。设备包/源码/签名/结果另追加，W01完成后统一更新skill继续待办。

## 0.0.56同owner换源候选已部署（2026-10-16）

W01/F06/F17/F20、ADR-017。auto6/BiliProbe1.Probe、原Author/Public Distributor，source `d93f0dc581fb8c844d4240508a0ac1187148d10d322a36697f690556de843740`，signed SHA256 `b01a68976fb9dc59787ed151918d9e8922f2c6b1150457136e301dadf6250d86`，native unsigned `3348c5fcc45520fd41a89de67cee49e6f79d49603c3eae5e2e0ef0d3dfc213b2`，源码ZIP `a621e3bd17198acdc79f0d911d21717a4e6a81c8202f155626bf017d5e550b5d`。398不同本地检查、strict/C/实际Samsung两条编译链接路线及三类包/source/许可证/签名门禁通过；固定库未重编译。

UTC21:06:59 install/launch均exit0/平台明确成功；UTC21:07:08.479223匹配本版source/signed报告仅证明cast.ready监听进度、native_closed_confirmed关闭DEVICE PASS，HTTP报告/GET后端口关闭true、marker1保持，不记媒体或换集已通过。startup另存device-native056-transition-startup-report.json，旧055现代PGC通过和054 legacy等包/源/报告仍在。

现代完整WASM为4e386cc4e120a8f8a042f54b43ad706c227a9ad05c5239d3544fc26c4e8ba282；新增换源导出必须与本版本配对，不能用055/005/006旧WASM。私密symbol map按精确WASM摘要归档native056-network-symbol-maps.json，不打包地图或原始栈。权限/CSP/库/CA不变，无真实账号写入、外部服务、提交/推送/发布。

已请求Android用新会话入口投PGC P194，手机选另一合法可播集，核对实际内容、20秒声画、新双端时间/时长，停止后开诊断；不重复拖动或长播。实际换集仍UNVERIFIED，TV端F17目录未实现、其余三端/内容/恢复/HTTPS会话/保护存储/直播/F19/性能和完整W01仍OPEN，完成W01后统一更新skill继续待办。

## 0.0.56 Android番剧单次换集通过（2026-10-16）

W01/F06/F17/F20。用户明确“全部验证通过＋诊断已开启”，按本轮步骤记PGC P194→另一有权限可播集的实际内容切换、约20秒声画恢复、新双端进度/总时长、手机停止/Back USER PASS。目标集号未补，不假设P195；App版本未重新确认。

UTC21:13:46.385150报告匹配已装source `d93f0dc581fb8c844d4240508a0ac1187148d10d322a36697f690556de843740` / signed `b01a68976fb9dc59787ed151918d9e8922f2c6b1150457136e301dadf6250d86`：transition_summary_v1_00f＝媒体代次2的accepted/decoder_closed/native_closed/bridge_ready四阶段均记录；不含代次3/4证据。native_closed_confirmed、HTTP报告PASS/GET后端口关闭true、marker1保持。source_init_mib_1/moov_first、累计flow_s_c0_p0_w24_m45_l6，receiver_v2_7a0c00ff含真实进度、Play/Pause/Stop/Seek接受/完成及非零目标hit、无miss；这是整个会话的去重事实，不能把Seek命中分配给新集。本轮并未要求用户手动Seek，不据此新增“换集后手动Seek通过”。history_r/held_b0_t0仅说明一次重准备流程。

报告/用户观察私密独存device-native056-android-pgc-single-transition-pass-report.json和device-native056-android-pgc-single-transition-observation.json，startup另存，旧失败不追认。本轮未改运行时代码、未重装/重签或重复应用测试；后续docs/source打包配对与已装auto6分开。

下一项保持0.0.56，已请求Android普通短视频P1→P2→P1，核对两次内容/声画/双端时间并停止后开诊断；先隔离普通切P/重复事务与巨大索引预算，不表示放弃9小时P2或现代大索引验收。连续换源、普通切P、现代iPhone/iPad、争用/恢复/独立投屏、更多内容/直播/F19/性能、真实HTTPS账号会话和保护存储均保持OPEN。TV端F17详情/选集目录/追番仍未实现；手机单次换集通过不替代完整F17/F20或W01。W01完成后统一更新tizen skill继续待办。

## 0.0.56 Android普通切P稳定性失败（2026-10-16）

用户反馈“貌似可以成功，但是不是每次都能成功”，随后明确失败表现为“电视卡在准备/无声画”。本轮P1→P2→P1稳定性USER FAIL，成功次数/具体失败步骤未明确，不将“貌似”升级为单项验收通过。之前PGC单次换集USER PASS仍按原范围保留。

UTC21:18:13.540629匹配source d93f0dc581fb8c844d4240508a0ac1187148d10d322a36697f690556de843740 / signed b01a68976fb9dc59787ed151918d9e8922f2c6b1150457136e301dadf6250d86。transition_summary_v1_00f只记录一次代次2四阶段，不含代次3；receiver_v2_7a0c22ef含control_denied/denied_source_changed及Seek流程/真实tick/hit，无Pause接受。source_init1/moov_first、flow_s_c1_p0_w7_m10_l6、history_r/held_b0_t0、native_closed_confirmed；GET后关闭true/marker1。报告未记录本轮SDK prepare失败，用户可能在期限到达前返回；不能从无FAIL推导播放通过或把泛化source_changed确定为当前卡准备的唯一根因。

源码核对：session模式的source_changed也用于新URI计划校验失败，056没有保留拒绝细分与有界动作顺序，当前8条窗口也没有取消时实际播放器状态。已有证据不足以区分新源策略拒绝、后续重准备或不同请求的混合阶段，不放宽TLS/目的地/期限、加盲目重试或延长等待来猜修复。下一候选只补固定拒绝原因/媒体代次/状态与有界序列留存，播放策略保持。报告/观察私密独存device-native056-android-ugc-transition-intermittent-report.json / -observation.json。W01/F20开放，skill最终更新继续待W01完成。

## 0.0.57固定设源/退出状态取证候选（2026-10-16）

W01/F06/F20，按ADR-017补最多32次设源观测及cap标记，报告保留最后4次、决策前代次/会话模式/状态/remote位与固定原因，并保留UI退出前最后发布状态/seeking。空值、域家族、格式和deadline等只作分类，不放开任何目的地/权限/网络路径；退出缓存状态不冒充瞬时SDK状态。原8条/4096字节报告及源/控制/连接/期限/字节限制保持，IPC仅增加32+1条固定观测。

056普通切P不稳定/准备无声画继续USER FAIL，PGC一次通过按原范围保留。当前不足以把源拒绝与准备停滞绑定到同一操作；057不改变播放策略，不声称根因或修复通过。直接对冻结已装056源码和签名WGT核对九C输入及native JS/WASM/data全部逐字节一致，不重编译SDK或重跑原生网络来制造新通过。

新增纯合同检查覆盖全部固定枚举/代次/状态往返、保留最近4项和cap、非法/原始payload拒绝、现有政策拒绝不改变原媒体、single/busy不放宽、8条关键证据留存。真实Worker增加格式拒绝、二次prepare保持后Back、40次同源设置超观测上限仍正常响应的夹具。静态检查初次遇fixture合并声明TS7022和findLast超既定lib目标，已改显式类型/既有reverse().find，没有放宽tsconfig；实际执行结果后续追加。W01/F20与W01后skill同步仍OPEN。

### 057本地结果（尚未真机验收）

strict TypeScript/边界60模块通过，单元/合同192项、完整UI107项通过，共299项不同检查。最终policy_empty枚举补充后重建并复跑相关8项真实Worker/UI，8项通过（与107项重叠，不另计）。git diff --check通过。日志仅本机/tmp/bilisofa057-unit-final2.log、bilisofa057-ui-full.log、bilisofa057-ui-offers-final.log。未重跑C/原生网络测试；九个C输入和现代native JS/WASM/data与已装056逐字节一致。本地检查不替代设备切P证据；下面开始auto6打包/签名/部署，实际结果单独追加。

## 0.0.57取证候选已部署（2026-10-16）

W01/F06/F20、ADR-017。auto6/BiliProbe1.Probe，原Author/Public Distributor。source `915987f0ebfcda82ac99bfe565ae2c850318c082e47fc3c6659b7df2571a0f3e`，signed SHA256 `e8927634089d4307a80b6ffc56e2f262d52ef2ae1dede27c18cbb804216323d0`，native unsigned `e814545ca50ac30cc80b2a3c0296696fe351153ac9b01ed17bffe8cd75d05442`，sourceZIP `a210b104bc22a58f4234261502cd89622f0138c2f0184fd88e5305dc5d408f6f`。299项不同本地检查及最终相关8项重跑通过；basic/native/isolation三包、源码/许可证/依赖/签名前置门禁通过，不新增原生编译或网络验收。

UTC21:32:50.524728安装/启动exit0且平台明确成功；UTC21:32:58.872738匹配source/signed的自动报告只有cast.ready进度、native_closed_confirmed DEVICE PASS，报告HTTP PASS、GET后端口关闭true、marker1保持。startup私密独存device-native057-offer-diagnostics-startup-report.json。九C输入和现代native JS/WASM/data与已装056逐字节一致，现代WASM仍4e386cc4e120a8f8a042f54b43ad706c227a9ad05c5239d3544fc26c4e8ba282。

已请求Android同一短UGC P1→P2→P1，仅复现一次；普通准备卡住最多等30秒，可随时取消，Back后开诊断。此候选仅补固定设源决策/退出缓存状态取证，不改变播放策略，不认定根因或修复通过。056普通切P稳定性USER FAIL与PGC单次换集USER PASS并存。W01/F20保持OPEN；保护存储/真实账号会话、更多内容及其他现代发送端、恢复/性能/独立投屏等继续待验。完成W01后统一更新全局tizen skill仍待办，项目经验先留存在W01_LESSONS_FOR_SKILL.md。后续docs/current手动包与电视auto6冻结源分开配对，无提交/推送/发布。

## 0.0.57 Android普通短P两次切换通过（2026-10-16）

W01/F06/F20。用户反馈“验证通过＋诊断已开启”，按本轮同一短UGC P1→P2→P1、每次声画正常约10秒的步骤记单样本USER PASS；本轮没有单独要求或取得双端精确时间核对，不新增该验收；具体BV、时长、发送端OS/App版本未重新提供，不从报文猜测。057仅补取证，播放策略和九C输入/native JS/WASM/data与056保持；因此不是已修复056间歇准备失败的证明，原USER FAIL保留。

UTC21:36:39.622873报告精确匹配已装source `915987f0ebfcda82ac99bfe565ae2c850318c082e47fc3c6659b7df2571a0f3e` / signed `e8927634089d4307a80b6ffc56e2f262d52ef2ae1dede27c18cbb804216323d0`。transition_summary_v1_0ff记录代次2、3各四个阶段；不含代次4。offer_trace_v1_n_40048258269c依序解码：首源接受g1/missing；g1/playing接受换源到g2；g2/playing接受换源到g3；g3/playing拒绝policy_destination_akamaized。均session模式/remote=false，序列未达cap；状态属于决策前缓存，不是即时SDK状态。该家族只是文字分类，未放宽白名单或判定归属；本轮用户成功情况下也有该拒绝，不能将其直接等同前轮卡准备的唯一根因。

退出前最后发布cast.exit_g3_idle_s0、native_closed_confirmed DEVICE PASS；HTTP报告PASS/GET后端口关闭true、marker1保持。receiver_v2_7a0c22ef保留同会话控制/拒绝/时间/Seek聚合，不分配到某一P；init1、moov_first、flow_s_c1_p0_w13_m16_l6仅说明有界累计活动。报告及用户观察私密独存device-native057-android-ugc-two-transitions-pass-report.json / -observation.json，startup另存。未新增运行时代码、重签/重装或重跑应用测试。

保持057，下一项仅同一短UGC新会话P1→P2→P1→P2，每次约10秒，失败最多等30秒后Back开诊断；核对重复操作/代次4，不追加第四次更换或长播。结果待反馈，056间歇失败根因、现代其他发送端/内容、故障恢复及完整W01/F20仍OPEN。完成W01后统一更新全局tizen skill继续待办。

## 0.0.57连续切P复测失败：目的地家族拒绝（2026-10-16）

W01/F06/F20。用户“报错了，无法连续切换-诊断已开启”，连续三次检查USER FAIL；用户未明确第几步，不能补写具体P。UTC21:38:46.206783匹配已装source 915987f0ebfcda82ac99bfe565ae2c850318c082e47fc3c6659b7df2571a0f3e / signed e8927634089d4307a80b6ffc56e2f262d52ef2ae1dede27c18cbb804216323d0。offer_trace_v1_n_40049c只有首源g1/missing接受，随后g1/playing/session/remote=false发生policy_destination_akamaized；没有任何换源接受或transition摘要。因此本次被观测的新源在进入旧decoder关闭/native换源/新prepare之前被目的地策略拒绝，不能归因到SDK prepare超时或四源预算。

退出缓存cast.exit_g1_idle_s0、native_closed_confirmed DEVICE PASS；HTTP报告PASS/GET后端口关闭true、marker1。receiver_v2_7a0c22ef、source_init1/moov_first、flow_s_c0_p0_w3_m6_l6及held_b0_t0按整会话保留，不分配到未接受的新P。私密独存device-native057-android-ugc-repeat-policy-fail-report.json / -observation.json。上一轮两次切PUSER PASS保留；这不是稳定性已通过。

现有分类仅定位akamaized.net家族，未捕获精确主机。0.0.58按ADR-018仅拟支持Bilibili官方测速列明的upos-hz-mirrorakam.akamaized.net精确节点，不能由家族拒绝假定手机一定使用该节点；补固定accepted_bili_akam才能在新包核对实际接受的主机类型。不放行其他共享CDN主机/子域，TLS/凭据/重定向/路径/格式/期限/累计预算保持。候选尚未部署或真机验收，W01/F20继续OPEN。

## 0.0.58精确Bilibili Akamai节点候选（2026-10-16）

W01/F06/F20、ADR-018。TS SOAP验证/分类与C cast_source_valid仅新增upos-hz-mirrorakam.akamaized.net精确主机；其他共享CDN客户/子域/后缀伪造拒绝，游客/账号目标未变。仍要求HTTPS候选、/upgcxcode/*.mp4、唯一有效deadline、TLS/CA、禁止redirect/凭据/代理、512字节范围和真实MP4预检，控制权/代次/关闭ACK/4源及原累计预算不变。固定原因槽31新增accepted_bili_akam，只有接受精确节点意图时记录，不等同TLS/prepare或声画已成功，原IPC916/8条4096字节/最近4条限制不增长。

一手依据与动态页面限制见ADR-018。057实际失败只定位共享CDN家族，不能事先假定精确节点已命中或所有前轮失败同根因。严格TS/模块边界60模块、194单元/合同、29 HOST C源/换源行为检查已通过；实际Samsung legacy完整probe构建及modern selftest/validation/probe三链接成功，固定现代静态库/CA不重编译或修改。完整UI和桥/包验证尚在执行，实际结果后续追加。候选尚未签名/安装/真机验收，W01/F20开放。

### 058实际本地验证结果（设备尚待）

strict TS/边界60模块PASS；194单元/合同＋110完整UI＋29 HOST源/换源＋38 HOST桥＋6真实输入注入包检查＋2现代库Worker selftest＋2现代native加载/取消UI，共381项不同检查PASS。C11 Wall/Wextra/Werror syntax PASS；实际Samsung1.39.4.7 legacy完整构建、modern selftest/validation/probe三链接均exit0；现代静态库/CA/许可固定。与冻结057对照九C输入中仅probe-cast-source.h变动。UI是合成native/SDK夹具，HOST源/桥行为不是电视TLS/解码证明；native加载UI明确不假造桌面Tizen socket通过。

依赖selftest首次与完整UI并发占用4173，启动exit1/没有执行用例；已保留/tmp/bilisofa058-deps-ui.log，完整UI结束后原配置串行重跑2项通过，没有复用错误服务、改端口门禁或计入通过数。其余日志/tmp/bilisofa058-{check,unit,ui,native-source,native-bridge,candidate-package,deps-ui-retry,native-ui,modern-link,legacy-build}.log，git diff --check通过。接下来auto6源码/三类包门禁、签名/安装及实机结果独立记录；未执行真实账号写入、提交/推送/发布。

## 0.0.58精确节点候选已部署（多伦多2026-10-16）

W01/F06/F20，ADR-018，auto6/BiliProbe1.Probe，原Author/Public Distributor。source `2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479`，signed SHA256 `5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953`，native unsigned `ec70c3e47ff71e08d1ff761da410b07e92b0b3febd19fd72bb1f5f28380de902`，sourceZIP `a24f7e74ba55bd544deda5c76e62b8cf6a56d1d1828a5ea2c3e6ead31df3f13f`。381不同本地检查、strict C/TS与实际Samsung两路线构建链接、三类包/源码/依赖/许可/签名前置门禁通过；固定现代静态库未重编译。只新增精确专用节点，不加入共享CDN后缀白名单，不修改prepare/retry/租期/累计预算或权限/CSP。

首次安装前state为device但capability exit1/closed，未开始安装；下一次只重连原授权目标，state/capability恢复exit0后继续，未扫描/换地址。中断结构记录私密独存device-native058-preinstall-connection-interruption.json。实际UTC2026-10-17T01:34:59.866787（多伦多10-16 21:34）install/run均exit0并明确成功；UTC2026-10-17T01:35:12.780420（多伦多10-16 21:35）精确匹配source/signed报告仅有cast.ready进度和native_closed_confirmed DEVICE PASS，HTTP报告PASS/GET后端口关闭true、marker1。startup独存device-native058-akam-node-startup-report.json，不能升级为媒体兼容通过。

现代完整WASM `3b77ad88768af3fe1f8c4fc239b4abca55741af28268bfcbf87b22923a42cb55`，配对symbol map SHA256 `a7bb22cfe1d744bb5bfbdc47ddf3ff3d17522cf3891e96552443f546effce89b`，私密归档native058-network-symbol-maps.json及按WASM摘要目录，不进WGT/公开源码。不能使用057/056或独立005/006旧完整probe解释本次底层栈。

已请求同一Android短视频新会话P1→P2→P1→P2、每次正常声画约10秒，失败记步骤并最多30秒后结束，Back开诊断。本次重点核对accepted_bili_akam是否出现及三次实际切换声画；精确节点此前只由官方测速页面确认，057只给家族拒绝，故尚不宣称实际手机一定命中或故障已修复。057两次切P成功/连续复测失败、056间歇失败和PGC单次通过均保留。完整W01/F20、其他现代发送端/内容/恢复/性能/独立投屏和保护存储/真实会话仍OPEN，TV端F17目录等未实现。全局tizen skill按用户要求待完整W01结束统一更新；当前只维护项目经验。后续文档/current手动包与已装auto6冻结源分开，无提交/推送/发布或真实账号写入。

## 0.0.58约3秒停播失败与W01边界收敛（多伦多2026-10-16）

用户反馈“P1→P2 后仅播放3秒就停止了”，后两次切换未完成，本轮USER FAIL。UTC2026-10-17T01:40:36.054399报告匹配已装source `2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479` / signed `5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953`：FAIL cast.media_issue_206_28，offer_trace_v1_n_400仅首源g1/missing接受，无g2/换源摘要、无accepted_bili_akam；退出缓存g1/playing/s0。用户观察与日志媒体身份未对应，不能认定本轮已实际命中精确节点、P2已完成换源或所有历史问题同根因，也不据此否定用户实际停播观察。

206/28来自桥记录的HTTP206及超时分类；源码既可能从libcurl完成错误返回，也可能从桥的15秒上游无进展路径产生28，单标签不能进一步确定。flow_e_c2_p0_w8_m3_l6表示错误快照、2个活动本机客户端/0个paused、累计8窗口/向上取整3MiB、剩余租期l6为大于150秒的饱和桶，不能推断精确值或至少180秒；c2不是重试数，不足以判断重试是否执行或耗尽。native_closed_confirmed DEVICE PASS、GET后诊断端口关闭true、marker1。source_init1/moov_first和receiver_v2_5a0c00cf为整会话事实。报告/用户观察私密独存device-native058-android-p1-p2-early-media-timeout-report.json / -observation.json，startup及057成功/失败均保留。

按用户本轮明确要求，新建[W01固定剩余门槛](../../W01_EXIT_CHECKLIST.md)，当前剩余六组按功能和结束条件执行；纠正历史状态中把完整W04/W06内容/恢复矩阵及W07耐久都列作W01前置的过宽表述。连续/快速切P、第四代次/探针预算、多平台内容交叉、30视频/两小时等不继续作为W01人工加码；对应必需功能/已知缺陷留在后续原工作包，不视为删除或通过。当前先本地定位G1的206/28与代次对应，不发新测试要求或新安装包；本轮仅读取诊断/源码及更新文档，没有改运行时或重跑应用测试。后续测试必须注明G编号/假说/单路径/结束条件；同因两轮无新增证据停止重复人工操作，转本地或记录具体阻塞。W01未关闭，最终全局skill更新仍待W01结束。

## Tizen skill阶段性经验更新完成（多伦多2026-10-16）

用户明确要求先更新，覆盖此前等待W01结束的时间安排。已使用skill-creator更新全局tizen-tv-development入口和三个既有参考文件，新增retail-debugging.md；保留所有旧文件、frontmatter、agents元数据及调用策略。内容包括已证实的签名/工具链/Socket-curl兼容、AVPlay预缓冲/忙门闩、首次源握手/手机零时间、切源代次与关闭ACK、大索引、预算/证据配对、输入/存储及有限功能测试边界；未把未解决的058 206/28或CDN命中假说写成修复结论。

skill结构quick_validate PASS；20处本地链接/章节锚点全部有效，6文件保留/新增；私密备份和摘要/校验原件在仓库外。顺带依据producer更正058派生flow解释：l6为>150秒饱和桶，不能推断至少180秒；原始设备报告不修改，修正前观察留存。当前058失败与W01六组门槛保持。此轮没有运行应用测试、连接电视、构建/侧载包、修改运行时代码或提交/推送；skill校验不等于W01/产品通过。

## W01/G1：059范围读取错误分层候选（多伦多2026-10-16）

原058约3秒停播USER FAIL保持，实际触发客户端/媒体身份未确定。源码核对任意一条HTTP范围读取错误均会撤销整个receiver/关闭decoder；HOST双真实socket/cURL夹具已复现“一条206停滞、另一条仍正常传送正文”也产生全局206/28。首次fixture ACK读取被正常request进度干扰，修正有界读取后才得到有效旧逻辑失败；两份失败记录保留。此为具体可复现错误分层缺口，不冒称该TV原始请求重放或已确定所有早停根因。

按ADR-019实现059候选：仅在旧有限重试无法继续、该请求206/范围合法且另一个活动同源请求最近2秒真实传送正文时，每源最多隔离一次失效请求；其他故障仍按原路径。UI在有合法playing快照时核对真实进度，至少1秒墙钟与1秒媒体推进只记时间事实，并保留playing无推进5秒的监视，避免用少量缓存掩盖后续冻结；暂停/Seek不误用此时钟，仍受原操作/授权deadline。Stop/Back/Home/换源撤销监视；无可确认状态、5秒playing停滞、SDK错误或原生未知关闭仍结束。没有新URL/额外请求/扩大白名单/追加重试/延长prepare、上游15秒或原租期；IPC只增加4个媒体代次固定事实，916→920，报告8条/4096字节保持。

本轮strict60模块/C syntax、196单元/合同、41 HOST桥、29 HOST源/换源通过，51项相关cast/media UI初跑通过，最终进度监视完善后的5项定向仍执行中。6真实包输入/改动注入门禁已PASS，实际Samsung legacy完整编译和modern三链接exit0；固定库/CA未重编译。未重跑IME/Voice Guide/无关TLS矩阵。首次exactOptionalPropertyTypes失败已改显式undefined类型，编译配置未放宽。具体日志/tmp/bilisofa059-*；最终结果再追加。

当前电视仍058，未安装新候选。后续G1只同一短视频P1→P2一次，确认新内容声画30秒并停止/读诊断；不追加三次切换或长播。G2–G6保持固定清单，不执行真实账号写入、提交/推送/发布。

### 059最终相关回归与构建门槛

196单元/合同、41 HOST桥、29 HOST源/换源、6真实包输入检查通过。51项相关cast/media UI初跑通过；完善后续停滞监视后的最终5项定向全部通过（持续推进后换源、从未推进、Home取消、先推进后停滞、暂停超过5秒后继续），其中3项与初跑重叠，共53个不同UI案例，本轮不同检查325项，不把重跑相加。最终TS strict/60模块与git diff --check通过。实际Samsung legacy完整编译、modern selftest/validation/probe三链接通过；固定现代库和CA未修改/重编译。现代完整WASM c77d6706b0b178cb6b770059cb77758100619934857380e85d3a81af542061f6，精确symbol map 42fabfc2dcd18bf8efdc6bebe6e9fcdb830c32709d437b8fd1d2ea7fedb93dc2已私密按摘要归档。以下开始auto6打包/签名/部署，设备效果仍待，不沿用本地PASS冒充TV修复。

## 0.0.59 G1候选已部署（多伦多2026-10-16）

W01/G1、F06/F20、ADR-019。auto6/BiliProbe1.Probe，原Author/Public Distributor。已装source `a61da887fae8f8c314870c4099c5d0a476d08d0d66afa8eda7cd4fba46e18c7f`、signed `e09b618eee48122b778822b927b6a29f44591e305db41382b8e80969999f84a3`、native unsigned `9de47f9e6a154bed654400a25e02a9ae805e8fa6d7dc0b74f36305694fd5baef`、sourceZIP `06e30b10e227642eeebd1a9f8720c2400a65f127438aa6b680713e948f7c25de`。实际UTC2026-10-17T02:07:25.105420 install/run exit0且明确成功；UTC2026-10-17T02:07:33.879639+00:00报告精确匹配source/signed，cast.ready与native_closed_confirmed PASS，HTTP GET后监听关闭true、marker1。startup独存device-native059-range-timeout-startup-report.json，不能视为播放或隔离支路DEVICE PASS。

325不同本地检查、strict/C及实际Samsung legacy/modern链接、最终包门禁通过；完整WASM与配对symbol map见上一条最终回归记录，私密归档不入WGT。只改受影响读取错误分层及有界进度监视，无新依赖/权限/CDN放行、重试次数或期限变化。G1已请求上次同一短视频：P1正常约10秒→只切一次P2→确认新内容声画30秒→手机Stop/Back开诊断；P1或准备失败即结束，不加连续三切/拖动/长播。当前仍待实际反馈，058失败不覆盖。G2–G6固定，未执行账号写入、提交/推送/发布；后续文档/current手动包与已装auto6冻结source分开保留。

## W01/G1最小门槛通过（0.0.59，多伦多2026-10-16）

用户明确确认同一短UGC P1、一次切P、新P声画30秒及停止全部成功。UTC2026-10-17T02:10:13.668155报告精确匹配已装a61da887fae8f8c314870c4099c5d0a476d08d0d66afa8eda7cd4fba46e18c7f / signed e09b618eee48122b778822b927b6a29f44591e305db41382b8e80969999f84a3：exit_g2_idle_s0，transition_summary_v1_00f为第二代次四阶段完成；native_closed_confirmed PASS，HTTP报告PASS/GET后端口关闭true、marker1。offer_trace_v1_n_400482、receiver_v2_5a0c00ff、flow_s_c0_p0_w17_m25_l6及moov_first为会话摘要。无FAIL、无timeout隔离/progress事实；不能宣称隔离支路已在TV触发或所有早停根因已证实解决。

G1仅按固定退出清单这一条路径PASS；原058失败、连续/快速切P及完整W04/W06矩阵继续保留，W01/G2–G6仍OPEN。不再要求这条短视频重复切换。原始报告/用户观察分别私密归档device-native059-android-g1-single-transition-report.json / -observation.json，startup独立保存。下一步G2只用合成HTTPS/session值，不放真实cookies、不执行账号写入。

## W01/G2合成HTTPS/保护存储候选本地完成（多伦多2026-10-16）

ADR-020：新独立BiliNet001 007模式，电视内ephemeral TLS/Secure cookie两jar十二轮、明文/CDN/路径/redirect/清空对照及随机秘密KeyManager journal/重开删除候选。206单元/合同、12真实HOST HTTPS、13网络UI、6输入注入，共237不同本地检查通过；strict61模块及Samsung selftest/validation/https-session/probe四链接exit0。原主059完整WASM c77d6706b0b178cb6b770059cb77758100619934857380e85d3a81af542061f6逐字节保持；固定现代静态库和公共CA未改。没有重测无关播放器、IME、Voice Guide或整套TLS负例。HOST OpenSSL3.6.3与TV3.5.9证据分开，初始HOST/旧UI模式夹具失败及修正见ADR-020。当前尚未签名/部署007或得到本轮HTTPS/新秘密设备证据；G2保持OPEN。G1已通过，不再次要求切P。

## W01/G2合成技术链设备通过（多伦多2026-10-16）

独立网络007/BiliNet001.Probe：source `4ea66cdcc60db901b9f5769bf2ae6cd41d82ceed118de9da38aa51683438ccdf`，signed `83c48e6a08379385ca6aebf945afccb0a125d59f763fec778ae0e97c1dc26caf`；配对只读observer059/BiliIsola1.Probe同source，signed `9c597bdfc93407f289e14cafbde7be7e0f223849d4b1eeda01afcaf1cbb814f4`。签名证书叶的本地比较确认owner/observer/主059为同一Author，不公开证书或设备身份。007 UTC02:23:28、observer02:24:20安装/启动明确成功；原主059未升级，保留G1验收的确切包。

UTC2026-10-17T02:24:06.722837：007返回ephemeral_tls_verified、secure_cookie_wire、two_jars_isolated、redirect_not_followed、credential_scope_wire、clear_isolated及pass_all_closed PASS，12轮真实电视内HTTPS/HTTP合成交换已完成，保存合成秘密后vault.prepared_restart_required。仅本轮内存信任的临时证书，TLS校验不关闭，无外部测试服务器/固定私钥/生产CA变化。

UTC02:24:59.098131：observer身份及https-vault固定目标确认，读取BiliNet001指定alias返回NotFound；该单条仍为UNVERIFIED。UTC02:25:14.247179重新启动owner后vault.restart_digest_read_deleted PASS，证明重开后原秘密摘要匹配、删除后NotFound，补齐跨包读取前后存在条件。三份报告均精确匹配各自source/signed/app ID，HTTP GET后监听关闭true。只有三份配对才支持G2合成保护存储与跨包隔离结论，不把observer的NotFound单独升级为通用隔离证明。

报告/观察分别私密保存device-network007-https-vault-prepared-report.json、device-network007-vault-foreign-read-report.json、device-network007-vault-reopen-read-delete-report.json及device-network007-g2-combined-observation.json。公用输出改为NETWORK_DEVICE_REPORT/ISOLATION_DEVICE_REPORT/DEVICE_REPORT按身份分开，原主G1报告从既有归档原样恢复（非新收集）。HTTPS WASM `7b253e300521edb8b5ff6bc5f1d5395d9877a2b38798648196968af6962024cc`，symbol map `6ce457706193f6ca96bbb845f4ce222c6e2a37357e2aff61e703c28d966060f2`私密配对；主059 WASM未变。

G2仅合成技术链PASS：HTTPS cookie与存储探针使用不同合成值，不等于真实Bili登录/cookie导入恢复已通过，也不证明硬件密钥、额外密码加密、JS内存保密或原子覆盖。真实账号会话、一个指定视频进度及明确批准后的写回属于G3，现未执行。G1最小门槛PASS；W01尚余G3/G4/G5/G6，不增加测试组，不重新要求切P。237不同本地检查、严格类型/边界、真实Samsung链接与包门禁有效；未提交/推送/发布或执行账号写操作。

## W01/G3只读账号候选（设备前，2026-10-16）

用户指定BV14GHy6bE9n、方便稍后扫码。ADR-021新增独立account WASM/私密适配器/KeyManager固定测试slot/本地QR矩阵UI，目标aid/cid及95秒首P由公开官方view核对；仅固定GET generate/poll/nav/view/player/v2，没有业务POST。主059和007 G1/G2已验收工件保持，G3未通过。账号资料/QR/cookies只在专用私密链及TV界面，不进诊断或普通存储；本次会话只允许30分钟内恢复，物理删除需明确remove/NotFound结果，不能把TTL当进程退出后的自动擦除保证。

本阶段213单元/合同、8真实HOST TLS固定路由/作用域/导出恢复/拒绝不当domain与NUL/取消/清理、5账号Worker/UI、6实际候选输入门禁共232不同检查通过；严格TS/67模块，Samsung selftest/validation/https-session/account/probe五链接成功。之后补完一次固定from=空参数规则、自动退出/重开编排与精确操作/HTTP/cURL故障码，最终同范围回归和包门禁尚待最终记录；不重复整个媒体/输入或007 TLS负例。

真实官方匿名QR响应是account.bilibili.com固定新路径、callback=close和可选空from。HOST合同对照最初拒绝真实返回，修正这两项有证据的固定字段后最终实接口对照PASS；不放行任意callback/from/未知参数。默认Python parse_qs漏空字段是漏判来源，原失败保留，QR key不存/不打印、没有poll或真实账号读取。官方静态入口没有旧poll字面量，不能假称静态源码已证明完整协议；新路线最终仍须TV/用户扫码确认。扫码渲染qrcode-generator2.0.4、精确runtime hash及MIT文字/notice均记录并检查；单个UI模块依赖白名单不扩大到任意runtime包。

G3当前只读/恢复准备不含进度写回授权。last_play_time先以原始数值显示并保持单位未证边界，不把匿名0或fixture52000当真实云进度通过。实际写回须先落实可审阅目标/秒数/一次请求及unknown回读，获明确批准才执行。候选尚未安装、未请求本轮TV扫码；实际包/源码配对和反馈后续追加。

### G3设备前最终结果

最终strict/67模块PASS；213单元/合同、8 HOST TLS、5账号UI及6输入门禁合计232不同检查PASS。新增from空字段与callback规则、原始进度命名、30分钟恢复窗口、报告取走后退出/新document自动恢复、错误/取消/未知关闭清空QR及个人显示、实际操作/HTTP/cURL故障码均已在最终同范围回归覆盖；UI最终含QR已显示后原生未知关闭，5项15.2秒全部通过。C未再变，Samsung五链接有效，固定库/CA/主059 WASM保持。原实际二维码合同两次拒绝及最终PASS留在本地记录，不冒充真实账号成功。接下来只签名安装008并准备一次扫码/身份/只读进度；不包含进度写入或产品全验收。


## W01/G3只读探针008已部署（2026-10-17）

实际UTC2026-10-17T02:55:34.163670+00:00，BiliNet001.Probe / 0.0.8 / account-readonly-manual安装和CLI启动均明确PASS；source `4db27e11fac5eb95e58d7027a54e5e8db09de916aae690afd4f741c5c35b809a`，signed SHA-256 `01eebbb3a6c9580a9d27cf40a9fb3f7c094497b678b873c24fb4b28ab52cc67d`。私密device-g3-network-deployment.json与冻结源码/签名包保留；主059没有升级，007三份G2通过报告另存，不与008账号证据混用。

已请求用户在电视一次扫码并核对本人身份、BV14GHy6bE9n返回的原始进度数值。未收到用户结果前不提前取走报告触发自动退出；确认后分别采集首次登录保护保存/退出重开同UID恢复的报告。实际扫码、云进度读取、恢复及最终本地会话删除均尚未取得证据，G3保持OPEN。232项设备前检查只证明相应本地合同/夹具；不冒充账号通过。本包固定GET只读，不含云进度POST，真实写回仍需可审阅目标/秒数和一次单独明确授权。

## W01/G3首次扫码与只读结果（2026-10-17，008）

用户确认本人身份匹配、指定BV14GHy6bE9n返回进度原始值0。UTC2026-10-17T12:29:43.716273+00:00的报告精确匹配008已装source `4db27e11fac5eb95e58d7027a54e5e8db09de916aae690afd4f741c5c35b809a` / signed `01eebbb3a6c9580a9d27cf40a9fb3f7c094497b678b873c24fb4b28ab52cc67d`，`account.readonly_saved_closed` PASS、GET后监听关闭true。这证明本次真实扫码、身份/指定内容只读请求、KeyManager保存读回与原生关闭的路径；0不能证明非零续播、手机历史一致或写回通过。报告和仅含上述非秘密事实的用户观察已分别私密归档device-network008-g3-login-readonly-report.json / -user-observation.json。

首次报告取走后CLI再次run明确成功，但后续45秒collector未收到匹配恢复报告，不能把CLI启动PASS当同UID恢复PASS。已只请求用户描述当前界面/固定account代码，不重复扫码或清除会话。首次退出定时器与重新launch顺序、保护会话30分钟有效期等尚未有根因证据，不作确定归因。恢复、本地删除、经明确授权后的一次写回/回读仍OPEN。此次无业务POST、没有真实云进度写回；旧G1/G2通过不重跑。

### 008恢复核查：可见身份不代替关闭/恢复证据

用户补充重开命令后电视仍显示本人身份/进度，记录为界面观察。再次打开“读取状态”后，UTC2026-10-17T12:33:37.859448+00:00取得同source/signed报告：`account.cleanup_unconfirmed_restart_required` UNVERIFIED，报告GET成功/监听关闭true。此代码可能来自账号或报告Worker的关闭屏障，现有008报告不能区分；不能归因为KeyManager导入失败、TTL过期或原生库故障，也不能把仍可见身份当新document的同UID恢复成功。该份私密归档device-network008-g3-reopen-cleanup-unconfirmed-report.json，不覆盖首次readonly_saved_closed PASS。

标准SDB app_launcher -k本探针返回exit0但正文为空，不作为确切终止证明。依据Samsung官方Terminating Applications指南的Return/Exit长按强制终止行为，请用户只结束当前探针，然后由开发电脑启动同一008并自动取证；不清除/枚举保护存储、不重复扫码、不执行云进度写入。只有拿到restore_readonly_closed才将恢复子项标PASS；未知清理仍保留，不以进程终止重标为正常关闭。

### 009设备前最终检查（2026-10-17）

针对启动诊断缺口的三个新UI案例在旧008生成包全部因缺少报告而失败；009新生成包8项账号UI全部通过（15.6秒），含新增过期/损坏/不可读自动报告、既有登录保护保存/重开恢复、错UID拒绝、取消/Home及原生未知关闭。6项真实候选输入/改动注入门禁、strict/67模块通过。本轮14个不同相关行为/包检查，不与008的232累计重跑相加；无关媒体、IME、TLS矩阵未重跑。C输入和四组最终WASM与008一致，不声称SDK重编译。运行时仍只读，启动错误只输出固定分类、不删除或覆盖会话。

## W01/G3：009诊断包部署与当前阻塞（2026-10-17）

用户明确长按Return/Exit退出008后，CLI启动008成功，本轮45秒仍未收到报告；不以此判保护存储不存在或恢复失败根因。随后009补启动错误自动报告及关闭组件分类，8相关UI/6输入门禁与strict通过；C/账号网络逻辑和四组WASM全部与008相同，不重新编译SDK、不改保护存储TTL或执行POST。

UTC2026-10-17T12:48:23.173596+00:00，009/BiliNet001.Probe/account-readonly-manual安装/启动明确PASS。source `fa35f7b29d83c84384db9a3bb9c251eedd8ce6cd5e5280a2456305446d95f745`，signed SHA-256 `048bdc74b916755fc3a777f44cc46e4a15449a89a7c44a788772c86e7b398df3`。部署前capability初次失败，经同一授权目标断开/重连后成功，原始日志仓库外保存；不归因为签名错误。008原签名包、源码ZIP、deployed-network008-readonly-manifest.json及各报告保留。主059未升级。

009启动后45秒collector仍未取得报告，亦无旧build误配报告。当前源码在hasSaved返回false时不自动报告；恢复/错误报告也依赖前台、平台取地址及原生reporter，因此无报告不能单独确定保存项缺失、过期、恢复中或未进入前台。已只请求用户反馈当前顶部account代码/文字或电视主页，不请求重新扫码/反复点击，不继续猜测补包。首次008真实身份匹配/原始进度0/readonly_saved_closed证据有效；同UID重开恢复、非零进度、一次明确批准后写回/回读及最终固定测试slot删除仍OPEN。没有执行云进度写回或清理他人账号数据。

### 010修复设备前结果（2026-10-17）

真实链接WASM连接生产Worker的重入夹具修复前10秒无终止帧，native trace可见拼接终止消息；延后C调用后，同一夹具65毫秒内收到独立AUTH:ready/AUTH:closed及合法invalid_closed（首HTTP故意拒绝，未发真实账号请求）。ready后microtask取消60毫秒内确认cancelled_closed，未导入/发送请求。直接C导入/导出/清空关闭与成功进度回调重入模拟、登录/恢复/错UID/取消/Home/原生未知关闭/三种启动错误共12个相关浏览器案例PASS（19.2秒）；7账号单元、6候选输入门禁、strict/67模块PASS，共25不同相关检查，不累加重跑。原生C输入/四组WASM及私密精确symbol map保持，无SDK重编译声明。

新增测试直接运行本地实际链接的account WASM，生产Worker夹具仅拦截首个auth_begin在HTTP前返回0，并使用合成cookie；不通过模拟C函数掩盖stdio行为。诊断阶段输出过的合成fixture trace只在本地保存，没有读取真实cookies或将原始TV捕获放进源码。008首次登录/009关闭未知仍保留；010待实际TV恢复，未宣称G3或所有关闭故障已修复。

## W01/G3：010已部署，旧会话恢复窗口失效（2026-10-17）

UTC2026-10-17T13:03:52.074085+00:00，BiliNet001.Probe / 0.0.10 / account-readonly-manual安装/启动明确PASS；source `daa6ce0615c4a901e3cd8b87efff1b41947903218d4e12e5ebeaafdd499f7d35`，signed SHA-256 `3de86ffdddd0d0f47de8e3d46aec50535d9405beba7cac5da18c35924a08b55d`。准确源码ZIP/签名包/部署日志私密保留，主059未升级，账号C/WASM与008/009一致。本地25项相关检查与strict有效，不把TV尚未运行的恢复路径标通过。

UTC2026-10-17T13:04:01.925184+00:00精确配对报告为account.saved_session_expired_startup UNVERIFIED，GET PASS/监听关闭true；说明固定保护保存项可读，但有效期在允许30分钟窗口外，启动时未进入账号网络Worker。该分支不能证明重入修复的TV效果，也不能反推008/009的Worker关闭未知是过期导致。报告另存device-network010-g3-expired-startup-report.json。首次008登录、原始进度0、关闭未知及本次超窗口各证据分开。

因此只请求用户一次必要的新登录：先清除本探针固定测试slot并看到local_session_deleted，再在010扫码、核对身份/指定视频进度。待用户看到结果后立即采集，明确等待自动退出后再重开取同UID恢复报告；不重复G1/G2或请求更多视频。真实云进度写入仍未授权、未执行；G3剩恢复、一次可审阅且批准后的写回/回读及最终固定slot删除，G4/G5/G6不变。

## W01/G3：010真实重开恢复通过（2026-10-17）

用户确认旧测试slot清除后、新扫码、本人身份与指定视频进度显示均按预期；旧slot删除为USER OBSERVATION PASS，没有将未采集的旧删除报告伪称DEVICE证据。UTC2026-10-17T13:08:41.140155+00:00收到readonly_saved_closed PASS，等待自动退出后启动同一010，UTC13:09:07.557567+00:00收到restore_readonly_closed PASS；两份报告精确匹配source `daa6ce0615c4a901e3cd8b87efff1b41947903218d4e12e5ebeaafdd499f7d35` / signed `3de86ffdddd0d0f47de8e3d46aec50535d9405beba7cac5da18c35924a08b55d`，各GET后监听关闭true。后者要求从KeyManager导入凭据、nav完整UID与保存UID相同、固定view/首P和进度读取成功及原生关闭ACK，不能由CLI启动或可见旧身份代替。本次恢复路径DEVICE PASS，008/009关闭未知历史保持。

报告分别归档device-network010-g3-fresh-login-readonly-report.json / -restored-readonly-report.json，用户清除/新登录观察另存；本次反馈未提供新的进度原始数值，不把旧0机械赋给这次读取。010本次新保存项仍用于下一只读预览，未宣称已最终删除。G3最后的一次云进度写入仍未授权、未执行；一次明确批准后的写回/回读及最终清除继续开放。

## W01/G3：011写回候选与真实只读预览（2026-10-17）

只读登录/同UID重开已由010两份报告证明，见上一节。011在独立BiliNet001中加入ADR-022的一次确认能力，主059保持原包。最终011/account-progress-preview-manual实际UTC2026-10-17T13:34:48.757599+00:00安装/启动PASS，source `8ba7f48d667354d41ba7b206e522cf6d5169d815cba95b856e172cd50c82efdd`，signed SHA-256 `593a00c2a91daa25867c377831a6e86750b10294a144c904838b432647d5d183`。初版011 source57fa1fab/signed4abacfd原件另存，最终诊断修订未改C/WASM或写回策略；源码/签名包/部署记录按各自完整hash保存，不覆盖假配对。

UTC2026-10-17T13:35:29.899486+00:00的最终配对报告为progress.preview_ready_no_write UNVERIFIED，HTTP报告PASS/GET后监听关闭true。此固定分支只有同UID/指定单P与95秒读取成功、返回原始进度0、无防重复意图时出现；实际仅GET，没有启动POST Worker，也未创建写意图。这证明最终候选的真机只读预览，不证明真实写回已通过。报告私密归档device-network011-g3-final-readonly-preview-report.json。

50个不同相关检查PASS（13单元、13真实HOST TLS、18不同浏览器、6输入门禁），strict70模块及Samsung六链接/包许可门禁PASS。最终传递固定HTTP/cURL/API类别与实际回读结果，未知关闭单独报告；不存原始错误/UID/地址。真实账号写入仍未执行：已向用户提出具体授权请求——刚才同一账号、BV14GHy6bE9n首P、0→15秒、至多一次POST、只读回查、不自动重发。用户明确同意并在电视确认之前不执行；账号会话最终清除仍待，普通防重复意图不含凭据且保留以阻止再发。G3及W01保持OPEN；G1/G2既有通过不重跑。


## W01/G3：011一次授权写入已接受，回读未知（2026-10-17）

用户明确回复“授权且已确认＋Unverified progress.write_unknown_closed”，授权范围仅为刚才扫码同一账号、BV14GHy6bE9n首P、0→15秒、至多一次POST及只读回查。UTC2026-10-17T13:42:33.796936+00:00采得报告，精确匹配source `8ba7f48d667354d41ba7b206e522cf6d5169d815cba95b856e172cd50c82efdd` / signed `593a00c2a91daa25867c377831a6e86750b10294a144c904838b432647d5d183` / BiliNet001.Probe 0.0.11；固定代码为progress.post_accepted_closed及progress.write_unknown_closed，报告GET后监听关闭true。前者要求真实POST HTTP200/API0和原生关闭ACK，后者表示有限回读没有确认同CID约15000毫秒；不等于服务端没有副作用，也不等于云进度完成。不得重发POST或清除防重复意图。

原始脱敏报告私密另存device-network011-g3-once-write-accepted-readback-unknown-report.json，用户明确授权/观察另存；旧预览和010登录/恢复报告保留。当前只推进只读结果核查：011回读异常被折叠，诊断未区分“成功返回其他数值”和“读取失败”；30分钟本地恢复窗口也可能影响后续读取，采集时间不能反推出POST/回读时刻，不将其认定根因。已只请求结果页是否显示回读数值，无重复写入或重复播放。G3最后的回读确认及本地固定会话删除保持OPEN，G1/G2通过复用，G4–G6范围不变。


### 011未知结果后的本地改进（未部署）

保留电视011结果页和所有精确工件，不为补诊断覆盖当前用户可见结果。回读新增固定分类：目标命中并关闭、其他值并关闭、本地会话过期、读取不可用；本地过期后停止无效重复GET。已存在单次意图时，只读预览可单独记录当前固定CID/约15秒目标观测，但不据此推断是哪次请求造成，也不删除意图或允许新POST。界面明确已锁定、只读核查。未延长30分钟保护窗口、未放宽目标/账号校验，也未执行第二次业务POST。

本地8个写意图/合同单元和7个定向浏览器案例PASS，strict70模块PASS；新增接受后仍零、提交后过期与只读再次观测/重开防重复覆盖。浏览器在仓库外临时副本中运行，正式dist/已安装源码配对没有被测试bundle覆盖；初次临时配置服务路径错误、随后报告异步采集断言抢跑均保留失败日志，修正夹具路径/等待报告后7项通过。最终只读文案修订属于低影响文本，无额外测试计数。未重新编译C/WASM、打包、签名或安装，不把此本地通过记为011真机故障已修复。下一步只等待当前结果页的回读数值/无数值反馈，选择一次必要只读核查，不重发写入。


## W01/G3：012只读核查实际结果与013限定对照（2026-10-17）

用户确认011结果页无回读数值；这意味着没有有效回读，不等于读到了0。012（BiliNet001.Probe，account-progress-reconcile-readonly-manual）UTC2026-10-17T13:58:15.774673+00:00安装/启动PASS，source `64fab7122ecffa40557031196da4ab7eccdb0eb9520b936bcab40c431b7068e1`，signed `4c59a6c865b57a711da74bf8845b3b645e23ca9733f980bffe74e64b9d571aaa`。UTC13:58:38.513027+00:00报告为account.restore_readonly_closed PASS、progress.readonly_other_observed_closed UNVERIFIED，GET后监听关闭true。用户随后反馈0毫秒、未有对应分P历史（原文“上午对应分P历史”，按上下文解释为“尚无”）。本次从既有保护会话完成只读读取，没有重新扫码或第二次POST；本次恢复成功不能把011失败根因归为过期。准确工件及两类报告/用户观察私密保留。

012没有progress-worker.js、progress-post目录及确认写入按钮；只读account WASM/Worker与011逐字节一致。13项只读UI/strict70模块/包与许可门禁通过。保留旧写模式的7项夹具初次因012物理移除Worker而失败；补齐显式历史Worker夹具后7项通过，不向012包重新加入该模块、不扩大写入授权。

已审阅官方公开播放器core.147ce847.js（SHA256 05ff4195f5df34eeb8ed3271b0c9fa09b4f10c651e8762bfad732dacade4235b）使用/x/player/wbi/v2，而现有探针读取/x/player/v2；尚不能从路径差异推定实际根因。013仅准备一次自动同会话对照：GET nav完整UID与保存UID匹配、固定view、旧player/v2，再从本次nav公开WBI图片名生成签名，GET固定aid/cid的player/wbi/v2；后者必须自身login_mid等于保存UID，不能仅凭API0将匿名0当账号进度。所有值/账号资料只在私密Worker及电视显示；报告仅固定两路线目标命中/未命中、身份未确认或传输/API类别。两条GET读取都不命中时保留未知，不自动重发或添加其他业务写入。

新增独立account-readback原生程序仅有固定GET；原account/progress-post源码未改。只读比较候选继续不打包进度POST模块/按钮，保留无凭据的未知意图，最后固定保护slot删除仍待。新方案的构建/部署/设备结果另记，不能把候选准备当作013已验收或G3完成。G1/G2不重复，G4–G6范围保持。


## W01/G3：013双路线回查未命中，最终本地会话删除通过（2026-10-17）

013/BiliNet001.Probe实际UTC2026-10-17T14:08:32.551203+00:00安装/启动PASS，source `cf8dbf060ca365f084b4c679d8ce3d1bc95a977ab88371a950d067f1091e4b19`，signed `11ca7100b494479e05e1fa3681247cddd668027c354ad01549336e6195b3ed9b`。UTC14:08:55.132579+00:00收到account.readback_neither_target_closed及progress.readonly_other_observed_closed，GET后监听关闭true。该分支要求先前nav与保护会话完整UID匹配、固定内容/95秒相同、旧player/v2与动态WBI player/wbi/v2均读取成功且都未命中同CID约15000毫秒；后者自身login_mid也必须与保护UID相同。没有重新扫码、没有第二次业务POST。因此“单纯旧回读接口不对”假设不成立，仍不能把HTTP200/API0当持久化完成。服务端未返回可证明未生效原因的证据，不能猜测已确认是缓存、过期、账号隐私设置、缺设备cookie或缺少某个播放事件。

用户随后点击固定测试会话清除并确认“已清除”。UTC14:11:26.832442+00:00同一source/signed报告保留上述回查并新增account.local_session_deleted PASS，GET后监听关闭true；实现要求remove固定KeyManager alias后getData返回NotFound。此为最终本地测试会话删除DEVICE/USER PASS，不删除云端历史或防重复普通意图。013只读包没有进度POST程序/按钮；19个运行时文件与安装签名包一致，原011写回、012只读零值、013比较/删除及各源码/签名原件分别保留，不能以删除报告覆盖未知结果。

013设备前4 HOST真实TLS、4定向浏览器及strict71模块PASS；Samsung七程序实际链接/许可/包门禁PASS，原account WASM仍为bc5696343d6496a2d109482a738e3fc3847bab8ae052f395b8c4384b54d218c5，新account-readback符号表按实际WASM hash私密归档。观察包打包曾在主原生包重建并行期间被来源校验拒绝，按依赖顺序重建后通过；没有放宽门禁或改变已装包。G3恢复和最终删除已通过，仅云进度提交有效性OPEN；一次授权已使用，禁止自动重发/增加点击统计或伪造观看时长。下一写入方案需先基于真实播放与当前Web流程准备成可审阅候选，再单独取得具体授权，当前阶段继续其他不受影响门槛。

### G4推进边界

用户明确“没有该画质/权限，先跳过”：4K/HDR样本记录为外部条件不足/未验证，保留F19与W01缺口，不购买、不借账号或降级需求。继续直播/1080P相关准备；普通1080P标签不等于高码率，元数据分辨率也不等于实际HDR输出。060候选新增仅只读的AVPlay当前流信息提取，起播实际时间推进后记录有界宽/高/码率/白名单视频及音频codec；不输出原始extra_info、不改变播放/清理/手机控制。健康诊断保留该单条事实，已有FAIL/BLOCKED/未知清理优先。依据Samsung AVPlay API的getCurrentStreamInfo状态与extra_info字段合同，官方文档本身不作为目标TV解码或声画验收证据。

官方来源：https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html 。060局部单元和包/部署证据另记，未提前宣称G4或最终W01通过。


## W01/G4：060只读流信息候选已部署（2026-10-17）

0.0.60 auto6 / BiliProbe1.Probe，UTC2026-10-17T18:02:33.674007+00:00实际安装/启动PASS；source `bbf8356d4382aed33fba846975bb7fba7522b62d063c698d78982aa61414fcd3`，signed SHA256 `7a4db2a16b51351a5c4a53df4762ab1401251b5512301eee16bc5b4db951741c`。SDB旧连接首次capability失败，对同一授权目标断开/重连一次后capability/install/run明确通过，不归为签名故障。UTC18:03:00.749349+00:00自动报告cast.ready UNVERIFIED、cast.native_closed_confirmed PASS，marker1，GET后监听关闭true；这是启动/监听清理通过，实际1080P仍待用户反馈。

该包只在起播实际时间推进后读取一次SDK当前流信息，输出固定宽/高/码率/白名单codec或stream_unavailable；0表示字段未知，不代表0码率。遵守官方READY/PLAYING/PAUSED状态合同，拒绝过量/超长/损坏JSON、未知codec不出原文；既有FAIL/BLOCKED/未知清理不被正常元数据挤掉。未增加播放控制或改变网络/准备/seek/租期策略。原059的native JS/WASM/data、cast-worker与probe-worker五个文件与060逐字节一致，G1设备证据复用。65相关单元PASS（其中4项新流信息/诊断案例），一项完整浏览器控制与元数据导出PASS、strict71模块与打包许可门禁PASS；最后stream_unavailable保留修订复核4项，不重复计数。初版060仅本地签名未部署，签名/源清单另存；最终版本按上述完整source/signed配对。

059原件/源码/签名与已验收证据保留。060的11运行时文件与已装包一致；独立013仍为其自身source/signed，最终固定凭据已删除，未执行新的账号写入。4K/HDR用户明确无画质/权限、先跳过，保持外部条件不足/UNVERIFIED。已只安排一条可用1080P普通短视频约30秒声画/停止及手机画质名称，实际分辨率/码率由报告核对；不要求再做暂停/seek/切P、更多视频或交叉矩阵，不把手机1080P标签直接当高码率/解码通过。直播及倍速缺口继续OPEN，G5/G6后续安排。


## W01/G4：060实际720P，继续限定直播准备（2026-10-17）

用户反馈Android与苹果端均尝试画质入口、播放正常，但1080及以上受发送端“官方投屏”提示限制；用户随后明确确认“是，提示仅官方投屏设备可用”，按所测官方发送端对接收设备的画质入口限制记录；不归为电视解码失败，也不推断账号权益根因。UTC2026-10-17T18:08:17.174180+00:00最后一场报告精确匹配060 source `bbf8356d4382aed33fba846975bb7fba7522b62d063c698d78982aa61414fcd3` / signed `7a4db2a16b51351a5c4a53df4762ab1401251b5512301eee16bc5b4db951741c`，avplay.stream_v1_w1280_h720_b785454_vunknown_aunknown，cast.native_closed_confirmed PASS，报告GET后监听关闭true。只能证明最后一场实际1280×720、约0.785Mbps与清理；不能分别给两端分配此流事实，也不证明1080P高码率、codec/HDR或G5整套控制。060实际流与用户观察分别私密归档，不再请求相同画质操作。4K/HDR仍按用户要求先跳过/UNVERIFIED。

G4直播转入ADR-023的独立匿名固定room6 HLS候选：HOST官方API/清单/512字节分片正例已有来源证据；新增Worker有界TLS预检和直接AVPlay直播能力检查，不改已装060投屏后端。SDK后续清单/redirect边界单列，不能以curl预检推断SDK内部限制。尚未取得电视直播声画证据。G3云进度有效性、G4其他必要能力、G5/G6保持OPEN。


## W01/G4：独立直播014已部署，真实声画待用户（2026-10-17）

BiliNet001.Probe 0.0.14/public-live-manual实际UTC2026-10-17T18:27:24.759182+00:00安装/启动PASS，source `139f8012e5b2e3e23149315c8873d9c7eddf088bdcae36446405ff9407c62462` / signed SHA256 `276baee0d8b54bc75635b0a1de358c53fe2f67695b40dd83f07417e9249a9a83`。UTC18:27:42.032164+00:00配对报告live.ready UNVERIFIED、HTTP读取PASS、GET后监听关闭true。这是应用/诊断启动清理证据，尚未运行直播原生预检或证明真实直播声画。九个运行时文件与已装包一致；新live WASM、符号表/精确源码/签名与各历史包私密保存，主060未重新部署。

13项不同相关本地检查通过：5纯合同/解析、4 HOST真实TLS、4浏览器模拟SDK（含C回调任务边界、正常/恶意源/取消晚回包/Home关闭），strict76模块及独立链接/扫描/许可/包门禁通过。当前官方公开API和实际HLS清单使用生产解析器的HOST有界正例通过：短号6→7734200、1354字节/2分片/target3秒，Range512的三个TS同步点通过；不是TV证据。未执行账号写操作、未读取/恢复真实凭据，G3未知意图保留。

只安排一次G4功能用例：点击公开直播、核对约30秒持续画面及同步声音、Back停声后自动开放诊断。不要求手机投屏、更多直播间/画质、再次扫码或复测G1/G2。90秒是本探针自动清理上限；当前真实声画与AVPlay后续HLS行为仍UNVERIFIED。1080及以上所测发送端入口明确限官方接收设备，4K/HDR按用户要求先跳过；其余固定门槛仍OPEN。


## W01/G4：014直播用户声画正常，连接错误单列（2026-10-17）

用户反馈“直播声画／Back停声：正常播放＋诊断已开启”。UTC2026-10-17T18:35:42.424101+00:00报告精确匹配014 source `139f8012e5b2e3e23149315c8873d9c7eddf088bdcae36446405ff9407c62462` / signed `276baee0d8b54bc75635b0a1de358c53fe2f67695b40dd83f07417e9249a9a83`，记录起播、854×480 SDK流字段和live.stopped_closed PASS，GET后监听关闭true；同时保留FAIL avplay.playback_event_player_error_connection_failed。用户确认基本声画/Back停声，关闭有设备证据；旧诊断未保存运行秒数/退出原因，故约30秒持续性与错误先后尚待一次无需重测的文字核对，不把这条错误改写成正常停止或把直播稳定性标PASS。SDK返回Bit_rate=99999999且codec unknown，未验证其对应真实码率，不能据此升级为约100Mbps高码率能力。原报告与用户观察分别私密保存。

本地匿名对新取得的同一HLS地址连续约40秒做8次有界清单刷新及各512字节TS前缀检查：均HTTP200/206、7次清单变化，生产解析通过，未复现连接错误；这仅HOST证据，不能解释电视错误或证明SDK后续请求策略。未请求用户重复直播。

修复一项本地诊断显示缺陷：原直播页停止的PASS会覆盖此前FAIL的可见状态；当前源码保留最近失败显示，新增退出原因/实际起播后的有限墙钟秒数（不是声画或进度证明）。4项相关浏览器模拟检查6.6秒通过，strict76模块/diff检查通过；在独立.local/live-ui-check运行，未打包/签名/安装，也未覆盖已验收014工件。这是为后续必要更新准备的诊断修正，播放/网络策略未改，不因此安排新一轮人工测试。

### G5下一项已准备

UTC2026-10-17T18:37:40.663540+00:00已用CLI重新启动原有主060（未安装新包，不以run证明新进程）；UTC18:37:45.790799+00:00收到原source `bbf8356d4382aed33fba846975bb7fba7522b62d063c698d78982aa61414fcd3` / signed `7a4db2a16b51351a5c4a53df4762ab1401251b5512301eee16bc5b4db951741c` 的cast.ready及cast.native_closed_confirmed PASS，GET后监听关闭true、marker1。当前前台已回主060，独立直播014保持已安装。只请求一轮iPhone官方普通视频双端时间/暂停继续/约60秒定位/停止；结果待用户，不复测切P、画质或长播。G3云进度有效性、G4剩余能力及错误时序、G5/G6仍按固定清单开放。


## W01/G5：060 iPhone/iPad最小回归通过；G4直播断流明确失败（2026-10-17）

用户分别确认iPhone和iPad的一轮普通视频双端时间、暂停/继续、约60秒非零定位恢复声画、手机停止全部正常。UTC18:42:03.887714+00:00 iPhone与18:46:26.498948+00:00 iPad报告各自匹配主060 source `bbf8356d4382aed33fba846975bb7fba7522b62d063c698d78982aa61414fcd3` / signed `7a4db2a16b51351a5c4a53df4762ab1401251b5512301eee16bc5b4db951741c`，均有native_closed_confirmed PASS、诊断GET后关闭true/marker1。iPhone receiver_v2_7a0c22df含Play/Pause/Seek接受与完成、实际timeline、非零目标/hit，同时保留control_denied/denied_source_changed，未含Stop接受；手机停止仅记USER观察，不补自动事件。iPad receiver_v2_7a0c00ff包含Stop接受以及其他所需命令/非零目标hit，无miss；仅对应所用一款官方App，不分配到通用版和HD各一场。G5按一端一轮最小门槛PASS，不提升为完整F20、所有内容/画质或断网耐久通过。两份报告/用户观察分别归档。

用户对014直播进一步明确“中途自动停止或返回”：本轮持续直播USER FAIL，与已记录连接错误一致，主动Back停声未在此轮证明；此前泛化“正常播放”只支持曾有声画。G4直播不得标完成或正常停止。ADR-024新增独立015电视内受限HLS中转候选，逐次读取/校验/改写清单与分片，SDK只访问loopback、没有任意上游URL入口；原014失败保留。目前候选验证/部署结果后记，不先宣称修复；主060不更换，不重复G5。G3云进度有效性、G4剩余媒体能力与G6电脑关闭的官方投屏仍OPEN。


## W01/G4：015电视内直播中转已部署，待一次复测（2026-10-17）

BiliNet001.Probe 0.0.15/public-live-relay-manual UTC2026-10-17T18:50:19.291012+00:00实际安装/启动PASS，source `81456af6a52f3a1ca1b5befb5cafcfcf971764e1183f256c91c1d06a983a6cb0` / signed SHA256 `481d2930293ae87dbc7fd4784fb06ea8d1027bff6f1501e2511a2270effb7f3c`。UTC18:50:28.787373+00:00配对报告live.ready UNVERIFIED、诊断读取PASS/GET后监听关闭true。仅证明应用与诊断启动清理；直播中转尚未实际运行，不先宣称修复。九个运行时文件与签名安装包一致，精确源码/签名/符号/部署和报告私密保留，014失败原件不覆盖，主060原包继续保留。

独立Samsung实际链接/扫描、21项相关本地检查、strict77模块及包/来源/许可门禁通过。HOST当前官方源经生产清单解析/改写后，完整单个TS为392356字节、188字节对齐/同步点通过，改写3个依赖且无上游URL；未保存地址或媒体内容。这不证明目标TV持续解码或故障已修复。SDK媒体网络仅loopback40325，所有清单刷新/分片HTTPS由电视Worker受限处理；无新增账号权限或写入。

只请求一轮同公开room约30秒声画/主动Back停声，失败自动开诊断后停止，不重复手机、切P或长播。G5两端已按060各一轮最小门槛通过，G1/G2不重复；G3云进度有效性、G4待验证能力、G6独立投屏继续OPEN。


## W01/G4：015起播准备失败，016先自动取证（2026-10-17）

用户反馈avplay.prepare_invalidaccesserror_si、未起播。UTC2026-10-17T18:52:14.106646+00:00配对015 source `81456af6a52f3a1ca1b5befb5cafcfcf971764e1183f256c91c1d06a983a6cb0` / signed `481d2930293ae87dbc7fd4784fb06ea8d1027bff6f1501e2511a2270effb7f3c`：FAIL prepare_invalidaccesserror_si、exit_error_before_play、relay_summary_m0_s0，stopped_closed PASS、GET后报告监听关闭true。只能证明准备不可访问与零成功服务，旧包没有TCP接入/请求拒绝分类，不能断定SDK完全没有请求。真实G4仍FAIL，014播放后断流与015准备失败分开保留，不要求原包再试。

本地确认两个可复现缺口：40325仅在media-src而不在connect-src；HTTP服务拒绝清单Range及合法Content-Length:0。源码修正精确loopback connect-src、清单/分片单Range、HEAD忽略Range、接受唯一零Content-Length并继续拒绝TE/非零/重复长度及多Range。没有以放宽目的地、匿名代理或TLS换取兼容。是否命中TV实际请求尚未证明，不能称为根因已修复。

016候选新增只含计数/枚举的HTTP接入/解析/拒绝/方法与Range/零长度位集/末状态摘要；不记录路径、header、token或CDN地址。平台先对同一本地清单做有界no-cors fetch，opaque完成不算HTTP/解码PASS，需与原生服务数对照。包启动报告读取后自动运行一次固定公开直播，若实际起播则观察30秒后关闭并开放诊断；失败立即关闭/开诊断，不自动重试。先自动取证，只有已取得起播/持续记录后才请用户确认实际声画，主060/G5保持不变。新构建/设备结果后记。


## W01/G4：016自动30秒流程与清理通过，声画待观察确认（2026-10-17）

0.0.16/public-live-relay-auto-once/BiliNet001.Probe UTC2026-10-17T18:55:22.610783+00:00安装/启动PASS，source `61fa52c148bd5b1168e3b90ccee8403948fc0581e594b771f8434deac34741c1` / signed `bd55105bd64e2a2e16d63e47d700398516152436489c98783ed1b8a3bfa37a9b`。首次collector在部署完成前启动，持有旧015期望而拒收新016 startup；原拒绝记录保留，收到的build之后人工核对实际签名/安装016匹配，但不伪称该次collector通过或测得关闭。启动报告读取后触发唯一一次自动公开直播，没有要求用户重新点击。

UTC18:56:06.632593+00:00新的collector按实际016精确匹配，报告local_fetch_completed、playing、automatic_30sec_observation、exit_auto_wall_30s；HTTP摘要a30/q30/r0/f5/h200（30次连接/解析，0拒绝，GET与Range位，末状态200），成功服务m18/s11；无FAIL条目，stopped_closed PASS，GET后诊断监听关闭true。本次电视真实传输/AVPlay起播→30秒自动观察→关闭流程DEVICE PASS，声画同步需用户观察，不用时间回调/墙钟直接判声画PASS。SDK字段854×480、Bit_rate99999999、codec unknown保持元数据，不当实际高码率证明。

当前请求确有Range，仍无逐资源Range位或单变更对照，不能断言015具体是清单Range/CL0/connect-src哪项导致；仅记录本地缺口已修正、新组合路径已走通。014中途断流和015准备失败原件不抹除，不宣称全部直播/长播/F20直播通过。4项HOST relay、7项纯合同/重写、7项浏览器通过（最后自动关闭原因修订只复核1项，不重复计数），strict77模块、独立Samsung链接/许可/包门禁通过。共享预检4项沿用上一轮未改基线，不伪称本轮新跑。九个运行时文件与安装包匹配。

只问用户刚才自动直播声画是否正常，无需重播；未注意则保持声画待验收，不补写通过。G5主060两端最小门槛已经通过，G3云进度有效性、G4其余能力与G6电脑关闭的真实官方投屏仍OPEN。


## W01/G4直播观察与G6独立投屏反馈归档（2026-10-17）

用户确认060电脑关机时实际官方投屏约30秒、Home停声、重开重新接收、手机停止的所列步骤通过，G6最小门槛USER PASS。本轮新的原生诊断未收到，不能以G5清理报告代替该会话的自动证据；不重复关电脑/冷启动。独立016在同一授权目标重连后恢复启动，用户实际观察约20秒画面/声音正常同步；既有UTC18:56:06.632593+00:00精确匹配报告证明自动播放流程30秒及原生/报告关闭，两种证据不混为“用户看满30秒”。最新观察后的诊断未收到，保留原报告，不造新报告。G4固定公开直播中转的最小可行性路径通过，014断流/015准备失败不删除，F20直播投屏和完整耐久仍待后续验收。

下一候选017仅匿名固定95秒公开视频的1倍→2倍→1倍；用真实oncurrentplaytime与单调墙钟对照，SDK接受不等于有效倍率/声音证明。主060包保持，G3防重复写入标记和已删除的账号slot保持；没有再次POST或扫码。倍速、1080高码率/4K/HDR与云进度有效性仍未关闭，真实设备/打包结果另记。


## W01/G4：017匿名实际倍速探针已部署（2026-10-17）

BiliNet001.Probe 0.0.17/public-vod-rate-manual UTC2026-10-17T19:17:23.636232+00:00实际安装/启动PASS；source `8f79a87048a818d61f0021b0b9d075151d015d6a676ae4e9b909c5a0a55a390b` / signed `d2a52f3f7f0527f7793d66de34e22e31e1b48a7d9fa0210ff7c1a9c0debd219e`。UTC19:17:29.651990+00:00匹配报告只有rate.ready UNVERIFIED，诊断GET与关闭true；不能当成实际播放/倍速/声画通过。九个运行时文件与安装签名包一致；源码ZIP/签名/部署/启动报告私密保留。主060已装包未改变，016旧源码/运行结果继续保留。

46项相关单元测试（含既有AVPlay回归）和7项真实Worker/模拟SDK浏览器行为测试通过，strict80模块/边界/diff、包/来源/许可/签名门禁通过。没有新编译native，也未声称本轮重跑旧TLS/原生测试：017复用精确现代probe JS/WASM/data。新能力仅内部setProbeRate门禁、倍率观察与独立界面；G3账号/POST代码不随包。人工只观察一次1倍→2倍→1倍及声音，实际结果待回报，不重测G1/G5/G6/直播。


## W01/G4：017真实1倍→2倍→1倍及声画通过（2026-10-17）

UTC2026-10-17T19:18:24.017037+00:00报告精确匹配017 source `8f79a87048a818d61f0021b0b9d075151d015d6a676ae4e9b909c5a0a55a390b` / signed `d2a52f3f7f0527f7793d66de34e22e31e1b48a7d9fa0210ff7c1a9c0debd219e`：p0_x1_matched_r100、p1_x2_matched_r200、p2_x1_matched_r100和closed_finished均PASS，GET后诊断关闭true。用户确认2倍画面明显变快、2倍有声音、恢复1倍声画正常，G4该匿名AVC/AAC分离MPD的实际倍速及恢复路径USER+DEVICE PASS。不把SDK stream codec unknown改为已测编码，也不由源声明推断任意编码/小数倍率/音高保持/投屏倍速通过。实际流640×360/148788bps，只是此样本，1080高码率/4K/HDR仍受已记录条件限制而UNVERIFIED。

原报告和用户观察独立私密保存。016固定公开直播最小路径已通过，G4不再重复直播/倍速；下一工作仅G3云进度候选准备，旧写入未知与防重复标记保留，任何新账号写入待具体授权。完整W01仍未通过。


## W01/G3：018真实观看后一次写回候选就绪，等待新授权（2026-10-17）

独立BiliNet001.Probe 0.0.18/account-observed-progress-manual UTC2026-10-17T19:27:44.395494+00:00实际安装/启动PASS；source `4c721599e3044d43d7183304966ae253ca567b1a92770e13b8d827c9a5e406c5` / signed `6e8acc5371e3becabc437960e49e7cfcd09744aeb6dbb0c48cf5ecaa10008ac5`。UTC19:27:50.063165+00:00精确匹配observed.ready，诊断GET后关闭true；仅启动证据，不是新扫码、实际观察或云进度通过。017已由同应用ID升级替换，精确源码/包与倍率通过报告保留；主060已装应用保持。原件/源码ZIP/编译输入与WASM符号图私密冻结。

实现见ADR-026。原15秒未知journal及已删的KeyManager slot不重建/删除/改名来绕过旧意图。新UI待用户扫码本人身份、从头正常观看约20秒；真实位置/墙钟/有效播放符合约束并确认SDK/原生关闭后，才展示20–25秒具体目标。另行知晓旧未知与确认才可提交一次新的真实观看退出进度，任意新意图状态均锁定再次POST。最多3轮当前WBI只读回查，需完整UID绑定、CID与实际秒数命中才算成功；API0/旧15秒分类不能代替。再次需要用户具体授权，本轮只启动报告，尚未执行新的真实账号请求/POST。

6项纯观察/权限/意图单元、7项HOST TLS POST线缆/签名/禁止重发/取消/非法及溢出观察值、6项真实Worker/模拟SDK UI流程共19项不同相关检查通过，strict85模块、独立Samsung实际链接/扫描、包/来源/许可/签名与diff门禁通过；重复修复后的同项复跑不另计。初始单元Scope字段序夹具不符、浏览器过早推进虚拟时钟及嵌套字符串换行转义导致的本地失败另存解释，未降低产品校验；不是新增电视业务失败。真实账号/云进度仍待本次明确新授权与设备结果。

若本候选仍不命中，保留未知并停止重复账号写入，转本地定位或具体外部阻塞；不扩展到其他账号写操作。G4直播/倍速已分层归档，1080高码率/4K/HDR因已记录入口/权限/样本条件继续UNVERIFIED，完整W01不先记完成。


## W01/G3：018新授权已使用，实际20秒写回后回读0，停止重复POST（2026-10-17）

用户另行明确授权同账号/BV14GHy6bE9n首P实际20–25秒进度的一次新POST及只读回查。UTC2026-10-17T19:32:01.981480+00:00报告精确匹配018 source `4c721599e3044d43d7183304966ae253ca567b1a92770e13b8d827c9a5e406c5` / signed `6e8acc5371e3becabc437960e49e7cfcd09744aeb6dbb0c48cf5ecaa10008ac5`：新扫码保护保存/原生关闭PASS、实际p20_r20_w20/媒体关闭PASS，progress.post_accepted_closed即HTTP200/API0/原生关闭，最终observed.write_unknown_no_retry；诊断GET后关闭true。用户随后明确结果页“云端回读0毫秒”。018只有完整UID绑定的当前WBI回查成功返回view后才赋positionMs，因此本次不是完全没有回读值；但报告不含每轮数值/次数/CID，不能补写三轮均为0或CID匹配。最终实际20秒目标未确认，G3仍OPEN，本次一次授权已使用，旧15秒与新20秒意图均保留且禁止重发。

只读诊断缺口因用户提供0毫秒已解决；没有部署额外019读回探针，不再请求播放/扫码/写入。官方公开固定播放器源码核对UGC type=3，与本探针一致；正常流程存在start=1→15秒periodic=0→exit=4序列，本候选只提交exit=4。这个实现差异不证明服务端必须先收到start，也不证明它是未保存的唯一原因；不得由API0推定写回有效或以协议猜测要求用户再写一次。纯本地继续核查/恢复接口，不执行第三次真实POST。账号历史设置是否暂停仅待用户已有使用情况确认，不要求实际观看或改设置。

本轮测试结束后仅清除本探针KeyManager凭据，保留两个非秘密防重复意图；删除确认待用户操作/报告。原始授权、报告、用户结果和授权使用情况分别私密归档，017倍速/G1/G2/G5/G6证据不重跑。


### G3本地恢复接口补全（未部署）

当前开发源码ObservedProgress.query仅对现有新意图做一次有完整UID绑定的只读回查；缺意图/无效目标拒绝，无POST、无reservation创建、无journal改写或解锁，命中只表述“当前值已观察到”，不推定哪次请求造成。submit新增有界readbackCode保留关闭/错误原因，避免以泛化unknown遮蔽回读失败与回读成功但不命中；旧15秒意图仍保持。9项相关单元（原6项+3项恢复），strict85模块/边界通过。仅源码实现，018已装签名/原始源码不改变，没有新构建、部署、第三次POST或新增用户播放请求。


## W02第四批：账号应用中的匿名媒体（2026-10-17）

见[W02_MEDIA_APP](../../W02_MEDIA_APP.md)。308项全量单元/合同通过（新增8），strict/102模块边界通过；10项账号UI回归＋6项实际游客JS Worker/AVPlay适配器UI通过，C/SDK/KeyManager为明确合成边界。3项打包拒绝负例通过，最终未签名0.2.0工件SHA256 `497e1f04a505368d82f39ddfdbc18d3bf6a2871deee84ce0192bf417dd20f93e`；代码/库/CA/许可/内容/ZIP字节门禁通过。未运行新的原生C编译、设备/真实账号测试或远端CI。截图显示桌面无AVPlay插件，不作声画证明。首轮TS测试收窄错误和首页第二行布局问题已修复并分别重验；初轮日志保留。旧060/018设备记录不改变。


## W02第五批：前台投屏装配（2026-10-17）

见[W02_CAST_APP](../../W02_CAST_APP.md)。320全量单元/合同（新增12）、strict/106模块边界、6投屏＋6媒体＋10账号浏览器流程及3打包负例通过。实际JS Worker/SOAP/接收器与SDK适配器运行；C/SDK/发送端传输/KeyManager为合成边界，不是真实官方投屏证据。0.3.0未签名WGT SHA256 `d607f9ea5814288988bbbb62f5f765a92e51839c99e3213523c0c7f3423163e9`；正常来源/CA/许可/内容门禁通过，未重编译既有C或签名/安装/运行远端CI。首轮ready UI类型映射缺口、Home测试错误焦点期望已修复；错误期望改为原投屏入口，产品Home/关闭策略保持。五分钟/四源内部限制不算F20完成。


## W02第六批：按身份本地存储与续播（2026-10-18）

见[W02_LOCAL_APP](../../W02_LOCAL_APP.md)。332全量单元/合同（新增12）、strict/111模块边界、8本地＋6媒体＋6投屏＋10账号UI合成流程及3打包负例通过。新路径运行实际JS Worker/平台适配器/本地Storage，C/SDK/KeyManager/发送端为明确合成边界。0.4.0未签名WGT SHA256 `264b39aad182a0dd926a7985023cb7cf0dffb81f555d79d3c17061cee895f211`；依赖/源码/CA/许可/ZIP字节门禁通过。首轮刚起播即返回漏存3项失败由prepare后缓存duration修复，未放松真实tick要求；初轮日志保留。未签名/安装/真实账号写入/原生重编译/远端CI；旧W01存储marker或账号包证据不转记新布局。

## W02第七批：类型化内容入口与持久化写门禁（2026-10-18）

见[W02_NETWORK_APP](../../W02_NETWORK_APP.md)。347全量单元/合同（新增15）、strict/116模块边界、10本地＋6媒体＋6投屏＋10身份浏览器流程（新增2项）、3打包负例通过；均未发送真实账号写入。覆盖写前持久化/回读、配额及静默丢写、结果保存失败/重建unknown、超时/取消/迟结果、同目标竞争、查询不能自动重发、身份租约装配及清除/移除保留journal。原生8文件与0.4.0逐字相同，无原生重编译或新的原生服务验证。

0.5.0 unsigned SHA256 `2cdb116c70dd45557c6146a0549e9885de28327ee444c62097e9a4d15dcb446a`，signed SHA256 `6f451c084947ccfe7dc8481866b821b69e347658e20eec3cf92a6e5447bc0b8c`。证书日期/发行方与内容一致预检通过。首装exit1、无设备错误码；改为无空格的同字节包名后，UTC12:57:45起部署state/capability/install/launch均exit0及平台成功。首次失败和两次安装分别私密保留，不声称已独立证明文件名根因。真实可见UI、声画、KeyManager/普通存储、Home与性能仍待新ID反馈，不用旧W01或本地合成结果替代。远端CI未执行。

## W02 0.5.0用户反馈与0.5.1失败取证（2026-10-18）

用户确认0.5.0焦点、成功视频播放/续播、Home停声及设置重开；首张卡在获取源时失败、换卡成功，游客播放只部分通过，具体源错误未知。0.5.1补MediaFailure严格合同、清理前首错保留、页面/诊断反馈；不改原生/网络/重试/播放器策略。353单元/合同（新增6）、strict/118模块边界、8媒体＋10本地＋6投屏＋10身份浏览器流程（新增2个取源故障注入）及3打包负例通过；C/SDK等仍为合成边界，不从HTTP403夹具推定原失败也是403。新增两项可见性/截图补验属于同项，不重复计数。

最终unsigned SHA256 `cc5a04e59c7ff4991ba47a5f6eac59e13493799ebb3988e2959e27a12010aec3`，signed SHA256 `6375d741a5040b1e18c65c530adda14741c6c191150640da5f05098abe1c849a`。首次capability预检失败未安装，仅重连原目标后UTC13:21:11起state/capability/install/launch明确成功。新包只待一次有界取源观察，未记真实失败已修复；原生8文件逐字复用0.5.0，远端CI/新原生编译未执行。完整工件及剩余边界见[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)。

## W02人工组合收束与W03排行榜（2026-10-18）

0.5.1用户确认新ID账号扫码保存/选择/身份匹配、账号30秒与游客10秒偏好隔离、显式退出重开后已保存账号复用及移除全部成功；最后一端投屏15秒声画/双端时间、手机暂停继续、电视Home停声、重开再次接收/停止也全部成功。具体发送端未补，不推定平台。非原生删除/自动报告，详见[W02_DEVICE_ACCEPTANCE](../../W02_DEVICE_ACCEPTANCE.md)。

W03 0.6.0真实目录WASM/unsigned包已生成；358单元/122模块strict、7 HOST原生TLS、4新目录＋34既有浏览器与5包负例通过，hash/首次失败修正/原件保存见[W03_RANKING_APP](../../W03_RANKING_APP.md)。HOST API首次200/API0/100条，但后续生产解析器实际得到200/API-352，两个项目UA相同，未确认根因/TV结果。只安排一次新功能检查，不将合成数据或已签名/启动代替电视排行榜验收。完整W03与F07/F19仍未通过。


2026-10-18追加：0.6.0最终38个浏览器合成流程全部通过；签名包与源码ZIP各自冻结配对。设备预检capability失败，原地址重连一次后state仍未确认，没有执行install/run。当前TV仍以0.5.1已成功记录为准，0.6.0未验证；失败尝试分开保存。部署工具改为仅install/run均成功才发布current记录，工具本次仅Python语法检查，副本及hash另存私密post-freeze记录；应用工件未变化。详见W03_RANKING_APP的当前部署结果。


2026-10-18连接恢复追加：用户确认电视已开机、IP未变。原授权地址connect确认后，UTC2026-10-18T19:36:08.792656+00:00开始的同一0.6.0包部署取得state/capability/install/launch四项exit0与明确平台成功。signed `3f549210bcbf8a573a0cc0815e7793efcb93e249ca02c78a72eaa255d7c99946` / UI source `7f697bfcefd3cb73b8da35e7d29d58a3a81c745201eca4a1ac6ea402b8817b41`，未重建或重新签名。current installed记录只在install/launch确认后发布，旧预检失败原件保留。已请求一次排行榜显示/前后页/普通卡短播与Back检查；USER结果未收到，当前不记排行榜或声画通过。之前HOST API-352是早前记录，不当作本次电视读取结论。私密deployed-user-online记录及日志已与初始source ZIP390c856cf3681b1df39a1f07ca420de1c1e0548bfb7d834ad148fd7183b943f3配对。


2026-10-18 USER追加：同一0.6.0签名包上用户按原步骤确认排行榜名次/标题显示、下一页→上一页、普通卡约10秒播放与Back回原卡全部通过。本组收束，不重复测试；不是所有排名卡可播、自动原生报告或完整F02/W03验收。早前HOST API-352保留，不能从本轮成功确定其原因。私密w03-060-ranking-user-observation已配对。


2026-10-18追加：W03/F03 0.7.0首批视频搜索：364单元（保留358/新增6）、127模块strict、8 HOST TLS/编码原生、5新输入/搜索＋38旧界面流程、7包负例通过。真实SDK独立search链接/原12条native字节保持/固定AOSP notice验证。HOST API0与412并存，无根因结论或TV声画推论；源码恢复/首次fixture失败/工件与唯一人工组见W03_SEARCH_APP。


2026-10-18部署追加：同一0.7.0包已由自有profile签名，signed SHA256 `d95c4be17b1c91fb8438e0c3bafd2eb66d7eea0663c1fecfb2b59a34cf5ec49b`，433文件源ZIP SHA256 `8e3a9c296f7344f13be1f6895e2ee1452af1a96761755b65b2410f3df7e40e97`。UTC2026-10-18T19:51:14.920430+00:00开始的state/capability/install/launch均exit0且平台明确确认，首次实际部署成功，无重连/失败安装或新证书操作。current installed配对已保存后才请求用户检查；0.6.0及其USER记录完整保留。已请求一次NH→你好真实搜索/前后页/短播Back与ZG输入Back组，USER结果尚未收到；不将CLI启动、合成43流程或HOST API0当作电视搜索/声画验收。


2026-10-18 USER结果：首次你好搜索search.http_412失败，第二次相同词成功；首次搜索卡播放ugc.audio_transport_28失败，第二次同视频成功；ZG后Back先清字母、再退出验证通过。保留首次失败与用户重试恢复，不记全组/稳定首播通过；回复未分别确认翻页和播放Back，不替用户补全。未另收原生报告，原因未定。本组停止重复人工尝试，后续改进显式重试与F03本地历史，不自动重发412。


2026-10-18追加：0.7.0 USER结果已分开保存首次搜索412、音轨28失败与第二次同词/同视频成功，ZG Back PASS。0.8.0新增历史/显式搜索重试、一次范围超时恢复候选；371单元、130模块strict、16媒体/10搜索历史/4目录/10本地/6投屏/10身份合成UI，具体首轮夹具修正与结果见W03_HISTORY_RECOVERY_APP。无新增TV结果、原生C/SDK编译、真实账号写入或远程CI；未把重试策略当作网络根因修复。


部署配对：UTC2026-10-18T20:12:18.640209+00:00开始，state/capability/install/launch四项均exit0且平台明确成功。signed SHA256 `2b9ab1275c1320d501f19fd7d46239274fba1a4779c219bd4e204444b1f374a4`，442文件源ZIP SHA256 `0c83dd8b70f47ffb03010cc7e7a43e331fc615f34d030c5a25c9b81f812479d1`，unsigned/source对应上文。自有Author/Public Distributor沿用，无新权限/证书/SDK变更，旧版本/首次失败记录保留。已请求一次新增本地历史USER组（记录一个词、退出重开、关闭记录/确认清空/再次重开），不要求播放或重现timeout。当前USER结果尚未收到；媒体超时恢复只为本地故障注入通过，真实根因与效果未确认。无新增账号云写入/CI/提交/发布。


2026-10-18：W03/F03热搜0.9.0：375单元/135模块strict、62浏览器、7 HOST TLS新原生检查最终通过，范围/首次失败与恢复见W03_HOT_SEARCH_APP。HOST真实公开GET一次HTTP200/API0/4828bytes/生产解析10词；不是TV通过。0.8.0本地历史USER三项最终全部通过，既有412/音轨首次失败仍独立保留。无新账号写入、远程CI或产品全验收。


0.9.0实际部署：UTC2026-10-18T20:37:43.314407+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `ec2911a90ec65380db16f95ea9ddc7ae6b8d2ab2a769c98973cd453ad2bc0cd2`，455文件源ZIP SHA256 `7cefe4099c26dcc2ba8dfc2d43fec8a32dc0112e3e5c746ab38a7a35aa7ab837`。沿用自有Author/Public Distributor，无新权限/证书/SDK变更；旧0.8.0工件及最终USER记录保持。9项包负例最终全部通过。仅安装/启动证据，新热搜功能USER仍UNVERIFIED，只安排一次显示/方向翻组/Back/选词组，不重测历史或媒体。


2026-10-18追加：W03/F03 0.9.1：已用官方SSR实际卡片隔离确认5:8时长造成旧解析拒绝，仅补零可通过；新生产解析原样通过四卡，分页为隔离夹具而非真实API成功证据。378单元、135模块strict、32相关浏览器、9包负例最终通过。20原生条目保持，无C/TLS重测。当前两次真实匿名API均HTTP412，根因未定，无TV失败原始响应，不称所有invalid已修复。见W03_SEARCH_FORMAT_FIX。


0.9.1实际部署：UTC2026-10-18T20:51:40.216791+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `42c35d1e4f24b2d07eef5f92fcafbb6bc0d804e8d2f85827eea0fc68a1eb1c89`，457文件源ZIP SHA256 `71c922e79cac113a4f3996f3ddf59c8bfd72835621c5b61cc2732388359ef384`。原20项native保持，自有Author/Public Distributor沿用，无新权限/SDK/凭据/存储变更。仅安装启动PASS，USER修复观察仍待一次搜索，不重试/不播放。HTTP412继续OPEN，旧0.9.0失败与材料保留。


2026-10-18：W03/F03 0.9.2公开nav→WBI搜索：382单元/136模块、33相关界面、11 HOST原生TLS及11包负例通过，Samsung实际链接search；原其他16条native保持。原项目匿名UA/TLS下，独立计算及生产C实际HOST各一次nav200/签名搜索200/API0/四卡，均不带账号Cookie；不是TV验收或全部412根因证明。协议/来源/字段和唯一人工组见W03_SEARCH_WBI_APP。


0.9.2实际部署：UTC2026-10-18T21:06:57.038990+00:00开始，state/capability/install/launch均exit0且平台明确成功。signed SHA256 `82669819d54dc324873e8af20cfe14f1ba0c215cc970e7ef7842aee6711d457c`，461文件源ZIP SHA256 `0bada7b2669a1c0c39a0f597c5fcdd04de2afdb496d54ee63bdd51c777e24856`。自有Author/Public Distributor沿用，无新权限/SDK/存储或账号变更；原其他16项native保持，旧search及失败工件保留。仅安装启动PASS，新协议USER首搜/前后页待一次固定组；不能记HTTP412稳定性或完整F03通过。


2026-10-18追加：W03/F03 0.10.0新增UP搜索按ADR-040；388单元/140模块strict、25搜索+10本地+4目录浏览器、12 HOST TLS与实际Samsung链接/来源扫描通过。新增UP真实TV功能待验收；原0.9.2首搜/前后页USER成功已分开归档。极值单元夹具128字符Scope修为合同允许64后通过，不改产品校验；未重跑身份/投屏全组。工件/包门禁/部署结果见W03_USER_SEARCH_APP。


最终包门禁：12项负例通过（保留11项，新增篡改bili_user固定类型后拒绝）；首轮新增断言误写route而工具实际返回query，修正断言后通过，未降低门禁。与0.9.2相比identity/native/catalog/hot-search共16条逐字节保持。unsigned `dist/BiliSofa-W03-user-search-unsigned.wgt` SHA256 `3ded7a58e8cbc6e8af1022c3fd4e50337f74a8e0cb03046273bff6ac73eb8adc`；signed SHA256 `6e0470f773e81fd853da6d2204be695ae782665c7dced34547ad9c2d8d907e9d`；UI sourceHash `88b17bb9926f452e73bd55a0c4a0f9b6a5aa10350da61740431156fff6f5faf5`。沿用自有Author/Public Distributor，签名日期/issuer及原包逐文件一致检查通过。签名不是TV安装或新UP功能验收；部署与USER另记。


0.10.0实际部署：UTC2026-10-19T00:45:07.465611+00:00开始，state/capability/install/launch均exit0且平台明确成功。此前同包第一次state成功、capability返回连接关闭，未安装；按原地址一次有界重连确认成功后，本次四步通过，失败原件保留。469文件源ZIP SHA256 `aa48a1ea3d64ea82216f83c5f3bb1f69a4b525a28ce40f0a2df100d3097dcbf5`，signed SHA256 `6e0470f773e81fd853da6d2204be695ae782665c7dced34547ad9c2d8d907e9d`，UI sourceHash `88b17bb9926f452e73bd55a0c4a0f9b6a5aa10350da61740431156fff6f5faf5`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；未改旧0.9.2及其USER结果。新UP真实功能USER UNVERIFIED，只请求交付页所列一组，不由平台启动推定搜索/声画通过。


0.10.0 USER：UP搜索/信息/上下翻页成功；附带预览音频超过10秒、跳转、返回后续播正常，但全程没有画面，预览声画验收FAIL。没有把音频/进度推进当画面通过；不重复已通过搜索/翻页，先核查新入口的嵌套模态遮挡与原媒体路径差异。用户结果按原signed/source单独归档，无新原生诊断。


0.10.1本地最终门禁：388单元/合同、140模块strict/边界、26搜索＋16媒体＋6投屏浏览器流程（共48项）及12包负例通过，重复执行不重复计数。新增遮挡场景对原0.10.0失败、修复后通过，暂停/seek/Back/续播/Home覆盖保持；本版未重跑原生HOST TLS或SDK链接，全部五类20条native与0.10.0逐字节一致。没有原始TV帧或解码报告，新版电视画面修复仍UNVERIFIED。


0.10.1实际部署：UTC2026-10-19T00:54:31.288236+00:00开始，state/capability/install/launch四项均exit0且平台明确成功；本轮无需重连/重复安装。470文件源ZIP SHA256 `b2d0eb27acecf2fa5e2953d2bfab0b55d19d447e5951f0ddd601ee1fc141a61c`，signed SHA256 `b30cba1d854721814dd889466d6f507a29f3c026304ccb391068900e3352d2ef`，UI sourceHash `ff72582724811ce1056f294409f85064774e0c1d865d1ea42c460a73d9bd028f`。源ZIP在部署前冻结，后续部署/文档单存delivery-records，旧0.10.0 USER画面FAIL不覆盖。USER修复结果待一次同预览约10秒声画与Back摘要恢复；仅安装启动PASS，不推定真实画面已恢复。


0.10.1最终USER：用户确认音画正常，Back后UP摘要恢复显示，唯一画面修复补验USER PASS，停止重复。结合0.10.0已有搜索/信息/翻页/音频控制结果，本轮UP搜索＋附带预览最小组合收束；0.10.0无画面失败原件保留，不重写为通过。没有新增原生设备报告，不扩展到完整UP主页/投稿、全部F03/F04/W03或v1验收。


0.11.0本地最终验证：394单元/合同、144模块strict/边界、31搜索（含5新PGC及UP画面回归）＋10本地＋4目录共45项相关浏览器流程和13 HOST TLS通过。搜索SDK实际链接/CA/私密模式与来源扫描通过。1920×1080番剧结果/摘要截图检查完成，仅桌面布局证据；原身份/投屏全组未本版重跑，不算新通过。完整PGC播放/选集未实现，新番剧TV查询仍待。


0.11.0包/签名：13项包负例通过（新增篡改media_bangumi固定类型后的拒绝检查）；identity/native/catalog/hot-search四类16项与0.10.1逐字节保持。unsigned `dist/BiliSofa-W03-pgc-search-unsigned.wgt` SHA256 `74f27184061749b17d305bb55b9d633573acb40248b3eade9e199c0df3462aea`，signed SHA256 `cb85dd37abc01ca036b7ba8f9a614c1a9f42a2c8c8756013aa30e0023dd0d55a`，UI sourceHash `302ba333087c6bc839477195a0462421550b541e103741a63b6b16044e311385`。自有Author/Public Distributor、签名日期/issuer和payload一致检查通过，无新权限；部署及USER另记。


0.11.0实际部署：UTC2026-10-19T01:10:24.084562+00:00开始，state/capability/install/launch均exit0且平台明确成功；本轮无需重连或重复安装。478文件源ZIP SHA256 `3a0db599d413c6364533a84db928dc215988564c5015b08907cc2d5c20ac72a6`，signed SHA256 `cb85dd37abc01ca036b7ba8f9a614c1a9f42a2c8c8756013aa30e0023dd0d55a`，UI sourceHash `302ba333087c6bc839477195a0462421550b541e103741a63b6b16044e311385`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；0.10.1 USER音画/Back通过及0.10.0原画面失败均保留。新番剧USER读取/摘要/Back待一次固定组；本次仅安装启动PASS，完整PGC播放/选集、F03/F04/W03及v1未通过。


0.11.0最终USER：用户回复全部符合预期、通过，所请求凡人结果显示/只读摘要/Back及单页下一页禁用最小组USER PASS，结束重复。本轮没有新原生设备报告，不推断真实多页查询、PGC播放/选集或完整F03/W03通过；旧版本失败原件保持。继续F03直播搜索。


0.12.0最终本地验证：400单元/合同、148模块strict/边界、36搜索＋16媒体＋6投屏＋10本地＋4目录＋10身份共82项不同浏览器流程通过；同项定向复验/重跑不重复计数。直播结果/摘要和紧凑首页1920×1080截图已检查，原UP合成视频平面回归通过。14 HOST原生TLS及实际Samsung链接/CA/来源扫描通过。初始两种UI失败、类型字段修正与旧stage中止记录保持，最终不放宽断言/超时。未执行新的真实账号动作或TV声画组；新直播搜索USER仍待。


0.12.0包/签名：14项包负例通过，新增固定live_room类型篡改拒绝；identity/native/catalog/hot-search四类16项与0.11.0逐字节保持。unsigned `dist/BiliSofa-W03-live-search-unsigned.wgt` SHA256 `6b53cd58266ee1ed32828b12b38a1c45f3db4017e4d0e78d2921eebdb27eefe7`，signed SHA256 `a083dee9daa7aac2bfef3f318050f49126077c2af7dc09fe6c5359cb7ca78516`，UI sourceHash `5258badfb329ef890eaf78abb64e336412abb7d21e77fcf9e009c99dc9c2229a`。自有Author/Public Distributor和签名日期/issuer、payload一致校验通过，无新权限；侧载/USER另记。


0.12.0实际部署：UTC2026-10-19T01:27:35.436992+00:00开始，state/capability/install/launch均exit0且平台明确成功，本轮无需重连或重复安装。486文件源ZIP SHA256 `822f2b05263f904094eb8c43e33e5a61c3a0b5bbd0e2ca4b11a07b931f73fa14`，signed SHA256 `a083dee9daa7aac2bfef3f318050f49126077c2af7dc09fe6c5359cb7ca78516`，UI sourceHash `5258badfb329ef890eaf78abb64e336412abb7d21e77fcf9e009c99dc9c2229a`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；0.11.0番剧最小组USER PASS及既有失败记录保持。新直播查询/分页/摘要/Back USER待一次固定组；本次仅安装启动PASS。未执行新的TV声画/账号组，完整直播播放、F03/F04/W03及v1仍未通过。


0.12.0最终USER：用户回复全部通过、如预期，所请求音乐直播结果/前后页/房间摘要/Back最小组USER PASS，结束重复。输入/历史/热搜、视频/UP/番剧/直播搜索的已实现分项最小链路均已有分层记录；不由跨版本最小组宣布完整F03/W03或直播播放验收。无新增原生设备报告，旧失败及修复证据保持。下一项W03/F02基础分区。


W03/F02 0.13.0固定分区榜本地：403单元/合同、151 strict模块边界、9 HOST生产catalog TLS/固定匿名请求/范围/拒绝未允许ID通过；真实Samsung SDK链接扫描通过。浏览器86个不同流程通过（目录8/搜索36/媒体16/投屏6/本地10/账号10），含分类键隔离/关闭门槛/三组选择/Back、分页/刷新/拒绝清空、媒体原卡及Home取消；合成AVPlay不等于TV声画。目录Home测试初轮7通过1失败，原因是测试未等待请求真正进入fixture即Home，补等待实际请求后8通过，原失败保留。生成器收窄项数时旧唯一数断言阻止生成/构建，修复后全部重跑。官方排行源码/公开配置支持14项映射，但独立HOST分类榜仅HTTP200/API-352；旧region API-404无HTTP状态，真实内容/TV仍UNVERIFIED。包负例/签名部署结果另附，不据本段推断已完成。见W03_CATEGORY_RANKING_APP与ADR-043。

0.13.0包门禁16个负例全部通过；未签名SHA256 `70371239493b49102f77dbc1672b820e01c05c60504070ea11717b5e113eacb6`，自有profile签名SHA256 `8e1ea33de31ca2171ada0f537ea1952bfdd581082521d8d5148d8e74e1df3325`，UI sourceHash `8cd9106cc8f4e6c4af9c80f281b1b1bc0f0d0050f8f1a445e86bcb8f8a795855`。签名确认原包内容加两份签名，无新增权限/SDK/证书变更；TV安装启动及新功能仍待，不由签名成功推定设备信任。


0.13.0实际部署：UTC2026-10-19T01:52:11.319639+00:00开始，state/capability/install/launch均exit0且平台明确成功。首次同包state通过、capability连接关闭（未安装）；原地址一次有界重连确认后第二次四项通过，失败原件保留。496文件源ZIP SHA256 `45ef3bde1f0b2367e1c60c1962281ea25042c1d30b0886b5549f1d493a452a8f`；signed SHA256 `8e1ea33de31ca2171ada0f537ea1952bfdd581082521d8d5148d8e74e1df3325`；UI sourceHash `8cd9106cc8f4e6c4af9c80f281b1b1bc0f0d0050f8f1a445e86bcb8f8a795855`。源ZIP部署前冻结，本次部署/更新文档另存delivery-records。其余16项identity/native/search/hot-search原生条目与0.12.0逐字节一致。本次仅实际安装/启动PASS，新分区真实内容及唯一USER组仍UNVERIFIED；官方HOST API-352未宣称解决。0.12.0直播搜索USER通过保持，不扩大为F02/F03/W03/v1。


0.13.0 USER：用户确认上下翻页正常，但未明确具体层级；仅记翻页交互无异常，不补记未加载分区卡片的分页/刷新。动画和舞蹈实读均API -352，分区真实读取验收FAIL/外部拒绝OPEN，与HOST -352一致。停止这组重复请求和重装，不轮换UA/代理/账号绕行；现有14项选择/请求源码不重复实施，F02整体未通过。后续继续独立F05稍后再看只读列表。


最终本地交付：406单元/合同、157 strict模块、93个不同浏览器流程（稍后再看7/账号10/本地10/目录8/搜索36/媒体16/投屏6）、11 HOST TLS及19包负例全部通过；实际Samsung SDK链接扫描通过。首包因新library-worker未纳入UI文件白名单被门禁拒绝，修正清单并重建后全部通过，原失败日志保留。既有20项原生运行条目将与0.13.0逐字节核对；无新SDK/权限/账号写入。

未签名SHA256 `29e1f59c6edfb11cb66df3e7e402ff166407650b08ebb05ef331dacad39ea7ba`；signed SHA256 `4858b6e2279462862242d09cb276dde07c27c066841f6852869afa9644609b09`；UI sourceHash `423be6e267ee57222bcd311280ce5cce4437699062aca96c67509ed0a8d0f633`。自有profile签名通过不代表TV功能通过；真实列表与同账号对照尚待。


0.14.0实际部署：UTC2026-10-19T02:07:12.557199+00:00开始，state/capability/install/launch均exit0且平台明确成功；无需重连或重复安装。511文件源ZIP SHA256 `7d39e911d8a1be406904d029b5e91db4444f8a21000c63de9cd96e3aa97840e7`；signed SHA256 `4858b6e2279462862242d09cb276dde07c27c066841f6852869afa9644609b09`；UI sourceHash `423be6e267ee57222bcd311280ce5cce4437699062aca96c67509ed0a8d0f633`。20项原identity/native/catalog/search/hot-search运行条目与0.13.0逐字节一致，新增library仅只读。源ZIP在部署前冻结，部署记录/最新文档另存delivery-records。新私人列表USER待一次同账号只读核对；本次只记安装/启动PASS，不记完整F05或真实双账号通过。0.13.0动画/舞蹈API-352及旧USER原件保持，不再要求分类测试。


0.14.0 USER：用户回复“全部符合预期，通过”，所请求稍后再看只读核对组USER PASS，停止重复。未明确列表空/非空及下一页是否可用，不补记具体条数、实际第二页或真实双账号通过。无新增原生设备报告，不扩展为队列/播放/完整F05。继续F05云端历史只读，用户先前跳过云进度写入的决定保持。


最终本地包：411单元/合同、161模块strict、35相关浏览器、14 HOST TLS、21包负例及Samsung SDK链接扫描全部通过。既有公开搜索/目录/投屏未改的人工组不再重复，不将旧版本通过数字混成当前测试数量。未签名SHA256 `084471294dc734ed122241f218dcad971c8473195c708c1ea23452068b1c779f`；signed SHA256 `63b9fd615d230fc9fee06294665f9fc22d88a60cac67d31c986bfb691668fbaa`；UI sourceHash `2fee2bf5318f1a5c14285373ac58ecc2541e6ebf963d9e479a6fe1226c52fd39`。自有profile签名通过，实际TV安装/新历史读取待后续记录；无新SDK/权限、账号写入或保护存储格式迁移。


0.15.0尚未安装：UTC2026-10-19T12:02:25.181142+00:00开始的state检查exit1/未找到设备，未执行capability/install/launch；原地址一次有界重连exit0但未获得connected确认，因此不重发安装。最后确认设备版本仍0.14.0，其USER只读组PASS保持。521文件源ZIP SHA256 `a972545ea0144c7bd1ee82740ff01a18179cc0d2065d8cc15e66497c147bc5ac`；signed SHA256 `63b9fd615d230fc9fee06294665f9fc22d88a60cac67d31c986bfb691668fbaa`；UI sourceHash `2fee2bf5318f1a5c14285373ac58ecc2541e6ebf963d9e479a6fe1226c52fd39`。20项原生和8项其它Worker与0.14.0逐字节一致。新历史实读USER仍UNVERIFIED，等待电视在线，不重复源码/构建或已通过项目。


0.15.0实际部署：用户确认电视已开机后，原地址一次有界重连获connected确认；UTC2026-10-19T12:07:28.701847+00:00开始，同一已签名包state/capability/install/launch均exit0且平台明确成功。未重新构建/签名，首次未找到设备及未确认重连原件保留。521文件源ZIP SHA256 `a972545ea0144c7bd1ee82740ff01a18179cc0d2065d8cc15e66497c147bc5ac`；signed SHA256 `63b9fd615d230fc9fee06294665f9fc22d88a60cac67d31c986bfb691668fbaa`；UI sourceHash `2fee2bf5318f1a5c14285373ac58ecc2541e6ebf963d9e479a6fe1226c52fd39`。源ZIP未变，后续记录/最新文档另存delivery-records。本轮仅安装启动PASS，新增云端历史数据一致性、有限翻页和摘要Back仍待唯一USER组；不由启动推定完整F05/W03通过，不追加进度写入或旧稍后再看/分区测试。


0.15.0 USER：用户回复“全部正常，请继续”，所请求云端历史只读对照/条件翻页/摘要Back最小组USER PASS，结束重复。未明确空/非空及实际下一页分支，不补记具体条数、非零进度或真实双账号通过；没有新增原生设备报告。不扩大为队列/播放/完整F05。继续F05收藏夹与内容只读浏览，云进度写入跳过决定保持。


0.16.0最终本地交付：415单元/合同、165 strict模块、44相关浏览器流程（收藏9/历史8/稍后再看7/账号10/本地10）、17 HOST TLS及23包负例全部通过，实际Samsung SDK已链接扫描。收藏截图为合成数据且已检查，不算真实账号/TV声画。原20项native和8个其它Worker与0.15.0逐字节一致。未签名SHA256 `b6a1545fd7c5a6592275663cecf69f06cbf4cb9ea5373082d1ce0d584583b3d1`；signed SHA256 `78e2f6756cb20ee853371b66447510bf40f3a0ed1947968d6b3fbc678980e6bb`；UI sourceHash `25bca39801367c6f55c7e9d627ace76d3e98947180b02664124b2d996838ee1c`。自有profile签名通过，无新SDK/权限/保护存储格式或真实账号写入；TV安装与新收藏USER组仍待。


0.16.0实际部署：UTC2026-10-19T12:20:52.143521+00:00开始，state/capability/install/launch均exit0且平台明确成功，无需重连/重复安装。531文件源ZIP SHA256 `e81cbe193b23aeca9246932f34fb1a78da89673bef2d8792f8ace3f5d96c9202`；signed SHA256 `78e2f6756cb20ee853371b66447510bf40f3a0ed1947968d6b3fbc678980e6bb`；UI sourceHash `25bca39801367c6f55c7e9d627ace76d3e98947180b02664124b2d996838ee1c`。源ZIP在部署前冻结，后续记录/文档另存delivery-records；0.15.0 USER通过与先前连接失败原件保持。本次只记安装启动PASS，新收藏数据对照/条件分页/摘要Back USER仍UNVERIFIED，不推定完整F05/W03或真实双账号通过。


0.16.0 USER：用户确认收藏夹/内容和摘要Back其余均正常，但收藏数量只有3项时点击下一页报invalid；本组PARTIAL，短列表分页边界FAIL/OPEN，未记全组通过。未取得该次原始账号响应/新原生报告，具体失败层级和has_more实际值未确认；保留原包与反馈，先本地复现终点约束再仅补验此处。


0.16.1最终本地：417单元/合同、165 strict模块、27相关浏览器流程（收藏12/历史8/稍后再看7）、23包负例全部通过。修复前新增两项回归实际FAIL、修复后PASS，失败日志保留。全部24个原生条目、8个其它Worker及app.js/style.css与0.16.0逐字节一致，本批未重编SDK或重跑HOST TLS，不把旧17项计入本轮新检查；沿用已验证原生输入。仅library-worker解析改变。未签名SHA256 `480039d1de2493b871dd25ba1d1fe0867125070258a13c33f9c54b6be7029d87`；signed SHA256 `c8b3e5f781afe6e3c27b7a71c88d5a1010b7697335b90025eb3ab14db8851998`；UI sourceHash `a9614af7fb6a291cbe29d3e3d7dff86eef60508e0523feca218882b5a493d42e`。自有profile签名通过，新TV修复效果待同一3项收藏夹唯一补验。


0.16.1实际部署：UTC2026-10-19T12:32:32.073698+00:00开始，state/capability/install/launch均exit0且平台明确成功，无需重连或重复安装。532文件源ZIP SHA256 `607322bcc25948c863637b5576f675e28adf2d6a92beed8e64b71a377ff49905`；signed SHA256 `c8b3e5f781afe6e3c27b7a71c88d5a1010b7697335b90025eb3ab14db8851998`；UI sourceHash `a9614af7fb6a291cbe29d3e3d7dff86eef60508e0523feca218882b5a493d42e`。源ZIP部署前冻结，最新文档/平台记录另存delivery-records。旧0.16.0 USER其余正常及3项边界FAIL保持；本次仅安装启动PASS，修复TV效果待原3项收藏夹唯一补验，不重复历史/其它收藏或媒体组。


0.16.1 USER：用户回复“全部测试通过，如预期，请继续”，原3项收藏夹下一页禁用/方向跳过及Back唯一补验USER PASS；结合0.16.0其余显示/摘要Back正常，本轮收藏只读最小组收束，不重复。旧0.16.0分页FAIL及本地复现失败日志保持；无新原生报告/原始账户响应，不扩展为导航完整性、队列播放、真实双账号或完整F05/W03通过。


0.17.0最终本地交付：421单元/合同、169 strict模块、45相关浏览器流程（关注更新8/收藏12/历史8/稍后再看7/账号10）、21 HOST TLS/C及25包负例全部通过；实际Samsung SDK已链接扫描，合成截图已检查。原20项native和8个其它Worker与0.16.1逐字节一致；仅library新增固定更新GET。未签名SHA256 `30b0999ec1a3161c94cc1f081e6c2d8229095c5ad933fe26b77548dc95689b4c`；signed SHA256 `99497762e5463447edb3513ddf756d08b7118c4ba291050d9fd5b2d2960b10e9`；UI sourceHash `e64d4786d5a46d861af65b6e76493992157c55bf29ab6599926ab044c55b1093`。自有profile签名通过，无新SDK/权限/保护存储格式或账号写入。本地/匿名HOST不算真实账号，安装/新更新USER待后续证据；主动态页412及完整F04缺口保持。


0.17.0实际部署：UTC2026-10-19T12:47:44.148626+00:00开始，state/capability/install/launch均exit0且平台明确成功，无需重连或重复安装。542文件源ZIP SHA256 `72bb8319d90889f1347c33ba5c1475dff9ae499a53584a42c95d6cee46b95ab9`；signed SHA256 `99497762e5463447edb3513ddf756d08b7118c4ba291050d9fd5b2d2960b10e9`；UI sourceHash `e64d4786d5a46d861af65b6e76493992157c55bf29ab6599926ab044c55b1093`。源ZIP部署前冻结，后续记录/文档另存delivery-records。0.16.1 USER收藏边界PASS和旧0.16.0 FAIL保持。本轮只记安装启动PASS，新增关注更新真实内容/有限翻页/刷新/摘要Back仍待唯一USER组；主动态页412及完整图文动态、UP主页/投稿/F05队列未关闭，不扩大为完整F04/W03。


0.17.0 USER：用户回复“全部验收通过，请继续”，所请求关注更新导航对照/条件分页/刷新/摘要Back最小组USER PASS，停止重复。未明确空/非空和实际下一页分支，不补记具体条数或数据类型覆盖；无新增原生报告，不扩展为完整图文动态/真实双账号/完整F04/W03通过。下一项为F05本机身份队列和串行播放衔接。


0.18.0最终本地：429单元/合同、174 strict模块、46个不同界面流程（队列10/既有媒体16/本地10/账号10）、25包负例通过。队列对话框标签补齐后最终10项已重跑；原36项用于未变相关逻辑回归。初轮队列9通过1失败，是Home后应恢复队列入口却断言管理账号，改为准确入口后10通过；修改交付描述后provenance门禁拒绝旧输入摘要，保留失败与旧未签名包，完整重建/打包后通过，未放宽门禁。合成截图已检查，不算TV声画/自然连播。24项native和全部9个Worker与0.17.0逐字节一致，本批未重编SDK/重跑旧HOST。未签名SHA256 `617c4f7733b049271b55e4818bf91804dc37b4c060066d2120af85fca0680e11`；signed SHA256 `244c7fd8f49050ce98d841254be8f2eec926d9e721f51393496e78003dc4925f`；UI sourceHash `7414774ce059c487b241bbb6b8459358350aea3d71aed4e1dcc66891aadf5c7e`。自有profile签名通过，无新SDK/权限/云端写入或保护存储格式迁移；独立普通队列KV v1。TV新队列实际保存/重开/换项与声画待唯一组，自然连播与云端私人库队列未关闭。


0.18.0实际部署：UTC2026-10-19T13:09:33.563559+00:00开始，state/capability/install/launch均exit0且平台明确成功，无需重连或重复安装。552文件源ZIP SHA256 `429c5700370344e6aea998940d9b468fb4cfe1f2164d2b0f6ed522f2f2c47e91`；signed SHA256 `244c7fd8f49050ce98d841254be8f2eec926d9e721f51393496e78003dc4925f`；UI sourceHash `7414774ce059c487b241bbb6b8459358350aea3d71aed4e1dcc66891aadf5c7e`。源ZIP部署前冻结，最新记录/文档另存delivery-records。0.17.0 USER关注更新导航PASS及旧失败原件保持。本轮只记安装启动PASS，本机队列实际保存/重开/手动换项/Back仍待唯一USER组；不从合成自然结束推定真机自动连播，不扩展为云端私人队列/完整F05/W03或v1通过。


0.18.0 USER新反馈：本机列表为空，且持续显示网络失败；本次队列验收记FAIL，保存重开/下一项声画/Back未验证。已按原signed/source配对保留私密反馈，冻结源ZIP未改。源码确认队列读写不发网络请求；入队入口依赖自动取源播放页且热门错误丢失底层分类，确切设备失败阶段待核对，不推断存储损坏、服务拒绝或网络根因。停止原组合重复，先修复可确认缺陷并定位。

0.18.0反馈澄清：登录、游客热门等全部联网功能均失败。已按共同网络故障处理；未证明入队成功后丢失数据，不改队列/账号数据。HOST同匿名热门GET，Python默认CA先报证书验证20；使用现有包内未改CA后HTTP200/API0/4项，说明该HOST失败是开发Python信任链差异，不能归因TV。SDB旧state显示device但capability关闭；原地址一次重连后capability成功；官方Samsung/Wits调试命令未取得端口（首次超时、官方带300参数形式closed），不视作应用错误。


0.18.1实际诊断交付：state/capability/install/launch均exit0且平台明确成功；本次部署无需重连（此前调查一次有界重连及未成功调试独立保留）。553文件源ZIP SHA256 `312e10288e3717b26a90b5979a452c65cc6cd0baced6bcbecdc36539d20d308c`；signed SHA256 `23f8613f6cd1e00e0c5b95419d07c64e5cca07f76294ef45f613650b79b2df0f`；UI sourceHash `0fecf30aa0c670624c7c3e4b76f355663f220f6f248d7a2188e7a652d5e4c2fd`。24项native/全部9个Worker与0.18.0逐字节相同，无新权限/网络策略/存储迁移。最终13界面流程及3项adapter定向断言已重跑；430单元、174模块、25包负例通过。源ZIP在部署前冻结，当前文档/部署另存delivery-records。0.18.0全局联网FAIL保持；本版仅补取证，不宣称实际联网或队列USER已通过。


0.18.1 USER恢复反馈：用户两项均回复“目前全部恢复正常，全部验证项目也都成功且通过”。记当前联网恢复及原队列保存重开/一次手动下一项声画/Back最小组USER PASS，停止重复；旧0.18.0失败保持，未取得失败guest码/系统网络对照，不宣称诊断补丁修复根因。未要求自然结束，不推定真机自然连播、真实双账号或完整F05/W03/v1通过。下一批补私人列表普通UGC的显式本地入队，不执行云端写入。


0.19.0/F05私人列表显式本机入队正在核对。0.18.1 USER恢复/原队列最小组PASS见当前状态；旧失败保持，不从自然恢复倒推补丁修复根因。


0.19.0最终本地：432单元/合同、175 strict模块、43个不同界面流程（稍后再看8/历史9/收藏13/队列13）、25包负例全部通过，合成摘要截图已检查。24项native与0.18.1逐字节相同，8个其它Worker不变，仅library-worker解析可选公共BV；本批不重跑旧SDK/HOST网络组。未签名SHA256 `8137a682f7f899c98842a706d7d55408caad68dafb7fc9991374bada956c9d84`；signed SHA256 `5b33d8745e7354fc833357d763a8a0132ad140b42bcfeae3cb6f8a2229610564`；UI sourceHash `7489ecf01197d57b22394ee78133cb70659f903f522e3219ee72ef8fb3c4a9f5`。自有profile签名通过，无新权限/保护存储迁移或云端写入；源端字段按归档官方脚本核对。实际安装和新增TV入队仍待，不扩展为完整F05/W03。


0.19.0实际部署：首次state未确认、未安装，失败原件保持；原授权地址一次有界重连成功后，state/capability/install/launch均exit0且平台明确成功。557文件源ZIP SHA256 `6a115f6770235ace3a964770601269bf51a863dc8a61c640344d11db8de88b4f`；signed SHA256 `5b33d8745e7354fc833357d763a8a0132ad140b42bcfeae3cb6f8a2229610564`；UI sourceHash `7489ecf01197d57b22394ee78133cb70659f903f522e3219ee72ef8fb3c4a9f5`。源ZIP部署前冻结，后续部署/文档另存delivery-records；旧0.18.0 FAIL及0.18.1恢复/队列最小组USER PASS保持。本次仅安装启动PASS，新增私人列表入队真实映射/当前身份队列核对待唯一USER组；不由合成数据推定实际账号或完整F05/W03/v1通过。


0.19.0 USER：用户回复“全部测试通过，请继续”。所请求私人列表入队/Back/本机队列一致性最小组USER PASS，停止重复；原问题允许空列表/禁用项跳过，未明示具体空/非空或各入口分支，不补记全覆盖、真实双账号、自然连播或完整F05/W03/v1。无新增原生报告。下一步核查F04 UP投稿当前官方协议，旧匿名412不反复请求或绕行。


0.19.0私人列表入队最小USER组PASS已归档；0.20.0账号详情正在本地核对。F04当前普通参数请求HTTP200/API-352，未成功读取投稿，不从HTTP状态推定API通过，不安排用户重复。


0.20.0最终本地：435单元/合同、178 strict模块、34个不同界面流程（账号13/稍后再看8/队列13）、25包负例全部通过；合成账号详情截图已检查。24项native与0.19.0逐字节相同，8个其它Worker不变，仅identity-worker提取有限资料；本批未重编SDK/重跑旧HOST TLS组。未签名SHA256 `25443a351dc1a5d51ed33ece553bb5a6a54eff9a2cbe26c5e76a8057b4d3075d`；signed SHA256 `80373568b36331992c78aca1ec31736a7b4a3b16a3ecaee4fc579afe2f718d81`；UI sourceHash `5c9e0b8f906e0c8195f13d5605e6dfaf0025c04dc3371c825417da5ff8cff227`。自有profile签名通过，无新权限/端点/保护存储格式/账号写入；真实资料显示与Back仍待TV新增最小组，不扩大为完整F01/W03。


0.20.0实际部署：state/capability/install/launch均exit0且平台明确成功；本次无需重连或重复安装。564文件源ZIP SHA256 `ad5fc5c8067e20b4f90d700174244d43e6abdd4445c0c1034cc2b9e98d33b539`；signed SHA256 `80373568b36331992c78aca1ec31736a7b4a3b16a3ecaee4fc579afe2f718d81`；UI sourceHash `5c9e0b8f906e0c8195f13d5605e6dfaf0025c04dc3371c825417da5ff8cff227`。源ZIP部署前冻结，后续部署/文档另存delivery-records。0.19.0私人列表入队最小组USER PASS及旧失败保持；本次仅安装启动PASS，账号详情真实资料/Back仍待唯一新USER组。F04当前协议API-352和真实过期/双账号、完整W03/F01/v1未关闭。


0.20.0 USER：用户回复“正确，请继续”，所请求本人/等级/会员状态与Back原入口最小组USER PASS，停止重复；无新增原生报告，不扩大为真实过期/双账号/全部权益或完整F01/W03/v1。下一步独立F06普通视频分P选择/播放，保护既有首P队列与续播记录。


2026-10-19流程调整：按用户最新要求，以完整F模块完成开发与本地回归后统一TV验证，不再把单入口/控件/取证小包逐个交用户测试。当前F06整模块开发中，完整门槛/现有差距见[F06模块交付](../../F06_MODULE_DELIVERY.md)；0.20.0详情USER PASS已归档，不部署部分F06、不重复旧组，未宣布W03或F06完成。
