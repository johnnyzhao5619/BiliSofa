# 三星 Tizen TV 最佳实践调研

核查日期：2026-10-14。范围：三星消费级 Smart TV，主要为 Web/WGT 候选；不混同 Android、Tizen mobile、HTV、Signage 或 root/native daemon 能力。调研使用三星/Tizen 官方一手资料，22 个来源。没有安装SDK、构建、部署、账户API测试或真机验收。

## 结论及落地

1. 电视交互的中心是遥控器和真实焦点。以 FocusRouter/InputRouter、返回层级、IME所有权和Voice Guide落地，见 [TV_UI](../TV_UI.md)。
2. 平台适配器隔离全局对象；媒体/账号/lifecycle状态显式化，Worker消息限额、写入unknown不重试，见 [ENGINEERING](../ENGINEERING.md)。这些模块/类型选择为项目设计，非三星规定目录。
3. 保留单一完整v1.0.0、F01–F20、TV独立运行和未修改官方发送端投屏要求。WASM Socket/cURL是官方候选；本机权限/固件/安装/组播/会话/投屏仍由W01证明，不能默认为可用。
4. UI逻辑1080p、AVPlay坐标1080p、物理4K及MSE codec限制分别处理。HDR/4K/倍速只能由真实样本证明。详见 [TIZEN_PRACTICES](../TIZEN_PRACTICES.md)。
5. [PROJECT_STRUCTURE](../PROJECT_STRUCTURE.md)给出依赖方向及源/包/产物边界；框架、工具版本和最终包形态等待W01，不预建伪工程。

## 证据登记

下表均于核查日期联网读取；摘录为本项目总结，未复制官方手册。适用事实和本项目建议分开，历史表可能落后于新固件。

