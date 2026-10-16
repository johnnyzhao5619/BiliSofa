# ADR-004：电视内有界媒体桥候选

日期：2026-10-14（本地）；状态：W01/W04开发候选，未固定最终runtime或宣称真实播放通过。

0.0.14已经在目标电视真实读取游客热门，并获用户展示/分页/Back通过。HOST对该公开热门的一条普通UGC读取view与playurl均HTTP200/API0；pay/ugc_pay/interactive标记为0，游客请求qn16返回360P AVC/AAC。CDN同一未过期签名地址的bytes0–511请求，无cookie/Referer为403；仅增加规范的公开视频页Referer后，两轨均206/512bytes且ftyp有效。未改变自有UA、复用账号或官方客户端keys/身份。此为HOST行为观察，URL不落公开源码/日志，不外推为所有内容的授权或TV播放证据。

官方AVPlay公开streaming属性列出COOKIE/USER_AGENT等，未找到任意Referer设置合同；不使用未记录的属性、CRLF或cookie伪造Header。候选以电视内Worker/cURL明确设置公开视频来源Referer，并把有界媒体范围交给AVPlay；不引入常开开发电脑或外部网关。API详情/播放计划、MPD生成、媒体代理与PlayerCoordinator分层。

候选约束：只读普通游客UGC；显式用户选卡后播放，不自动播放真实内容；不接入账号、付费/互动/DRM绕过。优先验证qn16 H.264+AAC，API返回的其他track不自动作为权益可用。必要元数据/codec/range/HTTPS CDN子域/443/过期时间严格验证，拒绝未知响应。signed URLs仅短期运行状态，不进UI文本/普通存储/诊断或LAN报告。

媒体桥绑定127.0.0.1固定专用端口，随机每播放token，仅允许当前计划manifest/video/audio固定路径与GET/HEAD/单一有界Range，无调用方目标URL、通用代理、跨包服务或凭据转发。上游TLS验证保持，redirect/proxy/cookie关闭，范围/并发/headers/缓冲/队列/空闲与总租期有界。网络与socket在Worker，事件循环可处理stop，先清理cURL及fd再ACK；不明结果阻止复用。Home/Back/换源/错误取消代次并清理，不让旧地址/回调操控新播放器。

新增loopback端口须明确WARP/CSP；现有public internet签名权限不扩大。接口、参数、native URL与路径校验以及原始许可/源hash配对随实现维护。桌面/HOST测试只能证明相应层；需要本电视实际声画、暂停/seek/Back重入/Home与监听清理证据，才能关闭对应W01/F06分项。完整UGC/PGC/live/多轨/速率/画质/F19与最终网络安全依赖仍开放。

实施分步（2026-10-15）：0.0.15只实现固定详情/playurl、两轨512字节读取和摘要IPC；尚未创建媒体桥或申请新loopback配置。先在本机证实源数据与范围链路，再接AVPlay。源检查PASS不等于声画PASS。

0.0.16候选实现：新增probe-bridge.h，固定127.0.0.1:40324+每播放128-bit随机token，原生独立校验两个CDN目的地/BV及规范数值元数据，并在C内生成仅含两个owned loopback BaseURL的MPD。GET/HEAD/单Range（open range截为最多2MiB），4客户端、各64KiB流缓冲、4KiB请求/16KiB上游headers、最多512次连接、20秒客户端/15秒上游；总租期min(180秒,两个签名期限减5秒)。不使用easy_perform服务媒体；20Hz multi推进，满缓冲pause/resume，不转发上游Cookie/Location/正文错误页。拒绝未知path/token/query/method/多Range/请求正文，不提供目标URL参数。

CURL句柄与fd全部清理、multi/global释放后才BRIDGE:stopped；close/remove/cleanup异常保持unknown、阻止复用，不伪造ACK。显式loopback WARP/CSP只新增40324，无新privilege。IPC ready只传本次owned local URL和摘要，不传CDN签名/账号；Ready不是closed，不提前terminate Worker。Back/Home/错误立刻关闭AVPlay并发stop，替换播放等清理确认；不明结果要求重开。

用户从热门卡选择“播放游客360P · 首P”才读取新计划/小范围并启动真实AVPlay。Back回同页同卡；Home停声并回主界面，不自动续播。此为最长3分钟W01内部探针限制，不作为v1.0.0播放长度/清晰度范围缩减；全媒体实现仍需W04。主入口未自动播放真实内容。HOST/socket/UI/SDK检查与该机实际播放分开记，失败保留原因。

HTTP边界复核：对两轨GET必须携带单Range；无Range返回400，不主动发未请求的206。Range unit大小写不敏感；超过本次窗口的请求只先送所请求范围的有界子集，剩余由播放器重请，按[RFC9110 14.2/15.3.7](https://www.rfc-editor.org/rfc/rfc9110.html#name-206-partial-content)约定。该交互是否被本机AVPlay正确续请仍须实测，不能由HOST成功推断。


0.0.18目的地选择补充：HOST公开接口响应实测存在首选CDN不在当前策略内、但同轨backupUrl含合规bilivideo.com源的情况。只对同一已获guest普通UGC授权且metadata校验通过的轨道，依次验证primary及最多4个backup；所有候选应用相同HTTPS/host/port/path/deadline规则，未通过者不发网络请求。原生独立校验保持；不新增未知CDN域、不修改签名、无跨轨拼接或账号凭据。无有效候选返回cdn_unavailable；已选备用这一固定事实可进有界IPC，具体URL继续只留Worker。HOST样本改善不是TV问题已解决的证明，须匹配工件再验。


0.0.19内部预算调整：真实首播/177秒已获0.0.18用户反馈，短视频完整播放尚未证实。候选总租期为min(max(180秒,媒体时长+60秒),900秒,两条签名期限减5秒)，父Worker17.5分钟硬deadline覆盖有界源获取+租期；暂停仍消耗租期，完成/Back/Home/错误按原清理ACK。保持所有连接/缓冲/窗口/目标/TLS限制，无自动续期。该上限是W01内部取证预算，不能替代完整F06长期播放/更新URL设计。详情读取单独512KiB而其他JSON128KiB，针对公开接口大合集附加字段的实际169738bytes样本，UI仅接规范化摘要；超限返回固定原因并关闭。


0.0.28 progressive cast.mp4的HTTP完整响应、后缀Range/有界续段与新增聚合预算见[ADR-007](007-progressive-mp4-http-probe.md)，替代旧progressive“GET必须Range/仅首2MiB”限制；legacy DASH路径保持。新实现尚需TV播放证明，不继承游客DASH成功为投屏通过。
