# 工作区变更清单

日期：2026-10-14；main；无 HEAD，无 remote；未 commit/push/发布。

启动前 44 个原始文件的 hash 在 ignored `.local/baseline-2026-10-14.json`。没有删除原文件；原有产品需求、交接提示词、架构独立运行合同和历史研究仍保留。

## 原文件增补/状态更新

CONTRIBUTING.md、README.md、README.en.md、THIRD_PARTY_NOTICES.md、project.json、apps/tv/README.md、platform/wasm-network/README.md、tools/README.md、docs/ENGINEERING.md、docs/PROJECT_STRUCTURE.md、docs/research/tizen-best-practices-2026-10-14.md。

变更为实际执行命令、候选实现状态、来源/许可和设备证据边界；没有下调 F01–F20 或独立运行要求。

## 新增实现与记录

- 工程：package.json、package-lock.json、tsconfig.json、playwright.config.ts、CI workflow。
- apps/tv：候选 config、公有本地 HTML/CSS/原创 icon、装配/lifecycle、集中 platform adapters、FocusRouter/InputRouter。
- packages/contracts：strict DTO/Worker/Player/Network/PrivateSessionStore 合同与校验。
- packages/bili-client：SessionManager、WriteCoordinator、pagination、HTTPS/redirect policy。
- packages/media：PlayerCoordinator、subtitle/overlay timeline、normalized danmaku parser/timeline。
- packages/cast：CastSession/control-command whitelist；没有官方协议冒充。
- platform/wasm-network/src：原创 C/cURL/socket candidate 与 Worker glue。
- tools：构建、TS 测试 loader、依赖边界、unsigned packaging、package verification、source delivery、desktop server、native build/check。
- tests：23 项单元/合同、3 项主机 HTTP、基础桌面 UI、2 项 native 桌面加载/停止检查、设备验收模板。
- docs：ADR-002、IMPLEMENTATION_STATUS、DEVICE_CAPABILITIES、DEVELOPMENT、TEST_REPORT、W01_PROBE_GUIDE、RELEASE_CHECKLIST、RELEASE_DRAFT、本清单。

完整逐文件 hash 见最终 `dist/source-manifest.json`；source ZIP 包括初始目录 `.gitkeep`。bundle 与 source 对应关系见 `dist/DELIVERY.json`。

## 开发生成物（不进 Git/源码 ZIP）

node_modules、dist、.local 下载的官方 Samsung SDK/ZIP/CA/baseline/test outputs、用户 Playwright cache。桌面截图在仓库外 visualization 路径。

后续仅在用户授权下单独更新自己的 Distributor（Author 保留），实际探针已安装；未真实账号写入。已获授权连接电视，SDB 返回 tv/9.0；Developer Mode 已确认。用户说明原证书属于其他开源项目，保留且排除使用，后续已完成自己的新 profile，见 SIGNING_DEVICE_RECORD。用户后续授权的 Rosetta 2 已安装成功；官方 native WASM build 阻塞解除，基础/原生两个 unsigned 工件、原始第三方许可和 native UI 加载/停止测试已新增。App 设备验收继续 UNVERIFIED。

开发环境新增完整官方 Studio 6.1 CLI 在 ignored `.local/tizen-studio`、本地 data/JDK 配置及 installer 校验；CLI/SDB 可运行。没有改全局 JDK/SDK、读取用户 profile 密钥或生成新签名身份。

同日新增自己的签名身份创建指南 SAMSUNG_CERTIFICATE_GUIDE，更新电视连接元数据及旧第三方证书排除使用记录。官方 Certificate Manager/Samsung Certificate Extension 安装于隔离 SDK，VS Code 基础扩展独立存于仓库外 BiliSofa 目录；CLI 不隐式签名/安装。UI 无法绑定管理器进程及 TV 辅助扩展 Marketplace 不可用按实际失败记录，未创建证书。