| ID | 官方来源 | 已核查内容与边界 |
| --- | --- | --- |
| S01 | [UX Checklist](https://developer.samsung.com/smarttv/design/ux-checklist.html) | 规则/建议分开；单一清晰焦点、方向键可达、播放器控件、进度与错误反馈。Seller Office标准不等于本项目已认证。 |
| S02 | [Remote Control](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html) | 方向/确认/返回免注册；额外媒体键查询并注册；Back=10009。Smart Remote不能假定有物理数字键。 |
| S03 | [Keyboard/IME](https://developer.samsung.com/smarttv/develop/guides/user-interaction/keyboardime.html) | input/textarea触发IME；用户动作/自动focus及返回行为需协调。中文/地区支持需本机证明。 |
| S04 | [Managing Screen Resolution](https://developer.samsung.com/smarttv/develop/guides/fundamentals/managing-screen-resolution.html) | 推荐1920×1080设计、16:9；逻辑UI和面板物理分辨率分开。 |
| S05 | [Text To Speech](https://developer.samsung.com/smarttv/develop/guides/fundamentals/text-to-speech.html) | Voice Guide依据DOM focus/name/role/state；启动focus，不假定landmark或桌面读屏兼容。旧版支持表不证明Tizen9实机。 |
| S06 | [Configuring Web Applications](https://developer.samsung.com/smarttv/develop/guides/fundamentals/configuring-tv-applications.html) | 包根config.xml、ID/version/入口/权限/网络策略；权限声明和对应级别签名分别需要。 |
| S07 | [Samsung Tizen Web Configuration source](https://github.com/Samsung/tizen-docs/blob/master/docs/application/web/reference/config-xml.md) | 官方Tizen仓库定义CSP元素等；通用Tizen schema不保证每个Samsung TV扩展可用。docs.tizen.org对应路径本次打开失败，采用官方源码。 |
| S08 | [Application Security](https://developer.samsung.com/smarttv/develop/guides/fundamentals/application-security.html) | 最小权限、保密存储/传输、安全编码。具体账户保护存储/密钥方案仍需实机设计。 |
| S09 | [Web Engine Specifications](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html) | 2025基线Tizen9/M120，2026 Tizen10/M130；按目标固件与API核查，不用最新desktop推断。 |
| S10 | [Playback Using AVPlay](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html) | 状态合法调用、prepareAsync、displayRect固定1920×1080基准、结束stop/close；媒体能力仍需样本。 |
| S11 | [2025 TV Video Specifications](https://developer.samsung.com/smarttv/develop/specifications/media-specifications/2025-tv-video-specifications.html) | 按model group区分；表中H.264 MSE最高FHD，硬件/UHD与MSE不可等同。本机group未确认。 |
| S12 | [Setting Screensaver](https://developer.samsung.com/smarttv/develop/guides/fundamentals/setting-screensaver.html) | AppCommon屏保控制；项目要求仅活动播放关闭、其余恢复，避免静态画面长时间不受保护。 |
| S13 | [Multitasking](https://developer.samsung.com/smarttv/develop/guides/fundamentals/multitasking.html) | visibilitychange、后台JS暂停、网络/数据过期恢复；表仅至2024且低内存例外，不能断言本机支持/不支持。 |
| S14 | [Tizen Sockets Extension API](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html) | internet权限、非主线程、bind/listen/accept/IPv4组播、poll建议和descriptor限制；候选能力而非零售TV验证。 |
| S15 | [Common Development Checklist](https://developer.samsung.com/smarttv/develop/development-checklist/common.html) | 兼容/交互/恢复检查参照；开发侧载与上架验收不同，不能声称通过认证。 |
| S16 | [Launch Time Optimization](https://developer.samsung.com/smarttv/develop/guides/application-performance-improvement/launch-time-optimization.html) | 减少启动代码、本地资源、按需加载、独立请求并行；旧jQuery/全局缓存/强制GPU例子不可直接作技术选型。 |
| S17 | [Creating Certificates (VSCode)](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html) | author/distributor profile、DUID、权限级别、签名安装；不涉及本次申请证书/安装SDK。 |
| S18 | [Building cURL Applications Using CLI Tools](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html) | Samsung Emscripten/cURL/CA/Worker/WGT流程；固定工具链后验证，不能假定任意upstream SDK可替换。 |
| S19 | [Tizen .NET TV Q&A](https://developer.samsung.com/smarttv/develop/faq/tizen-net-tv.html) | 备选官方路线、零售设备与native .so伙伴级约束；.NET能力不自动赋予WGT。 |
| S20 | [Smart View Getting Started](https://developer.samsung.com/smarttv/develop/extension-libraries/smart-view-sdk/getting-started.html) | sender与receiver均需实现集成；不能证明未修改Bili官方sender兼容。 |
| S21 | [Accessibility](https://developer.samsung.com/smarttv/develop/guides/fundamentals/accessibility.html) | 字幕/可操作界面与可访问功能依据；商店地区合规取决于实际发布范围，本次不作法律结论。 |
| S22 | [Application Performance Improvement](https://developer.samsung.com/smarttv/develop/guides/application-performance-improvement/application-performance-improvement.html) | 官方性能方法补充；本项目预算需本机基线，不把示例写成硬性指标。 |

## 保持开放的验证项

本机型号组/固件、WASM runtime与CSP、零售socket权限与前台/隐藏生命周期、账户安全存储、AVPlay/MSE分离流、4K/HDR/倍速、中文IME/Voice Guide、官方Android/iPhone/iPad投屏均UNVERIFIED。官方支持表/其他项目的成功不能替代本机结果。参考 [ACCEPTANCE](../ACCEPTANCE.md)，不下调产品合同。

## 文档维护

AGENTS.md作为入口；产品事实以PRD/ADR为准，交互/编码/目录规则分别维护在主题文档，来源集中在此。增删权限/API、兼容范围或运行时变更同步ADR、来源和设备证据。可复用skill提供通用Tizen方法，不将BiliSofa专有产品约束强加于其他项目。

## W01 实施时复核（同日）

- [Samsung SDK 下载页](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/download.html)：当前列出 macOS 1.39.4.7（2021-12-10）。通过系统 curl 默认 TLS 下载，hash 记录在 THIRD_PARTY_NOTICES。官方 archive 的 clang/Node 实际是 x86_64，在此 arm64 主机执行失败；仅为 HOST 证据。
- [SDK setup](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/getting-started/setting-up-samsung-emscripten-sdk-and-tizen-studio.html)：Samsung fork 与 upstream 不等价。使用隔离 `--embedded` 激活，arm64 未找到匹配工具；未选定最终 runtime。
- 再核查 S14/S18：Socket 只在 Worker 调用、internet 声明、poll 同 descriptor 类型；候选 C 代码和严格 syntax check 不代表零售权限。
- [AVPlay API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)：listener 推荐 IDLE、prepareAsync、seekTo 毫秒和合法调用状态用于 adapter 候选测试。真机声画/轨道/HDR 未验证。
- [AppCommon API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/appcommon-api.html)：屏保 ON/OFF 候选适配；实际行为未验证。
- [curl Mozilla CA extract](https://curl.se/docs/caextract.html)：仅私密开发 CA 准备，不把信任/许可/原生 TLS 验证写成已通过。

实施细节和真实结果以 IMPLEMENTATION_STATUS / TEST_REPORT / DEVICE_CAPABILITIES 为准。文档初始化时“未执行任何构建”的历史描述不代表当前状态。

Rosetta 授权后更新：official macOS SDK 已激活/构建，host 架构阻塞解除；没有使用 upstream substitute。native JS/WASM/CA 已本地打包，第三方原文许可证保留。桌面可以初始化 WASM，原生网络执行 timeout；本电视的 sockets/TLS/official casting/权限仍 UNVERIFIED，未据此固定产品 runtime。

## W01 存储与生命周期续查（2026-10-14）

- S23 [Samsung KeyManager API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html)：saveData/getData/removeData，别名默认归调用包，跨包授权另经setPermission；自3.0起不得声明旧keymanager权限。W01只写/读/删本次专用合成值，不枚举别名、不调用setPermission。null可选密码的实际保护边界及本机行为尚待独立证明，API存在不等于会话安全。
- S24 [Data and File Handling Q&A](https://developer.samsung.com/smarttv/develop/faq/data-and-file-handling.html)：更新与卸载的存储保持语义不同，Studio测试更新可能先卸载，因此同ID/Author安装成功不等于数据保持。W01记录退出重开、断电、CLI升级/回退各自实测，不在升级前删除用户数据。
- S13复核：隐藏时JS可能暂停，异步Worker停止ACK不能仅靠源码推断在Home期间已完成；须在本机检查停声/监听关闭、恢复重入和过期重验证。

产品范围补充：用户于2026-10-14以[ADR-003](../adr/003-read-only-comments-danmaku.md)移除评论/回复/弹幕编辑与发送。上述IME文档仍供F03搜索输入/候选与焦点设计参考，不再产生完整中文评论编辑要求；来源/API说明和零售设备结果继续分开记录。


S23于2026-10-14再次核对：官方列出save/get/remove及默认调用包拥有读取/删除权限，setPermission用于显式跨包授权；saveData说明没有给出足够的同名替换/原子持久提交保证。0.0.12仅验证固定非秘密数据在退出重开后的实际保持/清理，不从文档补出重名、断电原子性或加密结论。


S23续核：KeyManagerAlias.packageId明确数据所属包，getData默认要求拥有读取权限；0.0.13只查询本项目另一包的固定合成项，不照搬示例的全量枚举/授权。运行身份用[S25 Samsung Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html)的getCurrentApplication().appInfo.id核对，不请求应用清单。两者文档均为SOURCE证据，实际三阶段结论另记。


- S26 [Samsung TV Command Line Interface](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)：TV的run/uninstall -p虽名为pkgid，实际传完整application ID。0.0.13首次按本地help传包ID未找到，按官方TV说明改正后只卸载本次观察App成功，未改其他App。


- S27 [Bilibili游客热门一手端点](https://api.bilibili.com/x/web-interface/popular?ps=4&pn=1)：2026-10-14本地HOST curl验证TLS、HTTP200、API0、4条；web工具不能打开该URL，不冒充浏览器成功。仅观察公共只读Web路线，未取得公开稳定API合同，不复用官方appkey或身份；TV证据另记。旧SDK TLS库继续是探针依赖，未据此接入真实credentials。


- S28 游客普通UGC一手端点行为观察：固定api.bilibili.com的/x/web-interface/view及/x/player/playurl（fnval16/qn16/no account）；HOST同样本HTTP200/API0/AVC+AAC，CDN两轨仅增加规范公开视频页Referer即从403变为206/512bytes/ftyp。原始资料仓库外；不是公开稳定API/全内容权益或TV播放证明。AVPlay属性以[S10 API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)公开合同为边界，不注入未记录的任意header。媒体桥异步候选参考[curl_multi_perform](https://curl.se/libcurl/c/curl_multi_perform.html)、[WRITEFUNCTION](https://curl.se/libcurl/c/CURLOPT_WRITEFUNCTION.html)、[easy_pause](https://curl.se/libcurl/c/curl_easy_pause.html)；SDK curl7.68不能使用后加入的CURL_WRITEFUNC_ERROR。详情与严格源检查实际TV结果另记。


- S29 [UPnP AVTransport:1 Service Template v1.01](https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)，2026-10-16复核第2.2.23/2.4.5/3节：单轨时间字段及GetPositionInfo参数/状态变量关联；位置由控制点轮询，不是LastChange连续事件。0.0.44原创固定SCPD仅声明已实现动作，不复制规范XML或宣称UPnP认证；事件订阅仍未实现。该SOURCE依据不能替代官方手机实际显示/定位验收。

- S30 [UPnP ContentDirectory:1](https://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf)，2026-10-16复核DIDL-Lite命名空间/必需item属性和res.duration定义，配合S29的CurrentTrackMetaData/AVTransportURIMetaData。0.0.45仅原创生成当前已批准资源的最小描述，不复制schema/透传原始metadata；SOURCE不等于手机已采用。


2026-10-16 W01/F20内部记录：0.0.48官方Android实际连续超过90秒/手机时间正常，2:57停止报告明确media_limit_lease，为三分钟探针预算而非平台时长上限。0.0.49按ADR-011将progressive媒体/接收许可改为五分钟，其他网络/权限边界不变；321本地检查及本机安装/启动/清理通过，完整短片/三端仍待验收。详见IMPLEMENTATION_STATUS与TEST_REPORT的0.0.49记录，不推广为Samsung通用能力。


2026-10-16 W01/F20后续：0.0.49完整218秒声画与手机/TV进度USER PASS，但投屏清理unknown，诊断HTTP自身关闭不能替代cast关闭。0.0.50修正父层310秒不足以覆盖5分钟发现＋5分钟媒体的缺口，改610秒有界看门狗；native租期/权限/媒体不改，5秒ACK与poison保护不变。补固定失败分类/失败关闭进度保留。251本地检查及本机安装/启动清理通过，旧unknown实际原因和播放后清理仍待取证，不将源码缺口自动认定为该TV样本根因。


- S31 [Bilibili官方视频测速页面](https://www.bilibili.com/blackboard/video-diagnostics.html?bvid=BV1KS4y197BN&cid=455022263)：2026-10-16搜索抓取的官方表格列出upos-hz-mirrorakam.akamaized.net；页面为动态测速，直接静态抓取只有表头。该页面可支持Bilibili视频专用节点候选，不证明任意akamaized.net主机归属、手机失败源精确主机或电视实际可播。058按ADR-018只增加该精确主机，保留双层策略/TLS/期限/范围/格式/预算，实际发送端与电视结果须独立取得；用户专栏/第三方实现不作为CDN信任范围依据。
