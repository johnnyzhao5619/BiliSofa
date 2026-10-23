# 设备能力与阻塞

## W02第三批身份应用（2026-10-17）

300单元/合同、99模块strict/边界通过；实际账号UI/真实Worker＋合成C/KeyManager边界10浏览器流程及既有18导航流程通过；8 HOST TLS通过。身份C已实际Samsung编译，权限/来源/CA/许可证/内容及档案校验通过；两项负例拒绝。新WGT `BiliSofa01.TV`/0.1.0只含QR/nav GET，无固定视频/云写入。未签名、未装机、未真实扫码；旧060/018不变。详见[本批交付](../../W02_IDENTITY_APP.md)和[ADR-029](../../adr/029-identity-worker-and-account-package.md)。不能外推为新8槽/新ID真机账号、完整W02/F01/F13或产品验收。


## W02第二批：多账号基础（2026-10-17）

ProtectedAccountStore/AccountCoordinator/AccountWorkspace已实现，本地285单元/合同、18浏览器合成流程、strict/94模块边界通过；预览ZIP完整性及平台模块误入的负例门禁通过。不是新8槽、正式扫码Worker、多账号真机/Voice Guide或性能验收；没有TV部署、真实账号/云写入或GitHub CI运行。设计、行为与失败修复见[W02_ACCOUNTS](../../W02_ACCOUNTS.md)和[ADR-028](../../adr/028-protected-multi-account-foundation.md)。

旧探针浏览器115项在本轮前一个构建候选通过；之后仅补了共享SessionManager异常回包代次处理及对应单元检查，最终构建的受影响浏览器子集51项通过，不把旧115项强配为最终源码全量回归。原设备060/018证据不变。


## 2026-10-17最新阶段记录

018本地测试凭据最终删除USER/DEVICE PASS（UTC19:41:10.936239，精确配对见W01_EVIDENCE_INDEX）；两个未知意图保留。用户要求跳过本轮云进度，既有画质/权限不足项继续未验证。按ADR-027收束本轮W01探针、推进W02，不计全项W01或产品PASS。

W02首批导航/资源owner/shell与独立合成预览已实现；261单元/合同＋11浏览器通过，strict/89模块与预览ZIP门禁通过。详见W02_FOUNDATION；不是新的TV运行/媒体/Voice Guide/性能或真实业务验收，CI仅配置未运行。

目标：Samsung UN58U8200FFXZC。当前记录日期：2026-10-17；下方历史段保留各原工件结果。

## 早期能力矩阵快照（原文保留，最新配对见上方索引）

| 能力 | 来源/API 候选 | 本机状态 |
| --- | --- | --- |
| 设备连接、型号、平台 | SDB capability / 设备信息界面 | METADATA PASS：目标型号 UN58U8200FFXZC、profile tv、平台 9.0、Developer Mode On；不证明 App 能力 |
| 固件、引擎、型号组 | ProductInfo / systeminfo | DEVICE METADATA PASS：0.0.5 报告 ProductInfo.model=U800FD、firmware=T-KSU2EFAKUC-0090-1300.9、platform=9.0；Chrome 主版本未可提取，engine UNVERIFIED |
| Public 签名接受、安装、CLI 启动 | 用户自己的 Author + Public Distributor | DEVICE PASS：0.0.51 install/run exit0及成功回执，source匹配启动/自动监听清理；准确工件见本页最新记录，产品全验收仍开放 |
| 独立启动/冷启动、升级数据保持 | 本电视人工操作/电脑关机 | 0.0.8→0.0.9 CLI更新后非敏感marker1保持 DEVICE REPORT PASS；0.0.13电脑关机/电视正常重启→探针启动/合成KeyManager读回清理/合成声画USER OBSERVATION PASS；其他UNVERIFIED，不能由同ID/Author推断 |
| Worker / CSP / WASM | 本地打包探针 | DEVICE REPORT PASS：0.0.5/0.0.9 本地 Worker/WASM 实际结果和相符 source hash；0.0.2 用户反馈另保留 |
| cURL / CA / TLS / headers / cookie jars | Samsung Emscripten Socket Extension | DEVICE REPORT PASS（0.0.5/0.0.9 游客 HTTPS CA/peer/host 校验及 synthetic cookie engine）；0.0.51合成HTTP真实响应头/Set-Cookie、两jar回传隔离/清空及redirect拒绝 DEVICE PASS；独立现代cURL8.23.0/OpenSSL3.5.9：005真实HTTP双jar/清空/redirect拒绝、006 TLS正/负/随机数/关闭DEVICE PASS；007合成HTTPS Set-Cookie/Secure/隔离/关闭配对PASS；008真实扫码身份匹配、指定视频只读进度原始0和保护保存/关闭PASS，010真实凭据同UID重开导入/固定视频读取与关闭配对PASS；011真实写回仍待授权 |
| TCP/UDP/组播/loopback | Worker 内 POSIX sockets | DEVICE REPORT PASS（0.0.5/0.0.9 loopback/组播自收及开发电脑 LAN GET 后端口关闭）；0.0.4 手机访问 USER OBSERVATION PASS；跨设备组播/Home 清理 UNVERIFIED |
| AVPlay / MSE / 音轨 / 倍速 / 4K / HDR | API、合成与游客样本 | 分项PASS：0.0.7合成声画/控制；0.0.19所测游客视频>180秒/自然结束/回卡/重播、报告video1/audio1和桥清理；0.0.17暂停/seek/Home用户通过；PGC/live/多轨/倍速/4K/HDR/MSE仍UNVERIFIED |
| 搜索输入 / Voice Guide | 系统键盘 / 应用内首字母候选 | 用户0.0.9反馈系统键盘貌似不支持中文，可用性未证实；0.0.10输入/你好候选及其他操作USER OBSERVATION PASS，但候选两行第一列不可达FAIL；0.0.11两行第一列/方向/选词USER OBSERVATION PASS，真实内容搜索未验收；0.0.12主页面/NH候选Voice Guide与焦点及Back USER OBSERVATION PASS；完整评论/弹幕中文编辑已移出范围 |
| Home/休眠/进程回收/重建 | 生命周期探针 | 0.0.9 Home停声/返回重播、0.0.13电脑关机后正常冷启动探针/合成存储/声画 USER PASS；完整账号/内容冷启动、休眠/进程回收恢复仍UNVERIFIED |
| 偏好存储 / 私密会话保护 | localStorage标记 / KeyManager候选 | USER OBSERVATION PASS：0.0.8退出重开marker0→1；DEVICE REPORT PASS：0.0.9合成KeyManager往返/清理、CLI更新marker1保持；0.0.12合成KeyManager退出/CLI重开读回/清理DEVICE REPORT PASS；0.0.13同Author不同包固定合成项读取隔离DEVICE REPORT PASS；独立007合成秘密跨包拒读/owner重开摘要核对及删除配对PASS；008本次真实会话保护保存读回PASS，010启动读到固定保存项但恢复窗口无效；010随后新登录/同UID恢复已配对PASS；011最终删除仍OPEN，不宣称硬件加密或原子覆盖 |
| F20 Android/iPhone/iPad | 未修改官方三端；TV预授权一次源及HTTPS渐进MP4 | Android0.0.49普通视频完整218秒/双端进度USER PASS；0.0.50手机非零定位/恢复声画、暂停继续、停止USER PASS，本轮cast关闭ACK DEVICE PASS。iPhone0.0.50普通视频发现/声画/双端时间、手机非零定位/暂停继续/停止USER PASS及cast关闭ACK DEVICE PASS；iPad通用版/HD用户均确认所述步骤通过，HD此前权限未启用已更正；最后匿名报告清理ACK通过，定位window_missed、无hit，保留自动差异。原失败历史保留，完整F20仍OPEN |

不得依据 API 存在把任何实机项标为 PASS；普通 Worker 的 WASM 算术也不能证明 Tizen sockets。

原始设备/账号资料、LAN 地址、DUID、证书和抓包在仓库外保管；公开记录仅保留脱敏版本、步骤、包 hash 和结果。一次性所需用户动作见 W01 探针指南，未获授权不连接设备。

## 已取得的低层证据

- SOURCE：官方 SDK 下载版本 1.39.4.7、Socket Extension Worker/privilege 条件已重新核查；来源见研究登记。
- HOST：初次 arm64 激活/工具执行失败；经用户授权安装 Rosetta 2 后，x86_64 激活成功、官方 C/cURL/socket 编译成功。EM_CONFIG/EM_CACHE/EM_PORTS 全部指向项目 `.local`，未覆盖用户全局 Emscripten/签名配置。
- DESKTOP：5 项 Chromium UI 测试，包括 Worker 内真实 WASM 计算、焦点、模态、composition、非敏感标记与无输入泄漏的导出。
- LOCAL：21 项基础行为测试，C/cURL/socket 语法/编译、WASM validate、重复编译 hash 一致、basic/native unsigned 包完整性检查。
- DESKTOP NATIVE：JS/WASM/CA 本地加载、WASM 初始化、严格 CSP、UI 可操作/停止后新 Worker；桌面网络执行超时记 FAIL，不提高为网络/设备通过。
- DEVICE METADATA：SDB connect 成功，capability 返回 profile_name:tv / platform_version:9.0；设备信息界面显示目标型号和 Developer Mode On。原始输出保存在仓库外私密目录，公开记录不含地址/DUID。
- DEVICE INSTALL：基础包签名命令 exit 0、传输成功；实际安装返回 118/-12 / Invalid certificate chain。公开证书检查发现 Samsung Author 有效至 2027-10-14，但 Distributor 叶及链证书已于 2022-10 过期。profile 的 role 1 仍为 SDK tizen-distributor-signer.p12；没有使用旧第三方项目身份。
- DEVICE INSTALL 后续：用户授权协助更新 Distributor。官方 SDK 单独生成新 Public Distributor，Author hash 保持；两个探针均实际 install/run exit 0。旧证书链阻塞解除，signed 包/source hash 见 SIGNING_DEVICE_RECORD。
- DEVICE APP：用户确认基础探针页面已显示；用户随后反馈两项最终 PASS；原生判定要求五个分项全成功，完整 JSON/自动 DOM/console/screenshot 尚未取得。本机任何媒体/生命周期/存储/投屏能力均不得从安装/启动成功提升为 PASS。

## 短时 LAN 诊断入口（0.0.3 候选）

W01 Worker 内固定 TCP 40322 `/report`，限时 120 秒、最多 16 次连接、单连接最多 2 秒、请求头 2048 bytes、脱敏 JSON 3072 bytes。只接受 GET/HEAD 固定路径，无账号/文件/URL 代理、凭据或 CORS。仅成功写出 GET 正文才记 PASS，客户端身份仍未证明；HEAD/监听初始化不算通过。Home/停止/新任务终止 Worker。代码边界与主机测试可证明相应逻辑，零售设备资源清理须单独验证。

瞬时地址只供 TV 屏幕显示，读取集中在 Samsung adapter，排除在导出/日志之外。依据 [官方 SystemInfo API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/systeminfo-api.html) 的 WIFI_NETWORK/ETHERNET_NETWORK、status、ipAddress；该调用未声明额外权限，官方条件权限仅适用于 CELLULAR_NETWORK。仍须本电视验证。手机浏览器传输诊断不证明 F20。

## 0.0.3 手机入口失败与 0.0.4 修复

用户反馈 `W01-http：FAIL`，没有末尾代码/时间或手机 JSON，记 DEVICE USER OBSERVATION FAIL，不能判断为网络隔离/权限问题。查本机固定 Samsung SDK 1.39.4.7 的 `src/library_syscall.js`：在 ENVIRONMENT_MAY_BE_TIZEN && SOCKET_HOST_BINDINGS 下，socket 的 F_SETFL 直接 abort。0.0.3 调用该路径，存在可明确修复的源码兼容错误；尚未用自动设备日志证明本次失败的唯一原因。

0.0.4 改用原生创建时 SOCK_NONBLOCK 及 accept4(..., SOCK_NONBLOCK)，HOST macOS 保留其自己的 fcntl 分支。方法依据 [官方 Socket Extension API](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)（socket/accept4 flags）；未更改 SDK、权限/TLS/CSP或取消 deadline。新增阶段代码：socket_create/reuse_option/bind/listen/clock/accept/report_bounds/runtime_aborted；顶部状态显示完整代码。新包在本机验收前保持 UNVERIFIED。

0.0.4 用户随后反馈手机访问成功：USER OBSERVATION PASS（同网手机→固定报告入口），未提供完整 JSON/代码。此项与官方 F20 协议、媒体/背景接收无等价关系。

## 0.0.5 自动真机报告

实际 signed/installed/CLI-start 工件 SHA-256 `8b8c1ab9e170ee65915d9308bc8209835a2df48d2fd114a11a34d22bdd07b60d` / source `b6f5f8b0cb1077e0957f6ac8d9a475b8b3d171922ecd787c7a3d340ab63f29fb`。报告包括 WASM PASS、`native.tcp0_udp0_multicast0_tls0_cookies0` PASS。已从单一授权 TV 固定端点读取且 source hash 匹配，无代理/重定向；GET 后 0.3 秒连接复查关闭。客户端为开发电脑，手机独立证据仍是 0.0.4 用户成功反馈。报告的 UNVERIFIED start/初始化是进度记录，不抵消随后最终 PASS。

完整脱敏 JSON 在 ignored dist/DEVICE_REPORT.json，签名及准确源码 ZIP/报告副本留仓库外。ProductInfo 原始 model 读数与营销型号分开，不从 UA 的 unavailable 猜 Chrome 版本。媒体/IME/Voice Guide/Home/冷启动/保护存储/官方投屏不由这些网络结果推导。

0.0.6 候选在 Worker 内增加仅 127.0.0.1:40323 固定合成 DASH 文件服务，60 秒/128 连接/2 秒/256KiB asset 上限；AVPlay adapter/PlayerCoordinator 驱动真实 prepare/play/pause/seek/stop，单一 modal focus、Back/Home/结束清理。只显示原生 playtime/状态，声画须用户核对，启动/asset served 不标媒体 PASS。

0.0.6 合成媒体首次实际视频可见（用户反馈绿色矩形正常），音频无声，重复运行 bind stage12失败，完整媒体项仍 FAIL/未完成。0.0.7 正在修复 cooperative服务停止/ACK/重入与样本增益；不得只因有画面或改过代码将媒体全项置PASS。

0.0.7 只读音量/静音诊断采用 tizen.tvaudiocontrol.isMute/getVolume，校验boolean及0–100整数，仅输出enum/数字；不调用setter。目标min9.0，依据 [官方TVAudioControl API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/tvaudiocontrol-api.html) 的privilege/SecurityError自5.0 deprecated记录，未增加旧 tv.audio权限；实际调用失败记unavailable，不能替代听音或自动改系统设置。

## 0.0.7 合成声画与资源重用实测

manual 0.0.7 已签名、更新安装、CLI 启动（exit 0 / 平台成功）。signed SHA-256 `801c39daaf6dfd41c31f0e375b93f8d0c62c27db77f6e12c63b14882e3202627`，source `5613ce6aa32a89c67e0c0d3557b20910534ab0f5b8ac4bc3680e87430962116f`。准确包、部署日志、源码 ZIP 均留仓库外，未公开签名身份。

用户先确认画面和声音，第二次测试暂停/继续、跳到5秒、Back后重新进入均通过，未再出现 `mpd.listener_failed_stage_12`。记 USER OBSERVATION PASS（W01-P12 / 合成 H.264/AAC 样本），保留0.0.6无声/重入失败历史。没有自动TV截图/音频采集；不推广到真实UGC/PGC/live、多轨/倍速/4K/HDR、Home/休眠或F20。

用户读数 `avplay.tv_mute_false_volume_16` 表示电视未静音、音量16，正常只读元数据。0.0.8 将进度、读数和能力待验收分开显示，导出保留原始verdict与kind，不把读数或初始化改成能力PASS。

## 0.0.9 自动真机 KeyManager/网络报告

实际部署：内部`guest-synthetic-report-once`模式，signed SHA-256 `e6fe5133fa9c19d0019c49c3ae0a75e04d9e66fbeeef465bb8a1d6ca7e103a27`，source `8042ae3f5934300494c05784dd7908871aa36436a3f4c16aafa92231be8e62a8`。首轮install exit1，SDB设备列表为空；重连报告connected后再次install/run均exit0 / 平台成功。失败/重连/成功的原始日志及精确签名包/源码ZIP在仓库外保留，不把最初失败隐藏或归因证书。

collector exit0，source匹配，来自授权开发电脑固定`/report`（无代理/重定向，非手机身份）；GET后复查监听关闭。报告固件仍`T-KSU2EFAKUC-0090-1300.9`、model读数`U800FD`、平台9.0、Chrome major unavailable。WASM PASS、`native.tcp0_udp0_multicast0_tls0_cookies0` PASS、`keymanager.synthetic_roundtrip_cleanup_only` PASS。KeyManager PASS要求同调用写入的随机合成非秘密值读回相等，删除后getData明确NotFound；未枚举别名、读取真实会话或调用setPermission。

report.marker=1，结合0.0.8用户保存/退出重开marker1，证明这一次相同ID/Author CLI 0.0.8→0.0.9更新保留非敏感标记；不推广至卸载/回退/断电/私密会话。报告`kind`将进度/读数与能力分开，原始verdict未机械提升。`keymanager.isolation_persistence_protection_not_proven`继续待验收。

完整脱敏报告在ignored `dist/DEVICE_REPORT.json`，私密副本按source命名。后续文档/默认manual unsigned重建产生新源码hash，与此次已安装的auto工件分开；原生C/媒体编译产物未改动。

## 0.0.9 Home与输入反馈 / 当前范围

用户明确确认“播放中按Home停声，返回探针再次播放”测试通过，配对为signed `e6fe5133fa9c19d0019c49c3ae0a75e04d9e66fbeeef465bb8a1d6ca7e103a27` / source `8042ae3f5934300494c05784dd7908871aa36436a3f4c16aafa92231be8e62a8`，层级USER OBSERVATION。未提供后台socket/休眠/电脑关机冷启动证明，不扩大结论。