用户后续完成 BiliSofa profile/新 Author；基础包实际签名成功，私密输出在仓库外。首次设备安装因过期默认 Distributor 证书链失败，未安装/运行。新增 tools/sign-probe.py，在安装前阻止 SDK 默认 Distributor、过期证书/非 Samsung 叶证书/签名内容不一致；不修改身份、接收密码或自动部署。运行现有无效 profile 的预检实际 exit 1，修复外部资源后再推进。

后续：新 Public Distributor 已恢复，基本/原生 0.0.2 均实际安装/启动，用户反馈两项最终 PASS。新增 0.0.3 原创 probe-http.h、固定脱敏报告合同/地址 adapter/UI、取消晚到地址回调、相应主机/合同/UI 测试及包含 header 的 native source hash。历史失败工件和签名备份在仓库外保留，不替代自己的 Author。Git 状态仍无 HEAD/remote，未发布。

0.0.3 手机入口失败后：增加原生 socket 创建/accept4 flags 兼容分支、逐阶段结果及顶部代码、6 项 HTTP 主机/兼容合同测试；0.0.4 已签名/安装/启动，实际手机重试待反馈。新增 tools/media-probe.py，生成/检查 ignored 原创媒体样本，不下载/签名/部署，FFmpeg 工具未随 TV 包分发。

新增 W01 显式内部自动取证/单目标有界 report collector；默认手动、无业务写入。0.0.4 手机成功已按用户观察登记。

0.0.5 已自动取回匹配源码的真机报告。0.0.6 增加 Worker MEMFS 固定 synthetic DASH、loopback 文件服务器和 modal AVPlay 控制，C source hash 覆盖两个 header；CSP/WARP 只新增固定 local origin/self object，CI 增加 HOST socket checks（未远程跑）。当前测试为 23 单元/合同、6 HOST HTTP/SDK兼容、3 HOST media、9 基础UI、2 native UI（最新结果见测试报告）。未公开或使用账号写入。

0.0.7 修复用户实测媒体重入bind失败/无声：新增 probe-service.h cooperative tick/stop导出、Worker控制消息/ACK/串行清理/失败阻止复用、原生生命周期HOST测试、Audio MIME与20dB合成增益、只含type/count的AVPlay轨信息/分项asset诊断。实际0.0.6视频画面通过，音频/重入失败记录保留；新版本待TV复测，不伪造通过。

0.0.7 用户实际复测通过：合成声画、暂停/继续、seek5秒、Back后重新进入，未再出现stage12。0.0.8将正常静音/音量读数和初始化进度独立显示，保留能力待验收及原始verdict；Home/冷启动、真实内容/账号和官方三端投屏继续开放。准确工件见SIGNING_DEVICE_RECORD。

0.0.8已实际签名/安装/CLI启动；用户反馈保存/Home/退出重开流程marker0→1，非敏感标记退出重开保持USER OBSERVATION PASS。Home停声/媒体复用细项和断电/电脑关机仍待明确实测，不能由标记或source测试推导。

0.0.9候选新增只处理原创随机合成值的KeyManager save/get/remove探针：专用本次alias、不枚举其他alias、不授予其他App权限，不保存真实账号；5秒deadline、取消/晚回调清理、未知结果禁止新写，清理后getData明确NotFound才可复用。API往返PASS只证明该行为，跨App隔离/加密/重建持久性仍待证明。未添加自Tizen3.0起禁用声明的旧keymanager权限。实际验证与部署随后记录。

0.0.9新增platform/keymanager-probe.ts及合成单元/UI fixtures，samsung adapter只暴露探针所需API；安装/自动报告已取得。44个原始基线文件0缺失，main仍无HEAD/remote，未commit/push；最新默认manual unsigned与已安装auto工件分开。

2026-10-14用户明确调整只读评论/回复/弹幕范围：新增ADR-003，同步AGENTS、PRD、W01–W07计划、架构/TV_UI/工程约束、验收、交接提示词、状态/能力/指南、README中英文、发布草稿/清单和project.json范围元数据。F15/F16保留追溯，其他保留互动不变；历史调研只加被替代说明，正文和旧测试记录保留。记录0.0.9 Home停声/恢复再播放USER OBSERVATION PASS，系统中文输入未取得通过证据。没有应用代码/依赖/探针版本/侧载变更；研究过程中下载的AOSP词库仅在ignored .local用于评估，未加入源码、依赖或WGT。原源码ZIP/unsigned包没有重建，仍对应各自此前快照。

