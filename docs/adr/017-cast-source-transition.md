# ADR-017：同发送端的有界切集/切P事务

日期：2026-10-16。W01/W04/W06、F06/F17/F20。状态：0.0.56 Android/PGC单次换集USER PASS及代次2四阶段/最终清理DEVICE记录通过；057 Android普通短UGC两次切换单样本USER PASS及代次2/3四阶段/清理通过；056间歇准备失败保留，连续三次/其他发送端仍待验收。0.0.55没有本能力。

## 已观察缺口

0.0.54 PGC P194的声画与所测控制USER PASS，用户明确选集/切P不支持；匹配receiver摘要含denied_source_changed。ADR-009/010单源策略在receiver.handle拒绝任何不同URI；Worker的sourceAttempted/mediaAttempted及native cast_source_attempted/cast_media_attempted也为单次，不能只改URI相等判断。报告不含内容ID，不能判断被拒绝的新URL对应另一集还是签名刷新。

## 候选合同与实现

- 保留“允许一次”原入口原含义。新增明确的会话入口，授权同一局域网发送端在原有期限内投送/切换媒体；这不是加密认证，不自动接受另一对端或转让账号身份。Back/Home随时终止。
- 同URI设置保持幂等；不同URI先检查owner/控制权/原会话期限/时钟、队列容量和现行URL政策，记录一次待换源事务。最多一个待切换、没有无界最新覆盖队列；重复设置只引用同一事务。拒绝准备/Seek竞态或明确串行化，不能并发调用AVPlay。
- 用独立媒体generation贯穿Worker→UI→播放器→native。设置源握手的成功仅表示接受意图，查询真实返回TRANSITIONING；不制造PLAYING/新时长，也不借新URL重置旧控制权、累计预算或会话期限。
- 先失效旧命令和晚prepare/Seek/tick，再停止/关闭旧decoder；UI回传同generation确认后，native关闭旧bridge的监听/客户端/cURL/multi，擦除旧源。原生关闭unknown立即poison并终止会话，不能开第二桥或以Worker.terminate冒充清理成功。
- 新源必须独立通过与首源相同的有界HTTPS/TLS/CA/目的地/签名期限/512字节和范围检查，再建立新桥和prepare。仅新的本机媒体token/generation可访问，旧本机URL不可读取新媒体。新时长来自新decoder，不能继承上一集缓存。
- 会话授权绝对期限、累计传输/连接/请求/命令预算必须由会话owner持有，native销毁重建不得归零；每源还受独立签名截止/准备和停滞限制。耗尽后用户需重新授权，不隐式续租。失败不自动回放旧集，给出可恢复的已停止状态。
- 完成新prepare并按实际已接受Play意图起播后才回传真实时间；手机在TRANSITIONING发出的暂停/Seek/Stop需明确支持矩阵及合成序列验证，不盲目把所有动作回答成功。

## 验证门槛

合同/实际Worker/原生HOST先覆盖：同源幂等、连续两次换源、另一owner/remote锁、忙命令、失效URI/TLS/过期、关闭unknown、Home/Back及旧回调、剩余预算、旧token拒绝、新时长和查询切换。随后真实Samsung构建/签名/本电视官方Android多P与PGC换集，再iPhone/iPad分别取证；内容ID/双端时长与声画由实际用户观察，不从URL变化猜测通过。至少一次失败恢复与快速重复操作需保留报告。

本事务只接收手机已合法取得、可投送的源，不读取手机账号或提升权益，也不等于TV端F17目录/选集UI、追番、续播已实现。0.0.55先完成现代库媒体回归，再实施该跨层事务，避免把库兼容与换源缺口混为一个修复。


0.0.56候选补充：新入口“允许本次投屏会话（可换集/切P）”，原一次入口不变；会话最多4源（3次更换），共用24命令/原始5分钟授权上限、128MiB/256窗口/512媒体连接/3次读取重连及1024发现RPC连接预算，源预检最多4×512字节。新URI先校验owner/新鲜状态/remote锁/忙与源政策，接受仅是意图，查询为TRANSITIONING/新媒体未知时长0。首源模式不含generation，session快照必须含1–4代次；旧代次与旧frame拒绝。

接收Worker生成新随机loopback token，只传token/代次给UI，不传远程URI。UI失效旧owner、清心跳、close旧coordinator后，必须经平台适配器确认SDK真实NONE，才回传匹配代次的decoder-closed ACK；5秒无ACK或否定ACK终止会话，不开新桥。native显式transition_begin只在已启用会话模式/顺序代次2–4下运行，关闭原bridge/cURL并核查关闭，再重新做TLS/206/512字节源检查。新桥还原累计字节/窗口/连接/重连计数，期限为原lease与新签名期限最小值；新token阻断旧本机URL读新源。原生关闭unknown继续poison，不输出原始地址/URI/异常。