系统中文输入用户反馈貌似不支持；地区/固件的全部可选键盘未穷尽核实。按[ADR-003](../../adr/003-read-only-comments-danmaku.md)，后续只为F03规划应用内首字母输入/候选，不再验证评论/回复/弹幕编辑。Voice Guide与首字母搜索仍待实测。

0.0.10 manual探针已安装/CLI启动成功（exact pairing见SIGNING_DEVICE_RECORD），新本地词候选/焦点/清理路径只有桌面/源码证据。词库来自固定AOSP数据，未接入内容搜索；已向用户请求NH→你好、ZG及Back/焦点实际反馈。

## 0.0.10首字母输入部分通过与候选区失败

用户确认输入可用、“你好”出现在第一候选，其他操作通过；候选两行四列的第一列无法用遥控到达，记USER OBSERVATION FAIL（候选方向可达性）。包与源码仍为0.0.10已部署工件，不把显示通过扩展成候选区或F03完整通过。

桌面诊断复现第二行第二列按Left跳到下方search-delete，属于跨区域几何排序问题；这不穷尽TV全部差异。0.0.11改为候选4列、键盘10列、工具/底栏的显式方向邻接；边界停留、竖向保持/夹紧列、禁用项跳过、候选刷新/翻页后焦点恢复。另兼容方向键旧名称/37–40键码，未增加页面keydown监听、权限、网络或写接口。

0.0.11修复包已实际签名/更新安装/CLI启动，准确signed/source在SIGNING_DEVICE_RECORD；已请求NH后Up两次→你好、Down→男孩及两行第2列Left→第1列的零售TV复测。未反馈前维持修复项UNVERIFIED，0.0.10导航FAIL不覆盖为PASS。


## 0.0.11 真机候选导航回归通过（F03/W01/W02）

用户对本轮步骤明确回复“已修复，全部验收通过”：NH后从键盘上移进入首候选你好、向下进入第二行第一项男孩、两行第2项向左返回第1项、选中你好，均记USER OBSERVATION PASS。工件为signed `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe` / source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。已更新该部署清单并仓库外保存脱敏用户观察；保留0.0.10第一列FAIL历史。当前输入回归关闭，真实内容搜索/热搜/历史、Voice Guide和其余W01门槛仍开放。


## 0.0.12 合成持久性真机双阶段通过

已实际签名/安装/CLI启动synthetic-persistence-report-once 0.0.12：signed SHA-256 `952e914ee70edb16212f37e8857f4f4f0ae6958f55017e8faefd952a5290aa63` / source `57c584c953ba5a2dcbdd138a0ca8a0520674e79524a48306ca287ef3e6346687`。install/run均exit0/平台成功；同Author/Public Distributor。第一份source匹配TV报告为`keymanager.persistence_prepared_exit_reopen_required`，GET后探针调用自身exit；随后CLI重开相同签名包成功，第二份source匹配报告为PASS `keymanager.synthetic_document_restart_read_cleanup_only`。值一致、remove后get明确NotFound、合成journal清除全部核查。两次GET后40322均关闭；客户端均授权开发电脑，未冒充手机。原始日志/签名包/准确源码和两份脱敏报告在仓库外归档。设备固件/平台读数未变化，marker1保持。

本次合计57项本地检查PASS（39单元/合同、16桌面UI、2native桌面加载/停止），1920×1080十二按钮截图已目检，无裁切/overlay，DOM焦点/正常console/交互通过。C/媒体未改且包完整性通过，13项HOST socket历史检查未重跑。读取/清理是本次合成退出重开证据，不证明进程PID更换、断电、升级/回退、加密或跨App隔离，不据此开始保存真实cookies或关闭W01。下一步恢复默认manual工件供人工Voice Guide/独立运行核查，mode/hash另记。


## 0.0.12 manual 人工验收工件

自动双阶段取证后，已恢复默认manual模式并实际同版本更新安装/CLI启动（均exit0/平台成功）：signed SHA-256 `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。manual没有自动写/报告/退出；运行界面保留首字母导航修复及独立存储重开按钮。准确源码归档与私密包保留，新的部署清单为device-native012-manual-deployment.json，自动测试原清单/两报告均另存不覆盖。自动模式的持久性PASS属于前一配对；手动工件的Voice Guide/电脑关机冷启动仍UNVERIFIED，已请求实际Voice Guide反馈。后续文档重建的unsigned/source与此已安装快照区别记录。


## 0.0.12 Voice Guide / Back 真机反馈

用户对主页面和NH候选间方向移动的Voice Guide检查明确反馈“朗读与焦点一致，Back 正常”，记USER OBSERVATION PASS；对应manual signed `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。已更新部署与仓库外脱敏观察。关闭该探针主界面/首字母候选的朗读与Back项，不扩展为尚未实现产品页面的全量无障碍验收。冷启动/电脑关机、保护存储隔离、真实内容与官方三端投屏仍开放。


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


## 0.0.14 游客热门真实TV读取通过

显式guest-popular-report-once实际签名/安装/CLI启动，均exit0/平台成功；原Author/Public Distributor，signed SHA-256 `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`。collector exit0，TV报告source匹配，`guest.popular_http200_api0_items4` PASS；即电视内原生HTTPS实际取得HTTP200/API0并成功规范化4条游客热门。固件/平台读数同前、marker1保持；授权开发电脑读取固定/report，GET后端口关闭，客户端非手机。精确源码/签名包/原始日志与脱敏报告在仓库外归档。没有把title/UP主/BV/原始正文/headers送入诊断。

本轮88项本地检查PASS：47单元/合同、20主包UI、4观察UI、2native桌面加载/停止、HOST HTTP6/media3/stop4/guest原生参数及内存2。strict/30模块边界与C syntax另外通过，Samsung重编译成功，basic/native/isolation三unsigned完整性通过。桌面native网络超时仍是既有桌面限制，不改变TV实读结论。44基线0缺失，无HEAD/remote、未commit/push/发布。新包的合成声画/Voice Guide/冷启动未从0.0.13直接继承为新实测；其原工件用户通过记录保留。

当前电视停在0.0.14真实游客热门页，已准备人工检查4卡可见/方向选摘要/下一页/Back重入；未回传前popularUiDeviceAcceptance保持UNVERIFIED。该自动工件首开只读一次guest并短时报告，不自动写账号；默认build仍manual。后续仅因文档更新重建的unsigned/source另有hash，不伪装为当前已安装工件。F02仅游客热门读取部分有TV证据，个性化/排行榜/分区与内容播放、F03真实检索、账号/媒体权益/官方三端投屏及完整W01/v1.0.0继续开放。


## 0.0.14 游客热门TV交互通过

用户对四张真实卡片标题/UP主、方向确认选卡摘要、下一页更新内容、Back回主页面再进入明确反馈“全部验证通过，请继续”，记USER OBSERVATION PASS。准确工件为signed `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`，guest-popular-report-once模式。脱敏观察/部署清单已更新。F02热门读取/摘要/分页有TV交互证据；其他推荐/排行/分区及实际内容播放不由本次反馈宣称完成。


## 0.0.15 真实TV游客源检查通过

source `e76620edb780788e52c31310906d695dc413238c30afbdb628350e3b513d3e24` / signed `54522f6e0614c4492328ff1f58e87cb27b5a713da4b76a3da3d84ffbefd982ae`，guest-video-source-report-once。首次安装60秒、重试40秒均超时；SDB devices曾保留device行，但capability查询超时，原地址connect失败。用户确认电视开机/IP未变；TCP26101可达且路由en0，CLI version正常。确认无其他已列设备后只重启本机SDB服务，重连成功；未改证书/卸载App/重启电视。随后同包install/run exit0且平台成功。准确源码快照/签名包/失败与恢复日志私密归档，不抹除失败历史。

collector exit0，source匹配，U800FD / T-KSU2EFAKUC-0090-1300.9 / Tizen9.0 / marker1；guest热门HTTP200/API0/4条及 `ugc.source_ranges_ok` 均DEVICE REPORT PASS：同一公开首P的详情/播放计划符合约束，视频与音频各512bytes、206/精确Content-Range/ftyp通过。开发电脑读取报告后listenerClosedAfterGet=true；不是手机或真实AVPlay声画验收。未请求账号写入。新的播放源动作TV方向/Voice Guide尚未反馈，F04/F06全量与媒体桥继续UNVERIFIED。


## 0.0.16目标TV部分真实播放证据与首播问题

实际installed/run均exit0/平台成功，guest-video-source-report-once；source `8ee04fda0300e20e098f2cbf60107e3fb8171342c9048223c63f1a9e6371919a` / signed `e237999b2da18c8568f31b169e2f961bd921bad8ce7ee8db65eeefae26c23e09`。精确源码/签名包/部署日志在仓库外保留。自动/report两次未取得，不标report PASS；SDB能力查询仍响应，debug尝试未取得调试入口；不凭空断言启动失败或源hash缓存错误。

用户反馈游客热门可见、点击真实视频可播放；首次播放失败，手动检查游客播放源后可播。只记画面USER OBSERVATION PASS与首播USER OBSERVED FAILURE，声音、暂停/seek/Back/Home、跨2MiB窗口连续播放尚未确认。用户关于地址动态刷新的推测保留为推测；实现每次播放本就重取详情/playurl并校验两轨，不据此断言根因。当前可播放工件保留，不伪装为完整F06通过。已请求主页面开启短时诊断以提取失败代码。

后续0.0.17候选增加有界原生事实进度：manifest/video/audio首次完整传输与首个HTTP/cURL问题代码，不含URL/headers；ready后父Worker最多接8条进度，关闭仍需独立ACK。另收紧两轨无Range GET为400、Range unit按大小写不敏感处理，避免主动发送未请求的206。新工件另配hash，不覆盖0.0.16观察。修改是协议/诊断改进，尚未宣称修复首播。


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


## 0.0.18 已部署，备用源TV回归待反馈

manual；source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。安装与CLI启动均exit0且平台成功，原Author/Public Distributor未变，collector expected已切换真实部署清单。精确source ZIP/manifest/DELIVERY在仓库外deployed-source归档，0.0.16/0.0.17签名包、原始日志和匹配报告保留。未自动播放真实内容，未执行账号写入。

已请求优先重试原失败视频及另外两条、直接首播/90秒声画，之后开启诊断。反馈前0.0.18 firstPlaybackRecovery与mediaPlayback均UNVERIFIED，不能继承0.0.17通过样本或HOST7条计划/4次小范围结果。0.0.17部分首播失败仍为开放问题；本轮88项本地检查通过是对应层证据。完整时长、完整F06/W01及单一v1.0.0仍未完成。部署后文档补记与已安装源码快照区分；后续unsigned重建不伪装为已部署。


## 0.0.18 首播/177秒通过，另有详情传输失败（W01/W04/F06）

2026-10-15用户反馈首播正常、连续177秒声画（源总时长4:24），记本次样本USER OBSERVATION PASS。准确manual source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。当前180秒桥租期与177秒反馈接近，但没有用户说明实际停止原因，不将其推断为完整播完或具体停止原因。仅明确一个样本，不推定另外两条全部通过或特定失败内容已回归。

collector exit0且source匹配、GET后监听关闭true。报告包含manifest/video/audio首次范围正文传输、avplay.tracks_video1_audio1、两次ugc.native_closed_confirmed，同时保留独立的FAIL `ugc.view_transport_23`。此次报告未含source_backup_selected，不能声称该播放一定走过备用源，也不能把另一条详情读取失败标为已解决。详情阶段curl23是本地写回调/接收处理失败类别，尚未区分正文超限、header超限或其他情况；代码会主动中止超限响应。继续用固定非敏感原因码收窄，不打印body/headers/URL，不以无界扩容或盲目重试掩盖失败。W01/F06全量及完整4:24播放仍开放。


## 0.0.19 已部署，完整短视频验收待用户（W01/W04/F06）

manual，source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`。首次CLI安装exit1，原始日志显示包传输失败，未进入证书验证；SDB设备列表无连接，get-state/capability exit1，但授权目标TCP可达。重新connect exit0，get-state=device/capability均exit0；未重启电视、改证书或重启本机SDB服务。重试同一签名包install/run均exit0且平台成功。第一次失败记录/两次日志、精确源码archive与签名包私密保留，只有成功后才更新deployed manifest供collector核对。

已请用户正常播放4–8分钟普通视频，核对超过180秒/自然结束返回原卡/重播，再开启诊断；尚未回传，不继承0.0.18首播/177秒为新工件完整时长结论。0.0.19 mediaPlayback/fullDurationPlayback/detailLimitRecovery保持UNVERIFIED。104项本地检查与SDK/包预检分开，W01完整门槛和单一v1.0.0仍未完成。测试期间保留该电视工件，不因后续文档补记重新侧载。


## 0.0.19 所测普通视频完整播放/回卡/重播通过

2026-10-15，用户明确反馈超过180秒正常声画、自然结束回原卡、重播全部通过。记所测普通游客视频USER OBSERVATION PASS；用户未另报本次确切总时长/BV/样本数，不自动记为4:24、8:56或全样本通过。准确source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`，manual。

collector exit0/source匹配，HTTP GET后listenerClosedAfterGet=true；包含ugc.source_backup_selected、游客热门HTTP200/API0/4条、manifest/video/audio范围传输、avplay.tracks_video1_audio1和ugc.native_closed_confirmed。本报告未含失败条目；八条报告不证明无限历史或所有视频。备用源选择这一固定事实已在本机证实，不将其与未导出的特定BV/每次播放强行对应。0.0.18的详情curl23仍保留历史；大详情目标样本回归、长片/URL续期/两小时混播、完整F06/W01/F20仍未关闭。


## 0.0.20 官方发送端发现候选

已有五分钟前台SSDP/固定描述探针和NVA有界解析基础。原组播自收/手机HTTP证明不替代跨设备官方发现；TCP40325/UDP1900共享、组播接口、发送端列表可见和拒绝控制均待该电视实际验证。用户报告Android9.12.0-b28383822、iPhone6.6.0-91300300、iPad3.75.1-37501100可用，OS未知；三端发现/连接/播放/控制/恢复仍全部UNVERIFIED。无新权限或后台接收承诺。126项本地行为检查与固定Samsung SDK编译PASS详见TEST_REPORT，不是本机F20通过。


## 0.0.20 已签名安装/启动，Android发现待用户（W01/W06/F20）

2026-10-15，manual，source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，application BiliProbe1.Probe。沿用自有Author/Public Distributor，签名前后资源一致、证书日期/issuer预检PASS；三unsigned完整性及source配对PASS，安装/启动最终exit0且平台成功。第一次exit1发生在包传输阶段，未到证书验证；SDB列表无绑定、get-state/capability exit1，授权目标TCP可达。仅重新connect原目标后state=device/capability0，重试同一签名包install/run成功，未改证书、重启SDB服务/电视或固件。原失败日志和两次记录均私密保留。

成功后才更新deployed-native-manifest供collector匹配；精确部署source ZIP/manifest/DELIVERY及unsigned native归档在仓库外deployed-source/完整hash，签名包私密保存。0.0.19包/源码及用户完整短片通过证据仍保留，不被新包覆盖为失败或继承到未测投屏。之后文档更新重建的unsigned/source不重新侧载；精确已装身份仍以上述hash为准。

已请用户先在电视启动五分钟发现窗口，再用Android官方9.12.0-b28383822普通公开视频TV列表检查自身接收端名称，点击一次记录结果，返回开启诊断；尚未回传。iPhone6.6.0-91300300和iPad3.75.1-37501100资源已确认，OS未知，后续分别测。安装/启动PASS不等于发现/连接/声画/控制通过；三端F20以及W01整体仍UNVERIFIED，未发布v1.0.0。


## 0.0.20 发现启动失败与0.0.21兼容修正（W01/W06/F20）

2026-10-15，用户反馈电视显示cast.failed_13。对应已部署manual source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，记USER OBSERVATION：发现监听启动FAIL；未取得本次匹配报告，原stage13合并了接口选项/TTL/入组，不能从该code唯一断定某syscall或errno。手机发现未到达，不记Android协议失败，三端F20保持UNVERIFIED。

复查[Samsung官方Socket选项表](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)（2026-10-15）：列出TTL、ADD/DROP_MEMBERSHIP，没有IP_MULTICAST_IF。本机固定Samsung1.39.4.7的library_tizen_sockfs.js同样没有该选项映射，getLevelAndOptionString对未知项抛ENOPROTOOPT；direct SocketsHostBindings路径委托TV实现，未取得其源码，不能把旧adapter报错当作本次TV已导出errno。原探针无条件设置IF是明确的兼容缺口，之前HOST fixture跳过整段组播配置，没有覆盖它。

0.0.21去掉不在支持列表内的IP_MULTICAST_IF调用，接收仍用经校验的本机RFC1918地址加入固定组，出站NOTIFY使用TV的IPv4路由；目标239.255.255.250、TTL1、私网peer校验/限流、监听范围和全部资源预算不变。多接口出站路由/真实跨设备发现仍待TV证据，不声称已固定出站接口。TTL失败改131，入组失败改132，清理未知17仍不能ACK/重用。没有忽略失败或改ANY入组，没有增加权限、放宽CSP/TLS/目的地、修改SDK或引入外部服务。

新增显式内部auto=6（cast-startup-report-once）：开始一次发现启动检查，收到native ready立即停止，等待原生关闭ACK后开放固定脱敏报告；15秒启动预算，用户操作/Home取消后不继续自动报告，旧自动回调不关闭新手动窗口。只证明bind/TTL/join和清理，不测试官方端可见/连接/实际播放；无视频自动播放/账号写入。默认npm run build仍manual，部署auto=6必须显式构建并写入包metadata；手动“五分钟发现”入口保留。


