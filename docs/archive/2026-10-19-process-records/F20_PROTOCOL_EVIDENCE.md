# F20 协议与真机证据准备

当前日期：2026-10-16（多伦多）；W01/W06。电视仍为0.0.58 auto6/source 2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479，signed 5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953。最新用户P1→P2后约3秒停播USER FAIL；匹配206/28、仅g1、无精确节点/换源接受记录，不能宣称018兼容修复通过。旧成功/失败各自保留。当前W01只处理W01_EXIT_CHECKLIST的固定功能门槛，完整F20内容/恢复矩阵归W06，不能用W01可行性通过替代完整F20。

以下2026-10-15初期研究/步骤保留原文，初期“未接通/未验收”及版本结果不覆盖当前分项证据。原日期：2026-10-15；W01/W06。已有候选NVA/SOAP解析、CastSession控制权合同和前台发现探针；完整接收协议未接通/未验收。保留完整F20目标与ADR-001独立运行约束。

本轮一手资料核查：[Bilibili投屏使用帮助](https://www.bilibili.com/blackboard/activity-U_aG4BWWl.html)说明发送端播放器的TV入口、同一网络、iOS/iPadOS本地网络权限，以及官方接收端须前台打开等排查条件。网页描述用户使用条件，没有提供足以实现BiliSofa接收端的发现报文、认证/身份、控制与状态回传协议。其旧客户端最低版本文字不作为2026本机兼容版本保证。[开放平台入口](https://openhome.bilibili.com/doc)当前网页抓取无正文，不能据此断言有或没有接收端SDK/授权路线。

当前证据界限：Tizen Worker的TCP/UDP/组播自收、手机HTTP、固定MPD声画是底层能力。0.0.21已有Android/iPhone可见的用户观察及匹配的累计请求事实；尚无完整会话/媒体投送证明，没有注册或借用官方接收端身份。搜索得到的第三方视频、博客或项目不充当本机/一手协议证据。未复制身份、keys、协议实现或抓取私人手机流量。

历史0.0.50范围对照（后续分P/PGC结果见文末）：Android0.0.49仅普通视频完整218秒USER PASS；Android/iPhone0.0.50各自所测普通视频手机控制和清理通过。分P、PGC/可投直播、争用/断连恢复、投屏在开发电脑关机后的独立运行、iPad HD路线仍未完成，不能以已通过项替代。

以下初期规划矩阵为2026-10-15历史快照。下一份可验收接收探针必须有实际打包工件，再向用户安排发送端测试。分阶段记录如下，每行分别保留Android、iPhone、iPad三份结果：

| 项目 | 可接受证据 | 当前状态 |
| --- | --- | --- |
| 发现路径及身份 | 官方未修改发送端实际发现本探针；接收端声明和身份依据可追溯，明确任何注册/授权要求 | 0.0.21 Android/iPhone列表可见USER OBSERVATION PASS；iPad仅AirPlay、未见本探针，待核查入口/权限 |
| 连接/同意/控制权 | 本电视确认连接；拒绝、争用、过期会话安全恢复；不把网络命令转为账号写操作 | 仅本地CastSession合同，DEVICE UNVERIFIED |
| 普通视频/分P | 官方App投送后本电视实际声画与分P切换；记录内容匿名ID及权限/地区 | UNVERIFIED |
| PGC/可投直播 | 合法权益内实际播放；不以普通视频替代，不绕过DRM/地区 | UNVERIFIED |
| 控制与状态 | 暂停/继续/seek/停止与状态回传；电视遥控器和手机控制一致 | UNVERIFIED |
| 恢复 | 手机离线/重新连接、电视Home/返回、会话失效；旧回调不能控制新播放 | UNVERIFIED |
| 独立运行 | 开发电脑关机，只保留电视、必要官方发送端与普通网络 | UNVERIFIED |

证据模板：包版本/SHA/source；TV型号/固件；发送端硬件、OS、Bilibili版本；相同网络及本地网络权限；步骤/预期/实际/代码；合法权益和地区；脱敏附件位置。第三方App、URL复制、Smart View、屏幕镜像、只出现设备名或通用DLNA工具均不能关闭完整F20。无接收探针前不要求用户重复盲测官方App。

网络合同仍需限制报文/连接/正文/队列、发现目的地、目标媒体域名及凭据/重定向；声明与任何基于UPnP/DLNA/专有协议的候选应有原始规范/许可和版本依据。不得因浏览器限制或本轮公开资料未找到协议而默认引入外部常开网关。


2026-10-15候选更新：发现作者公开的NVA 0.33实现，已固定commit/hash/根license并记录身份使用边界，见[一手实现核查](../../research/f20-nva-candidate-2026-10-15.md)。没有复用代码/客户端身份，也没有接收包或官方发送端证据；F20状态不变。下一步可独立推进有界解析，再以自身身份做发现/会话探针。


## 0.0.20 前台发现探针（候选实现）

三端资源已由用户确认：Android `9.12.0-b28383822`、iPhone `6.6.0-91300300`、iPad `3.75.1-37501100`。版本文字原样记录，OS/硬件未提供；没有实际发现/连接/投送结果，不推断需升级或任一端已兼容。每一端后续单独关联租期、工件和结果。

显式“投屏发现探针”启动电视内独立Worker，使用自身名称 **BiliSofa W01 Discovery**、应用随机UUID（普通存储可用时保持）和每次随机路径token。地址只在本地传给native，不进入报告。固定RFC1918本机TCP40325，UDP1900加入239.255.255.250/选定电视接口，TTL1；最长300秒、30秒刷新/60秒缓存，退出尽力发byebye，清理socket/组播后才ACK。Back/Home/其他任务取消；清理未知会阻止重用，须退出重开，不能靠Worker.terminate冒充成功。

候选UPnP描述只声明本探针身份和MediaRenderer:1服务路径，非完整UPnP/DLNA认证实现。GET/HEAD仅固定token路径的设备/服务XML；ConnectionManager.GetProtocolInfo仅返回固定MP4格式查询，基于本机已有合成/游客MP4轨道证据，不表示该探针能执行投屏。其他SOAP控制返回Invalid Action，NVA SETUP /projection明确501。尚无订阅、NVA握手、媒体URI执行或账号路径；不借用官方/第三方包名、appkey/appsec、认证材料。发送端可能忽略、隐藏或拒绝这种有限描述，这正是待采集的结果。

接收预算：UDP报文2048bytes/每tick最多4个、16待回复、每租期最多64成功单播回复；只回合法私网请求源端口，不读外来LOCATION或回调URL。TCP2客户端、每客户端5秒、最多128连接、4KiB头/4KiB正文/8KiB总请求、8KiB响应；拒绝TE、重复长度/动作、NUL、管线和未知路由，不解析/执行请求正文。报告仅固定类型一次进度及7项计数：search/reply/description_request/service_request/control_rejected/setup_rejected/protocol_query，不含发送端地址/身份、body/header/URI/账号。描述请求计数表示收到合法请求，不自动代表对端完整收取或列表可见。

独立NVA候选解析尚未接入此监听：4096bytes JSON、8192bytes接收缓冲、最多16帧/批、严格UTF-8/操作码/序号/深度节点预算；坏帧或半帧结束毒化连接，不扫描重同步。仅窄化Pause/Resume/Stop/Seek命令转换，仍需CastSession批准/控制权/防重放；Seek单位候选待官方端实测。Play/登录/点赞/发弹幕等不会落入账号或播放器操作。匿名vector/拆包测试只证明本地合同，不能证明与官方发送端互通。

依据：作者固定源码仅用于wire事实研究，见[候选核查](../../research/f20-nva-candidate-2026-10-15.md)；[OCF UPnP实施指南](https://openconnectivity.org/wp-content/uploads/2015/11/UPnP_Vendor_Implementation_Guide_Jan2001.htm)核查MX随机延迟、回复源端口、自身UDN/USN、短缓存和离网通知；[Samsung Socket Extension](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)核查Worker/internet/非阻塞及组播条件（2026-10-15）。组播接口设置和官方端跨设备发现仍须本机证明，不由HOST loopback替代。

实际签名/安装与每端结果后续见SIGNING_DEVICE_RECORD和TEST_REPORT。未取得设备结果之前，发现、连接、播放、控制、恢复和独立运行均UNVERIFIED；不关闭W01/W06/F20。


## 0.0.20 发现启动失败与0.0.21兼容修正（W01/W06/F20）

2026-10-15，用户反馈电视显示cast.failed_13。对应已部署manual source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，记USER OBSERVATION：发现监听启动FAIL；未取得本次匹配报告，原stage13合并了接口选项/TTL/入组，不能从该code唯一断定某syscall或errno。手机发现未到达，不记Android协议失败，三端F20保持UNVERIFIED。

复查[Samsung官方Socket选项表](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)（2026-10-15）：列出TTL、ADD/DROP_MEMBERSHIP，没有IP_MULTICAST_IF。本机固定Samsung1.39.4.7的library_tizen_sockfs.js同样没有该选项映射，getLevelAndOptionString对未知项抛ENOPROTOOPT；direct SocketsHostBindings路径委托TV实现，未取得其源码，不能把旧adapter报错当作本次TV已导出errno。原探针无条件设置IF是明确的兼容缺口，之前HOST fixture跳过整段组播配置，没有覆盖它。

0.0.21去掉不在支持列表内的IP_MULTICAST_IF调用，接收仍用经校验的本机RFC1918地址加入固定组，出站NOTIFY使用TV的IPv4路由；目标239.255.255.250、TTL1、私网peer校验/限流、监听范围和全部资源预算不变。多接口出站路由/真实跨设备发现仍待TV证据，不声称已固定出站接口。TTL失败改131，入组失败改132，清理未知17仍不能ACK/重用。没有忽略失败或改ANY入组，没有增加权限、放宽CSP/TLS/目的地、修改SDK或引入外部服务。

新增显式内部auto=6（cast-startup-report-once）：开始一次发现启动检查，收到native ready立即停止，等待原生关闭ACK后开放固定脱敏报告；15秒启动预算，用户操作/Home取消后不继续自动报告，旧自动回调不关闭新手动窗口。只证明bind/TTL/join和清理，不测试官方端可见/连接/实际播放；无视频自动播放/账号写入。默认npm run build仍manual，部署auto=6必须显式构建并写入包metadata；手动“五分钟发现”入口保留。


## 0.0.21 已部署，发现启动/清理本机通过（W01/W06/F20）

2026-10-15，auto=6 cast-startup-report-once，source `7828bbd82c20a67cda472fa05c81c39f7ca59df16b58a553816d344832c8e7a1` / signed `fa3598d16bd1e25dbd2dbcfaea7deed07ef5fac7f650d81485e5d795ab011d71`。自有Author/Public Distributor；安装前显式目标get-state=device/capability0，无需重连，install/run首次均exit0且平台成功。未改SDK/证书或电视配置。原0.0.20失败、0.0.19可播放包及历史报告保留；已部署manifest只在成功后切到新工件。

collector exit0，source/signed匹配，TV报告cast.ready进度、cast.native_closed_confirmed PASS，HTTP报告GET后监听关闭true。该C ready只在TCP40325/UDP1900绑定、TTL1、指定接口入组和时钟成功后发出，随后ACK仅在native socket/drop membership清理成功后发出；因此记所测TV发现启动和清理DEVICE REPORT PASS，修正后未再见原stage13。原stage13精确syscall/errno未导出这一边界仍保留，不将候选定位伪装成旧包已取到独立errno。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0、marker1；Chrome主版本仍不可提取。启动报告已另存私密device-native021-startup-report.json，避免之后同source手机/手动报告覆盖它。

自动检查收到ready立即关闭，没有证明NOTIFY实际接收、手机可见、连接或媒体投送。已请用户手动开启五分钟窗口，用Android官方9.12.0-b28383822查找自身BiliSofa W01 Discovery并点击一次，最后开启报告；尚未反馈。iPhone/iPad同样保持未测，完整F20/W01/v1.0.0未完成。精确已装source ZIP/manifest/DELIVERY与unsigned native私密归档；之后文档重建的manual unsigned不重新签名/侧载，已装身份继续以上述hash/auto=6为准。


## 0.0.21 三端发现反馈与0.0.22 SOAP候选（2026-10-15）

| 官方发送端（用户提供版本） | 用户观察 | 证据边界 |
| --- | --- | --- |
| Android 9.12.0-b28383822 | 可见，点击后电视明确拒绝未接通媒体 | 发现USER OBSERVATION PASS；不是连接/播放PASS |
| iPhone 6.6.0-91300300 | 正常显示 | 发现USER OBSERVATION PASS；点击后结果未单独确认 |
| iPad 3.75.1-37501100 | 无本探针，仅AirPlay，电视无报错 | 未通过发现；已确认哔哩哔哩HD、视频内TV、本地网络已允许；OS/硬件未知，原因仍未定位 |

两次手动collector均exit0、匹配0.0.21 source/signed；固定事实包含search/reply/description_request/service_request/control_rejected及native_closed_confirmed，报告GET后监听关闭true。已在仓库外分别保存启动、Android与iOS报告/观察，避免同source覆盖。iOS报告为累计事实，不能把某一请求分配给iPhone或iPad，也未导出SOAP action/body。后续以本节更新顶层矩阵；上文未反馈/未测文字为历史时点。

0.0.22新增原创有界SOAP1.1解析及只读探针响应：校验路径服务/SOAPAction/XML命名空间/参数一致性，4KiB严格UTF-8、节点/深度/属性预算；拒绝DTD、外部实体、嵌套参数、重复字段、非零InstanceID与不支持操作。标量CDATA/实体只解码一次，metadata保持不执行文本。Seek仅REL_TIME、最多24小时及毫秒子集；不是完整UPnP时间语法实现。依据[OCF AVTransport v1规范](https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)核查参数、错误和无媒体状态，未复制规范XML/实现代码，未声称认证。

原生每连接独立序号、冻结请求；stdout只发固定RPC序号，Worker私有getter读取正文/动作，至多6144bytes固定响应缓冲；回复/过期/停止即擦除并作废，反向完成的两个连接不能混淆。仍限2客户端/5秒/128连接、4KiB头+4KiB正文，所有Socket调用留在Worker。跨线程仅15类固定SOAP事实、一次去重，总进度上限24；无URI/header/body/标题/地址外传。清理未知继续阻止重用，Back/Home必须等native关闭ACK。

探针只返回其真实初始NO_MEDIA_PRESENT/空URI/零轨、空连接及可用动作等读查询；不冒充真实播放器状态。GetVolume/GetMute拒绝501，不捏造电视音量/静音。Play/Pause/Stop/Seek及所有SetAVTransportURI仍拒绝701。对HTTPS真实bilivideo.com子域、无用户信息/非默认端口/fragment、/upgcxcode/*.mp4、单一有效deadline的候选仅作分类；保留签名URL原文，不请求/重定向、不改HTTP为HTTPS、不接孤立m4s。此策略未证明适配官方发送端真实URI，不能把分类成功当作媒体已接受。现有有限SCPD未扩展成完整服务；订阅、NVA握手、连接同意、媒体/状态控制链路仍未接通。

本地136项不同的行为检查PASS，分层与首次fixture失败见TEST_REPORT；0.0.22真机SOAP响应/手机行为尚未验证。F20/W01/W06仍开放，无账号写操作、客户端身份/keys或常开外部服务。


0.0.22已签名安装/启动并取得匹配的ready/原生关闭ACK报告；精确工件见SIGNING_DEVICE_RECORD。Android真实请求分类待反馈，SOAP和媒体验收仍开放。


## 0.0.22 Android真实SOAP取证与0.0.23改进（2026-10-15）

collector exit0，精确source `a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6` / signed `3a12818dcb16f2f4614ae88d9a267b9a9fb85ee84730dc3b74ed2cd500b3050c`，HTTP GET后关闭true。固定事实为search/reply/service_request/control_rejected、soap_invalid、soap_transport_query、soap_control_rejected及native_closed_confirmed。用户见一闪而过的SOAP提示，未读清；因此提示内容以匹配报告为准。

这证明本机Worker/native私有RPC已处理有效GetTransportInfo、至少一种有效控制和一条不满足当前解析子集的请求，并将固定响应交给native发送缓冲；没有远端确认/实际媒体证明。泛化invalid不能判定为SetAVTransportURI，也不能定位XML/动作/参数或某种metadata；不放宽全部解析或声称媒体失败已修复。另存device-native022-android-soap-report.json及观察记录，原startup报告保留。

iPad已确认哔哩哔哩HD 3.75.1-37501100、视频内TV、本地网络已允许；仅AirPlay/未见探针仍未解决。来源和剩余路线见[HD核查](../../research/f20-ipad-hd-2026-10-15.md)。不要求无依据升级/换App，不以AirPlay替代F20。

0.0.23对无效请求新增固定header/xml/envelope/body/action/arguments/media_fields七阶段，若精确已知SetAVTransportURI头再标offer_；阶段不含原文，offer标记仅说明头部声明，不表示正文通过。四种有效控制分别记录play/pause/stop/seek_rejected。诊断事实表原15项顺序保留并追加18项，共33项；每租期去重，进度上限为33+8=41，不改4KiB/2连接/5秒/128连接/6144响应等原生预算。

UI显示最近四项SOAP固定结果和code，后续发现轮询不会清除，Back/新租期重置。关闭/期满/错误时把该租期已见事实转成v1双uint32固定位图summary，不含序号、时间、地址/标题/body/URI；事实顺序为append-only，解码拒绝未知位。八项HTTP报告保留最新有效summary和最新故障/源切换，普通本地导出仍最多64项；summary不表示动作顺序/次数或设备身份。

原XML声明不支持合法standalone=yes/no；现按[XML1.0声明语法](https://www.w3.org/TR/xml/)补充，仍仅UTF-8/XML1.0、固定属性顺序，拒绝DTD/PI/UTF-16及非法值。该兼容缺口由源码和匿名fixture证实，尚无证据证明就是0.0.22实机invalid原因。按[UPnP Architecture1.1 SOAP profile](https://upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf)修正自身1.0响应补encodingStyle；仍不接受Body上的该属性（UPnP profile禁止），没有因通用SOAP允许而整体放宽。探针媒体/会话、订阅和完整SCPD仍未接通。


0.0.23已签名安装/启动并取得匹配的ready/原生关闭ACK报告；精确工件见SIGNING_DEVICE_RECORD。真实新分类/完整摘要仍待Android下一次报告，不由启动通过推导。


## 0.0.23 实际offer参数拒绝；0.0.24完整结构分类（2026-10-15）

0.0.23 collector exit0、精确source `fc307c543cd0875fb39428fac0da7f2619974d5314f41e292e6d096d3ab7b0f2` / signed `f623df00af754b161ed89101ec9ac15eeaa2a1ed384440e50e29aec44f1a26a7`。报告含cast.soap_offer_invalid_arguments、transport_query、stop_rejected、summary_v1_8800000400000000及native_closed_confirmed，GET后关闭true、marker1。用共享decoder解码summary恰为三项，与单条事实一致；另存device-native023-android-offer-report.json/observation，启动报告保留。

该固定分支只在精确SetAVTransportURI头、XML/envelope/body、动作/服务校验后触发；说明当前拒绝点在参数结构，不是本次XML声明或播放器解码。它仍未区分缺失/额外/重复/属性/嵌套/命名空间，不证明Android报文不符合所有标准，也未取得可接受媒体URI。停止已被识别，但执行仍明确拒绝。无远端收取确认/媒体证据。

0.0.24新增纯inspectSoapOffer，复用同一个4KiB XML/envelope/action门槛，在Worker内部分类已拒绝的请求。固定事实补齐：三种必需字段缺失、额外/重复/属性/嵌套/外来namespace或结构完整；URI缺失/歧义/格式/HTTP/其他scheme/目的地/路径/m4s/m3u8/其他格式/deadline缺失/不合法/不可用/候选可用；metadata仅空/文本/嵌套/超限。未知字段名称、值、URL、metadata内容都不进入IPC或日志，metadata从不执行。URI分类只说明命中的第一项策略分支；HTTP分类不证明域名/格式/期限也合规，候选supported不表示接受或播放。

事实表按原顺序追加27项至60，v1摘要仍双uint32，未用高位继续拒绝；去重进度上限60+8=68。原生2客户端/5秒/128连接/4KiB头与正文/6144响应、32MiB堆不变。分类只在native回复被接纳后发给父线程，过期RPC不发虚假事实。缺失、额外、重复、嵌套或typed参数仍按原规则拒绝；没有为了让探针PASS盲目改接收合同或关闭TLS/目的地限制。

复查[AVTransport v1 SetAVTransportURI](https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)列三个输入参数，metadata不用时可传空字符串，402涵盖数量/名称/类型差异；不能由此把缺失参数与空字符串直接当同一种实际报文。下一次完整分类用于确定兼容调整的具体范围，当前不声称已修复媒体接收。iPad HD发现问题独立保留，不要求重复相同入口/权限检查。


0.0.24已签名安装/启动，匹配自动报告证明cast.ready/原生关闭ACK、报告GET后关闭及marker1。已装source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276` / signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`；详情与私密冻结工件见SIGNING_DEVICE_RECORD。新offer完整分类待Android再触发一次，不继承为媒体/完整F20通过。文档补记的manual重建包不重新侧载。


## 0.0.24 三类差异与0.0.25兼容/HTTPS范围候选（2026-10-15）

0.0.24 collector exit0，精确source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276` / signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`。摘要0800000408002010解码为transport_query、offer_invalid_arguments、offer_args_extra、offer_uri_http、offer_metadata_oversized，与单条事实一致；native_closed_confirmed、GET后关闭true、marker1。原件另存device-native024-android-structure-report.json/observation，startup不被覆盖。

该窗口观察到额外标量参数、HTTP URI和超过原2048字符阈值的普通metadata，未见缺失/重复/属性/嵌套/外来namespace。它是租期累计，未记录逐请求关联/次数，不保证三种差异来自同一报文。未知字段原文和URI域名/路径/格式/期限尚未取得。不能从HTTP事实推断可安全直连或已知MP4，也不把窄化合同拒绝当作Bilibili标准错误。

0.0.25内部parseSoapProbeRequest兼容这类有界扩展：仍必需三个唯一标准字段、InstanceID=0、scalar/namespace门槛，最多五个额外标量字段，未用metadata丢弃；整条XML仍4096bytes。一般parseSoapRequest和其他动作精确参数规则保持。见[ADR-005](../../adr/005-cast-probe-offer-compatibility.md)。未将未知字段转成请求头、凭据或账号命令。

HTTP不发送；只建立同authority/path/query的HTTPS候选并保留query签名字节。必须通过bilivideo.com子域/HTTPS/无用户信息、异常端口、fragment/固定MP4路径/唯一deadline等现有政策，并由native独立校验。候选即使不合规也输出14类固定source_policy原因；不因HTTP首个分支而继续隐藏格式/目的地差异。最多一次/租期、512bytes/16KiB头的curl multi范围检查，4秒connect/8秒transfer/9秒防护；固定CA与证书/主机验证、HTTPS-only、无redirect/HTTP回退、无cookie或外来headers，所有选项错误即失败。非200/206/403等实际状态和curl码均固定数值归类，原始头/字节不出native。

source_pass只在TLS传输成功/HTTP206/正确0-511 Content-Range/512bytes和ftyp文件头后、native handle关闭完成才发出；不等于两轨/AVPlay/权益/手机收取或投屏播放。Back/Home/期满先清理source easy/multi/global与缓冲，未知cleanup阻止ACK/重用。SOAP仍拒绝媒体设置与Play等，报告NO_MEDIA_PRESENT。当前没有真实连接同意/投屏声画/控制/三端验收。

SOAP事实60类/v1位序不变，source_policy14类和候选/原生结果使进度总上限86；8项报告固定保留最新summary、policy、source结果及最新故障。新source文件纳入八个C文件hash/SDK重编译与包导出检查。165项本地检查通过，具体层次/fixture编译失败及修正见TEST_REPORT；新传输候选仍待本机真实触发，HD发现继续独立开放。


0.0.25已签名安装/启动并取得匹配的ready/原生关闭ACK、报告GET后关闭与marker1证据。已装source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8`；精确冻结工件见SIGNING_DEVICE_RECORD。auto6未创建source cURL，参数兼容、HTTPS/活跃句柄取消及媒体仍待Android真实触发；不扩大启动PASS。文档补记manual重建不重新侧载，HD和完整F20/W01/v1.0.0继续开放。


## 0.0.25 Android HTTPS 源范围实机通过（2026-10-15）

用户开启诊断后collector exit0；source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8` 精确匹配。报告有 `cast.source_policy_supported`、`cast.source_upgrade_planned`、`cast.source_started` 和 **PASS `cast.source_pass`**，随后 `cast.native_closed_confirmed`；GET后监听关闭true、marker1。摘要 `cast.soap_summary_v1_8000400408002010` 解码为transport_query、uri_offer_rejected、stop_rejected、offer_args_extra、offer_uri_http、offer_metadata_oversized。

记DEVICE REPORT PASS：参数兼容越过原arguments拒绝；同址HTTPS候选在本电视完成TLS校验、HTTP206/0–511范围、512bytes与ftyp头检查，source句柄完成清理，最终发现监听清理确认。未记声画、手机收到成功回复、连接、控制或活跃source中途取消通过；SOAP仍拒绝媒体，完整F20/W01开放。私密报告独立保存在device-native025-android-https-report.json与observation，startup原件保留；原始CDN URL已经擦除，下一包需要一次新投送。


## 0.0.26 确认后的独立候选声画实现

0.0.25真实HTTPS范围通过后，新增[ADR-006](../../adr/006-cast-approved-candidate-playback-probe.md)所述媒体探针：native成功源短暂私有保留60秒，电视确认才以本次token在loopback40324开放cast.mp4，最长3分钟；AVPlay仍由集中adapter/PlayerCoordinator调用。Back/Home/失败/完成关闭并等最终cast ACK；native桥共享主loop，不误取消发现loop。所有curl安全选项查错/范围与缓冲有界，无HTTP fallback、凭据、重定向、任意目标代理。固定上游HTTP/cURL故障保留供首次实测定位，原始地址不导出。

189不同本地检查及实际SDK编译通过，分层/初次4项旧文案失败与修正见TEST_REPORT。SOAP媒体/控制仍拒绝，这只是验证官方投送候选能否在本机解码的独立电视动作，不是完整接收会话；TV声画/控制/三端/HD问题继续开放。

native桌面加载/取消另2项通过，本轮191不同本地检查；网络与媒体真机证据边界保持，未启动真实内容自动播放。


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


0.0.28按[ADR-007](../../adr/007-progressive-mp4-http-probe.md)补齐TV内MP4完整GET/HEAD/单Range与后缀Range，下游响应完整选区、native上游≤2MiB续段/固定64KiB×4背压，total来自已验证512范围并逐段核对。无TLS关闭、目的地放宽、账号headers或外部服务。新增五种固定请求类型/位图和AVPlay错误枚举，取消只收尾旧lease诊断，不允许晚ready启动新媒体。204不同本地检查及实际SDK重编译通过，TV无声画是否解决仍待新包验证；SOAP媒体/控制会话与三端要求继续开放。

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


## 0.0.36 已确认单源 SOAP 控制候选（2026-10-15）

见[ADR-009](../../adr/009-approved-soap-receiver-probe.md)与TEST_REPORT。独立入口保留旧发现/自动回跳流程。电视确认并起播后，同一私有对端/同一原始URI可得到成功SetURI与真实状态轮询；Play/Pause/Seek/Stop走现有协调器，Stop后同源Play重开，不延媒体租期。不同peer/变更URI/过期或陈旧快照/remote所有权分别固定分类拒绝；仅局域网地址所有权，不宣称认证或协议层防重放。UI IPC无原始URI、对端或账号。接收器18固定事实汇总5hex，147帧上限包含24命令，最终报告仍最多8条。

合同/匿名HOST与桌面假后端联调已通过，真实官方Android连接/控制待下一次投送。首次未批准仍701；手机重连是否重用URI、是否需要其他动作/GENA/NVA，仍需观察。SOAP成功队列只证明接收器答复已排队或命令分派被接受，不能单独记手机连接、目标tick或声画PASS。iPhone与iPad HD发现边界保持，不借Android结果关闭三端F20。


## 0.0.36 已确认 SOAP 手机控制候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2`，signed SHA-256 `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`，native unsigned `918d9e8f0614d7425b1aa8d22f3b9e486cc85e82799ad05343c9749c67bb9917`，源码ZIP `58d883bfbce9493b745e8096bda8a91d3eb606018fbaf9c4e0ad00b0f6e4e4ce`。本轮233不同实际检查PASS（137单元合同/80主UI/14 HOST cast/2 native桌面），strict/50模块/C syntax/真实Samsung SDK重编译及三类包/source/CA/媒体/许可门禁通过。HOST与桌面假后端不作官方手机或解码证明。

state/capability exit0，首次install/run均exit0且平台成功；沿用自有BiliSofa Author/Public Distributor，无重连/证书/权限/固件变更。collector UTC23:31:59精确source/signed匹配，cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。原startup另存仓库外device-native036-startup-report.json，部署源码/manifest/DELIVERY/native unsigned按全source冻结，签名包和原始日志私密保留。

此报告仅证明部署/前台发现启动/原生清理，未发送媒体，也未测试新peer getter的真实发送端语义或官方手机控制。已请求Android一次新入口投送：TV确认起播后，手机如未连接仅重选同一接收器一次，测手机暂停/继续，然后Back开诊断。SetURI/命令接受/声画/连接是不同证据；URI变化、额外协议或手机超时均可能阻塞，尚不记通过。iPhone/iPad HD/完整F20及W01仍开放。0.0.35所测三跳声画USER PASS及未触发重连边界保留。无HEAD/remote/commit/push/公开发布；后续默认manual本地包与本精确auto6部署分别配对。


## 0.0.36 官方Android连接/暂停继续通过，暂停态遥控跳转失败（2026-10-15）

匹配source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2` / signed `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`。用户明确“手机已连接＋暂停继续有效”，记本轮未修改官方Android、普通UGC单样本连接及手机暂停/继续USER OBSERVATION PASS。用户同时反馈手机暂停后，遥控器“跳到5秒”导致退出：该组合USER FAIL。不是完整手机seek/Stop/状态显示、恢复、更多内容或三端F20通过。

实际报告UTC23:34:39：avplay.seek_callback_invalidvalueserror_b0_t0_sh（错误回调时SDK仍PAUSED，e为可手动重试拒绝）、history_e、独立native cast.media_issue_206_28、flow_e_c2_p0_w7_m12_l4、media_retry_1、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。原生错误是收到206后的上游超时；旧重连只覆盖尚无HTTP头/正文，不覆盖本次状态。首次观测retry_1仅证明排队，未导出每连接关联，不能判定该重试恢复到了206或证明所有SDK错误根因。原件/用户观察另存私密device-native036-phone-paused-seek-report.json / device-native036-phone-user-observation.json，startup保持。

发现0.0.36手机快照每200ms在seek期间读getDuration，违反Samsung seekTo异步期间不得调用其他API的规则；这是SOURCE缺口，不能直接断言本次全部错误都由它造成。0.0.37在coordinator正在prepare/seek时使用缓存时长，adapter也拒绝pending期间读duration。native新有限续读只对完全校验的206+curl28，从start+received继续原窗口，保留已收到但未送出的缓冲与原下游响应头；2次/客户端、3次/原租期共享，250ms退避和原固定URL/TLS/CA/期限/窗口/字节限额不变。不重试SDK或写操作。细节见ADR-008追加。

旧8条报告在history路径会漏receiver_summary，0.0.37已修正优先级，仍最多8条。历史报告不补造已丢失会话事实；本轮手机连接控制通过依据是用户实测。新包效果须新设备结果，不提前记修复PASS。


## 0.0.37 暂停组合修正候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12`，signed SHA-256 `e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc`，native unsigned `963f3a8de43d48ff2865615a14ba4a0c0075fd8ec2fde000e42f26df24f6134f`，源码ZIP `ff99417214cac205fbaff11b992f6fae4b7b51c2522092d9949f72c07318b399`。287不同本地检查PASS（140单元合同/81主UI/37 HOST桥/14 HOST cast/13 HOST source/2 native桌面）；strict/50模块/C syntax、真实Samsung SDK重编译/固定32MiB堆及三类包/source/CA/媒体/许可门禁通过。默认manual重建与本精确已装auto6冻结源码分开配对。

state/capability首次exit0，首次install/run exit0且平台成功；同自有Author/Public Distributor，无重连/权限/证书/固件变更。UTC23:42:46匹配source/signed报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup原件单存私密device-native037-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结。

该自动检查没有媒体/真实手机命令，仅启动/清理DEVICE REPORT PASS。0.0.36手机连接/暂停继续USER PASS和暂停遥控seek USER FAIL独立保留；已请求0.0.37只测手机暂停→遥控seek保持暂停→恢复5秒附近声画→交还手机控制，最后开诊断。修正调用互斥和有限续读仍须本机新结果；全F06/F20/W01、iPhone控制/iPad HD路线与账号/PGC/live/F19等开放。未commit/push/发布或执行账号写入。


## 0.0.37 手机连接/电视声画未通过，0.0.38起播握手候选（2026-10-15）

用户先反馈“手机无法投屏播放”，随后明确“电视也没有声画”。0.0.37本轮官方Android连接/起播USER FAIL；暂停/遥控seek/交还控制未到达，不记为其新修正通过。匹配source ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12 / signed e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc，UTC23:49:01报告receiver_summary_v1_04201仅approved/control_denied/denied_stale，SOAP摘要为transport_query/uri_offer_rejected/stop_rejected/extra scalar/HTTP URI/oversized metadata，source_pass、avplay_started API调用、请求02、native_closed_confirmed，HTTP GET后关闭true。没有实际时间tick/声画证明；没有独立decoder/native错误保留也不能证明它们正常。原件/用户观察私密另存device-native037-phone-start-report.json / device-native037-phone-user-observation.json，startup与0.0.36局部USER PASS独立保留。

源码发现确定的时序缺口：首次UI准备帧后，200ms状态心跳原在prepare完成/播放后才启动，prepare可等待30秒，接收器却在3秒后拒绝“旧快照”。原始stale码未细分，不能断言本次必为该唯一支路。0.0.38在prepare等待期间也发送协调器真实状态、缓存时长和递增帧号，不读busy SDK。已批准的同一URI幂等确认无需查询解码器；首次TV自动播放意图在原30秒准备窗口内可幂等接受Play而不再次分派SDK，查询只报TRANSITIONING。Pause/Seek/Stop在准备中仍拒绝；真正开始播放后继续3秒快照门禁，不延长180秒/签名租期、不接受新URI或不同peer。

新增固定快照发送/Worker接收/应用/拒绝、具体stale原因（missing/old/expired/clock）、本地inactive及实际时间tick/变化事实。只有实际backend时间事件能产生tick事实，它不等于声画PASS。29事实用receiver_summary_v2_8hex汇总，v1报告仍可读取；IPC上限161/报告最多8条。无history时也固定保留media flow/清理，避免被早期批准提示挤掉。C/WASM网络策略/SDK字节保持0.0.37，不从本次失败推翻或宣称206续读已证实。


## 0.0.38 起播状态/握手候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `4ce22544ca976c6d1d2ef564643d7b2752acd67d5021dcde76be69a8e63f7b28`，signed SHA-256 `aac28c1e7ce688c78105ac2cce4fccf55ef56399fb24b7649fd897db138502af`，native unsigned `7ee6bf1ab3118c01bd51d3fc7ebae8f289d269f0c024dad778ae1807a0bea8a5`，源码ZIP `ecc3ff868625b1a8ea8dad4c138cfa264a0a10b90f94ba57487fb450044b9ff6`。228本轮不同实际检查PASS（143单元合同/83主UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。C与JS/WASM/data/manifest四个原生工件已对已装0.0.37签名ZIP逐字节核对相同；本轮没有SDK重编译或HOST网络重跑声明。

初次SDB get-state exit1后，只重连同一个已授权目标，重查state/capability均exit0；首次install/run exit0且平台成功。沿用自有BiliSofa Author/Public Distributor，未改权限/证书/固件。UTC23:58:31精确匹配source/signed的报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup原件私密device-native038-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结，工具原始日志与签名包保密。

此为启动/清理分项DEVICE REPORT PASS，没有实际投送或解码。已请求0.0.38只验证官方Android连接、电视画面与声音，准备最多30秒，起播后观察约20秒再开诊断；暂停组合暂不重复。0.0.37手机/电视均未成功起播USER FAIL、0.0.36手机连接/暂停继续USER PASS分别保留。新时序修正仍待实测，完整W01/F06/F20及三端/账号/PGC/live/F19保持开放；无HEAD/remote/commit/push/公开发布。后续默认manual文档重建不重复侧载，运行时五文件与本精确auto6配对。


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


## 0.0.51 Android第二P准备失败；0.0.52诊断候选（2026-10-16）

W01/F06/F20。用户在同一多P普通视频上确认第1P可播放并可拖动、第2P始终准备，第二P USER FAIL，播放中换P未测试。UTC18:19:21.072176匹配0.0.51 source6a172dccd8367938a395365a6fbcbc5598333f3dac68afe30975890653f31660 / signeddb15070cbcdbb87c8c27f65b08f29ed69e5bacce41f55ccb77cbb17acc0f9b47：cast.avplay_prepare_timeout_b0_si、source_pass、receiver_v2_020c000f、wire09、SOAP0000000c48002010、flow_s_c1_p0_w5_m10_l6及requests02（open Range）。约10MiB是累计读取向上取整桶，5个上游窗口、1个活动客户端、无背压暂停；它不证明文件总大小或编解码兼容。native_closed_confirmed与GET后HTTP关闭true。原件/观察独存device-native051-android-second-part-prepare-fail-report.json / -observation.json；最初HTTP双jarPASS报告单独保留。

报告8条优先级丢弃已有source_layout，现有证据不足以认定是分P身份、MP4布局、网络或解码根因。0.0.52仅调整prepare失败时优先保留布局/源/桥流量/网络issue/关闭结论，仍最多8条且只用固定代码；不扩prepare超时、不改变TLS/目标/播放器策略。新增回归同时覆盖随后清理失败覆盖prepare的情况；首轮新测试暴露该优先级后已修正，163单元/合同及strict/53模块通过。原生C/JS/WASM/data沿用0.0.51，现代依赖实验另隔离，不混入本包；需新一次真实P2请求取得缺失布局，未提前记修复。


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

## 0.0.54 Android PGC《凡人修仙传》P194（2026-10-16）

W01/F06/F17/F20。用户确认本集起播、音画同步、跳转/拖动/暂停均正常，分项USER PASS；没有明确补回双端总时长，不将它记作通过。选集/切P仍不支持。UTC20:26:04.771498报告匹配source `905c2ddadb4502598c570545b578495a8b535f9d3eaf2edf50d3bb0e4dbc9b7b`、signed `4b59eb479c14128e302a734974ff04dd39988f2185a6487ad6dac3fd9aace302`，receiver_v2_fa0c22ff含URI接受、Play/Pause/Stop/Seek接受及完成、实际时间推进、非零目标/hit，同时也含target_window_missed及denied_source_changed。多次操作窗口可同时出现hit/miss，不能据此声称所有目标精确命中或把miss抹除。history_rr、held_b1_t0、source_init_mib_1/moov_first、flow_s_c0_p0_w24_m45_l6、wire0f；native_closed_confirmed，诊断GET后关闭true、marker1。

原件与用户观察分别私密保存device-native054-pgc-fanren194-play-controls-source-change-report.json和device-native054-pgc-fanren194-observation.json。源切换拒绝是ADR-009/010当前单源授权规则，与源码相符；本报告没有内容身份/请求正文，不能单独断言哪次操作对应哪一集。PGC实际媒体样本通过不等于F17详情/选集/追番已实现，未测试长播/权益变更或所有PGC。

下一步先以ADR-016将独立005/006已验证的固定现代网络库接入明确0.0.55主媒体候选，复验启动/关闭与官方媒体；不变更换源授权，也不送入真实账号凭据。之后另做同owner换源的停止/关闭/代次隔离设计与验证，不能直接放开URI比较。W01、完整F20与完成W01后更新skill继续OPEN。

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

## 0.0.58精确节点候选已部署（多伦多2026-10-16）

W01/F06/F20，ADR-018，auto6/BiliProbe1.Probe，原Author/Public Distributor。source `2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479`，signed SHA256 `5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953`，native unsigned `ec70c3e47ff71e08d1ff761da410b07e92b0b3febd19fd72bb1f5f28380de902`，sourceZIP `a24f7e74ba55bd544deda5c76e62b8cf6a56d1d1828a5ea2c3e6ead31df3f13f`。381不同本地检查、strict C/TS与实际Samsung两路线构建链接、三类包/源码/依赖/许可/签名前置门禁通过；固定现代静态库未重编译。只新增精确专用节点，不加入共享CDN后缀白名单，不修改prepare/retry/租期/累计预算或权限/CSP。

首次安装前state为device但capability exit1/closed，未开始安装；下一次只重连原授权目标，state/capability恢复exit0后继续，未扫描/换地址。中断结构记录私密独存device-native058-preinstall-connection-interruption.json。实际UTC2026-10-17T01:34:59.866787（多伦多10-16 21:34）install/run均exit0并明确成功；UTC2026-10-17T01:35:12.780420（多伦多10-16 21:35）精确匹配source/signed报告仅有cast.ready进度和native_closed_confirmed DEVICE PASS，HTTP报告PASS/GET后端口关闭true、marker1。startup独存device-native058-akam-node-startup-report.json，不能升级为媒体兼容通过。

现代完整WASM `3b77ad88768af3fe1f8c4fc239b4abca55741af28268bfcbf87b22923a42cb55`，配对symbol map SHA256 `a7bb22cfe1d744bb5bfbdc47ddf3ff3d17522cf3891e96552443f546effce89b`，私密归档native058-network-symbol-maps.json及按WASM摘要目录，不进WGT/公开源码。不能使用057/056或独立005/006旧完整probe解释本次底层栈。

已请求同一Android短视频新会话P1→P2→P1→P2、每次正常声画约10秒，失败记步骤并最多30秒后结束，Back开诊断。本次重点核对accepted_bili_akam是否出现及三次实际切换声画；精确节点此前只由官方测速页面确认，057只给家族拒绝，故尚不宣称实际手机一定命中或故障已修复。057两次切P成功/连续复测失败、056间歇失败和PGC单次通过均保留。完整W01/F20、其他现代发送端/内容/恢复/性能/独立投屏和保护存储/真实会话仍OPEN，TV端F17目录等未实现。全局tizen skill按用户要求待完整W01结束统一更新；当前只维护项目经验。后续文档/current手动包与已装auto6冻结源分开，无提交/推送/发布或真实账号写入。

## 0.0.58约3秒停播失败与W01边界收敛（多伦多2026-10-16）

用户反馈“P1→P2 后仅播放3秒就停止了”，后两次切换未完成，本轮USER FAIL。UTC2026-10-17T01:40:36.054399报告匹配已装source `2c78dcb79bf658ee29c60338ee8a2ad897b708fda71ceab4e539d43f80778479` / signed `5eb9340afdfd339cd545e42a447ed1a45761d98be477a3348e8adc81aac86953`：FAIL cast.media_issue_206_28，offer_trace_v1_n_400仅首源g1/missing接受，无g2/换源摘要、无accepted_bili_akam；退出缓存g1/playing/s0。用户观察与日志媒体身份未对应，不能认定本轮已实际命中精确节点、P2已完成换源或所有历史问题同根因，也不据此否定用户实际停播观察。

206/28来自桥记录的HTTP206及超时分类；源码既可能从libcurl完成错误返回，也可能从桥的15秒上游无进展路径产生28，单标签不能进一步确定。flow_e_c2_p0_w8_m3_l6表示错误快照、2个活动本机客户端/0个paused、累计8窗口/向上取整3MiB、剩余租期l6为大于150秒的饱和桶，不能推断精确值或至少180秒；c2不是重试数，不足以判断重试是否执行或耗尽。native_closed_confirmed DEVICE PASS、GET后诊断端口关闭true、marker1。source_init1/moov_first和receiver_v2_5a0c00cf为整会话事实。报告/用户观察私密独存device-native058-android-p1-p2-early-media-timeout-report.json / -observation.json，startup及057成功/失败均保留。

按用户本轮明确要求，新建[W01固定剩余门槛](../../W01_EXIT_CHECKLIST.md)，当前剩余六组按功能和结束条件执行；纠正历史状态中把完整W04/W06内容/恢复矩阵及W07耐久都列作W01前置的过宽表述。连续/快速切P、第四代次/探针预算、多平台内容交叉、30视频/两小时等不继续作为W01人工加码；对应必需功能/已知缺陷留在后续原工作包，不视为删除或通过。当前先本地定位G1的206/28与代次对应，不发新测试要求或新安装包；本轮仅读取诊断/源码及更新文档，没有改运行时或重跑应用测试。后续测试必须注明G编号/假说/单路径/结束条件；同因两轮无新增证据停止重复人工操作，转本地或记录具体阻塞。W01未关闭，最终全局skill更新仍待W01结束。


## W01/G5：060 iPhone/iPad最小回归通过；G4直播断流明确失败（2026-10-17）

用户分别确认iPhone和iPad的一轮普通视频双端时间、暂停/继续、约60秒非零定位恢复声画、手机停止全部正常。UTC18:42:03.887714+00:00 iPhone与18:46:26.498948+00:00 iPad报告各自匹配主060 source `bbf8356d4382aed33fba846975bb7fba7522b62d063c698d78982aa61414fcd3` / signed `7a4db2a16b51351a5c4a53df4762ab1401251b5512301eee16bc5b4db951741c`，均有native_closed_confirmed PASS、诊断GET后关闭true/marker1。iPhone receiver_v2_7a0c22df含Play/Pause/Seek接受与完成、实际timeline、非零目标/hit，同时保留control_denied/denied_source_changed，未含Stop接受；手机停止仅记USER观察，不补自动事件。iPad receiver_v2_7a0c00ff包含Stop接受以及其他所需命令/非零目标hit，无miss；仅对应所用一款官方App，不分配到通用版和HD各一场。G5按一端一轮最小门槛PASS，不提升为完整F20、所有内容/画质或断网耐久通过。两份报告/用户观察分别归档。

用户对014直播进一步明确“中途自动停止或返回”：本轮持续直播USER FAIL，与已记录连接错误一致，主动Back停声未在此轮证明；此前泛化“正常播放”只支持曾有声画。G4直播不得标完成或正常停止。ADR-024新增独立015电视内受限HLS中转候选，逐次读取/校验/改写清单与分片，SDK只访问loopback、没有任意上游URL入口；原014失败保留。目前候选验证/部署结果后记，不先宣称修复；主060不更换，不重复G5。G3云进度有效性、G4剩余媒体能力与G6电脑关闭的官方投屏仍OPEN。
