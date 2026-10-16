# ADR-008：W01 seek 等待、缓冲与失败恢复

日期：2026-10-15；状态：0.0.35所测单样本三跳/35秒声画USER PASS；本轮未触发重连，其设备分支及完整媒体仍待验收。W01/F06/F20，依赖ADR-006/007；不固定最终runtime，不等于官方手机会话/控制已接通。

## 已有证据

0.0.29用户确认起播约20秒、首次暂停20秒再继续正常。回跳5秒仍间歇失败：首次播放第一次回跳卡住后回发现页；第二次播放第一次成功，第二次卡住后回发现页。实际报告source ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b、signed e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3，HTTP读取和GET后关闭通过，avplay.seek_failed、media_requests_v1_02、native_closed_confirmed。原始脱敏报告/用户观察私密保存；旧通用catch丢失错误原因，不能断言为SDK拒绝、应用15秒watchdog、buffer或HTTP资源耗尽。没有旧桥206/28条目不等于证明上游全程无故障。

## 候选实现

- prepare保留15秒；seek独立30秒有界等待。旧版两者共用15秒且均记prepare_timeout。三星文档列出默认缓冲20秒，应用不应在该默认预算结束前自行终止seek；这提供修正依据，不证明旧TV故障必为该watchdog。
- 仅cast.mp4候选在IDLE配置起播/恢复各4秒缓冲、10秒buffer timeout，均在官方参数范围内。接口缺失保留默认并记录buffer_default；支持时记录buffer_play4_resume4_timeout10，配置异常不假装成功。legacy合成/游客DASH不改缓冲策略。不是吞错、自动重试或重取URL；C/WASM桥与签名租期不变。
- classify seek_callback、seek_throw、seek_event、seek_timeout及固定允许的SDK错误枚举/name；不收集message/stack/URL。seek失败/成功摘要可附b0/1（最后一次bufferingstart/complete状态）和t0/1（本次seek期间实际time tick是否在目标±1500ms内）。这些是诊断事实，回调成功/目标tick不能替代声画验收；不合成时间轴。15秒prepare与30秒seek超时标签不混用。
- 显式失败callback或同步拒绝后，只有同epoch且SDK active state保持原PLAYING/PAUSED，DomainError才标retryable；UI保留播放页/焦点并提供手动重试/返回。无自动重试。未知状态、未返回callback超时、播放器事件错误、Back/Home仍关闭/隔离/清理；晚callback不能复活旧播放器或覆盖新seek诊断。
- seek进行中重复命令仍不叠加，等待期间保留Back/Home。成功只记UNVERIFIED callback_success；失败仍FAIL，反馈层与200ms进度更新分开，避免错误提示马上被覆盖。
- 八项诊断优先保留最新seek结果及最新故障。存在seek结果时让出早期candidate_confirm_sent槽位；保留media_approved/source/HTTP类型/SOAP/关闭证据，不扩大报告或写入私密参数。

依据：[Samsung AVPlay seek/buffering API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)、[Playback guide](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html)，2026-10-15复核。文档默认值/API合法状态不等于本机实际效果。下一门槛为新包同一内容两次回跳的实际声画/时间及分类报告；失败保留开放，不跳过F06/F20。

## 0.0.31：播放中的渐进MP4使用指定时间重新缓冲

0.0.30实际匹配build报告（source d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47，signed 61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4）保留最新avplay.seek_callback_invalidvalueserror_b0_t0、开放Range摘要02、source_pass与native_closed_confirmed，HTTP/GET后关闭通过。这是SDK error callback，不是应用seek_timeout标签；b0表示最后buffering完成/未开始，t0只表示该次操作窗口未观察到目标±1500ms tick，不能否定其他尝试曾恢复。用户原话“两次恢复声画和进度，等待超过30秒后失败，失败时自动返回”，顺序已发可选澄清，未取得答复前不将两次都记为USER PASS。后续自动返回为USER FAIL；旧八条最新结果不能还原两个操作的完整顺序或证明SDK拒绝根因。