## 0.0.21 已部署，发现启动/清理本机通过（W01/W06/F20）

2026-10-15，auto=6 cast-startup-report-once，source `7828bbd82c20a67cda472fa05c81c39f7ca59df16b58a553816d344832c8e7a1` / signed `fa3598d16bd1e25dbd2dbcfaea7deed07ef5fac7f650d81485e5d795ab011d71`。自有Author/Public Distributor；安装前显式目标get-state=device/capability0，无需重连，install/run首次均exit0且平台成功。未改SDK/证书或电视配置。原0.0.20失败、0.0.19可播放包及历史报告保留；已部署manifest只在成功后切到新工件。

collector exit0，source/signed匹配，TV报告cast.ready进度、cast.native_closed_confirmed PASS，HTTP报告GET后监听关闭true。该C ready只在TCP40325/UDP1900绑定、TTL1、指定接口入组和时钟成功后发出，随后ACK仅在native socket/drop membership清理成功后发出；因此记所测TV发现启动和清理DEVICE REPORT PASS，修正后未再见原stage13。原stage13精确syscall/errno未导出这一边界仍保留，不将候选定位伪装成旧包已取到独立errno。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0、marker1；Chrome主版本仍不可提取。启动报告已另存私密device-native021-startup-report.json，避免之后同source手机/手动报告覆盖它。

自动检查收到ready立即关闭，没有证明NOTIFY实际接收、手机可见、连接或媒体投送。已请用户手动开启五分钟窗口，用Android官方9.12.0-b28383822查找自身BiliSofa W01 Discovery并点击一次，最后开启报告；尚未反馈。iPhone/iPad同样保持未测，完整F20/W01/v1.0.0未完成。精确已装source ZIP/manifest/DELIVERY与unsigned native私密归档；之后文档重建的manual unsigned不重新签名/侧载，已装身份继续以上述hash/auto=6为准。


## 官方发送端发现更新（2026-10-15，0.0.21）

Android 9.12.0-b28383822、iPhone 6.6.0-91300300列表可见USER OBSERVATION PASS；Android点击后明确拒绝未接通媒体。iPad 3.75.1-37501100仅AirPlay、未见本探针、TV无错误；应用名称/入口/本地网络权限待核查，不推断该版本协议或TV故障。匹配累计报告见F20_PROTOCOL_EVIDENCE；OS/硬件尚缺。0.0.22 SOAP候选136项本地行为检查通过，不替代本机响应/媒体/三端验收。


0.0.22 source `a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6` / signed `3a12818dcb16f2f4614ae88d9a267b9a9fb85ee84730dc3b74ed2cd500b3050c` 已安装/启动且匹配自动报告证明监听启动/原生清理，marker1。SOAP请求/响应与媒体仍待真实发送端，不能由启动通过推导。精确安装证据见SIGNING_DEVICE_RECORD。


0.0.22 Android报告已匹配收取：状态查询解析、控制拒绝、未定位无效SOAP及原生清理。没有远端收取确认或投屏声画。iPad为哔哩哔哩HD、视频内TV、本地网络允许仍未见；不将其归类为权限关闭。0.0.23新分类/持续显示待本机证据。


0.0.23匹配Android报告进一步证明SetAVTransportURI外层XML/动作已过、参数结构被拒，v1固定摘要与三条分类一致；native关闭/报告GET后关闭通过。缺失/额外/属性等尚未分开。0.0.24完整60事实分类仅本地验证，不提前记真机或媒体PASS。


0.0.24已签名安装/启动，匹配自动报告证明cast.ready/原生关闭ACK、报告GET后关闭及marker1。已装source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276` / signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`；详情与私密冻结工件见SIGNING_DEVICE_RECORD。新offer完整分类待Android再触发一次，不继承为媒体/完整F20通过。文档补记的manual重建包不重新侧载。


0.0.24匹配累计报告确认extra scalar/HTTP URI/metadata>2048字符，源host/格式/期限仍未知。0.0.25新增同TV内一次HTTPS候选范围检查；165本地行为检查/SDK通过不代替本机CDN/TLS/媒体，完整参数兼容和源检查待Android真实触发。ADR-005记录窄化合同选择；不发HTTP或关闭TLS。


0.0.25已签名安装/启动并取得匹配的ready/原生关闭ACK、报告GET后关闭与marker1证据。已装source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8`；精确冻结工件见SIGNING_DEVICE_RECORD。auto6未创建source cURL，参数兼容、HTTPS/活跃句柄取消及媒体仍待Android真实触发；不扩大启动PASS。文档补记manual重建不重新侧载，HD和完整F20/W01/v1.0.0继续开放。


## 0.0.25 Android HTTPS 源范围实机通过（2026-10-15）

用户开启诊断后collector exit0；source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8` 精确匹配。报告有 `cast.source_policy_supported`、`cast.source_upgrade_planned`、`cast.source_started` 和 **PASS `cast.source_pass`**，随后 `cast.native_closed_confirmed`；GET后监听关闭true、marker1。摘要 `cast.soap_summary_v1_8000400408002010` 解码为transport_query、uri_offer_rejected、stop_rejected、offer_args_extra、offer_uri_http、offer_metadata_oversized。

记DEVICE REPORT PASS：参数兼容越过原arguments拒绝；同址HTTPS候选在本电视完成TLS校验、HTTP206/0–511范围、512bytes与ftyp头检查，source句柄完成清理，最终发现监听清理确认。未记声画、手机收到成功回复、连接、控制或活跃source中途取消通过；SOAP仍拒绝媒体，完整F20/W01开放。私密报告独立保存在device-native025-android-https-report.json与observation，startup原件保留；原始CDN URL已经擦除，下一包需要一次新投送。


## 0.0.26 实际签名安装与启动取证（2026-10-15）

已装auto=6（cast-startup-report-once）、BiliProbe1.Probe：source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56`，signed SHA-256 `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`，unsigned native `59f50ccde7ccb1410d83ab24f191b68e6fbd3f36ab6c208a8523ded66506b322`。全部191不同本地行为检查/strict/C/SDK、三个unsigned gate与source ZIP冻结通过。原Author/Public Distributor保持，仅用BiliSofa profile；未改电视固件、其他证书/账号。

SDB首次get-state exit1，原授权地址connect exit0，state复查/capability exit0；install第一次exit0且install completed，run exit0且successfully launched。保留首次连接失败私密日志，不记作安装失败或证书故障。collector exit0，精确source/signed匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1。设备仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0；engine major仍不可提取。

只登记DEVICE REPORT PASS监听启动/原生清理；auto6未创建source或媒体桥，不证明活跃桥/AVPlay清理或实际声画。已请求用户一次Android新投送→TV确认→90秒声画/暂停/seek/Back→诊断；未获反馈项保持UNVERIFIED，SOAP接收/手机控制/HD发现/完整F20/W01/v1.0.0继续开放。

精确已装source ZIP/manifest/DELIVERY/unsigned frozen于仓库外deployed-source/d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56，签名包/raw logs/private metadata在仓库外；startup原件另存device-native026-startup-report.json，后续手动报告不能覆盖它。文档补记后的默认manual重建工件不再次签名或侧载，不能替代上述已装身份。main无HEAD/remote，未commit/push/公开发布。


## 0.0.26 无法播放反馈与确认窗口证据（2026-10-15）

用户反馈“无法播放”，未说明按钮是否亮/是否进入播放器，也未提供cast错误码。两次collector均exit0，精确source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56` / signed `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`匹配；均含source_pass、source_policy_supported、media_expired、summary_v1_800044060a002010与native_closed_confirmed，GET后关闭true。第二份是同一页面累计记录，不能当作第二次独立播放尝试。startup原件保留，手动报告另存device-native026-no-play-report.json/observation。

登记USER OBSERVATION FAIL（无法播放、阶段未明），不记播放器解码失败。报告未见AVPlay started/prepare_failed或media_ready；native media_expired只在尚有ready候选、未移交桥时发出，因此本次未证明已接纳电视确认。不能据此责怪用户未操作、推断遥控故障或CDN失效；原根因仍开放。

代码审查发现后续手机轮询/发现事件会覆盖“检查通过，请电视确认”提示，过期后也可被覆盖。0.0.27修复保持就绪/过期提示、明确左右邻居，保留60秒/不自动播放；新增TV确认发送和Worker接纳固定回执、10秒未就绪关闭与明确故障。所有回执无外部payload，8项诊断保留两阶段回执；进度94（原93+approved），SOAP位序不变。只改善操作和定位，不声称已经修复媒体解码。C/SDK、源策略/媒体桥不变，0.0.27复用0.0.26已编译原生字节；新UI/Worker需重新验证/打包/签名/本机反馈。


## 0.0.27 安装超时后实际版本恢复取证（2026-10-15）

已签名auto=6/BiliProbe1.Probe：source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218`，signed SHA-256 `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`，native unsigned `948b43c7224f5d7fe79291e516e99e16e1b8bb5cfe4ace3e68718155da90f86f`。154不同本地检查、strict/46模块与三个unsigned gate/source ZIP冻结通过；C/CA/native三文件与0.0.26相同且hash核对通过，本轮没有宣称重新SDK编译或重跑HOST网络。

安装前get-state=device/capability exit0；唯一一次install在60秒被外层timeout终止（exit124），私密日志确认传输完成、停在安装阶段，无install completed/失败确认。后续get-state/capability均exit0；只读TV应用列表含目标条目但没有版本，通用pkgcmd查询虽exit0/空输出亦不算版本证据。无残留安装Java进程，未kill其他进程、重启SDB/电视、改证书或重试安装。

随后只启动当前BiliProbe1.Probe，CLI exit0且successfully launched。临时让collector按新signed manifest（未提前更换deployed）校验，exit0、实际报告build精确为新source；cast.ready/native_closed_confirmed、GET后关闭true、marker1，固件/model/platform不变。此后才更换deployed manifest。记DEVICE BUILD VERIFIED已更新/正常启动和监听/清理PASS，安装CLI成功回执仍UNVERIFIED（保留exit124），不是伪造install exit0。源码/unsigned/manifest/DELIVERY按全source冻结于仓库外，startup原件另存device-native027-startup-report.json。

新包只在TV确认后尝试媒体，没有自动播真实内容；新版固定提示/两阶段回执/播放/活跃桥清理仍待用户实际反馈，未把启动报告提升为这些PASS。已请求先验证按钮可选/能否进入播放页/起播并开启诊断，不再要求尚未起播时做90秒及控制。0.0.26“无法播放”USER FAIL与阶段未明、候选过期的事实保留。完整F20/W01/v1.0.0继续开放，无commit/push/发布。后续文档默认manual重建不再次侧载，电视维持上述auto6签名工件。


## 0.0.27 已确认进入播放器、AVPlay准备失败（2026-10-15）

用户明确反馈“进入播放页但无声画，诊断已开启”。collector exit0，source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218` / signed `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`匹配。报告source_pass、candidate_confirm_sent、media_approved、media_ready、**FAIL cast.avplay_prepare_failed**、summary_v1_8000400402002010及native_closed_confirmed，GET后关闭true、marker1。startup保留；手动原件另存device-native027-prepare-failure-report.json/observation。

本次TV确认/Worker接纳/桥监听启动分项DEVICE REPORT PASS，原生关闭通过（已批准的桥监听）；USER声画FAIL，AVPlay启动链路DEVICE REPORT FAIL（旧catch同时覆盖open/prepare/play，不能独立区分）。未见具体请求类型、AVPlay枚举/异常名或媒体轨道，不能推断必为codec、TLS、HTTP拒绝或活跃媒体transfer取消；不把0.0.26候选过期继续套用到此次失败。完整F20/W01保持开放。

源码复核发现原progressive桥不接受无Range GET/后缀Range，且开放范围只答2MiB；这些是可用HOST复现的兼容缺口，当前没有TV请求类型证据证明它们就是此次根因。0.0.28补齐HTTP响应和请求分类/AVPlay固定错误枚举，再以新包实测，不提前宣称修复声画。

0.0.27错误标签复核：startCastMedia旧catch同时覆盖await open和同步play，cast.avplay_prepare_failed仅证明启动链路失败，不足以区分prepare或play阶段；此前按标签解释为单独prepare失败的文字以此修正。0.0.28新增phase区分和独立play失败UI用例；不改写用户“进入播放页但无声画”及原始报告。


## 0.0.28 HTTP兼容候选实际部署与启动（2026-10-15）

auto=6/BiliProbe1.Probe，source `e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60`，signed SHA-256 `896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d`，native unsigned `c7e8b1bd872be4ec71def203fd9f9a230ce57c74dbe838e1753c3150e5a9272f`。208不同本地检查及strict/C syntax/实际Samsung重编译/三个unsigned gate/source ZIP冻结通过；相同Author/Public Distributor，无新权限、证书或固件变更。

get-state=device/capability exit0，无需重连；第一次install exit0且install completed，run exit0且successfully launched。collector exit0，TV build与新source匹配，签名工件配对；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup独立保留device-native028-startup-report.json。准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结在仓库外deployed-source，私密签名包/raw日志保留，不混入后续默认manual文档快照。

启动自动模式未创建源cURL/媒体桥或AVPlay；只通过新包监听/清理，不扩大为HTTP请求实际类型、分段续传、声画或活跃transfer取消的TV证明。已请求Android同一视频重新投送→TV确认候选，正常时可继续90秒/暂停/seek/Back，最终开诊断。真实请求类型/声画/手机控制、HD发现、完整F20/W01/v1.0.0继续开放。0.0.27无声画与旧catch混合prepare/play的边界已更正并保留，未提前记为HTTP根因或声画修复。

文档补记后默认manual重建不再签名/部署，电视维持上述精确auto6工件；无HEAD/remote、未commit/push/公开发布。

## 0.0.28 声画反馈及控制失败（2026-10-15）

W01/F06/F20：用户确认TV已检查候选声画正常；首次暂停/继续退出、第二次正常，首次跳5秒成功，进度超过5秒再次跳5秒卡住后返回投屏发现。独立记录声画USER PASS、控制FAIL；未明确连续90秒，不计90秒通过。部署源码e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60、签名896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d。实际读取报告HTTP PASS且GET后监听关闭，含cast.media_issue_206_28（上游206/cURL超时）、source_pass、avplay_started、media_requests_v1_02（开放Range）、native_closed_confirmed。原始脱敏报告及用户观察保存在仓库外device-native028-controls-report/observation.json；首个暂停独立失败未被8项摘要保留，不将其根因推断为已证实。

0.0.29候选按ADR-007修复渐进MP4背压总超时和seek期间控制叠加；真实TV回归尚未完成。未接通手机控制，完整F20/W01仍开放。

## 0.0.29 实际签名部署与控制待回归（2026-10-15）

W01/F06/F20内部auto6，BiliProbe1.Probe，source `ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b`，signed SHA-256 `e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3`，native unsigned `8d64a8eaeccd4175de038bdecf46db231e3ee016187ae00085d21ac4716d9a9b`，source ZIP `834bc897873860f71c3746ee63396e855f35d1b381ace59c7068317ae65c1dea`。214不同本地检查PASS、strict/46模块/C syntax/真实Samsung SDK编译及三个unsigned gate通过；相同自有Author/Public Distributor，无新增权限。

设备state/capability exit0，首次install exit0且install completed，run exit0且successfully launched。collector exit0，实际build与新source匹配；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。启动原件仓库外device-native029-startup-report.json，准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结于deployed-source，签名包和raw工具日志留私密目录。

仅证明部署/发现监听启动/清理；自动模式未播放真实内容，不证明新的暂停/回跳修复或手机控制。已请求同一视频起播20秒→暂停20秒→继续→两次回跳5秒→Back并开启报告，待用户反馈；0.0.28声画USER PASS与控制FAIL独立保留。W01/完整F20/v1.0.0仍开放，不将TV确认候选播放当官方连接控制验收。文档补记后默认manual重建不再次部署，电视维持上述精确auto6包。main无HEAD/remote，保留所有未提交文件，未commit/push/公开发布。

## 0.0.29 暂停通过、回跳仍间歇失败（2026-10-15）

W01/F06/F20：用户确认起播20秒后首次暂停20秒再继续正常，记录USER PASS；回跳5秒在两次播放中分别出现首跳失败、首跳成功/第二跳失败，卡住后返回发现页，记录USER FAIL。collector exit0，source ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b / signed e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3匹配，HTTP报告/GET后关闭true，avplay.seek_failed、source_pass、media_requests_v1_02和native_closed_confirmed。手动报告/观察另存仓库外device-native029-seek-report/observation.json，startup不覆盖。通用catch丢掉SDK/timeout原因，不能提前锁定根因；无206/28条目也不扩大为全程网络通过。90秒未明确反馈，完整F20/W01仍开放。

0.0.30候选按ADR-008拆分prepare15秒/seek30秒有界等待、仅渐进MP4 IDLE显式配置4秒起播/恢复和10秒缓冲、固定SDK原因/缓冲/目标tick分类；已结束且活动状态不变的seek失败保留播放页允许手动重试，未知/超时仍关闭，不自动重试。真实回跳修复仍待新包反馈。本轮C/native源未改，不声称SDK重编译；重用0.0.29已实际编译且C source hash匹配的固定32MiB WASM，需继续通过包hash门禁。

## 0.0.30 实际部署与seek待验收（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47`，signed SHA-256 `61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4`，native unsigned `1daefa1ae7b078e639127c834b19c45e1f19e5f3ee56a07f97af40b615a944f0`，source ZIP SHA-256 `c005cf2689246fd42b0e29572b00f3fe97dc3bea342c31a8be56aff30ef37465`。171不同本地检查通过（107+62不同UI+2native桌面，初始夹具问题和定向复核见TEST_REPORT），三类unsigned/source/许可门禁通过；C及native JS/WASM/data/manifest与冻结0.0.29逐字节一致，本轮无SDK重编译声明。

