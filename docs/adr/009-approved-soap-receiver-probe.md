# ADR-009：已确认投送的 SOAP 控制探针

日期：2026-10-15。状态：W01/W02/W06、F06/F20 候选实现，0.0.36官方Android单样本连接/手机暂停继续USER PASS；其他控制/三端完整F20未验收。承接 ADR-006/007/008；原发现/电视确认播放/自动回跳入口保留。

新增独立“官方手机控制探针”入口。先沿用有限 HTTPS 源检查和电视明确确认，再允许该候选来源的一个 TCP IPv4 对端控制本次播放器。对端仅在 native/Worker 私有内存中存活，不进入 UI、日志或诊断；局域网地址绑定并非认证或密码学防重放。同一局域网应视作信任前提。SOAP 无请求序号，内部递增 RPC ID 只防本机重复分派。不同对端、新 URI（包括变更 query）、过期候选均拒绝，不偷偷替换源。原始 URI 仅在 Worker 内保留，以向同一对端回答 CurrentURI；HTTPS 升级候选仍由 native 再检查，TLS/CA/目的地策略不变，无 HTTP 回退。

首次投送仍可能因电视尚未确认而收到 701。电视确认播放后可在手机重连同一条视频；是否复用同一 URI、是否要求其他协议、是否接受查询轮询，必须由实际官方发送端证明。该有限单视频探针不等于完整连接、分P/PGC/live、断连恢复或三端 F20 通过。

UI 只接受匹配 scope 的有限命令 DTO，调用 PlayerCoordinator；Worker 不触达 Samsung globals。状态由 UI 的真实 coordinator/adapter 快照回传，含递增帧号、播放状态、时间、已知时长、seek 和控制权，Worker 拒绝旧帧/非法字段；超 3 秒无新帧时拒绝控制及私有状态查询。命令每租期最多 24 个且同一时刻一个待接收命令。Seek 被协调器接受后可立即回答，完成前查询为 TRANSITIONING；成功响应只证明分派被接受，不表示声画或目标时间已恢复。失败通过实际状态和固定诊断码记录，不自动重试 SDK 控制。Stop 关闭解码器但保留有界媒体租期，允许同一源 Play 重新 prepare；Back/Home/错误/期限到立即停止整个接收器。停止/准备/跳转都不能延长原 180 秒、签名期限、字节或请求预算。

电视暂停/跳转先取得 remote 控制权；手机控制在显式“交还手机控制”前拒绝，查询仍可读取真实状态。Back/Home 总能终止。未接通物理音量/静音时继续 501。没有 GENA 事件订阅实现，不宣称支持；当前只提供真实 SOAP 查询轮询。权限/CSP/签名身份不变，无账号写操作、外部常驻服务或第三方客户端身份。

协议依据：[UPnP AVTransport v1 §§2.4.3–2.4.12、2.4.17](https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)。尤其 Seek 响应与 TRANSITIONING/最终位置是不同事实。本项目批准与控制权规则是工程策略，并非规范提供的认证。

验证须分别记录合同/Worker/浏览器假后端、HOST C、真实 SDK 编译与本电视官方发送端的证据。未验证项保持开放；0.0.35 的自动三次回跳声画通过不作为本接收会话通过。

诊断新增18种去重固定会话事实（含owner/source_changed/stale/locked/busy/limit拒绝分类），汇总为5位hex的receiver_summary_v1；保留在最多8项报告中，无原始值。IPC进度上限从105增至147：24个有界命令帧与18种固定事实，状态快照反向发送，不进入观察日志。

0.0.37快照互斥、206范围续读及诊断保留补充见ADR-008；最大进度150。原0.0.36的147帧和18事实为对应版本记录。用户观察与匹配报告已分别保存，暂停态遥控seek失败未因手机控制局部通过而关闭。


## 0.0.38 首次准备握手和快照闭环

0.0.37报告只有泛化denied_stale，用户明确手机/电视均未成功播放。源码的30秒prepare与3秒新鲜度间存在心跳空窗，不能把SDK started标签当作实际声画。

TV已批准原URI后，SetURI只是幂等确认同一资源，不依赖当前SDK快照，绝不换URI/owner/续租。首次TV自动播放已排队时，在min(原租期,批准后30秒)内允许幂等Play确认，未再分派播放器；查询为TRANSITIONING/真实已知时间，绝不制造PLAYING。准备中的Pause/Stop/Seek继续busy拒绝，不承诺尚未实现的准备中取消命令。首次实际playing/paused/idle/error帧结束这一启动阶段；其后3秒过期门禁保持。已批准意图不作为新的SDK成功或声画证明。

