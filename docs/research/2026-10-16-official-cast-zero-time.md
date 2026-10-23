# W01/F20：官方发送端时间全零调查（2026-10-16）

状态：根因尚未确证；保留0.0.46电视版本，先核对发送端实际过滤条件，不继续盲改响应字段。完整W01/F20仍开放。

## 本机已取得的证据

用户确认Android官方App 9.12.0-b28383822在0.0.46中仍显示0:00–0:00。UTC04:52:19报告精确匹配source `6334f6c04cef546204526b1a0caa18da53e63cc3614e9b5ebe20d933c62a579f`、signed `bc9e5a3e182e9ef03fdc88bea5330a924038021d285b8b21c5cfe474f76664b1`。本轮无seek历史，SOAP与发送摘要均保留。

- `cast.position_wire_v1_1f`：至少一个进度响应完整交本机socket；完整响应集合中包含非零RelTime、非零TrackDuration和生成DIDL；也有至少一个已排队响应在未完整写出前被丢弃。位集按会话累积，不保证五个事实来自同一次请求。丢弃可由Back清理导致，不能单独认定网络错误；完整socket写入也不是TCP送达或手机解析证明。
- `cast.soap_summary_v1_8000400c72002010`：包含位置/状态查询、非零位置/时长及元数据生成排队事实；无“元数据超限省略”事实。本次没有GetMediaInfo查询事实，不能要求其发生才能取得总时长。
- `avplay.receiver_duration_known`、receiver `v2_1a0c0005`，source_pass、requests02、flow_s_c1_p1_w8_m15_l5、native_closed_confirmed。HTTP GET后关闭true、marker1。
- 独立私密原件为device-native046-phone-zero-time-report.json，用户观察另存；startup、0.0.43–45失败与所有已有工作保留。

这些证据否定了“电视始终没有时长/始终只回零”和“所有非零回复都只排队未写出”作为充分解释。尚未证明手机收到和采用了哪条回复；不能把剩余问题直接归因B站限制或SDK忽略seek。

## 官方发送端规则的一手检查