state/capability exit0，首次install exit0且install completed，run exit0且successfully launched；相同自有签名profile/Author/Public Distributor，无需重连或新权限。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup原件独立保存仓库外device-native030-startup-report.json；精确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结，签名包/raw日志仍私密。

自动启动未播放媒体或触发seek，不证明新缓冲/回跳修复。已请求同一内容两次进度过10秒回跳5秒，单次最多等30秒、首跳失败即可结束并开报告；无需重复0.0.29已通过的20秒暂停。新包声画/回跳仍待用户反馈；完整W01/F20/v1.0.0继续开放，手机控制仍拒绝。后续文档默认manual重建不重新部署，精确部署快照与本地文档包分开；main无HEAD/remote，无commit/push/发布。

## 0.0.30 最新seek报告与0.0.31候选（2026-10-15）

W01/F06/F20：collector exit0、精确匹配source d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47 / signed 61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4，HTTP/GET后关闭true，最新FAIL avplay.seek_callback_invalidvalueserror_b0_t0、source_pass、media_requests_v1_02、native_closed_confirmed。手动原件单存仓库外device-native030-seek-report/observation.json，startup不覆盖。SDK callback错误不等于应用30秒watchdog，且未证明URL失效或参数5秒本身非法。用户“两次恢复声画和进度，等待超过30秒后失败，失败时自动返回”的顺序已请求可选澄清；保留原话，自动返回USER FAIL，尚不将两次恢复都记PASS。

按ADR-008新增0.0.31：仅PLAYING的受控渐进MP4可用PREBUFFER_MODE目标起点重新准备/播放；同owned URL/Worker/3分钟租期不变，不叠加或自动重试原SDK seek，不新取源、不延租、不增加decoder。paused/缺接口仍走原SDK候选，未扩大这些验收。最近4次seek常量结果历史与详细故障/清理共同进入8项报告。C/WASM本轮未改，候选实际声画/两次回跳与后续播放仍待新包验证，完整W01/F20开放。

## 0.0.31 指定时间重新缓冲候选部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114`，signed SHA-256 `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，native unsigned `0ae308207ba0853f9aec4ff3cf55a9910d4a022124d12aeda9eb850a9d368983`，source ZIP SHA-256 `4f39bf53d6ecb03799a265b428e31dc338332842b5f6726065f83abd305232a7`。181不同本地检查PASS（113合同单元/66整组主UI/2native桌面；最后配置异常枚举补丁另重跑113及19媒体定向），strict/46模块/C syntax、三个unsigned/source/许可门禁通过。C和native JS/WASM/data/manifest与冻结0.0.30逐字节一致，没有新SDK编译声明。

state/capability exit0，首次install exit0且install completed、run exit0且successfully launched，无需重连/新权限/改证书。同自有profile/Author/Public Distributor。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后监听关闭true、marker1；model U800FD / firmware T-KSU2EFAKUC-0090-1300.9 / platform9.0，engine major未知。startup私密原件device-native031-startup-report.json；准确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结deployed-source，签名包/raw日志仍在仓库外。

仅自动发现启动/清理通过，没有自动播放或PREBUFFER_MODE设备证明。已请求同一视频两次过10秒跳到5秒，第二次后正常播放35秒以核查后续自动返回；单次最多等30秒，首跳失败可结束并开报告，不要求重复长暂停。0.0.30最新SDK InvalidValuesError与用户自动返回FAIL保留，两次恢复的具体顺序待可选澄清，未擅自记PASS。0.0.31实际起播/两次重定位/后续35秒声画仍待反馈，paused/全F06、官方手机控制/三端完整F20/W01/v1.0.0继续开放。后续文档默认manual包不重复部署，电视维持上述精确auto6。main无HEAD/remote，原有所有未提交文件保留，无commit/push/发布。


## 0.0.30澄清与0.0.31回跳失败（2026-10-15）

用户确认0.0.30前两次回跳恢复声画/进度，第三次失败并自动返回；前两次USER PASS、第三次USER FAIL，整体未通过。0.0.31两次独立尝试均首跳失败回零售探针主页面，USER FAIL。collector实际匹配source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114` / signed `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，HTTP读取/GET后关闭通过，FAIL `avplay.seek_restart_callback_pending`、history_f、source_pass、media_requests_v1_02、native_closed_confirmed。stage pending不能区分同步prepare拒绝/非READY回调等，未定位SDK或网络根因；无native错误条目不证明网络始终通过。手动报告另存私密device-native031-seek-report.json，0.0.30/31观察另存，startup不覆盖。

按ADR-008准备0.0.32：恢复原生seek默认策略，PREBUFFER仅保留显式HOST实验，增加固定SDK阶段/状态与原生桥有界flow/limit分类；TV确认后自动三次回跳及后续35秒时间轴检查，再等清理ACK开启报告。Back/Home可取消；自动时间轴只记UNVERIFIED，不替代声画。无新增权限、URL重获/延租、账号写入或手机控制接通。实际新包部署/验收另记，完整W01/F06/F20开放。


## 0.0.32 已部署，自动三跳实际结果待取证（2026-10-15）

250不同本地检查及实际Samsung重编译/三类unsigned/source/许可门禁通过。首次连接状态失败后仅重连已有授权TV成功；install/run exit0且平台成功。auto6 source `d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd` / signed `f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852`，source匹配报告为cast.ready/native_closed_confirmed，GET后关闭true，marker1。准确unsigned/源码ZIP/私密归档见[SIGNING_DEVICE_RECORD](SIGNING_DEVICE_RECORD.md)。仅启动/清理通过，新的回跳/声画未验收。已请求TV确认自动三跳+35秒观察，Back/Home可取消，清理确认后自动开报告。官方手机控制仍拒绝；完整W01/F06/F20/v1.0.0继续开放。


## 0.0.32 自动检查失败与0.0.33诊断修正（2026-10-15）

用户启动TV批准的自动流程后，collector实际读取精确匹配source d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd / signed f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852的报告：自动FAIL avplay.control_check_failed_network，SDK FAIL avplay.seek_callback_invalidvalueserror_b0_t0_sp，history_se。仅证明第一次seek成功回调、第二次明确可重试拒绝且SDK仍PLAYING，不等同用户确认声画；流程按故障结束并清理。错误快照flow_e_c2_p0_w4_m6_l5、停止flow_s_c0_p0_w4_m6_l5、source_pass、请求摘要02、native_closed_confirmed；HTTP/GET后关闭true。快照为2连接、0背压、4窗口、累计向上取整6MiB、剩余时间桶5；无字节/窗口/租期触顶证据，不能据此确定根因或证明网络全程正常。原件私密device-native032-auto-seek-report.json，startup独立保留。

源码复核定位诊断丢失：CastProbeView仅在UI代次有效时记录media_issue，关闭期间到达的底层固定错误被忽略；紧凑报告还可能让后来的media_stopped遮住较早issue。0.0.33候选把本次已验证issue与flow/limit一并保存到该run的局部集合，native ACK后才汇总；compact单独优先issue与limit，再考虑stopped，SDK/历史/清理仍保留。没有放宽late回调执行UI/播放的边界，没有改seek策略、网络预算、权限或C/WASM源。该修正只补证据完整性，不能宣称修复播放器。新包真实底层错误与回跳仍待取证，完整W01/F06/F20开放。


## 0.0.33 已部署并开始自动取证（2026-10-15）

197不同本地检查、strict/47模块和三类包/源码/许可门禁通过。首次install/run exit0且平台成功，source `83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354` / signed `4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82`，启动报告匹配、cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP见SIGNING_DEVICE_RECORD。C/WASM不变。用户已开始相同自动流程，真实结果等待collector；这是证据留存修正，不是回跳修复证明。


## 0.0.33 首次自动尝试停在prepare（2026-10-15）

collector实际匹配source 83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354 / signed 4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82。FAIL cast.avplay_prepare_timeout（15秒应用有界等待），source_pass/TV确认/批准/请求02、停止快照flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，HTTP GET后关闭true。没有进入自动seek；没有原生issue/错误快照e，不能作为上一轮第二跳的同一原因，也不能证明底层网络正常。原件单存私密device-native033-auto-attempt1-prepare-report.json，startup不覆盖。

保持同一0.0.33/相同策略，已请求再启动一次相同自动流程，无新安装或放宽超时/预算。此轮起播FAIL、回跳UNVERIFIED，完整W01/F06/F20仍开放。


## 0.0.33 同包复测仍prepare超时，0.0.34有界观察候选（2026-10-15）

用户确认重新启动后，第二份匹配同source/signed报告仍为cast.avplay_prepare_timeout、source_pass、请求02、flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，GET后关闭true；未进入seek。第二份原件单存私密device-native033-auto-attempt2-prepare-report.json，不覆盖首次/启动报告。这是本次两次prepare失败，未取得关闭期底层issue，不能改写0.0.32的第二跳SDK错误为同一根因。

0.0.34仅cast候选prepareAsync观察延至30秒（legacy合成/游客仍15秒，seek仍30秒），超时增加关闭前实际SDK状态和最后buffering标志。30秒是有界观察实验，不是“延长超时已修复”结论。三星文档中buffering timeout只定义onbufferingcomplete，4秒缓冲表示媒体累计量，不承诺prepareAsync在10或15秒内返回；本轮官方资料复核见ADR-008。原生上游无数据15秒、3分钟租期及资源/TLS范围保持，可先呈现真实网络错误；不自动重试。

另修正自动流程在prepare中被native issue关闭时的报告路径：即使mediaPlayer已被清空，只要仍同automation epoch且非用户Back/Home/新操作，仍等待清理ACK并自动报告。取消/新owner仍不能自动打开报告或复活player。新实际效果仍待测试/部署与真机报告，不先宣称修复。


## 0.0.34 已部署，准备等待与回跳实际结果待取证（2026-10-15）

200不同本地检查（124+74+2）、strict/47模块、三类包/source/许可门禁通过。C/native字节复用0.0.32已实际编译的四文件。首次install/run exit0且平台成功；source `3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94` / signed `af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731`，source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。只证明启动/清理，不证明延长cast prepare有界观察已修复。已请求相同自动流程，真实报告待读取；完整W01/F06/F20/v1.0.0仍开放。


## 0.0.34 实际起播、第二跳失败及原生超时证据（2026-10-15）

用户明确“开始播放了”，记所测实际起播USER OBSERVATION PASS；未明确确认本轮全部声画/三跳。自动报告与之后用户重新开启的手动报告均实际读取并匹配source 3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94 / signed af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731。history_se、SDK InvalidValuesError_b0_t0_sp、control_check_failed_network，整体FAIL；source_pass/请求02/native_closed_confirmed，HTTP GET后关闭true。

首次完整保留独立native FAIL cast.media_issue_0_28：上游尚无HTTP状态时超时，不是HTTP403或已证实的解码失败。flow_e_c2_p0_w5_m7_l5（2连接、0背压、5窗口、累计向上取整7MiB、剩余30秒桶5）。不能据此认定所有SDK回跳错误都由同一原因造成，亦非资源上限证据。起播观察30秒未构成三跳通过。auto/manual原件分存私密device-native034-auto-seek-report.json / device-native034-manual-seek-report.json，startup保留。

0.0.35候选只对已批准匿名progressive GET，在本次范围尚无HTTP头/状态/正文的curl28超时，排队250ms后新连接重发同一范围。每个下游连接最多一次、整租期最多三次；重复消耗原窗口预算，保持原URL/Range、TLS/CA/host、3分钟/签名租期、128MiB/256窗口/512连接/4×64KiB边界。不重试部分正文、HTTP/范围/格式/证书错误，不重试seek/prepare/写操作，不重取URL或延租。进度retry_1/2/3只是已排队而非恢复证明，最大105帧/8条报告。新包实际效果仍待设备证据。


## 0.0.35 已部署，有限重连与三跳待实际验收（2026-10-15）

262不同本地检查、strict/47模块/C syntax/真实Samsung SDK重编译及三类包/source/许可门禁通过。首次install/run exit0且平台成功，source `0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510` / signed `7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1`；source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1。准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。仅启动/清理通过，已请求同一自动流程验证零HTTP响应超时的有限重连与三次seek；完整W01/F06/F20继续开放。


## 0.0.35 单样本三跳/35秒声画通过（2026-10-15）

source 0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510 / signed 7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1。实际匹配报告history_sss、avplay.control_check_complete_timeline_only、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。SDK三次回调和真实目标tick/后续35秒进度均按driver完成；原报告自动结论仍UNVERIFIED timeline_only，不改写为声画PASS。最后SDK成功摘要t0只表示回调操作窗口内未见目标±1500ms tick；driver在回调后继续观察目标区间，因此不矛盾。

用户对刚才自动三次回跳及后续播放明确反馈“声画正常，没有卡住”，本所测公开视频的三跳声画/后续无卡住记USER OBSERVATION PASS。流程结束主动回主页面为预期，不等同此前故障返回。flow_s_c1_p0_w10_m16_l4；没有media_retry进度或native错误，不能宣称重连支路被触发、恢复已证明或新代码为通过原因。重连真实分支/更多样本/长期稳定/完整F06、官方手机连接控制/三端F20与W01继续开放。auto报告/用户观察私密分存device-native035-auto-seek-report.json / device-native035-user-observation.json，startup不覆盖；历史失败完整保留。下一步推进真实官方手机会话/控制，不用这次TV确认候选结果冒充手机连接通过。


0.0.36已安装启动，精确source/signed报告cast.ready/native_closed_confirmed与HTTP GET后关闭通过，marker1/同固件平台。新增单源SOAP手机控制候选的真实发送端/状态/控制权验证待Android反馈；HOST和桌面假后端不能填此门槛。0.0.35单样本三跳声画USER PASS保留，不推导完整F06/F20通过。精确工件见SIGNING_DEVICE_RECORD最新段。

0.0.36用户确认官方Android单样本手机连接/暂停继续有效；手机暂停后遥控seek退出USER FAIL。匹配source报告原生206_28与SDK InvalidValuesError/sh、重连排队1、清理确认，独立用户观察/原始报告私密保存。0.0.37消除seek期间getDuration读取，并增加已校验206范围有限续读；本地测试不是新TV效果，详见ADR-008/TEST_REPORT。

0.0.37用户确认官方手机无法投屏且电视无声画，匹配receiver approved/control_denied/stale；暂停组合未到达，API started不作为实际声画证明。0.0.38起播握手/准备状态心跳候选已部署，source匹配启动清理与GET后关闭通过；真实连接/声画待反馈。前版局部通过/失败各自保留，精确hash见SIGNING_DEVICE_RECORD。


## 0.0.38失败与0.0.39新样本边界

0.0.38前两次reject、后两次连接但无视频USER FAIL；匹配prepare30秒超时、无真实tick，快照收发/应用和query_live已到达。0.0.39真实SDK重编译仅增加原512字节源布局分类；启动清理报告匹配，UTC03:45:33新投送报告moov_first、receiver_summary_v2_1a0c0005含真实timeline_tick/changed，source_pass、flow_s_c1_p0_w3_m6_l6、native_closed_confirmed及GET后关闭。用户明确确认播放、声画正常，所测样本起播USER PASS。

source fdcfa3698b489e6e7fc2240ad6128b7651ddbfd8c7cc4474bd9ac2c5c1b8f582 / signed 04b47df6904b38ee35b78c3859422b41c107ba227a80c97a41c333874d618efc。精确报告与用户观察私密分存，startup保留；不把这次布局套到旧失败请求，不把诊断代码认作修复。手机暂停/遥控seek/恢复/交还控制同包待验；完整W01/F06/F20不关闭。


## 0.0.39 暂停回跳后声画未恢复，0.0.40候选（2026-10-15）

用户明确操作可进行，但“跳到5秒后无法恢复正常声画”，组合验收USER FAIL。UTC03:48:34报告匹配source fdcfa3698b489e6e7fc2240ad6128b7651ddbfd8c7cc4474bd9ac2c5c1b8f582 / signed 04b47df6904b38ee35b78c3859422b41c107ba227a80c97a41c333874d618efc。SDK seek_callback_invalidvalueserror_b0_t0_sh（PAUSED、操作窗口无目标tick），receiver_v2_1a0c001d包含批准/query/Play/Pause/快照及曾有实际时间推进；history_ssee是报告中的最近四个结果，不据此猜测每次物理操作顺序。media_retry_2仅排队重连事实，flow_s_c1_p0_w13_m17_l4、source_pass/native_closed_confirmed、GET后关闭true；无独立issue保留不等于网络正常。原件及用户观察私密分存device-native039-paused-seek-report.json / device-native039-paused-seek-user-observation.json，单样本此前声画PASS不覆盖本组合FAIL。

0.0.40仅对cast progressive暂停态有setStreamingProperty时，在同一原租期/源/loopback URL下重建AVPlay，IDLE以PREBUFFER_MODE准备目标位置，成功后SDK保持READY、逻辑仍paused，等待用户明确play才开始播放。不偷偷play/pause，不合成目标tick、不重新批准/换源/续租，不在原seek未完成时叠加恢复。该READY可再次收到暂停态seek；Back/Home/失败/30秒超时关闭并隔离晚回调。缺少接口时保留原native seek；PLAYING默认仍native seek，不恢复0.0.31的默认playing重建实验。合成/游客DASH、网络C/WASM和权限不改。此前PREBUFFER准备失败历史保留，本候选支持及效果须新真机结果，不先记修复。


## 0.0.40 暂停重定位候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `22ab74dfdbc631527424921dc4be66ff3af4ea1752826e2e4706ae41b1ba94d0`，signed SHA-256 `b33119dabfd6acc93492881354488cc3b0dcae96648fcf6ef24d30bc6d062e14`，native unsigned `b47ab91002a33f73ec9c6e76f3351f1bcf3ac4226e547f493243ce7cc2a011be`，源码ZIP `cb15de9c050fdde26bb481a75dfde17ac157300a123bead7dee43b2e980988e3`，sourceRevision基于HEAD `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty内容以源码hash为准）。230不同本地检查PASS（145单元合同/83整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。C与native JS/WASM/data/manifest已对0.0.39签名ZIP逐字节核对相同，本轮没有SDK重编译或HOST网络重跑。