0.0.31只对已批准cast.mp4、SDK原态PLAYING且有setStreamingProperty的候选，改用同一AVPlay实例close/open同一owned loopback URL，IDLE调用PREBUFFER_MODE、参数为目标毫秒字符串，随后prepareAsync，READY后play。原网络Worker/HTTP token/源/签名有效期/3分钟租期/字节与窗口预算保持，没有重新approve、拉新URL、延租或额外播放器/AVPlayStore实例。操作前尚未发原seekTo，不是在未完成SDK seek上叠加重试；也不将失败自动切回原SDK路径。prepare阶段仍4秒buffer、10秒buffer timeout；重定位独立30秒上限，未知/失败关闭播放器并由owner清理桥。

同一PlayerCoordinator的logical owner不变，backend epoch递增使旧listener/回调失效；新binding复用现有time/end/error owner，只用真实oncurrentplaytime更新进度，不把目标时间直接写入时间轴。重定位期间远程重复控制仍被seeking门闩抑制，Back/Home取消，新准备/播放的晚回调不能复活旧player或污染新source。短暂重新缓冲允许画面间断，这不是无缝切换承诺。

暂停态保留原SDK seekTo，不自动play/pause以免暂停时出声；该场景与完整F06/F20仍待验收。没有setStreamingProperty时保留原候选SDK路线，实际策略由seek_restart/seek_callback分类区分；方法存在但配置失败会显式失败，不能假装支持。legacy游客/合成DASH不改策略。不能由公开API证明本电视的PREBUFFER_MODE支持或实际跳转恢复，需新签名包实测。

同一逻辑播放器保留最近4次有界结果avplay.seek_history_v1_*：w等待、s原SDK成功回调、r重新缓冲并启动、e明确拒绝且可手动重试、f致命失败、t超时、c用户取消。结果只是API/操作事实，不是声画PASS；新player清零、晚owner不能追加，开始/结束只记录常量，不记录URL或个人数据。八项报告有history时让出初始avplay_started和早期confirm槽位，保留最新详细seek/故障、source、approval、SOAP、HTTP类型及关闭；补位按code排除已固定条目，避免重复Range摘要占槽。

2026-10-15再核查[Samsung PREBUFFER_MODE和prepareAsync](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)：属性参数为开始时间ms，配置限IDLE，prepareAsync成功在prebuffer完成后返回。未复制示例实现；本候选只复用一个播放器。另一个seamless guide URL本次打开失败，未作为依据。


## 0.0.32：恢复原生seek并连续取证

用户已澄清0.0.30前两次回跳恢复声画/进度，第三次失败自动返回，分别记USER PASS/PASS/FAIL。0.0.31用户两次独立尝试均首跳失败回主页面。匹配source 8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114的手动报告为FAIL avplay.seek_restart_callback_pending、history_f、source_pass、media_requests_v1_02、native_closed_confirmed，报告GET后关闭。pending标签也可能由同步prepareAsync拒绝或成功回调的非READY状态留下，不能据此宣称SDK超时/PREBUFFER不支持或确定根因。

本候选默认恢复原生seekTo，即使setStreamingProperty存在也不调用PREBUFFER_MODE。重新缓冲代码仅保留显式构造参数开启的HOST实验；实际工厂不启用。prepareAsync同步异常、error callback和非READY成功回调分别记录固定stage/允许错误枚举/SDK状态，原生seek拒绝同样记录实际状态；不输出错误message、stack或地址。现有30秒seek、15秒prepare、4/4/10缓冲和明确失败可手动重试的边界保持。

### 连续检查

主页面新增“自动投屏回跳检查”，用户选普通两分钟以上视频后仍须在电视确认“播放并自动检查三次回跳”。未获TV确认不播放。检查共三次：真实进度过10.5秒后走同一PlayerCoordinator seek到5秒，观察真实3.5–8秒tick；第三次后观察35秒真实时间轴持续前进。每轮等待原进度最多20秒、目标观察8秒，原seek30秒，起播后的自动检查150秒上限；不循环重试失败操作，不重获URL、不延租。结论只为UNVERIFIED complete_timeline_only，绝不替代真实画面/声音验收。