从[官方下载中心](https://app.bilibili.com/)解析到公开Android64下载链接，取回当前包，仅作本机只读协议检查，无安装、登录、账号调用或解密个人通信。实际AndroidManifest：tv.danmaku.bili，versionName **9.15.0**、versionCode9150300，APK SHA-256 `37c606290fae434f4630795107fa6a4c716120ca271415f27305dc040ab0c6c2`。这不是用户9.12.0，不能把静态检查当该版本运行证据。

使用项目已存在的Samsung SDK JDK8及隔离下载的jadx1.4.7/baksmali，只审阅classes11.dex中投屏链路及libnirvana的协议符号。没有将官方实现、APK、反编译内容或第三方库加入应用、源码snapshot或发布附件；不借用其身份、appkey或权限。私密研究索引official-sender-zero-time-research.json记录工件和审阅文件hash。

可确认9.15.0标准AVTransport路径的行为：

1. GetPositionInfo按参数名读取TrackDuration、RelTime、AbsTime等，时间字符串经native时间解析（失败可走UTC时间解析回退）转秒，再转毫秒。元数据不是这些数值的唯一来源。
2. 相对进度在有效范围内时优先采用；可退到有效绝对进度。因此不能仅凭AbsTime为NOT_IMPLEMENTED判定全部零时间，0.0.44补值也未实测修复。
3. 当前视频需属于普通可投播条目。通常的进度界面发布前，会将接收端总时长与所选条目总时长比较：**包含边界的±5000毫秒窗口**；超出窗口可跳过界面进度更新。另有初始恢复位置等分支，不能简化成“任何情况下差5秒必定全零”。这是具体可检验的原因候选，不是本次根因结论。
4. 返回TrackURI还会与所选来源比较（查询串前的地址部分）；不匹配可切换到未识别条目。当前BiliSofa保留并回答电视批准的原始URI，未把127.0.0.1媒体桥地址回给手机；仍需考虑发送端后续换源/刷新这一边界。

本次检查[官方开放平台目录](https://openhome.bilibili.com/doc)未取得承诺9.12.0投屏解析行为的公开协议规范。独立研究者的[NVA分析](https://www.xfangfang.cn/028)说明专有Nirvana与标准DLNA需区分，不能据此把本机的标准SOAP查询认作NVA，或擅自伪装官方电视身份。

## 交叉核对与证据限制

只读对照Macast `121add3a8a70edb77e33aeab1ec88aeff27f49fc`、MiracastReceiver `6533b14032490bda42fae0b35f6ed8467c3f323a`、NeoBV `6c8ce4bbf82f43681cc6c5e46cd4f8c9b9b71bf6`和[Kodi Platinum控制点响应检查](https://github.com/xbmc/xbmc/blob/master/lib/libUPnP/Platinum/Source/Core/PltCtrlPoint.cpp)。它们是一手实现，可用于理解标准响应/解析，但不是B站官方规范，也不证明本电视兼容。没有复制代码进入产品；源码保留在ignored研究目录。

前几包补SCPD、AbsTime、DIDL只取得协议实现/本地验证，不是手机问题的根因证据。不能再根据猜测把它们记“修复”。也不能因为暂未实现GENA，就推定必须补GENA才能读取持续变化的位置；本机已有GetPositionInfo轮询，先检查真实回包采用条件。

## 下一步与停止盲试条件

已向用户请求同一视频手机本地播放总时长、电视播放页总时长，不要求暂停、拖动或升级发送端。

- 若差值超过5秒：先查是否选错分P/媒体资源、源内时长与AVPlay读值是否一致，再修正对应事实来源；不伪造总时长去绕过校验。
- 若在窗口内：该原因候选未命中；继续验证9.12.0发送端的实际收包/解析或缓存服务描述。9.15.0静态分支不能替代9.12.0日志。保持电视版本，避免无因果目标的新包。
- 只有匹配版本/来源、真实手机时间更新和已知非零目标seek声画均取得证据，才能关闭对应项；完整W01及完成后skill更新继续按原门槛。


## 同时长样本与首次握手缺口（2026-10-16）

用户更换普通视频：手机未投屏总时长134秒，电视显示134秒。约52秒回主界面，原话“自己推出的”；没有将含糊退出归因直接记成SDK失败或人工Back通过。UTC12:43:49匹配0.0.46 source/signed，position_wire_v1_1f、SOAP_v1_8000400c78002010、receiver_v2_1a0c0005、source_pass、duration_known、requests02、flow_s_c0_p0_w2_m4_l5、native_closed_confirmed，GET后关闭true、marker1。当前报告无FAIL/SDK错误条目，不等于退出原因已确定；新报告/用户观察独立私密保留device-native046-duration134-report.json与-user-observation.json。

**134对134，时长差异过滤候选在该样本不成立。** 新SOAP摘要中的offer_metadata_oversized仅指发送端入站opaque描述超过原2048限制；实际兼容解析会在4096总XML预算内丢弃它。接收端生成元数据与发送位均已取得，不能把“入站oversized”误当“回包被截断”。

进一步只读核查官方9.15.0 APK的SetAVTransportURI成功回调：成功路径将所选视频登记到当前source subject；GetPositionInfo消费路径在当前source不属于普通可播放条目时，会在发布进度前返回。因此“非零回包”还缺“手机已登记当前视频”这一前置条件。smali对照确认调用到实际GetPositionInfo参数解析类，避免仅依赖反编译器的错误类型推断；9.12.0仍需实机验证。

本项目的结构性握手缺口已从真实源码复现：首次未获电视批准的SetAVTransportURI返回HTTP500/SOAP拒绝；随后用户电视确认可独立开启媒体并回答位置查询200，但这不会补发手机原请求的成功回调。本轮receiver摘要有approved/query_live而无uri_accepted，符合“电视自行播放，手机未收到源设置成功”的路径。若手机重新投同一精确URI，现有接收器返回200；若App刷新了URL query，即使视频相同也按source_changed返回500，现有安全边界不自动接受新源。

一次本地合成序列直接运行现有discoverySoapReply/ApprovedSoapReceiver，结果initialSet500、TV批准后position200且非零、精确URI再投200、query刷新再投500/source_changed。这是源代码行为证据，不是手机根因已验收。没有改包/权限、未实际访问fixture域名。

已请求保持0.0.46，在电视起播后让手机重新选择同一接收器一次；优先于之前的强行停止缓存对照。读取下一份报告时核查uri_accepted/source_changed与手机时间结果，再决定修正握手顺序。若需要改成“电视先明确允许下一次单源投送”，应保持一次批准/单发送端/严格目的地/TLS验证/有界准备失败清理，不能通过提前伪报PLAYING、伪造时长、透传含潜在私密字段的opaque元数据或放开任意刷新URI来掩盖问题。当前不部署试改包，W01/F20与条件skill更新保持开放。


静态因果边界补充：当前source还有显式setter可供其他调用方使用，因此不能仅凭成功回调中的赋值，断言所有版本/所有路径都“只有成功回调才登记”。已确认的是本项目首次失败回执与TV另行起播的顺序缺口；它是否导致本轮手机未登记、以及重新连接后是否恢复，仍由9.12.0实机对照决定。源代码检查和一次本地合成序列不等于根因验收。


## 0.0.46强行停止与重投结果；0.0.47握手候选（2026-10-16）

用户强行停止Android后另选3:43视频，TV222.1秒、约53秒停播，手机仍00:00–00:00；重选同接收器后仍全零且无声画，均不记通过。UTC13:15:42最后重投报告匹配0.0.46 source6334f6c04cef546204526b1a0caa18da53e63cc3614e9b5ebe20d933c62a579f / signedbc9e5a3e182e9ef03fdc88bea5330a924038021d285b8b21c5cfe474f76664b1。receiver_v2_1a0ca225含Stop接受、source_changed/locked拒绝、无uri_accepted；wire0f、SOAP_v1_8000400c78002010、knownDuration、source_pass、requests02、flow_s_c0_p0_w2_m3_l3/native_closed_confirmed、GET关闭true、marker1。报告是最后重投的记录，不能把所有条目反推到之前强行停止那次。约53秒停止无明确SDK失败证据，Stop事实也不能单独确定该停止时点原因。原件/用户观察独立私密保存device-native046-force-stop-reoffer-report.json/-user-observation.json。

时长差异与仅靠强行停止清缓存不足以解释现象；重复投送确实被精确源变化门禁拒绝。0.0.47新增独立“允许一次官方投屏并播放”入口，电视先授权，首个合规源设置得到200，HTTPS检查通过后才自动起播一次；准备期不伪报PLAYING。旧后确认入口保留，不放开刷新URI/其他对端；失败/Back撤销授权、不自动重试。详见ADR-010。尚不宣称手机全零根因已验收，W01/F20与完成后skill更新仍开放。

0.0.47修正的是已观测到的握手顺序缺口；手机时间是否因此恢复，必须用新入口实测，不能由源码/模拟客户端成功推断。


## 0.0.47时间恢复与62秒停止；0.0.48轮询预算（2026-10-16）

用户确认新电视预授权入口正常起播、手机/TV时间均正常：时间与停止前声画USER PASS；约62秒自动停止返回，70秒连续播放USER FAIL。UTC13:26:29报告匹配source0e03ab29753ce3493aa8c8e36d94ce7bf4894ff3b85007cc12d190e9935ff7af / signed4e23e944891b6375d08646906b39048bf5ee5c3a843c5f4fc61c3a42c86cc949。receiver_v2_7a0c00cf含uri_accepted/Play及Seek接受/完成/非零目标命中，无Stop接受；held_b1_t0/history_r、wire0f、SOAP_v1_0000000c78002010、media_stopped、flow_s_c0_p0_w5_m9_l4/native_closed_confirmed，GET关闭true、marker1。用户未手动拖动，不能将报告中的发送端恢复定位视作人工控制全验收。原件与用户观察独存device-native047-time-pass-stop62-report.json/-user-observation.json。手机全零恢复支持首次设置源握手缺口这一因果解释，不能扩展为完整F20通过。

定位到发现阶段遗留的累计128 HTTP连接上限：每次普通状态/进度轮询都新建连接，累计上限会调用cast_stop并连带关闭媒体桥；每秒约两次查询约一分钟即可达到。旧报告没有显式关闭原因，尚不能单靠本轮8条报告证明恰好第128次触发。HOST真实127次请求后达到旧128边界会停止，无播放器或手机Stop；新实现真实140余次请求及高于128的RPC继续成功，另注入1024边界验证仍关闭并发固定原因。此为已复现源码根因候选，具体TV修复效果待0.0.48。

0.0.48将有限监听累计预算128→1024（两并发客户端、5秒单连接、5分钟发现、最多3分钟媒体、TLS/URI与字节/窗口预算均不变）；接入前再次检查上限避免同tick越界。RPC ID的native/Worker正则/contracts上限同步1024，播放器命令仍最多24次，不把只读轮询当播放控制配额。新固定listener_limit_connections/lease在关闭前输出并在8条报告优先保留，IPC178→180；不输出地址、请求、URI或精确计数。原64位SOAP/32位receiver格式不变，不取消资源边界或延长媒体租期。