state/capability首次exit0，首次install/run均exit0且明确平台成功，无需重连或更改签名资源/权限/固件。UTC03:52:09报告精确匹配source/signed，cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；设备仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup另存私密device-native040-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

只有启动/清理分项通过；暂停目标重准备保持READY、显式继续才play尚待本机验收。已请求同视频起播后手机暂停→遥控跳5秒→继续声画，再开诊断，先不重复交还控制/长时间或三次seek。0.0.39原生暂停seek拒绝与恢复声画失败保留，完整W01/F06/F20/v1.0.0开放；skill最终更新仍待W01关闭。保留现有HEAD/remote及所有工作，本轮未commit/push/发布/执行账号写入。默认manual文档构建与本已装auto6另配对，不重复部署。


## 0.0.40预缓冲成功仍IDLE被错误关闭，0.0.41候选（2026-10-15）

用户确认正常声画约15秒及手机暂停通过，遥控跳5秒失败后返回主界面，组合USER FAIL。UTC03:54:50实际报告匹配source 22ab74dfdbc631527424921dc4be66ff3af4ea1752826e2e4706ae41b1ba94d0 / signed b33119dabfd6acc93492881354488cc3b0dcae96648fcf6ef24d30bc6d062e14：FAIL avplay.seek_restart_ready_state_i、history_f、receiver_v2_1a0c0015，flow_s_c1_p0_w6_m8_l6、source_pass/请求02/native_closed_confirmed，GET后关闭true。该标签只在prepareAsync成功回调中检查状态时产生，故本次不是30秒超时，也不能称PREBUFFER_MODE未被接受；是应用要求READY而实际IDLE，随后自行失败清理。真实目标位置和恢复声画未到达。报告/用户观察私密分存device-native040-prebuffer-idle-report.json / device-native040-user-observation.json，startup保留。

复核Samsung官方AVPlay API，PREBUFFER_MODE成功回调表示预缓冲完成，区别于普通prepare完成；其示例使用预缓冲后play。普通play状态表并未明确列出预缓冲IDLE，所以以下是根据该语义与本机状态制定的窄范围候选映射，不声称已取得play-from-prebuffer-IDLE本机成功证明。0.0.41仅在本epoch明确设置PREBUFFER_MODE且成功回调实际IDLE时记录prebufferComplete；普通prepare仍须READY，尚无成功回调/旧epoch/close后的IDLE均不能play。暂停重定位可保持该预缓冲IDLE/READY，等显式继续才尝试play，随后仍要求SDK PLAYING。不偷偷play/pause、不伪造目标tick；held IDLE不调用getDuration，复用先前缓存时长。再次暂停seek可重准备，Back/Home/失败/超时清掉标记并隔离晚回调。

来源：https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html （2026-10-15复核）。不增30秒等待/网络预算，不重新批准/换源/续租，不启用默认playing重建；C/WASM和权限不变。新效果待本地和真机结果，0.0.40的READY假设失败完整保留，不能据此关闭W01/F06/F20。


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


## 0.0.42 手机Seek协调候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `7d301b5a3bf9f418958a851204f88704b444908064c9343bd7af63ab2a649df0`，signed SHA-256 `a9d332c22ff0f114f1467abdc555800499d5e380ab71d5487503940abcdc51c0`，native unsigned `f9eaf3efe0444d0f820008ba9a111f1d1cc0849aa667ffebad10f97bb88b1333`，源码ZIP `81d114f22038a63b1104295fd1b64186ac3ebdcb621c58ed9e3955ba574c9b53`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，完整dirty内容以源码hash为准。235不同本地检查PASS（149单元合同/84整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生JS/WASM/data/manifest与已装0.0.41逐字节相同，无新SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:15:37精确匹配source/signed报告cast.ready/native_closed_confirmed，GET后关闭true、marker1；设备环境保持U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。新报告仅当前cast run，故不再携带更早W01-start条目；marker/环境仍在外层。startup私密另存device-native042-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，新手机playing Seek先暂停→重定位→同owner恢复及本轮SDK/history诊断仍待本机结果。已请求同视频正常播放15秒后直接手机拖动一次核对进度与声画，再Back开诊断，不重复交还控制/遥控5秒。0.0.41交还/手机暂停继续USER PASS、手机拖动USER FAIL与上一轮暂停重定位USER PASS分别保留。完整W01/F06/F20及skill最终更新保持开放；无commit/push/公开发布/账号写入。默认manual文档构建与本已装auto6另配对，不重复部署。


## 0.0.42手机Seek恢复声画但目标位置失败，0.0.43取证（2026-10-16）

用户反馈每次拖动只能到0.1秒附近，随后声画正常，分记恢复声画USER PASS、定位USER FAIL。UTC04:18:05匹配source 7d301b5a3bf9f418958a851204f88704b444908064c9343bd7af63ab2a649df0 / signed a9d332c22ff0f114f1467abdc555800499d5e380ab71d5487503940abcdc51c0，held_b0_t0/history_rr、receiver_v2_1a0c00d5含seek接受和完成，source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w9_m13_l5，GET后关闭true。报告无FAIL仅表示尚无目标命中核查，不能据此记完整Seek通过。两次重定位流程完成不等于到达期望位置；没有记录本次请求目标，故尚不能区分手机发出近零目标与SDK忽略offset。原件/用户观察私密分存device-native042-phone-position-report.json / device-native042-phone-position-user-observation.json。

0.0.43不改变媒体/重定位策略，仅在本次手机seek保留内存目标、成功后观察PlayerCoordinator的真实新tick。固定事实：目标>=3秒的seek_target_nonzero，首次真实新tick进入目标±1500ms的seek_target_hit，或已观察至少4秒且真实进度从首个新tick前进>=2秒仍未命中的seek_target_window_missed。旧tick/成功回调/目标值本身不能造命中；暂停/忙状态不采样，取消/Stop/失败清除本次观察。事实仅是有限窗口，不保证永远无法到达；若没后续tick则不产生miss。为避免从零正常播到短目标造成混淆，下一次真机请求选择约60秒目标并等约8秒取证。原请求数值只在内存比较，不输出原始媒体地址/参数/精确位置。

RECEIVER_FACTS 29→32，v2仍8位uint32 hex（已用满32位，后续不能继续移位追加），3条固定进度使IPC166→169；报告仍8条/4096字节，沿用按run隔离。所有事实从协调器事件取，不调用忙SDK；无C/WASM/权限/网络预算变化。旧0.0.41暂停重定位的用户通过观察保留，但不能推广为所有目标/路线正确。W01/F06/F20及skill最终更新继续开放。


0.0.43取证范围补充（2026-10-16）：用户明确手机始终显示0:00–0:00，无法知道拖动目标。因此撤销“下一轮选约60秒”作为当前前置动作，先检查时间/总时长回传，不能提前归因SDK忽略offset。Worker对活跃接收器实际回答的GetPositionInfo/GetMediaInfo等查询补记既有固定SOAP查询类型；新追加receiver_position_nonzero/receiver_duration_nonzero两个事实，仅检查本机生成回复中时间字段是否非零，不输出正文、URI、精确时间或原请求。UI显示缓存的真实总时长，并首次记avplay.receiver_duration_known；不额外调用busy SDK。报告在无seek历史时优先保留查询摘要/时长事实，用以区分TV尚未知时长与手机是否收到非零查询回复；仍不证明手机UI已采用或事件订阅已支持。SOAP事实保持<=64位，IPC最终为171而非之前候选169；RECEIVER_FACTS仍32位，不再追加。原目标命中观察继续保留，当前先不要求盲拖。


## 0.0.43 时间/定位取证包实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `6d76b6ea5cabc94b1000b8a1674410bf5ea1673f801e22b4d9c79b1d6294b644`，signed SHA-256 `25a4a3d93f7db4789d6045cccefe7dc56a7cb37f40fcf536c6e4a8fa33ea37fa`，native unsigned `289bee66ac5c55c3bb93cd358f55df262e8bd1ec99e21cf5e2e49b13b32f274c`，源码ZIP `2b1cde5614c749139cd3f7c866d2f5c98bc7eb2be334cb6b5c2a64dafc85b141`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。238不同本地检查通过（151单元合同/85主UI用例/2 native桌面；最终UI为84整组加修正textarea断言后的1定向重跑），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生JS/WASM/data/manifest与已装0.0.42逐字节相同，无新SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:26:17精确匹配source/signed报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；设备环境仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup私密另存device-native043-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过。这包不改播放策略，只补真实目标观察、32位receiver事实、活跃查询类型/非零时间回复与TV已知时长，IPC最终171/报告8条。已请求同视频正常起播后等20秒，反馈手机当前/总时长是否仍0:00–0:00，Back开诊断，不再要求盲选60秒或拖动。0.0.42恢复声画USER PASS与目标位置USER FAIL、手机全零时间反馈均保留；不能先把根因认定为SDK忽略offset。完整W01/F06/F20及skill最终更新保持开放。默认manual文档构建与已装auto6另配对，不再次侧载；无commit/push/发布/账号写入。


## 0.0.43电视时间已知、非零查询回复已排队，手机仍全零；0.0.44服务描述修正（2026-10-16）

用户确认电视播放至少30秒，手机依旧0:00–0:00，手机时间显示USER FAIL。UTC04:29:23匹配source 6d76b6ea5cabc94b1000b8a1674410bf5ea1673f801e22b4d9c79b1d6294b644 / signed 25a4a3d93f7db4789d6045cccefe7dc56a7cb37f40fcf536c6e4a8fa33ea37fa，avplay.receiver_duration_known、receiver_v2_1a0c8205（批准/query/快照/实际tick/locked拒绝），SOAP_v1_8000400c32002010含position_query、receiver_position_nonzero、receiver_duration_nonzero，flow_s_c1_p0_w7_m14_l5、source_pass/请求02/native_closed_confirmed、GET后关闭true。固定事实是在cast_rpc_reply成功排队后产生，不证明每字节已到手机或手机已解析。仅能排除“TV始终未知时长/所有已排队查询回复全零”，不能断言手机SDK/UI根因。无新seek测试，上一轮定位FAIL保留。原件/用户观察私密分存device-native043-phone-zero-time-report.json / device-native043-phone-zero-time-user-observation.json。

源码发现AVTransport.xml仍为发现阶段空actionList/serviceStateTable，已实现的SOAP动作未声明。0.0.44在RPC启用时返回原创固定9898字节SCPD：11个现有动作、29个关联变量，InstanceID/方向/关联类型、GetPositionInfo完整8个输出及REL_TIME/1倍速范围；不声明未实现的Next/Record/事件功能，不接入任何新控制动作。RPC未启用仍保留旧发现描述；所有控制继续经TV批准/owner/lease。原生response固定容量8192→16384仅为容纳固定描述，两客户端共多16KiB静态缓冲；入站8192、body4096、RPC回复6144、连接/时间/网络目的地边界不变，无动态无界分配。

单一progressive媒体无跨轨绝对偏移，GetPositionInfo的AbsTime改为同一真实快照timeMs，不再返回NOT_IMPLEMENTED；RelTime/TrackDuration与原实际缓存不变，不制造时间。对完整多轨/playlist需另行建模，不能由该候选推导。SCPD与时间字段修正是合同缺口补齐，效果仍需本机验证，不把手机全零根因直接归给它。

官方依据：UPnP AVTransport:1 v1.01第2.2.23/2.4.5/第3节（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf，2026-10-16复核）。协议字段/类型按标准实现，未复制规范XML正文。位置由control point轮询，不应把它未经判断归为必须GENA推送；GENA仍未接通，不宣称完整UPnP兼容认证。C变更需真实SDK重编译与HOST描述解析/大小/HEAD验证，完整W01/F06/F20和skill最终更新门槛开放。


## 0.0.44 服务描述/单轨时间候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `1313ad83faedc03aa02b12c479f8e0bef6fc5bfd9acb0e72b8223261c490c1df`，signed SHA-256 `e242945b167f91ac75648fd2931689b0e754a92e5481631e18882a36e44eae86`，native unsigned `763666f8dd664f0d054b5a2ce4d57116e603ebc81de7ee58ce5393699bb5dd40`，源码ZIP `5ada9f3bb6992d2d8c144d6a843ad94ede9cb782b876c778dc96f3cd19954fd0`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。253不同本地检查PASS（151单元合同/85整组UI/15 HOST cast/2 native桌面），strict/50模块/C语法、实际Samsung SDK重编译与三类包/source/CA/媒体/许可门禁通过。固定32MiB堆，response静态容量调整有HOST XML/HEAD/长度证据，不把HOST当TV手机解析证明。

首次预检state exit0但capability exit1，未尝试安装；失败原日志另存native044-initial-state/capability.log和device-native044-attempt1-preflight.json。只disconnect/reconnect同一授权目标均exit0，第二次state/capability通过，首次实际install/run exit0且平台明确成功；deployment记录attempt2/installationAttempt1。没有改权限/证书/固件或扫描其他目标。UTC04:34:40报告精确匹配source/signed，cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密另存device-native044-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，新的SCPD动作/参数关联及AbsTime实际手机效果待验收。已请求同视频起播后观察20秒手机当前/总时长；仅时间正常时再拖到明显非零位置核对，仍全零则不盲拖，最后Back开诊断。0.0.43手机时间全零USER FAIL、TV已知时长和非零回复排队事实保留，不把“排队”冒充手机收到/解析。完整W01/F06/F20、GENA与三端/其他内容及skill最终更新仍开放。默认manual文档构建与已装auto6另配对，不再次部署；无commit/push/公开发布/账号写入。


## 0.0.44手机仍全零，0.0.45最小元数据候选（2026-10-16）

用户反馈仍0:00–0:00，手机时间显示USER FAIL；没有新拖动验收。UTC04:36:43报告匹配source 1313ad83faedc03aa02b12c479f8e0bef6fc5bfd9acb0e72b8223261c490c1df / signed e242945b167f91ac75648fd2931689b0e754a92e5481631e18882a36e44eae86。receiver_v2_1a0c0005、SOAP_v1_8000400c32002010仍包含位置查询及非零位置/时长回复排队；TV已知时长、实际tick、source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w7_m13_l5、GET后关闭true。服务描述和AbsTime改动未取得手机显示修复，不能记为通过。新原件独存device-native044-phone-zero-time-repeat-report.json，不覆盖startup/其他旧记录。

0.0.45候选补GetPositionInfo.TrackMetaData/GetMediaInfo.CurrentURIMetaData：仅用当前已批准原URI、固定通用标题/视频类型及真实缓存duration构造单item DIDL-Lite，不解析/透传发送端opaque metadata，不猜内容标题、不添加其他资源或外部请求。duration未知时省略res.duration属性；已知时与TrackDuration/MediaDuration同源。先转义URI进DIDL，再转义完整DIDL进SOAP，避免&/引号等穿越XML层。只在owner/新鲜度/租期检查后回答私密资源。

完整UTF8 SOAP仍<=6144字节：超限时省略生成元数据并用NOT_IMPLEMENTED，若连基础回复也超限则返回501，不扩大native RPC/入站预算。Worker只记固定receiver_metadata_generated/omitted事实，摘要SOAP62→64位（已满，后续须升级格式而非继续移位），receiver仍32位、IPC171→173，报告8条/4096字节。事实是成功排队，不证明手机解析。播放策略、C/WASM/权限/网络边界不改，不能先归因空元数据为唯一根因。

依据UPnP AVTransport:1第2.2.16/2.2.19及ContentDirectory:1的DIDL-Lite/资源duration定义（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf；https://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf，2026-10-16复核）。原创序列化，未复制标准XML/schema或新增依赖/客户端身份；不宣称UPnP认证或GENA已实现。完整W01/F06/F20与skill最终更新继续开放。


## 0.0.45 有界DIDL元数据候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `cd21b46815b7d5e431588fead1f86d2d72fa1760c29a417febe0ddd3bbbe488b`，signed SHA-256 `6c455dfc60dbd5324421cc1ed2c517863ad9fdb56b962389f1d378798f2e7a46`，native unsigned `18fbc03d38189456830ce2eda07c1e6644196608a4ebec674175d57d92cd51f0`，源码ZIP `d90f54c3191301e0d8b4a8e1d77d4f16c60865b10e1ac7f4095559f576e8559a`；HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`，dirty完整内容以源码hash为准。240不同本地检查PASS（153单元合同/85整组UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。原生四文件与已装0.0.44签名ZIP逐字节相同，无本轮SDK/C编译或HOST网络重跑。

首次state/capability/install/run均exit0且平台明确成功，无重连或改权限/证书/固件。UTC04:41:50精确匹配source/signed报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密另存device-native045-startup-report.json，精确源码/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，最小DIDL元数据的手机显示效果未验收。已请求同视频正常起播后仅观察手机当前/总时长20秒，不拖动，Back开诊断。元数据只使用已批准资源、固定通用标题与真实时长，未知duration省略，SOAP整包6144字节门禁/安全回退与两个固定排队事实保持，IPC173/8条报告。0.0.44手机仍全零USER FAIL与非零查询排队事实保留；不能先判定空metadata为唯一根因。完整W01/F06/F20、GENA/三端及skill最终更新门槛开放。默认manual文档构建与本已装auto6另配对，不再次侧载；无commit/push/发布/账号写入。


## 0.0.45手机时间仍全零；0.0.46发送层取证候选（2026-10-16）