Back/Home取消controller并改变automation epoch，旧流程不能继续seek/打开报告；成功或故障结束后关闭播放器并等待本次cast native清理ACK，再自动开启原120秒脱敏报告。用户取消不自动打开报告，清理未知保持错误并阻止自动开启新报告Worker。控件期间忽略手动暂停/seek，Back保持可用。无真实账号写操作，无新增权限或外部常开服务。

### 有界网络诊断

progressive租期最多追加两条flow快照（首次错误e、最终停止s）：活动连接0–4、背压连接0–4、窗口0–256、累计字节向上取整MiB 0–128、剩余时间向上取整30秒桶0–6。另最多一条固定limit原因bytes/windows/connections/lease。Worker严格校验规范数值和paused≤active，最多新增3条进度，整体上限102。实际C/WASM须重新编译，不将HOST行为当零售设备结果。

八条报告有history时优先最新故障/SDK seek详情、独立网络limit或issue、flow（错误优先）、最近四次操作history、native关闭、最新自动阶段、source与请求摘要；按优先级最多八条，空间不足可舍弃早期SOAP/确认记录。不会输出URL/请求正文/设备地址，最终标签仍不证明根因。桥本身的3分钟租期、4×64KiB缓存、2MiB窗口、128MiB/256窗口/512连接、TLS和目的地限制不放宽。


## 0.0.33：关闭期间的固定原生错误也必须留存

0.0.32自动报告history_se/第二次InvalidValuesError_sp，第一跳只有SDK回调证据、第二跳FAIL。flow_e为c2/p0/w4/m6/l5，不支持字节/窗口/租期触顶结论。关闭期间issue可能晚于UI generation失效而到达，原network集合只留flow/limit，导致issue丢失；compact还用最新stopped覆盖早期issue。0.0.33将issue纳入本次run的局部集合、ACK后汇总，compact分别优先issue和limit。晚帧仍不能恢复播放/控制或更改新owner；固定字段、102进度/8条报告不扩大，满额时让出早期source/请求摘要槽位。C/WASM不变，不宣称重新编译、变更SDK策略或根因已解决。


## 0.0.34：分开观察prepare与seek

0.0.33同包两次实际自动尝试均prepare15秒超时，未进入seek，flow_s为c1/p0/w3/m5/l6、source_pass、请求02、native_closed_confirmed，GET后关闭。不能当作0.0.32第二跳的同一故障。只将cast prepareAsync有界观察延至30秒，legacy仍15秒，seek仍30秒；超时记录SDK状态n/i/r/p/h/u与最后buffering b0/1，关闭之前采样，不输出外部错误文本或地址。此实验可能让更晚的成功或原生错误被观察到，未证明能恢复声画。上游15秒无数据deadline、3分钟租期、字节/窗口/连接/堆/TLS边界保持；不自动重试/换源。

2026-10-15重新复核[Samsung AVPlay](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)：setTimeoutForBuffering说明的是到期触发onbufferingcomplete；4秒缓冲参数是可播放媒体累计量；prepareAsync成功回调/READY另有合同。文档未保证prepareAsync在已配10秒buffer timeout或15秒应用deadline内必定返回。厂商未配置时20秒默认值也不能证明本机忽略了4/4/10设置；30秒是本项目有界诊断选择。

自动driver起播后仍最多150秒；起播准备最多30秒，全部受原3分钟/更早签名期限约束。native错误若在prepare期间先关闭player，catch仍按相同epoch完成清理与报告；用户Back/Home/新操作取消则不报告。独立UI回归覆盖真实Worker在未完成prepare时发issue，且不调用seek。


## 0.0.35：零响应媒体GET超时的有界重连