0.0.10候选：新增packages/search本地词匹配和Worker、contracts输入消息、platform串行Worker客户端、ui/search-input关键词模态、36屏幕键/候选翻页/Back/清理、集中InputRouter的IME Done/Cancel修正；未增加任何评论/弹幕写接口。AOSP词库及完整Apache通知由ignored研究副本转为明确登记的固定版本源码数据，构建确定性派生并在basic/native包强校验；第三方许可保留。源/单元/UI验证及工件身份见TEST_REPORT和DELIVERY，不能把输入探针计为完整F03。

0.0.10当前已实际侧载/启动，设备输入反馈待取得，47本地检查通过。另记录一次HOST游客搜索候选HTTP412（无凭据/keys，未扩展为设备结论）；未接入该未证实接口或真实账号写入。已安装工件准确源码归档后，文档变化另生成unsigned/source，旧部署证据不归属新hash。

0.0.11焦点修复：保留0.0.10用户显示/输入通过与第一列不可达FAIL，桌面复现candidate5→Left→search-delete。SearchInput为候选/键盘/工具/底栏写入显式邻居；InputRouter补方向键旧名/标准键码兼容，仍唯一键盘入口；FocusRouter的通用几何后备不改。新增两行8格、边界、翻页、5候选不完整行、禁用按钮、刷新退回/旧键码的UI回归；修复前方向用例实际FAIL，修复后结果见TEST_REPORT。无新依赖/权限、无业务接口/账号写入、旧工作保留。

0.0.11已实际签名/安装/CLI启动成功，新TV焦点复测待反馈；第一列上下两张桌面截图已目检。后续仅更新证据文档并生成新unsigned/source，准确已安装源码ZIP仍留仓库外c251d093…目录；没有commit/push/远程发布。


2026-10-15 / 0.0.32 / W01/W02/F06/F20：新增docs/reviews/2026-10-15-status-and-standalone-plan.md及app/cast-control-check.ts；修改AVPlay阶段/状态分类与默认原生seek、CastProbeView入口/固定flow记录/清理ACK门槛、主程序自动三跳与35秒检查及取消/报告、HTML入口、diagnostics/contracts/Worker原生flow与limit、probe-bridge.h有限资源快照、collector有界等待参数、native版本metadata；更新unit/UI/HOST有界行为测试与对应文档。修正F04/F17/F19证据映射、登记0.0.30澄清与0.0.31两次首跳FAIL。现有基线文件保留，未commit/push/创建remote。签名/设备记录与准确快照在后续部署段，私密证书/地址/原始日志不入源码。

0.0.33 / W01/F06/F20：CastProbeView保留关闭期间到达的固定native issue；diagnostics把issue/limit与stopped分开优先；增加unit/actual Worker UI回归、更新native内部包版本与0.0.32实际自动失败记录。C/网络策略/seek策略/权限不变；签名部署身份沿用，实际结果另记。

0.0.34 / W01/F06/F20：投屏候选prepare观察30秒、legacy15秒/seek30秒保持分开，prepare超时新增固定SDK状态/buffering标志；自动流程在native错误先关闭prepare中的player时，仍按同epoch/ACK报告，Back/Home/新owner保持取消。新增2unit/1实际Worker UI回归、版本metadata与0.0.33两次prepare FAIL记录。C、权限、上游15秒无数据/原3分钟租期和资源预算保持。

0.0.35 / W01/F06/F20：针对0.0.34实际issue_0_28，原生bridge增加仅零HTTP响应/零正文的匿名GET超时重连，250ms backoff/每客户端1次/每租期3次/重连一次fresh connection，保留原URL/Range/TLS及全部预算。新增固定retry_1..3 IPC（上限105）、关闭期留存/8条报告优先级、HOST网络恢复与取消行为、contracts/UI回归；更新版本及设备失败证据。C实际SDK重编译，真实效果待设备；不自动重试SDK命令或写操作。