UI从player.open之后就启用200ms心跳，等prepare期间只发协调器状态/缓存时长，无SDK并发读取。已有Home/Back/失效/超时取消整条链，晚prepare不会重播；所有期限沿用原批准/签名期限，不因握手或Play延长。Worker对首个接收/应用/拒绝帧各记一次，细分missing/old/expired/clock；UI发送、本地inactive、真实tick/time_changed各固定一次。RECEIVER_FACTS从18追加至29，v2为8位hex；旧v1/5hex历史保留。IPC上限161（原150+11固定事实），无原始帧/地址/URI/时长读数入日志，报告8条并保留关闭流量快照。

新增前首帧/慢prepare>3秒、重复Play无额外SDK调用、真实就绪后控制、Home取消等待等合同/实际Worker UI夹具；假后端不代表实际TV。需0.0.38再确认官方手机连接和真实声画，暂停组合暂不重复施压。

0.0.39源检查在擦除前分类原512字节顶层MP4布局，仅固定5种事实，不额外获取、不改变源批准/播放策略。新增分类不是编码或声画证明，mdat_first不证明moov必在文件尾；未知/非法仅作诊断，不绕过原源验证。IPC166，报告8条保留源布局。0.0.38手机查询/快照已到达但prepare30秒超时，布局原因尚待证据；不延长超时掩盖问题。W01完成后的skill更新见项目W01_LESSONS_FOR_SKILL.md。

0.0.39实际新源为moov_first且报告含真实时间推进，用户确认单样本声画正常。没有改变播放策略，不归因诊断代码为修复；此前不同请求的prepare失败原因保持未知，同包继续暂停/遥控seek/交还手机控制。


## 0.0.41交还控制通过、手机拖动失败及0.0.42候选（2026-10-16）

用户确认交还控制和手机继续/暂停/继续通过，但手机拖动失败后返回主界面，分项USER PASS/PASS/FAIL。UTC04:09:44实际报告匹配source 147ff8ea1da4ddab50fa47cea4b98ede8a7b93649c6b4754e8454ee868f0d0f9 / signed 6106e27f7a8c2d9079ef27643df73ed8cb9526713c7c304c4e8a2349fd21f8e8，FAIL cast.avplay_error；receiver_v2_1a0c015d包含approved/query_live/Play/Pause/seek_accepted/command_failed及快照/曾有tick，证明本轮手机seek已到达，不是仅发现失败。media_resume_2为排队续读，不证明恢复；flow_s_c4_p0_w8_m7_l5、source_pass/native_closed_confirmed、GET后关闭true。SDK具体事件被pulse通用标签遮住；报告还夹有上一轮seek_restart_held/history_r，因为手机seek未记录本轮SDK/history且compact从整个页面历史选择。不得把旧held结果算作本轮手机seek成功或根因。私密device-native041-phone-seek-fail-report.json / device-native041-phone-seek-user-observation.json另存，之前暂停重定位USER PASS保留。

0.0.42只改本次手机seek的执行/诊断：若原逻辑状态playing，先由同PlayerCoordinator暂停，再走已验收的暂停重定位路径，成功且同owner/operation才显式恢复play；原paused保持暂停，不合成目标tick。ACK仍是接受分派，完成独立回传；busy拒绝叠加，Back/Home/换owner晚回调不恢复。手机seek失败关闭本次decoder且不自动重试/恢复，保留原receiver有界租期，允许用户Back；未延租/换源/重新批准。默认遥控playing原native seek策略不改。

手机seek新增started/succeeded/failed到本轮history和固定backend摘要；pulse记录实际允许枚举的SDK摘要，不再覆盖成泛化cast.avplay_error。每次新投屏run在内存标记诊断代次，compact只选当前代次，旧记录仍可在页面历史中保留；run号不进入公开报告schema，不增加8条/4096字节上限，不输出URL/参数/地址。C/WASM、网络预算/权限不变。本轮失败不能归因为HTTP或解码器的具体原因；候选效果待本地与TV验证，完整W01/F06/F20开放。


## 0.0.42手机Seek恢复声画但目标位置失败，0.0.43取证（2026-10-16）

用户反馈每次拖动只能到0.1秒附近，随后声画正常，分记恢复声画USER PASS、定位USER FAIL。UTC04:18:05匹配source 7d301b5a3bf9f418958a851204f88704b444908064c9343bd7af63ab2a649df0 / signed a9d332c22ff0f114f1467abdc555800499d5e380ab71d5487503940abcdc51c0，held_b0_t0/history_rr、receiver_v2_1a0c00d5含seek接受和完成，source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w9_m13_l5，GET后关闭true。报告无FAIL仅表示尚无目标命中核查，不能据此记完整Seek通过。两次重定位流程完成不等于到达期望位置；没有记录本次请求目标，故尚不能区分手机发出近零目标与SDK忽略offset。原件/用户观察私密分存device-native042-phone-position-report.json / device-native042-phone-position-user-observation.json。