W01/F06/F20。用户反馈“仍全零＋诊断已开启”，时间显示USER FAIL，不记新的拖动通过。UTC04:45:16报告精确匹配source cd21b46815b7d5e431588fead1f86d2d72fa1760c29a417febe0ddd3bbbe488b / signed 6c455dfc60dbd5324421cc1ed2c517863ad9fdb56b962389f1d378798f2e7a46。receiver_v2_5a0c00f5、held_b0_t0/history_r、flow_s_c0_p0_w7_m12_l5、source_pass/requests02/native_closed_confirmed，GET关闭true、marker1。报告含本轮重定位历史，现有8条优先级因此未保留SOAP摘要/已知时长；不能据此推定生成元数据已发出或被手机解析。独立原件私密保存device-native045-phone-zero-time-report.json，startup与历次失败保留。

0.0.46候选不改变SOAP正文/播放策略，补原生发送层固定position_wire_v1两位hex位集：bit0完整响应已交本机socket，bit1该完整响应有非零RelTime，bit2非零TrackDuration，bit3生成DIDL，bit4某个已排队进度响应未完整写出即丢弃（包括显式关闭，不单独判网络故障）。只有成功的GetPositionInfo回复被标记；排队不产生完成位，完整响应头及正文写完后才合并内容位，失败/超时/关闭未完成不产生成功位。各位按一次会话累积，不保证来自同一个响应，不能当成对端接收/解析/显示证明。日志不含正文、目标时间、地址或原请求。

位集独立于已满64位SOAP/32位receiver摘要，最多5次新增位更新，IPC173→178，8条/4096字节报告保持。history分支在错误/SDK/网络失败及清理之后优先保留最新发送位集和SOAP摘要；无history同样优先保留。无新增权限、目的地、HTTP回调、GENA、协议动作、媒体自动重试或签名身份变化。本地/设备结果待真实执行后补，手机全零根因仍未确定，完整W01/F20与完成后skill更新继续开放。


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


## 0.0.47首次源握手候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `0e03ab29753ce3493aa8c8e36d94ce7bf4894ff3b85007cc12d190e9935ff7af`，signed SHA-256 `4e23e944891b6375d08646906b39048bf5ee5c3a843c5f4fc61c3a42c86cc949`，native unsigned `d4e9cf3009ef99da6c7677884b10d515b475e3da202fac5ccdc04cb00583aaaf`，源码ZIP `0905f28799e9d4630a01b11beb7f659e7251cbc7128049f78ec1518be1fcd7e7`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty完整源码以snapshot为准）。246不同本地检查PASS：155单元/合同、89整组UI、2 native桌面；strict/50模块及三类包/source/CA/媒体/许可证门禁通过。原生JS/WASM/data/manifest与0.0.46签名包逐字节相同，无本轮C/SDK编译或HOST重跑。

首次state0/capability1，未尝试安装，原0.0.46保留；私密保存attempt1预检与原日志。同一授权目标disconnect/connect均exit0，第二次state/capability0，首次实际install/run exit0且平台明确成功，deployment标记attempt2/installationAttempt1。未改证书、权限、固件或扫描其他设备。UTC13:24:00报告精确匹配source/signed，cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0、engine major未知。startup独存device-native047-startup-report.json，源/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过。已请求电视新入口“允许一次官方投屏并播放”，Android投一次后自动起播，不再电视二次确认或手机重选；起播约20秒核对手机时间，若恢复则继续至70秒核对是否停播，Back开诊断。本轮不暂停/seek。新源设置首次200与真实手机进度采用的因果验收仍待结果，不提前宣布全零修复；完整W01/F20与完成后skill更新仍开放。默认manual文档构建与已装auto6另配对，无重复部署/commit/push/发布/账号写入。


## 0.0.47时间恢复与62秒停止；0.0.48轮询预算（2026-10-16）

用户确认新电视预授权入口正常起播、手机/TV时间均正常：时间与停止前声画USER PASS；约62秒自动停止返回，70秒连续播放USER FAIL。UTC13:26:29报告匹配source0e03ab29753ce3493aa8c8e36d94ce7bf4894ff3b85007cc12d190e9935ff7af / signed4e23e944891b6375d08646906b39048bf5ee5c3a843c5f4fc61c3a42c86cc949。receiver_v2_7a0c00cf含uri_accepted/Play及Seek接受/完成/非零目标命中，无Stop接受；held_b1_t0/history_r、wire0f、SOAP_v1_0000000c78002010、media_stopped、flow_s_c0_p0_w5_m9_l4/native_closed_confirmed，GET关闭true、marker1。用户未手动拖动，不能将报告中的发送端恢复定位视作人工控制全验收。原件与用户观察独存device-native047-time-pass-stop62-report.json/-user-observation.json。手机全零恢复支持首次设置源握手缺口这一因果解释，不能扩展为完整F20通过。

定位到发现阶段遗留的累计128 HTTP连接上限：每次普通状态/进度轮询都新建连接，累计上限会调用cast_stop并连带关闭媒体桥；每秒约两次查询约一分钟即可达到。旧报告没有显式关闭原因，尚不能单靠本轮8条报告证明恰好第128次触发。HOST真实127次请求后达到旧128边界会停止，无播放器或手机Stop；新实现真实140余次请求及高于128的RPC继续成功，另注入1024边界验证仍关闭并发固定原因。此为已复现源码根因候选，具体TV修复效果待0.0.48。

0.0.48将有限监听累计预算128→1024（两并发客户端、5秒单连接、5分钟发现、最多3分钟媒体、TLS/URI与字节/窗口预算均不变）；接入前再次检查上限避免同tick越界。RPC ID的native/Worker正则/contracts上限同步1024，播放器命令仍最多24次，不把只读轮询当播放控制配额。新固定listener_limit_connections/lease在关闭前输出并在8条报告优先保留，IPC178→180；不输出地址、请求、URI或精确计数。原64位SOAP/32位receiver格式不变，不取消资源边界或延长媒体租期。


## 0.0.48轮询预算修正实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `68d2b447f851c59d9f422e771e4265203af559e866a84e7df48f643441d2f71e`，signed SHA-256 `df8b531e6861abb81485dde1f94286f7c8d98166106275acc6bc282d055422a6`，native unsigned `16a2f4aa60d0f34ae1779ff2eb679e748ad281e20465e8a2a34480400c8c83bd`，源码ZIP `47625a76d3b6e2d06fe777a94af1aa26f8cac7f832b0b463cd82d18779cd0304`，HEAD `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty内容以snapshot为准）。267不同本地检查PASS（156单元/合同、89整组UI、20 HOST原生投屏、2 native桌面）；strict/50模块、原生C严格检查/真实Samsung SDK重编译、三类包/source/CA/媒体/许可证门禁通过。HOST预算对照不是旧TV工件运行；本轮TV具体持续播放效果仍待用户结果。

首次state/capability/install/run均exit0且平台明确成功，无重连或改证书/权限/固件。UTC13:31:45精确匹配source/signed报告cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup独存device-native048-startup-report.json，精确源/manifest/DELIVERY/native unsigned按完整source冻结。

仅启动/清理分项通过，已请求同一新入口投送3分钟以上普通视频，连续实际观看90秒、核对手机时间/声画与自动停止，Back开诊断，不要求暂停/seek/手机重选。原0.0.47手机时间与停止前声画USER PASS、62秒自动退出USER FAIL保留；新1024预算/同步RPC上限/固定关闭原因的实机效果未提前记通过。完整W01/F20及完成后skill更新仍开放。默认manual文档构建与已装auto6另配对；无重复部署/commit/push/发布/账号写入。


## 0.0.48超过90秒通过，2:57触及媒体租期；0.0.49五分钟候选（2026-10-16）

W01/F06/F20。用户无操作投送全长3:42的视频，约2:57自动停止返回，播放期间手机与“电脑端”进度正常（沿用用户原话，不擅自改记电视显示）。连续90秒声画/手机时间USER PASS；完整3:42未播完。UTC13:37:27精确匹配0.0.48 source `68d2b447f851c59d9f422e771e4265203af559e866a84e7df48f643441d2f71e` / signed `df8b531e6861abb81485dde1f94286f7c8d98166106275acc6bc282d055422a6`：`cast.media_limit_lease`、receiver_v2_7a9c42cf、wire0f、SOAP_v1_0000000c78002010、flow_s_c0_p0_w5_m9_l0、held_b0_t0/history_r/native_closed_confirmed，GET关闭true、marker1。原件/观察私密独存device-native048-time-pass-stop177-lease-report.json / -user-observation.json。明确为现有三分钟媒体时限触发，不误记新的CDN/播放器故障；准备/恢复定位也消耗租期，媒体时间177秒不要求等于墙钟180秒。未见listener_limit_connections；跨过62秒旧故障并通过90秒支持预算修正，但单样本不等于任意轮询压力通过。

0.0.49仅将progressive投屏媒体硬租期和对应SOAP接收器许可180秒→300秒，均保留signed deadline提前5秒截断；准备和暂停计入时限，不续期、不自动换URL。TV说明同步五分钟（含准备/暂停），发现未投送仍5分钟，实际候选起播可按既有逻辑将监听截止延至桥截止+1秒。1024累计连接/RPC、两协议客户端/四媒体客户端、24播放器命令、128MiB/256窗口/512媒体连接、TLS/CA/精确源/owner/权限均不变。约2Hz轮询五分钟约600连接，留有1024预算余量；不是发送端频率承诺，更快/恶意访问仍可能提前耗尽。flow的l仍0..6，6表示剩余大于150秒的饱和桶，不改旧诊断格式或冒充精确时长。

新增HOST虚拟单调时钟验证跨过原180秒仍存活、300秒后关桥/清URL/句柄以及较短signed deadline截断；接收器单测验证跨180秒真实快照/查询/命令、300秒到期和短签名截止，重复offer/暂停不续租。HOST不等于电视长播或真实CDN验证。待真实编译/测试/签名安装后补结果，下一轮优先同一3:42视频自然结束，再验证官方手机Stop清理；完整W01/F20/三端和完成后skill更新仍开放。无commit/push/发布/账号写入。


## 0.0.49五分钟短片验收候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `f110b36028a8297657c5f658aaa99d90e09f8941a776805fd39adcf8d2d6ac22`，signed SHA-256 `aab5c6e99fbb8efcf2f2161a390e52e0922663822fa2110eaacc6f77b92bd3d4`，native unsigned `85eb60586bf020181311f571b28ac348fe38eb50a5abb66e5bdc929e844702c2`，源码ZIP `8249e5e3f6b226e78e2a1d0e15b60dc97113657f3ed06f403a1f6c5ddfb4d721`，HEAD基线 `610e8c21ec50b13449cd88625a5f726db7d83450`（dirty源码以完整snapshot为准）。321不同本地检查PASS：157单元/合同、89整组UI、20 HOST投屏、16 HOST源/租期、37 HOST媒体桥、2 native桌面；strict/50模块、C严格检查、真实Samsung SDK重编译、三类包/source/CA/媒体/许可证门禁通过。首轮误对auto6运行手动UI夹具4失败后中断，日志保留且不计通过；恢复manual全组89通过，再构建独立auto6签名安装。

首次state/capability/install/run均exit0且平台明确成功，无重连或改证书/权限/固件。UTC13:44:39精确匹配source/signed报告cast.ready/native_closed_confirmed，GET关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup独存device-native049-startup-report.json，精确源/manifest/DELIVERY/native unsigned按完整source冻结；安装原始日志私密保留native049-*，deployment单列本轮启动/清理PASS。

仅0.0.49启动/清理实证通过，五分钟窗口及自然结束实际效果待用户反馈。已请求新预授权入口，手机投前从头播放同一3:42或3–4分钟普通视频，自动起播后无操作自然播完，核对超过3分钟声画/手机进度与结束页面，Back开诊断。不要求拖动/重连或重复三次回跳。0.0.48连续90秒/手机时间USER PASS、177秒触发原媒体租期的事实保留；不将该有意预算截断归为CDN/SDK故障。完整W01/F20/三端及W01完成后skill更新仍开放；默认manual文档构建与已装auto6另配对，无再次侧载、commit/push/发布/账号写入。


## 0.0.49完整218秒声画/双端进度通过；清理未确认（2026-10-16）

W01/F06/F20。用户确认完整播放218秒，无提前自动停止退出，手机与电视进度同步且正确：本样本完整声画/双方进度USER PASS。用户描述没有自动退出，不把它记成自然结束自动回主页面或再次重播/手机Stop/定位全部通过。UTC13:51:03报告精确匹配0.0.49 source `f110b36028a8297657c5f658aaa99d90e09f8941a776805fd39adcf8d2d6ac22` / signed `aab5c6e99fbb8efcf2f2161a390e52e0922663822fa2110eaacc6f77b92bd3d4`：cleanup_unknown_restart_required（FAIL）、receiver_v2_5a0c00cf、wire1f、SOAP_v1_8000400c7a002010、held_b0_t0/history_r、resume1/source_pass；GET后诊断HTTP关闭true、marker1。HTTP报告关闭不是cast socket清理证明，未见cast.native_closed_confirmed，本轮投屏清理FAIL/具体底层原因尚未确证。原件/用户观察私密独存device-native049-complete218-cleanup-unknown-report.json / device-native049-complete218-user-observation.json，startup独立保留。

源码核查发现独立预算缺口：原父层CastProbeWorker310秒硬超时不足以覆盖允许的5分钟发现等待＋最多5分钟媒体；存在合法native仍存活时被父层terminate并poison的路径。旧报告没有时间戳或首个失败原因，不能证明本轮恰由310秒触发，也不能把它归成播放器/网络断流。0.0.50将父层有限看门狗调整到610秒，native发现/媒体/签名截止、1024连接/RPC、24命令和所有流量/权限边界不变，不允许播放源续期。新增虚拟时钟验证310秒后仍可控制并在610秒硬截止poison；清理ACK依旧5秒，不延长ACK或忽略关闭错误。

清理未知保留固定原因：父层timeout/Worker error/非法消息/ACK timeout，以及Worker可先报告的native清理未确认/runtime abort/异常。只记录固定分类，不输出错误正文/地址；事实closed=false，不能冒充关闭ACK。失败分支也保存关闭期间network事实，8条报告优先保留具体原因与unknown结论，仍阻止未确认owner重用。新增三条IPC原因白名单，进度预算180→183，原SOAP64位/receiver32位格式不变。未改C/SDK/媒体策略；本地和真实部署结果另补。W01/F20/三端与完成后skill更新仍开放，暂缓人工拖动/Stop，先验清理修正与取证。


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


## 0.0.53大索引候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe。source `f3ee2b3fd279aaa1ea5f4e8450fecaba93f5e41aae7f5aee932a8bb6ed2d5430`，signed SHA-256 `8ff3af8136a13b1867890e7ff56be326840374d7e3ee12095ebd8b6b20a5a18f`，native unsigned `906b7662efd7c3b7fc9f5cfd7c871a37e39536474f257c6fc1289257c105351b`，源码ZIP `282dde2905149830df70fc58b22f96937f5da55662f7c901f12e3cd1c49f888e`。HEAD基线610e8c21ec50b13449cd88625a5f726db7d83450，dirty完整输入按source冻结于仓库外。首次state/capability/install/run实际均exit0且平台明确成功；沿用自有Author/Public Distributor，无新权限/CSP/WARP、电视固件或账号操作。

UTC18:57:32.416403精确匹配本版报告cast.ready、cast.native_closed_confirmed，诊断GET后端口关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，Web engine major仍未知。启动/清理DEVICE PASS，原件独存device-native053-startup-report.json，部署记录及原始native053日志私密保留。350项不同本地检查、strict/53模块、C严格检查、真实Samsung SDK编译、三类包/source/CA/媒体/许可证门禁通过；HOST/桌面结果不替代TV媒体验收。

公开样本BV1PkM66LESq的P2为34688秒（9:38:08），HOST匿名Web前缀含43183732字节moov（向上取整42MiB）。旧版约30秒累计读取10MiB后超时，支持大索引未读完的具体假说，但Web与官方发送源尚未证实相同，未取得完整codec/PTS，不能提前宣布根因已解决。候选保持原内存/目的地/TLS/字节/签名截止，增加有限进展驱动泵送；仅已知9–128MiB索引初次prepare使用至多180秒且20秒无进展终止，普通准备/seek不延长。当前仍旧探针网络依赖，现代cURL/OpenSSL实验没有混入。

已请求同一Android/P2重试：预授权自动播放入口，较大索引最多等待3分钟，可Back取消；起播后只看20秒声画/双端总时长，失败或完成后Back开诊断。不要求拖动或播放完整9小时。实际P2播放与读取尺寸仍UNVERIFIED，旧0.0.51/.52 P2失败保留；完整W01/F20及W01完成后skill更新继续OPEN。默认manual最终文档交付与已装auto6另外配对，无重复侧载、commit/push/发布或真实账号写入。


## 0.0.53 P2短暂起播通过、自动手机Seek重准备失败；0.0.54候选（2026-10-16）

W01/F06/F20。用户确认同一P2可以播放，约1秒后手机自动跳转中并最终报错：仅初次短暂起播USER PASS，随后手机Seek USER FAIL，未达到20秒稳定声画与双端时长验证。未捕获精确Seek目标，不能把用户“貌似之前的默认操作”确认为应用默认回片头或手机历史恢复策略。UTC19:04:47.794361精确匹配0.0.53 sourcef3ee2b3fd279aaa1ea5f4e8450fecaba93f5e41aae7f5aee932a8bb6ed2d5430 / signed8ff3af8136a13b1867890e7ff56be326840374d7e3ee12095ebd8b6b20a5a18f：receiver_command_failed、avplay.seek_restart_timeout_b0_t0、receiver_v2_1a0c014f、seek_history_f、wire0f、SOAP0000000c78002010、flow_s_c0_p0_w36_m70_l6、native_closed_confirmed；GET后HTTP关闭true、marker1。70MiB为累计传输桶，非文件/索引大小或去重覆盖证明；当前8条seek优先级仍丢弃source_init，不能据此声称TV源已确认为42MiB。原件/观察独存device-native053-second-part-started-seek-timeout-report.json / device-native053-second-part-observation.json；startup原件单独保留。

