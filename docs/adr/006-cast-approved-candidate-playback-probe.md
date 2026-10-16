# ADR-006：电视确认后的投送候选声画探针

日期：2026-10-15。状态：W01内部探针实现；不固定F20正式接收会话/协议。依赖ADR-004/005。

0.0.25已在本电视证明一次官方Android投送候选的HTTPS/TLS/206/512bytes/ftyp范围，尚未证明可解码轨道。下一步不推断手机连接成功，增加明确的电视“播放已检查候选”动作以独立验证该媒体与loopback/AVPlay。SOAP SetURI/Play/Pause/Seek/Stop仍拒绝；NO_MEDIA_PRESENT描述未建立的SOAP transport，这一独立电视声画样本不接管手机会话。完整接收还须CastSession审批/所有权、真实状态回传、控制争用、恢复和三端证明。

0.0.26仅在native source范围检查成功后保留一个私有URL，最多60秒，Back/Home/失效/失败擦除，绝不落盘、跨UI IPC或进入诊断。UI仅从本次随机token构造owned 127.0.0.1:40324/token/cast.mp4，点击后向当前scope的Worker发送无payload play-candidate。Worker只接受匹配scope/运行中/source已通过/未发起过的唯一确认，native再次校验源/期限/ready。新租期不继承URL，取消/过期或旧scope不能开启桥。候选移交后立即擦除source缓冲。

仅这条私有候选可进入桥，不接受HTTP路由的目标参数。复用4客户端×64KiB缓冲、单range最多2MiB、512连接、4KiB请求/16KiB上游头、20秒客户端/15秒上游、HTTPS-only/CA/peer/host验证、无redirect/proxy/cookies的桥。新progressive模式仅cast.mp4（GET必须Range，HEAD无正文），不开放manifest/video/audio旧路由；原DASH模式保留。所有curl选项均查错，未add的easy不remove；整数扫描限制13位。

总媒体租期min(180秒,签名期限减5秒)，暂停消耗租期，无自动续期。显式TV动作至多延长前台探针3分钟。桥作为cast主loop的子资源，不取消共享main loop；只有cast_stop在子桥/source/发现fd均清理后给最终ACK，未知remove/close/cleanup禁止成功ACK及复用。source与bridge cURL global使用不重叠，source检查结束才开放按钮。

显示与控制复用PlayerCoordinator和集中Samsung adapter，仅允许本次owned cast.mp4 URL；不接受任意CDN字符串。单DOM焦点：确认后退出cast弹窗再进入媒体弹窗；Back/完成/错误回主入口，Home关闭播放与Worker，无自动重播。取消prepare拒绝晚回调。媒体实际时间来自AVPlay，轨道计数为metadata，启动/桥served均不作为声画PASS。

进度预算由86追加6个固定media代码及一条有界status/cURL故障至93，SOAP60位/v1摘要不变。只有最终cast.closed才是整个原生租期的关闭确认，media_stopped不是。8项诊断同时保留source、SOAP summary、policy、媒体观察及最新错误。没有新权限/CSP/WARP、账号写操作或外部常驻服务。

本轮应验证HOST策略/有界HTTP/清理、匿名UI确认/暂停/seek/Back/Home/晚prepare/过期/失败，再实际SDK编译、签名安装与TV声画。声画未回传保持UNVERIFIED；手机连接失败仍符合当前探针行为，不能据此关闭完整F20。


0.0.27确认路径补充：0.0.26用户反馈无法播放；匹配报告只证明源PASS及候选过期，未证明解码失败。后续手机轮询不得覆盖就绪/确认中/过期提示；固定按钮左右邻居，不自动改变确认意图或自动播放。点击发出cast.candidate_confirm_sent，当前Worker接受合法确认后发cast.media_approved，10秒无桥ready关闭并记candidate_confirm_timeout。两个回执随有界8项报告保留；native候选60秒与所有源/桥限制不变。进度预算94，SOAP位序和C/WASM字节不变。新包不能以UI修复或receipt代替声画/完整F20通过。


0.0.28 progressive cast.mp4的HTTP完整响应、后缀Range/有界续段与新增聚合预算见[ADR-007](007-progressive-mp4-http-probe.md)，替代旧progressive“GET必须Range/仅首2MiB”限制；legacy DASH路径保持。新实现尚需TV播放证明，不继承游客DASH成功为投屏通过。