0.0.43不改变媒体/重定位策略，仅在本次手机seek保留内存目标、成功后观察PlayerCoordinator的真实新tick。固定事实：目标>=3秒的seek_target_nonzero，首次真实新tick进入目标±1500ms的seek_target_hit，或已观察至少4秒且真实进度从首个新tick前进>=2秒仍未命中的seek_target_window_missed。旧tick/成功回调/目标值本身不能造命中；暂停/忙状态不采样，取消/Stop/失败清除本次观察。事实仅是有限窗口，不保证永远无法到达；若没后续tick则不产生miss。为避免从零正常播到短目标造成混淆，下一次真机请求选择约60秒目标并等约8秒取证。原请求数值只在内存比较，不输出原始媒体地址/参数/精确位置。

RECEIVER_FACTS 29→32，v2仍8位uint32 hex（已用满32位，后续不能继续移位追加），3条固定进度使IPC166→169；报告仍8条/4096字节，沿用按run隔离。所有事实从协调器事件取，不调用忙SDK；无C/WASM/权限/网络预算变化。旧0.0.41暂停重定位的用户通过观察保留，但不能推广为所有目标/路线正确。W01/F06/F20及skill最终更新继续开放。


0.0.43取证范围补充（2026-10-16）：用户明确手机始终显示0:00–0:00，无法知道拖动目标。因此撤销“下一轮选约60秒”作为当前前置动作，先检查时间/总时长回传，不能提前归因SDK忽略offset。Worker对活跃接收器实际回答的GetPositionInfo/GetMediaInfo等查询补记既有固定SOAP查询类型；新追加receiver_position_nonzero/receiver_duration_nonzero两个事实，仅检查本机生成回复中时间字段是否非零，不输出正文、URI、精确时间或原请求。UI显示缓存的真实总时长，并首次记avplay.receiver_duration_known；不额外调用busy SDK。报告在无seek历史时优先保留查询摘要/时长事实，用以区分TV尚未知时长与手机是否收到非零查询回复；仍不证明手机UI已采用或事件订阅已支持。SOAP事实保持<=64位，IPC最终为171而非之前候选169；RECEIVER_FACTS仍32位，不再追加。原目标命中观察继续保留，当前先不要求盲拖。


## 0.0.43电视时间已知、非零查询回复已排队，手机仍全零；0.0.44服务描述修正（2026-10-16）

用户确认电视播放至少30秒，手机依旧0:00–0:00，手机时间显示USER FAIL。UTC04:29:23匹配source 6d76b6ea5cabc94b1000b8a1674410bf5ea1673f801e22b4d9c79b1d6294b644 / signed 25a4a3d93f7db4789d6045cccefe7dc56a7cb37f40fcf536c6e4a8fa33ea37fa，avplay.receiver_duration_known、receiver_v2_1a0c8205（批准/query/快照/实际tick/locked拒绝），SOAP_v1_8000400c32002010含position_query、receiver_position_nonzero、receiver_duration_nonzero，flow_s_c1_p0_w7_m14_l5、source_pass/请求02/native_closed_confirmed、GET后关闭true。固定事实是在cast_rpc_reply成功排队后产生，不证明每字节已到手机或手机已解析。仅能排除“TV始终未知时长/所有已排队查询回复全零”，不能断言手机SDK/UI根因。无新seek测试，上一轮定位FAIL保留。原件/用户观察私密分存device-native043-phone-zero-time-report.json / device-native043-phone-zero-time-user-observation.json。

源码发现AVTransport.xml仍为发现阶段空actionList/serviceStateTable，已实现的SOAP动作未声明。0.0.44在RPC启用时返回原创固定9898字节SCPD：11个现有动作、29个关联变量，InstanceID/方向/关联类型、GetPositionInfo完整8个输出及REL_TIME/1倍速范围；不声明未实现的Next/Record/事件功能，不接入任何新控制动作。RPC未启用仍保留旧发现描述；所有控制继续经TV批准/owner/lease。原生response固定容量8192→16384仅为容纳固定描述，两客户端共多16KiB静态缓冲；入站8192、body4096、RPC回复6144、连接/时间/网络目的地边界不变，无动态无界分配。

单一progressive媒体无跨轨绝对偏移，GetPositionInfo的AbsTime改为同一真实快照timeMs，不再返回NOT_IMPLEMENTED；RelTime/TrackDuration与原实际缓存不变，不制造时间。对完整多轨/playlist需另行建模，不能由该候选推导。SCPD与时间字段修正是合同缺口补齐，效果仍需本机验证，不把手机全零根因直接归给它。

官方依据：UPnP AVTransport:1 v1.01第2.2.23/2.4.5/第3节（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf，2026-10-16复核）。协议字段/类型按标准实现，未复制规范XML正文。位置由control point轮询，不应把它未经判断归为必须GENA推送；GENA仍未接通，不宣称完整UPnP兼容认证。C变更需真实SDK重编译与HOST描述解析/大小/HEAD验证，完整W01/F06/F20和skill最终更新门槛开放。