源码确认0.0.53仅初始prepare得到已知大索引窗口，手机Seek先pause再PREBUFFER_MODE重新prepare仍使用30秒上限，实际报告恰为seek_restart_timeout。这是明确的策略缺口，累计70MiB支持索引重读但不能排除其他SDK/CDN因素。0.0.54对同一已知9–128MiB源的seek_restart也应用size×4秒+10秒、最多180秒及20秒无有效新接收进展保护；每次操作独立起算，旧操作进展不能续命。直接seekTo、未知/小索引及所有native媒体租期/128MiB/签名截止不变，不自动重试或忽略发送端Seek。暂停保持与取消/晚回调隔离不变。

UI在重新准备期间显示索引与本轮累计接收，可Back取消；大索引Seek紧凑报告优先保留seek结果/清理原因/底层issue/索引/流量/原生关闭，仍最多8条，普通seek优先级不变。177单元/合同及strict/53模块通过，新边界覆盖跨30秒保持暂停、旧初次读取不能保活、绝对178秒、Home取消和直接native seek仍30秒、紧凑证据留存。整组UI/包/设备结果另记，未提前宣称修复或关闭W01/F20；未改C/依赖/权限或真实账号。


## 0.0.54已知大索引重准备候选实际部署（2026-10-16）

W01/F06/F20，auto6/BiliProbe1.Probe；source `905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b`，signed SHA-256 `4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302`，native unsigned `79978dd8af9ae93e2f92ed526d77fcf309b488bb481f2a0967f4eb3bac1dc8ee`，源码ZIP `4d3cf6cf09d19b5f44031d9d5d2ab6e74887dbd1a892cf748b2a705951af6863`。HEAD基线610e8c21ec50b13449cd88625a5f726db7d83450，dirty完整源码按source冻结。177单元/合同＋99整组manual UI＝276不同本地检查PASS，strict/53模块、三类包/source/CA/媒体/许可证及签名门禁通过；九个C输入与cast/session/probe Worker、native JS/WASM/data/manifest七工件对冻结已装0.0.53逐字节相同，没有本轮SDK编译/HOST网络或native桌面重跑，旧结果不重复计数。

首次state/capability/install/run均实际exit0且平台明确成功，沿用自有Author/Public Distributor。UTC19:09:53.925947精确匹配报告cast.ready/native_closed_confirmed、诊断GET后端口关闭true、marker1，启动/清理DEVICE PASS；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。私密原件device-native054-startup-report.json，部署日志native054-*、deployment/native-reuse记录与冻结源单独保留，无新权限/CSP/WARP、账号操作或固件修改。

本包仅修正已知大索引seek_restart仍走30秒的策略缺口；每次重新准备采用新起点/有效传输进展的有限索引窗口，仍保留20秒停滞/绝对至多180秒、native媒体5分钟/128MiB/签名截止与Back/Home取消，直接seekTo及未知/小索引仍30秒。已请求同一Android/P2自动起播，手机若自动Seek则等待至多3分钟后核对20秒声画/双端时长，若未自动Seek如实反馈，不额外拖动；最后Back开诊断。实际大索引Seek恢复仍UNVERIFIED，不把启动/清理或桌面通过替代播放修复。

0.0.53短暂起播USER PASS、随后的自动手机Seek超时USER FAIL及旧0.0.51/.52 P2准备失败保留；完整W01/F20仍OPEN，W01完成后skill更新继续跟踪。默认manual最终文档交付与已装auto6另配对，无重复侧载/commit/push/发布或真实账号写入。


## 0.0.54大索引P2与自动手机Seek本轮通过（2026-10-16）

W01/F06/F20。用户明确确认本次请求项目全部通过，记同一Android/P2起播、自动手机跳转恢复、后续约20秒声画与双端时长USER PASS，范围仅本次步骤，不扩展为9小时完整播放/重复seek/播放中换P/全部F20。UTC19:43:14.500763匹配source905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b / signed4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302：seek_restart_held_b0_t0、history_r、source_init_mib_42、source_layout_moov_first、receiver_v2_7a0c00cf、wire0f、flow_s_c1_p1_w52_m102_l6、native_closed_confirmed；GET后HTTP关闭true、marker1。

TV实际官方源的前缀索引尺寸已独立确认42MiB向上取整，与HOST公开Web样本尺寸一致，但相同尺寸不等于两个签名URL字节身份完全相同。重准备成功及用户声画支持30秒策略缺口修正；未含seek_target_hit/非零目标，不能宣称特定非零秒数定位已自动命中。102MiB累计读/52窗口接近128MiB内部预算，不能由这轮通过推断任意次数重读/9小时可用；p1只是关闭前流量快照，不覆盖实际关闭ACK。0.0.51/.52准备失败及0.0.53自动Seek超时分别保留。

原件/观察独存device-native054-second-part-automatic-seek-pass-report.json / -observation.json，startup与签名源另存，本轮未重装或运行新应用测试。当前0.0.54保持；下一步现代依赖独立测试包按ADR-013验证，不覆盖本包或送入真实凭据。完整W01/F20及W01完成后skill更新仍OPEN。


## 独立现代网络001：TLS正负例与原生关闭真机通过（2026-10-16）

W01/W02/F01/F13，独立BiliNet001.Probe/0.0.1，source6b611f77e0fea25f6f2335ce776308db3b108ac41c8c853d3e271a8480c845f2、signed8911ce37ac8d5c7686dcff030e1181fe1629844a3c6fd9bcad59c073c3de1122。实际首次state/capability/install/run均exit0且平台明确成功，自有Author/Public Distributor沿用，主BiliProbe1.Probe/0.0.54部署清单与签名包未改。独立精确源码/源清单/NETWORK_DELIVERY/unsigned已按source冻结，独立签名身份/设备日志私密保管。

UTC19:54:09.869238报告精确匹配source/signed，versions_curl8_23_0_ssl3_5_9、crypto_random、tls_positive_pass、tls_expired_pass、tls_hostname_pass、tls_selfsigned_pass与最终PASS network.pass_all_closed，全部四个TLS分项及原生清理DEVICE PASS；真实版本来自运行库、负例按CURL错误/verify固定原因，不把超时算拒绝。诊断GET后端口关闭true，marker0属于独立App不覆盖主包marker1。型号U800FD/固件T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。报告独存私密device-network001-tls-pass-report.json；主0.0.54 P2用户通过/匹配报告与旧失败另存。

186本地行为检查/strict57模块/真实SDK三套最终链接/扫描/独立包与签名门禁通过，不替代设备结果。现代库直接创建SOCK_NONBLOCK的默认socket路线已支持本轮正负例；不能由此推导任何fcntl/ioctl变体都支持。未测试会话真实线缆、媒体或官方投屏使用现代依赖；不批准真实凭据，不关闭完整W01。

下一步独立网络002/0.0.2仅增加session自动模式与按钮，复用现有九轮合成HTTP/两jar隔离/清空与不跟随redirect，编译的现代full probe保持不变；新UI支持Home/stop，任何未确认资源关闭阻止同App后续网络执行，报告仍可读取。主0.0.54保持，完成网络检查后恢复其前台；W01结束后更新skill继续跟踪。


## 独立网络002现代HTTP会话：未确认关闭（2026-10-16）

W01/W02/F01/F13，BiliNet001.Probe/0.0.2，sourcec536ec20372b848e3647b32c8d654747d22e9bebedcd80dcc6d308c137db1ea3、signedd762a1e1be5fe4974c4ca33ee9a9b900df2b759654ab7faafa0d48040c6f69a7、unsigned6f754349b1e62001274f840751a91afaad640917f8e9ec595f3de90172ecb75c、源码ZIP841357f439d26d4e2e41b166ef17c84681c3cd2177110c6d411e36d03aa6d49b。首次state/capability/install/run实际exit0，现代native/validation六工件与已装001逐字节相同，未重编译或更换库。

UTC19:58:02.997239匹配报告仅session.ready及FAIL network.cleanup_unconfirmed_restart_required，GET后报告HTTP端口关闭true、独立marker0。合成HTTP会话DEVICE FAIL/原生会话清理UNVERIFIED；不能把报告HTTP关闭当会话socket已关闭，也不能用001TLS通过覆盖。独存私密device-network002-session-unconfirmed-report.json与deployment，001TLS PASS/主054 P2 PASS保留。

当前摘要没有区分SESSION:failed:17、WASM abort、Worker异常、父层超时或非法消息；根因未确定。现代cURL默认外连TLS已成功，不能只凭旧F_SETFL故障猜测本轮相同。下一独立003先补固定原生原因与父层cleanupFailure分类，不输出SDK原文/请求/地址，不忽略未知关闭或允许复用。主0.0.54不覆盖，完整W01保持开放。


独立网络003：sourcea594cfc5b5b2b52c7a4af2217ab024ff3e0c22e28a4fdd636f0c7c81b523183e、signed72ef9ee47992ce766203309284fb0b30bafd22c9fc775e2f089ecbc162c9fc4f、unsigned85599c3a8915bdcfc1d30f53bd5507afc571c7c770e2e0652213a534d51bf0d2、源码ZIP3419fd0752ff56fe587c88fc92f1ca40502cb52b47a087fba60bebe90d9a229a。首次state/capability/install/run均实际exit0。UTC20:05:39.778740匹配session.ready、session.native_issue_runtime_abort、cleanup_cause_unsupported及cleanup_unconfirmed_restart_required，GET后HTTP关闭true/marker0。现代会话仍DEVICE FAIL、会话原生清理未确认；已排除仅父层超时的充分解释，但没有F_SETFL分类，不能把源码close drain候选宣称已确定根因。独立原件device-network003-session-runtime-abort-report.json，旧001TLS PASS/002FAIL及主054PASS保留。下一步004加入有限数值栈与离线symbol map，仍先补取证不改cURL行为；原始栈/错误文本不输出，非敏感数字位置须绑定精确WASM摘要。


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

## 0.0.54 Android PGC《凡人修仙传》P194（2026-10-16）

W01/F06/F17/F20。用户确认本集起播、音画同步、跳转/拖动/暂停均正常，分项USER PASS；没有明确补回双端总时长，不将它记作通过。选集/切P仍不支持。UTC20:26:04.771498报告匹配source `905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b`、signed `4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302`，receiver_v2_fa0c22ff含URI接受、Play/Pause/Stop/Seek接受及完成、实际时间推进、非零目标/hit，同时也含target_window_missed及denied_source_changed。多次操作窗口可同时出现hit/miss，不能据此声称所有目标精确命中或把miss抹除。history_rr、held_b1_t0、source_init_mib_1/moov_first、flow_s_c0_p0_w24_m45_l6、wire0f；native_closed_confirmed，诊断GET后关闭true、marker1。

原件与用户观察分别私密保存device-native054-pgc-fanren194-play-controls-source-change-report.json和device-native054-pgc-fanren194-observation.json。源切换拒绝是ADR-009/010当前单源授权规则，与源码相符；本报告没有内容身份/请求正文，不能单独断言哪次操作对应哪一集。PGC实际媒体样本通过不等于F17详情/选集/追番已实现，未测试长播/权益变更或所有PGC。

下一步先以ADR-016将独立005/006已验证的固定现代网络库接入明确0.0.55主媒体候选，复验启动/关闭与官方媒体；不变更换源授权，也不送入真实账号凭据。之后另做同owner换源的停止/关闭/代次隔离设计与验证，不能直接放开URI比较。W01、完整F20与完成W01后更新skill继续OPEN。

## 0.0.55现代网络主探针部署与启动（2026-10-16）

W01/W02/F06/F20、ADR-016。source `903790294aeadd76df2dc46af06a54d637275c81629646a729303213655d9b3e`，signed SHA256 `8c22210b846291c23ef64d28ebe84adfc3e30fdfcc905086dc6073385448e8f2`，unsigned `6543da4e9338e857c83ef2ac466f8b1440bec1f39eb6a31fb1529c1349c42e3a`，源码ZIP `08742f05f08e06a75fd184f12c490aebe9974196d782bb0207be3c3f1cbae1f8`。仍BiliProbe1.Probe，auto6，原Author/Public Distributor，权限/CSP不变；UTC20:31:27实际install与launch均exit0/平台成功。冻结源与包私密保留在deployed-source/903790…，旧0.0.54冻结源/签名/报告仍在。

UTC20:31:35.118517匹配本版source/signed报告：cast.ready仅为监听就绪进度，native_closed_confirmed为关闭DEVICE PASS，HTTP报告PASS/GET后端口关闭true，marker1保持；原件另存device-native055-modern-network-startup-report.json。不能把ready当作官方手机发现/媒体PASS。候选完整WASM `6604d65e31d174fc239420faf69f25421f56e3a964f1d7d3196ff2504a5255be` 与独立005/006相同，旧054为81aac444…；CA/合成媒体data及cast/probe Worker与054逐字节相同。主UI/session Worker含独立诊断阶段已测试的变更，不声称与旧054所有运行时代码相同。

190不同本地检查及strict/三类包/来源/签名前置通过，未本轮重编译C/库/重跑TLS。已请求用户在现代主包用同Android/同PGC单集核对20秒声画、双端时间/时长、约60秒定位、暂停继续/停止并开诊断。主现代媒体UNVERIFIED，选集/切P仍未支持；W01/完整F20及W01后skill更新继续OPEN。

## 0.0.55现代库PGC媒体/控制回归（2026-10-16）

用户明确“全部测试通过”，记请求范围内Android/同PGC P194的20秒声画同步、双端当前进度/总时长、约60秒定位恢复、暂停/继续/停止USER PASS。UTC20:50:05.959802报告匹配source903790294aeadd76df2dc46af06a54d637275c81629646a729303213655d9b3e / signed8c22210b846291c23ef64d28ebe84adfc3e30fdfcc905086dc6073385448e8f2，receiver_v2_7a0c00ff含非零目标hit、Seek/Play/Pause/Stop接受/完成及真实timeline推进，没有miss/command_failed；history_rr、held_b0_t0、moov_first/init1、flow_s_c0_p0_w21_m36_l6、wire0f/native_closed_confirmed、HTTP GET后关闭true/marker1。用户声画观察与自动事实分开，不推导所有PGC/长播/现代三端通过。

原件/观察私密独存device-native055-modern-pgc-controls-pass-report.json / device-native055-modern-pgc-controls-observation.json，startup另存。本轮未重复安装/应用测试；W01/F20继续OPEN。下一步按ADR-017推进同owner有界换源，保留原单源入口，不改变真实账号/权益边界。

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

## 0.0.57 Android普通短P两次切换通过（2026-10-16）

W01/F06/F20。用户反馈“验证通过＋诊断已开启”，按本轮同一短UGC P1→P2→P1、每次声画正常约10秒的步骤记单样本USER PASS；本轮没有单独要求或取得双端精确时间核对，不新增该验收；具体BV、时长、发送端OS/App版本未重新提供，不从报文猜测。057仅补取证，播放策略和九C输入/native JS/WASM/data与056保持；因此不是已修复056间歇准备失败的证明，原USER FAIL保留。

UTC21:36:39.622873报告精确匹配已装source `915987f0ebfcda82ac99bfe565ae2c850318c082e47fc3c6659b7df2571a0f3e` / signed `e8927634089d4307a80b6ffc56e2f262d52ef2ae1dede27c18cbb804216323d0`。transition_summary_v1_0ff记录代次2、3各四个阶段；不含代次4。offer_trace_v1_n_40048258269c依序解码：首源接受g1/missing；g1/playing接受换源到g2；g2/playing接受换源到g3；g3/playing拒绝policy_destination_akamaized。均session模式/remote=false，序列未达cap；状态属于决策前缓存，不是即时SDK状态。该家族只是文字分类，未放宽白名单或判定归属；本轮用户成功情况下也有该拒绝，不能将其直接等同前轮卡准备的唯一根因。

退出前最后发布cast.exit_g3_idle_s0、native_closed_confirmed DEVICE PASS；HTTP报告PASS/GET后端口关闭true、marker1保持。receiver_v2_7a0c22ef保留同会话控制/拒绝/时间/Seek聚合，不分配到某一P；init1、moov_first、flow_s_c1_p0_w13_m16_l6仅说明有界累计活动。报告及用户观察私密独存device-native057-android-ugc-two-transitions-pass-report.json / -observation.json，startup另存。未新增运行时代码、重签/重装或重跑应用测试。

保持057，下一项仅同一短UGC新会话P1→P2→P1→P2，每次约10秒，失败最多等30秒后Back开诊断；核对重复操作/代次4，不追加第四次更换或长播。结果待反馈，056间歇失败根因、现代其他发送端/内容、故障恢复及完整W01/F20仍OPEN。完成W01后统一更新全局tizen skill继续待办。

## 0.0.57连续切P复测失败：目的地家族拒绝（2026-10-16）

W01/F06/F20。用户“报错了，无法连续切换-诊断已开启”，连续三次检查USER FAIL；用户未明确第几步，不能补写具体P。UTC21:38:46.206783匹配已装source 915987f0ebfcda82ac99bfe565ae2c850318c082e47fc3c6659b7df2571a0f3e / signed e8927634089d4307a80b6ffc56e2f262d52ef2ae1dede27c18cbb804216323d0。offer_trace_v1_n_40049c只有首源g1/missing接受，随后g1/playing/session/remote=false发生policy_destination_akamaized；没有任何换源接受或transition摘要。因此本次被观测的新源在进入旧decoder关闭/native换源/新prepare之前被目的地策略拒绝，不能归因到SDK prepare超时或四源预算。

退出缓存cast.exit_g1_idle_s0、native_closed_confirmed DEVICE PASS；HTTP报告PASS/GET后端口关闭true、marker1。receiver_v2_7a0c22ef、source_init1/moov_first、flow_s_c0_p0_w3_m6_l6及held_b0_t0按整会话保留，不分配到未接受的新P。私密独存device-native057-android-ugc-repeat-policy-fail-report.json / -observation.json。上一轮两次切PUSER PASS保留；这不是稳定性已通过。