0.0.34真实自动/手动报告均保留native issue_0_28与第二跳SDK拒绝、history_se；用户确认实际起播，但三跳FAIL。0表示该次上游尚无HTTP状态，curl28为超时（2026-10-15复核[curl错误码](https://curl.se/libcurl/c/libcurl-errors.html)）；这不是全部SDK故障的因果证明。

候选仅在progressive匿名GET、curl28且status/received/upstream_headers均零、仍在租期/资源预算内、该下游未重连过、整轮未达三次时启用。先确认旧easy从multi移除并cleanup，250ms非阻塞backoff，下一tick在同一已批准URL与相同字节范围用fresh connection尝试；[CURLOPT_FRESH_CONNECT](https://curl.se/libcurl/c/CURLOPT_FRESH_CONNECT.html)只对这次重连启用，后续正常窗口恢复默认连接复用。没有接收该范围的任何字节，因此既不回滚已送出的先前窗口，也不重复/丢弃部分正文。每次新尝试仍消耗原256窗口预算；流量/字节/堆/连接/期限不重置，Back/Home/stop在backoff期间清理后不发迟到请求。

每下游连接最多一次、整租期最多三次。非28、已收到任何响应头/正文、HTTP拒绝、TLS验证失败/格式/Range不符均保留终态错误，不走此路。没有自动重试SDK seek/prepare或账号写入；没有新URL、源切换、延租或外部服务。新增最多三条retry_1/2/3固定进度，表示已排队非恢复；IPC上限105，8条报告优先保留最新重连计数与故障/SDK/历史/清理，空间不足可让出source/请求摘要。无history的首播报告同样保留重连，并强制最多八条。需要SDK重编译和新包TV回归，不能以HOST模拟网络或SDK编译证明恢复声画。


## 0.0.37：暂停组合、SDK调用互斥与已校验206有限续读

0.0.36官方Android单样本连接和手机暂停/继续用户确认通过，但手机暂停后遥控seek失败并退出；匹配报告同时有SDK InvalidValuesError/sh与native206_28。新版快照的getDuration在seek期间持续调用，是可定位源码缺口；[Samsung seekTo约束](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)明确异步期间须等success/error回调再调用其他API。改为协调器busy期间只发送缓存时长，adapter pending门闩再次保护；不通过偷偷play再pause解决暂停seek，不制造时间tick。

0.0.35的零响应重连保留并扩展为0.0.37范围续读：仅匿名progressive GET且curl28，满足原零HTTP响应条件，或status206/完整头验证成功/Content-Range匹配请求与本次媒体total/已收字节少于当前窗口长度。后者移到start+received，保持原end，不重复已收前缀，未发送的本地64KiB缓冲/下游HTTP头和Content-Length均保留。每次仍新连接、250ms退避，消耗原256窗口/128MiB预算，单下游连接最多2次、全租期共享最多3次（替代0.0.35单连接1次）。随后新窗口从原end+1继续。固定原签名URL，无重定向/重取URL/续期或HTTP降级；TLS/CA/host检查不变。相同URL/total的媒体连续性沿用既有逐窗口策略，不宣称ETag或内容哈希验证。

不续读错误/未完成/不匹配的206头、HTTP错误、压缩响应、TLS验证失败、其他curl错误、已收完整窗口、HEAD或legacy DASH。次数/期限/窗口/字节耗尽仍终态失败。native resume_1..3只证明排队，从全局共享计数取号，不证明恢复；IPC上限147增至150，未知/非法序号拒绝，状态快照不写日志。八项报告在seek history路径也保留receiver_summary。没有增加权限/外部服务/SDK自动重试/账号写入。

应覆盖未收正文的206恢复、部分正文连续精确字节、跨窗口边界、重取头/total校验失败、2次/3次/stop与原16秒背压/期限，并实际SDK编译。HOST匿名HTTP不是真实TLS/TV证明；新TV只做手机暂停→遥控seek保持暂停→恢复声画/交还控制，其他真实发送端/完整F20保持开放。