## 0.0.44手机仍全零，0.0.45最小元数据候选（2026-10-16）

用户反馈仍0:00–0:00，手机时间显示USER FAIL；没有新拖动验收。UTC04:36:43报告匹配source 1313ad83faedc03aa02b12c479f8e0bef6fc5bfd9acb0e72b8223261c490c1df / signed e242945b167f91ac75648fd2931689b0e754a92e5481631e18882a36e44eae86。receiver_v2_1a0c0005、SOAP_v1_8000400c32002010仍包含位置查询及非零位置/时长回复排队；TV已知时长、实际tick、source_pass/请求02/native_closed_confirmed、flow_s_c1_p0_w7_m13_l5、GET后关闭true。服务描述和AbsTime改动未取得手机显示修复，不能记为通过。新原件独存device-native044-phone-zero-time-repeat-report.json，不覆盖startup/其他旧记录。

0.0.45候选补GetPositionInfo.TrackMetaData/GetMediaInfo.CurrentURIMetaData：仅用当前已批准原URI、固定通用标题/视频类型及真实缓存duration构造单item DIDL-Lite，不解析/透传发送端opaque metadata，不猜内容标题、不添加其他资源或外部请求。duration未知时省略res.duration属性；已知时与TrackDuration/MediaDuration同源。先转义URI进DIDL，再转义完整DIDL进SOAP，避免&/引号等穿越XML层。只在owner/新鲜度/租期检查后回答私密资源。

完整UTF8 SOAP仍<=6144字节：超限时省略生成元数据并用NOT_IMPLEMENTED，若连基础回复也超限则返回501，不扩大native RPC/入站预算。Worker只记固定receiver_metadata_generated/omitted事实，摘要SOAP62→64位（已满，后续须升级格式而非继续移位），receiver仍32位、IPC171→173，报告8条/4096字节。事实是成功排队，不证明手机解析。播放策略、C/WASM/权限/网络边界不改，不能先归因空元数据为唯一根因。

依据UPnP AVTransport:1第2.2.16/2.2.19及ContentDirectory:1的DIDL-Lite/资源duration定义（https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf；https://upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf，2026-10-16复核）。原创序列化，未复制标准XML/schema或新增依赖/客户端身份；不宣称UPnP认证或GENA已实现。完整W01/F06/F20与skill最终更新继续开放。


## 0.0.45手机时间仍全零；0.0.46发送层取证候选（2026-10-16）

W01/F06/F20。用户反馈“仍全零＋诊断已开启”，时间显示USER FAIL，不记新的拖动通过。UTC04:45:16报告精确匹配source cd21b46815b7d5e431588fead1f86d2d72fa1760c29a417febe0ddd3bbbe488b / signed 6c455dfc60dbd5324421cc1ed2c517863ad9fdb56b962389f1d378798f2e7a46。receiver_v2_5a0c00f5、held_b0_t0/history_r、flow_s_c0_p0_w7_m12_l5、source_pass/requests02/native_closed_confirmed，GET关闭true、marker1。报告含本轮重定位历史，现有8条优先级因此未保留SOAP摘要/已知时长；不能据此推定生成元数据已发出或被手机解析。独立原件私密保存device-native045-phone-zero-time-report.json，startup与历次失败保留。

0.0.46候选不改变SOAP正文/播放策略，补原生发送层固定position_wire_v1两位hex位集：bit0完整响应已交本机socket，bit1该完整响应有非零RelTime，bit2非零TrackDuration，bit3生成DIDL，bit4某个已排队进度响应未完整写出即丢弃（包括显式关闭，不单独判网络故障）。只有成功的GetPositionInfo回复被标记；排队不产生完成位，完整响应头及正文写完后才合并内容位，失败/超时/关闭未完成不产生成功位。各位按一次会话累积，不保证来自同一个响应，不能当成对端接收/解析/显示证明。日志不含正文、目标时间、地址或原请求。

位集独立于已满64位SOAP/32位receiver摘要，最多5次新增位更新，IPC173→178，8条/4096字节报告保持。history分支在错误/SDK/网络失败及清理之后优先保留最新发送位集和SOAP摘要；无history同样优先保留。无新增权限、目的地、HTTP回调、GENA、协议动作、媒体自动重试或签名身份变化。本地/设备结果待真实执行后补，手机全零根因仍未确定，完整W01/F20与完成后skill更新继续开放。


0.0.47新增独立电视预授权的首源握手，见[ADR-010](010-first-offer-handshake.md)。原后确认入口保持本ADR历史行为，不能将其首次500与新入口首次200混用验收。