现有分类仅定位akamaized.net家族，未捕获精确主机。0.0.58按ADR-018仅拟支持Bilibili官方测速列明的upos-hz-mirrorakam.akamaized.net精确节点，不能由家族拒绝假定手机一定使用该节点；补固定accepted_bili_akam才能在新包核对实际接受的主机类型。不放行其他共享CDN主机/子域，TLS/凭据/重定向/路径/格式/期限/累计预算保持。候选尚未部署或真机验收，W01/F20继续OPEN。

## 0.0.58约3秒停播失败与W01边界收敛（多伦多2026-10-16）

用户反馈“P1→P2 后仅播放3秒就停止了”，后两次切换未完成，本轮USER FAIL。UTC2026-10-17T01:40:36.054399报告匹配已装source `2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479` / signed `5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953`：FAIL cast.media_issue_206_28，offer_trace_v1_n_400仅首源g1/missing接受，无g2/换源摘要、无accepted_bili_akam；退出缓存g1/playing/s0。用户观察与日志媒体身份未对应，不能认定本轮已实际命中精确节点、P2已完成换源或所有历史问题同根因，也不据此否定用户实际停播观察。

206/28来自桥记录的HTTP206及超时分类；源码既可能从libcurl完成错误返回，也可能从桥的15秒上游无进展路径产生28，单标签不能进一步确定。flow_e_c2_p0_w8_m3_l6表示错误快照、2个活动本机客户端/0个paused、累计8窗口/向上取整3MiB、剩余租期l6为大于150秒的饱和桶，不能推断精确值或至少180秒；c2不是重试数，不足以判断重试是否执行或耗尽。native_closed_confirmed DEVICE PASS、GET后诊断端口关闭true、marker1。source_init1/moov_first和receiver_v2_5a0c00cf为整会话事实。报告/用户观察私密独存device-native058-android-p1-p2-early-media-timeout-report.json / -observation.json，startup及057成功/失败均保留。

按用户本轮明确要求，新建[W01固定剩余门槛](../../W01_EXIT_CHECKLIST.md)，当前剩余六组按功能和结束条件执行；纠正历史状态中把完整W04/W06内容/恢复矩阵及W07耐久都列作W01前置的过宽表述。连续/快速切P、第四代次/探针预算、多平台内容交叉、30视频/两小时等不继续作为W01人工加码；对应必需功能/已知缺陷留在后续原工作包，不视为删除或通过。当前先本地定位G1的206/28与代次对应，不发新测试要求或新安装包；本轮仅读取诊断/源码及更新文档，没有改运行时或重跑应用测试。后续测试必须注明G编号/假说/单路径/结束条件；同因两轮无新增证据停止重复人工操作，转本地或记录具体阻塞。W01未关闭，最终全局skill更新仍待W01结束。

## W01/G2合成技术链设备通过（多伦多2026-10-16）

独立网络007/BiliNet001.Probe：source `4ea66cdcc60db901b9f5769bf2ae6cd41d82ceed118de9da38aa51683438ccdf`，signed `83c48e6a08379385ca6aebf945afccb0a125d59f763fec778ae0e97c1dc26caf`；配对只读observer059/BiliIsola1.Probe同source，signed `9c597bdfc93407f289e14cafbde7be7e0f223849d4b1eeda01afcaf1cbb814f4`。签名证书叶的本地比较确认owner/observer/主059为同一Author，不公开证书或设备身份。007 UTC02:23:28、observer02:24:20安装/启动明确成功；原主059未升级，保留G1验收的确切包。

UTC2026-10-17T02:24:06.722837：007返回ephemeral_tls_verified、secure_cookie_wire、two_jars_isolated、redirect_not_followed、credential_scope_wire、clear_isolated及pass_all_closed PASS，12轮真实电视内HTTPS/HTTP合成交换已完成，保存合成秘密后vault.prepared_restart_required。仅本轮内存信任的临时证书，TLS校验不关闭，无外部测试服务器/固定私钥/生产CA变化。

UTC02:24:59.098131：observer身份及https-vault固定目标确认，读取BiliNet001指定alias返回NotFound；该单条仍为UNVERIFIED。UTC02:25:14.247179重新启动owner后vault.restart_digest_read_deleted PASS，证明重开后原秘密摘要匹配、删除后NotFound，补齐跨包读取前后存在条件。三份报告均精确匹配各自source/signed/app ID，HTTP GET后监听关闭true。只有三份配对才支持G2合成保护存储与跨包隔离结论，不把observer的NotFound单独升级为通用隔离证明。

报告/观察分别私密保存device-network007-https-vault-prepared-report.json、device-network007-vault-foreign-read-report.json、device-network007-vault-reopen-read-delete-report.json及device-network007-g2-combined-observation.json。公用输出改为NETWORK_DEVICE_REPORT/ISOLATION_DEVICE_REPORT/DEVICE_REPORT按身份分开，原主G1报告从既有归档原样恢复（非新收集）。HTTPS WASM `7b253e300521edb8b5ff6bc5f1d5395d9877a2b38798648196968af6962024cc`，symbol map `6ce457706193f6ca96bbb845f4ce222c6e2a37357e2aff61e703c28d966060f2`私密配对；主059 WASM未变。

G2仅合成技术链PASS：HTTPS cookie与存储探针使用不同合成值，不等于真实Bili登录/cookie导入恢复已通过，也不证明硬件密钥、额外密码加密、JS内存保密或原子覆盖。真实账号会话、一个指定视频进度及明确批准后的写回属于G3，现未执行。G1最小门槛PASS；W01尚余G3/G4/G5/G6，不增加测试组，不重新要求切P。237不同本地检查、严格类型/边界、真实Samsung链接与包门禁有效；未提交/推送/发布或执行账号写操作。


## W01/G3只读探针008已部署（2026-10-17）

实际UTC2026-10-17T02:55:34.163670+00:00，BiliNet001.Probe / 0.0.8 / account-readonly-manual安装和CLI启动均明确PASS；source `4db27e11fac5eb95e58d7027a54e5e8db09de916aae690afd4f741c5c35b809a`，signed SHA-256 `01eebbb3a6c9580a9d27cf40a9fb3f7c094497b678b873c24fb4b28ab52cc67d`。私密device-g3-network-deployment.json与冻结源码/签名包保留；主059没有升级，007三份G2通过报告另存，不与008账号证据混用。

已请求用户在电视一次扫码并核对本人身份、BV14GHy6bE9n返回的原始进度数值。未收到用户结果前不提前取走报告触发自动退出；确认后分别采集首次登录保护保存/退出重开同UID恢复的报告。实际扫码、云进度读取、恢复及最终本地会话删除均尚未取得证据，G3保持OPEN。232项设备前检查只证明相应本地合同/夹具；不冒充账号通过。本包固定GET只读，不含云进度POST，真实写回仍需可审阅目标/秒数和一次单独明确授权。

## W01/G3首次扫码与只读结果（2026-10-17，008）

用户确认本人身份匹配、指定BV14GHy6bE9n返回进度原始值0。UTC2026-10-17T12:29:43.716273+00:00的报告精确匹配008已装source `4db27e11fac5eb95e58d7027a54e5e8db09de916aae690afd4f741c5c35b809a` / signed `01eebbb3a6c9580a9d27cf40a9fb3f7c094497b678b873c24fb4b28ab52cc67d`，`account.readonly_saved_closed` PASS、GET后监听关闭true。这证明本次真实扫码、身份/指定内容只读请求、KeyManager保存读回与原生关闭的路径；0不能证明非零续播、手机历史一致或写回通过。报告和仅含上述非秘密事实的用户观察已分别私密归档device-network008-g3-login-readonly-report.json / -user-observation.json。

首次报告取走后CLI再次run明确成功，但后续45秒collector未收到匹配恢复报告，不能把CLI启动PASS当同UID恢复PASS。已只请求用户描述当前界面/固定account代码，不重复扫码或清除会话。首次退出定时器与重新launch顺序、保护会话30分钟有效期等尚未有根因证据，不作确定归因。恢复、本地删除、经明确授权后的一次写回/回读仍OPEN。此次无业务POST、没有真实云进度写回；旧G1/G2通过不重跑。

### 008恢复核查：可见身份不代替关闭/恢复证据

用户补充重开命令后电视仍显示本人身份/进度，记录为界面观察。再次打开“读取状态”后，UTC2026-10-17T12:33:37.859448+00:00取得同source/signed报告：`account.cleanup_unconfirmed_restart_required` UNVERIFIED，报告GET成功/监听关闭true。此代码可能来自账号或报告Worker的关闭屏障，现有008报告不能区分；不能归因为KeyManager导入失败、TTL过期或原生库故障，也不能把仍可见身份当新document的同UID恢复成功。该份私密归档device-network008-g3-reopen-cleanup-unconfirmed-report.json，不覆盖首次readonly_saved_closed PASS。

标准SDB app_launcher -k本探针返回exit0但正文为空，不作为确切终止证明。依据Samsung官方Terminating Applications指南的Return/Exit长按强制终止行为，请用户只结束当前探针，然后由开发电脑启动同一008并自动取证；不清除/枚举保护存储、不重复扫码、不执行云进度写入。只有拿到restore_readonly_closed才将恢复子项标PASS；未知清理仍保留，不以进程终止重标为正常关闭。

## W01/G3：009诊断包部署与当前阻塞（2026-10-17）

用户明确长按Return/Exit退出008后，CLI启动008成功，本轮45秒仍未收到报告；不以此判保护存储不存在或恢复失败根因。随后009补启动错误自动报告及关闭组件分类，8相关UI/6输入门禁与strict通过；C/账号网络逻辑和四组WASM全部与008相同，不重新编译SDK、不改保护存储TTL或执行POST。

UTC2026-10-17T12:48:23.173596+00:00，009/BiliNet001.Probe/account-readonly-manual安装/启动明确PASS。source `fa35f7b29d83c84384db9a3bb9c251eedd8ce6cd5e5280a2456305446d95f745`，signed SHA-256 `048bdc74b916755fc3a777f44cc46e4a15449a89a7c44a788772c86e7b398df3`。部署前capability初次失败，经同一授权目标断开/重连后成功，原始日志仓库外保存；不归因为签名错误。008原签名包、源码ZIP、deployed-network008-readonly-manifest.json及各报告保留。主059未升级。

009启动后45秒collector仍未取得报告，亦无旧build误配报告。当前源码在hasSaved返回false时不自动报告；恢复/错误报告也依赖前台、平台取地址及原生reporter，因此无报告不能单独确定保存项缺失、过期、恢复中或未进入前台。已只请求用户反馈当前顶部account代码/文字或电视主页，不请求重新扫码/反复点击，不继续猜测补包。首次008真实身份匹配/原始进度0/readonly_saved_closed证据有效；同UID重开恢复、非零进度、一次明确批准后写回/回读及最终固定测试slot删除仍OPEN。没有执行云进度写回或清理他人账号数据。

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


2026-10-17 W02第四批本地媒体整合：BiliSofa01.TV/0.2.0未签名WGT已生成，匿名MPD/AVPlay与双关闭逻辑有本地合成检查；未签名/安装/实播。旧W01音画/官方发送端/存储结果不能移记为此应用ID的证明。新包真实KeyManager、Voice Guide、屏保、启动/焦点/媒体及性能继续未验证。见[W02_MEDIA_APP](../../W02_MEDIA_APP.md)。


2026-10-17 W02第五批：BiliSofa01.TV/0.3.0将既有接收器接入统一导航壳，只有本地合成Worker/SDK/协议检查及未签名包证据。旧060三端/换源/关闭结果不能转记到新ID；本批未签名/安装/实投。真实局域网权限、官方三端声画/控制、关闭、Home/屏保及性能仍待新包验证。详见[W02_CAST_APP](../../W02_CAST_APP.md)。


2026-10-18 W02第六批：BiliSofa01.TV/0.4.0本地偏好/普通视频首P续播与摘要诊断只有本地合成及未签名WGT证据。新普通存储分区的TV退出/重开/重启/升级、真实A/B、配额、性能/Voice Guide未验收，不转用旧marker或KeyManager结果。媒体/接收器原生工件本批不变；旧060/018安装保留。见[W02_LOCAL_APP](../../W02_LOCAL_APP.md)。

2026-10-18 W02第七批：新ID BiliSofa01.TV/0.5.0在原授权零售电视实际完成签名包安装/启动，state/capability/install/launch均exit0、平台明确成功，证据见[W02_NETWORK_APP](../../W02_NETWORK_APP.md)。首装无平台错误码失败保留；同字节无空格文件名第二次成功，不据此断定根因。新ID焦点、匿名声画/本地续播、Home/重开、保护存储和量化性能待用户/测量；不把平台启动返回或旧W01能力移作这些通过。原生8文件逐字沿用0.4.0已打包输入，本轮无新编译或媒体能力声明。

后续用户确认0.5.0焦点、成功卡播放/续播、Home停声及设置重开通过；首张卡获取源失败，换卡成功，因此游客播放仍部分通过，原失败根因未知。0.5.1只补脱敏失败保留，原生8文件逐字复用；同ID升级已获平台安装/启动成功（首轮capability失联未安装，原目标重连后成功）。新包取源观察待反馈，保护存储、投屏装配和量化性能尚未验收，见[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)。


2026-10-18追加：W02 0.5.1新ID最小组合已获用户通过，包括账号与游客偏好隔离、账号重开/移除、一端投屏/Home/重开接收；发送端平台未指明，不能分配为三端。W03 0.6.0排行榜已实际Samsung链接及签名，但当前TV连接预检失败、未安装/执行，HOST API-352不当作本电视结论。完整排行榜/性能验收仍未验证。见W02_DEVICE_ACCEPTANCE、W03_RANKING_APP。


2026-10-18连接恢复：同一0.6.0签名包已在原授权电视完成state/capability/install/launch平台确认；排行榜实际显示、翻页和卡片声画仍待本次USER结果，不从CLI启动推断功能通过。此前预检失败记录保留。


2026-10-18 USER追加：同一0.6.0签名包上用户按原步骤确认排行榜名次/标题显示、下一页→上一页、普通卡约10秒播放与Back回原卡全部通过。本组收束，不重复测试；不是所有排名卡可播、自动原生报告或完整F02/W03验收。早前HOST API-352保留，不能从本轮成功确定其原因。私密w03-060-ranking-user-observation已配对。


2026-10-18 W03 0.7.0：新独立搜索WASM已签名安装启动（同一TV、同一App身份/权限），USER输入/真实结果/翻页/声画/Back仍待回传；旧12项原生文件与0.6.0逐字节不变。无新冷启动/电脑关闭/Voice Guide/性能测量证明。


2026-10-18 USER结果：首次你好搜索search.http_412失败，第二次相同词成功；首次搜索卡播放ugc.audio_transport_28失败，第二次同视频成功；ZG后Back先清字母、再退出验证通过。保留首次失败与用户重试恢复，不记全组/稳定首播通过；回复未分别确认翻页和播放Back，不替用户补全。未另收原生报告，原因未定。本组停止重复人工尝试，后续改进显式重试与F03本地历史，不自动重发412。


2026-10-18 0.8.0新内部包已侧载启动，16项原生与0.7.0相同；本地历史、开关/清空持久化USER结果待回传。一次范围超时恢复只有本地注入/关闭时序证据，未证明本电视实际命中恢复或排除网络根因；不重复W01测试。


2026-10-18：W03热搜：0.8.0本地搜索历史重开保留/关闭保持/清空重开USER通过。0.9.0单独热搜C/Worker只有Samsung链接/HOST TLS/浏览器合成证据，实际TV列表与选词还未验收；原16条native逐字节保持不代替新功能TV结果。


0.9.0实际部署：UTC2026-10-18T20:37:43.314407+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `ec2911a90ec65380db16f95ea9ddc7ae6b8d2ab2a769c98973cd453ad2bc0cd2`，455文件源ZIP SHA256 `7cefe4099c26dcc2ba8dfc2d43fec8a32dc0112e3e5c746ab38a7a35aa7ab837`。沿用自有Author/Public Distributor，无新权限/证书/SDK变更；旧0.8.0工件及最终USER记录保持。9项包负例最终全部通过。仅安装/启动证据，新热搜功能USER仍UNVERIFIED，只安排一次显示/方向翻组/Back/选词组，不重测历史或媒体。


0.9.1实际部署：UTC2026-10-18T20:51:40.216791+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `42c35d1e4f24b2d07eef5f92fcafbb6bc0d804e8d2f85827eea0fc68a1eb1c89`，457文件源ZIP SHA256 `71c922e79cac113a4f3996f3ddf59c8bfd72835621c5b61cc2732388359ef384`。原20项native保持，自有Author/Public Distributor沿用，无新权限/SDK/凭据/存储变更。仅安装启动PASS，USER修复观察仍待一次搜索，不重试/不播放。HTTP412继续OPEN，旧0.9.0失败与材料保留。


2026-10-18：0.9.1用户仍多次412、第5次才加载，未记稳定通过。0.9.2增加匿名公开nav/WBI签名查询，具备生产C真实HOST成功/SDK链接及合成取消证据；没有新权限/SDK/CA/账号资源。TV新的双阶段native执行与首搜/翻页尚待实测，未以旧搜索/媒体证据代替。


0.9.2实际部署：UTC2026-10-18T21:06:57.038990+00:00开始，state/capability/install/launch均exit0且平台明确成功。signed SHA256 `82669819d54dc324873e8af20cfe14f1ba0c215cc970e7ef7842aee6711d457c`，461文件源ZIP SHA256 `0bada7b2669a1c0c39a0f597c5fcdd04de2afdb496d54ee63bdd51c777e24856`。自有Author/Public Distributor沿用，无新权限/SDK/存储或账号变更；原其他16项native保持，旧search及失败工件保留。仅安装启动PASS，新协议USER首搜/前后页待一次固定组；不能记HTTP412稳定性或完整F03通过。