TRANSITIONING期间仅Play幂等接受与真实查询，Pause/Stop/Seek和叠加换源拒绝busy；Back/Home为可靠取消入口。当前UI失败结束本会话回主页面，重新授权可恢复，不重放旧集。首个新快照用新时长和真实时间，旧CastReceiverPlayer的异步完成通过player identity失效。固定12位transition_summary_v1记录各代accepted/decoder_closed/native_closed/bridge_ready，不能当作实际声画或集身份；报告仍8条，IPC总额按4代固定上限增长。

实现首次真实Worker联调发现play-receiver仍先要求首源一次性offer、阻止第二桥，已将其限定在尚未有已批准receiver的路径，重验连续两次换源通过。另有fixture未真正模拟close不改状态，以及HOST断言误读未设置的HTTP status字段，分别修正夹具并保留失败日志；没有弱化SDK NONE/旧token404要求。完整真机换集/切P、现代三端及其余W01继续开放。


UTC21:13:46匹配056 source/signed报告transition_summary_v1_00f记录一次换源四阶段，最终原生关闭确认；用户确认PGC实际新内容/约20秒声画/双端新时间和手机停止通过。目标集号与App版本未重报，receiver Seek事实为全会话聚合，不分配给新集。下一项普通短P的连续两次更换待验收；不推导四源上限、故障、另两端或完整F20通过。详见TEST_REPORT同名记录。

## 0.0.56普通切P不稳定与0.0.57取证候选

用户明确普通P1→P2→P1不是每次成功，失败停在准备/无声画；本轮USER FAIL，之前PGC一次通过不撤销。UTC21:18:13匹配056报告只有代次2四阶段和receiver source_changed/control_denied，没有后续拒绝细分或用户退出前的实际发布状态。不能把无SDK FAIL标签当成功，不能确定source_changed就是本次卡准备的唯一原因。

057不改变源批准/播放器/网络策略，仅补以下固定取证：最多32次SetURI决策（额外1条cap标记），每条记录决策前媒体代次、session/single模式、最后接收的状态/遥控接管位及固定结果原因。Word为12位：原因5位、状态3位、代次2位、session1位、remote1位；序列1–32只用于本机排序，不是外部请求ID。退出报告仅保留最近4个Word及是否达到上限，decodeOfferTrace给出固定字段；不输出URI、签名、地址、metadata、正文、异常或精确时间。

拒绝分类包含空URI、格式/目的地/路径、deadline缺失/非法/过近/过远及busy/locked/过期/旧快照等。目的地额外区分文字匹配的bilivideo.cn和akamaized.net家族，格式额外区分FLV；这只是失败诊断分类，不表示信任或放行这些地址。原bilivideo.com/HTTPS/期限/MP4与原生校验都未改。单源入口的意图拒绝单列single_source，避免误归因地址政策。

新设源观测在SOAP答复成功排队后生成，不证明发送端已消费。决策前代次g的transition_accepted表示申请g→g+1，状态同样为决策前快照；不能当作目标集真实内容证明。解析失败仅在当前owner、确认为SetURI头时分类，无任意外部字段；无后续状态时使用missing，不造PLAYING。首次预授权意图记initial_accepted，不冒充TLS/媒体通过。

UI关闭前记录最后成功发布的播放器状态/代次/seeking，属于缓存状态，不额外读取忙SDK，不冒充退出瞬间硬件状态。8条报告优先保留最近4设源决策、退出状态、换源阶段、实际错误及清理；已有8条/4096字节限制保持。IPC总额883→916仅覆盖32+1观测，原源/命令/连接/期限/字节预算不变。056九个C输入及native JS/WASM/data逐字节复用，未重编译SDK、扩展白名单、增加重试或延长prepare。实际根因和修复仍待新包取证，不能将057视作修复通过。

057 UTC21:36:39普通短P两次切换用户通过，transition_0ff记录g2/g3四阶段。固定trace同时记录首源接受、g1/g2 playing下换源接受，随后g3/playing一次policy_destination_akamaized拒绝；无cap。成功样本仍出现同类通用拒绝，不能把它单独认定为056卡准备的根因或立即放宽域名。退出缓存g3 idle/s0、原生关闭/HTTP端口关闭通过。未改播放策略，间歇故障仍未闭环；保持本包新会话连续三次更换待验。
