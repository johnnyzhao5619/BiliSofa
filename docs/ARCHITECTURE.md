# 独立电视应用架构

用户流程：安装一个电视App→启动→扫码登录→直接浏览/观看/互动；开发电脑可关机。官方手机/平板作为投屏发送端，不是常开服务。

## 已选择路线

按[ADR-027](adr/027-w02-runtime-and-deferred-evidence.md)，使用**单WGT、Web UI＋电视内Worker/WASM/cURL＋AVPlay**。W01所测能力支撑实现，不代表完整产品通过。Shaka/MSE或.NET只在具体必需能力受阻时评估；.NET是独立TPK路线，不能直接把组件混入WGT。

| 电视内组件 | 职责 |
| --- | --- |
| TvShell / FocusRouter / ResourceOwner | 单焦点、输入/返回栈、页面所有权、生命周期与清理 |
| AccountCoordinator / BiliClient | 保护账号、身份核对、代次/取消、失效处理、固定请求与解析 |
| WASM NetworkRuntime | Worker内Socket/cURL、TLS/头/独立jar、内部媒体桥和TCP/UDP接收 |
| RetainedWrites | 明确写意图、持久化防重复、状态回查和未知结果 |
| PlayerAdapter / MediaSession | AVPlay合法状态、真实时间、异步prepare/seek、双关闭 |
| CastSession / ReceiverLink | 官方发送端协议、来源/命令校验、控制权与状态回传；W06独立产品Worker/C、逐源真实到期、无累计探针配额、显式换手机/重开与双关闭，见ADR-064 |
| LocalStore / Diagnostics | 按身份偏好/观看数据、受保护会话、有界脱敏事实 |
| 叠加模块（W05） | 独立只读Worker/C、源Worker私有CID端口绑定、WBI/有界正文解析、真实媒体时间/有界视觉时钟、控制层显隐及身份设置；0.22.0请求组USER PASS，0.22.1流畅度/显隐补验USER PASS；评论独立只读Worker/C和播放侧面板0.23.0所请求组USER PASS，见ADR-059–061 |
| 本人推荐（W03/F02） | 独立recommend Worker/C、保护会话与同jar nav/推荐mid双核对、动态WBI、四卡有界快照、固定错误/播放与返回；见ADR-065，所请求组及0.26.1首读补验USER PASS |
| 保留互动（W05） | 账号媒体能力绑定的独立Worker/C；只读预览、一次确认、固定接口、分项回读、持久日志及旧意图保护；独立能力/未确认null与阶段码、部分读取不锁健康操作，见ADR-078；F14默认暂停，原三连日志/部分成功保护保留；F11所请求正常路径USER PASS，最终异常与F17真实验收仍OPEN |

## 权限与数据流

- Socket/cURL仅在Worker；UI只交有限合同，不接收原始凭据或签名CDN地址。每账号独立jar，CDN/重定向不自动附账号cookie。
- 每次异步工作携带账号generation、媒体session/request标识；取消与旧回调拒绝保证旧账号/源不能复活。换源必须取得解码器和网络实际关闭。
- 私人内容通过身份核对后的独立只读lane，UI持有限DTO/临时引用，私有ID/游标留平台内存。不会因能看列表自动取得媒体或写权限。
- 内部MPD服务仅loopback，投屏LAN监听只在明确启用的前台会话；目的地/TLS/重定向/正文/连接和内存分别有界。不得成为任意代理。
- 外部文本只作文本；运行脚本、Worker和依赖本地随包，不执行外部内容。CSP/WARP和native网络校验是不同层。

## 写操作与本地存储

[ADR-003](adr/003-read-only-comments-danmaku.md)规定评论/回复与点播/直播弹幕只读，无编辑、发布、回复写入、删除评论或弹幕发送。F15/F16合并到F10/F08/F18；搜索保留本地拼音首字母候选。点赞、收藏、关注、投币等保留写操作经持久门禁与具体授权，不从研究或登录推定测试授权。

私密会话与普通KV分开。首P记录格式保持；P2+使用独立有界身份分区（ADR-051，0.21.1所请求本地组已验收）。移除/重置只清对应身份数据，未知云写意图保留。队列按BV＋P使用独立v2键，仅缺v2时只读兼容旧首P快照，显式编辑不覆盖旧键；清空确认删除两个键，见ADR-066。F12记录管理只读合并首P/P2、逐P删除或独立确认清空位置，保留偏好与其他本机数据；账号列表缓存按租约取消旧读/确认关闭后清理，保留保护会话与未知日志，见ADR-067。目标未确认的写入不统一重试。

## 完成状态

当前W04已装配，安装身份与候选版本见实施状态：F06生产DASH桥/私密刷新/选择控制，F17详情/剧集/追番，F18读取与匿名HLS中转已装配；直播按最新ADR-068排除当前交付，入口在下一候选统一隐藏，代码/失败和浏览结果保留；原边界见ADR-053，跨型号候选与运行时降级见ADR-055。新生产媒体不沿用探针累计配额，真实声画/恢复及权益条件仍待验收。其余未完成项见[实施状态](IMPLEMENTATION_STATUS.md)，不要从架构组件名称推定功能已完成。

[工程规则](ENGINEERING.md) · [依赖结构](PROJECT_STRUCTURE.md) · [TV交互](TV_UI.md) · [Tizen约束](TIZEN_PRACTICES.md) · [验收](ACCEPTANCE.md) · [架构过程归档](archive/2026-10-19-process-records/ARCHITECTURE.md)

账号失效/同身份重新登录按[ADR-082](adr/082-single-account-session-recovery.md)：返回媒体能力共享代次/到期保护；恢复仅保存安全页面意图，保护存储双bank更新，不恢复旧DTO/游标/播放/POST。

小数倍速候选按[ADR-086](adr/086-fractional-rate-element-candidate.md)独立开发，尚未接入上述生产架构；原生video的生产DASH、跨后端排他切换与电视证据未完成，不能用当前0.43.0通过替代。当前用户要求先不部署。
