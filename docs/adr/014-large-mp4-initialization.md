# ADR-014：大MP4索引的有界传输与准备

日期：2026-10-16。W01/F06/F20，内部0.0.53候选；真实P2起播待设备验收，不锁定产品运行时。

0.0.51/52同一Android官方App投送P2均prepare30秒超时，0.0.52保留moov_first、约10MiB累计读取、5个2MiB上游窗口、1活动客户端、无背压及原生关闭ACK。不能继续用“moov在文件尾”解释，也不能把P1通过当分P全部通过。

用户提供公开BV1PkM66LESq及9:38:08。HOST无账号Web view读取：3个分P，P1=2915秒、P2=34688秒、P3=13460秒；qn16/fnval0的P2单MP4为1487053789字节。512字节的有效206前缀解析出ftyp32字节、紧接moov43183732字节（约41.18MiB，向上取整42MiB）。未取得完整moov/解码参数；单次约43MB前缀读取25秒超时，只收到约12.2MiB，后续4并发/2MiB的有界HOST元数据尝试仍有分片失败，均不记完整解析成功。Web源不自动等同于官方手机源，必须让TV对下一次真实请求记录自身索引尺寸再核对。

这为“30秒尚未收齐大索引就被关闭”提供具体解释，尚不是全部解码问题的排除证明。现有bridge每50ms一次cURL收发轮，可能额外限制吞吐；修正需同时保留资源/调度界限，而不是扩大WASM堆或取消看门狗。

## 候选行为

- progressive桥每tick最多8轮；仅有真实读/写进展时继续，发出约1MiB后或轮间检查累计10ms即让出。单个SDK调用自身的阻塞性质仍需设备测量，不把轮间预算说成每个原生调用的硬实时保证。无进展只跑1轮；legacy DASH维持1轮。仍4客户端×64KiB缓冲、单上游窗口2MiB、原128MiB/256窗口/连接预算和5分钟/签名截止，不缓存整个moov。
- 原512字节源预检额外读已在前缀内的top-level moov size，验证总长/标准与扩展size；只输出1–128MiB向上取整或over128固定事实，未知不猜测。无新增媒体请求或原始字节/地址日志。
- 原生每实际接收4MiB报告一次累计桶，最多32条；Worker合同与父层配额同步，不能用它ACK关闭。此计数不是去重覆盖范围、解码或声画证明。
- 只有已知9–128MiB索引的cast初始prepare使用size×4秒+10秒、上限180秒的独立窗口；普通cast仍30秒、legacy仍15秒、seek仍30秒。20秒没有新的有效传输进度即失败关闭；时间戳异常/取进度抛错不能续命。持续进度不突破绝对上限。Back/Home取消清除两个拥有的timer，迟到成功回调不得播放。网络/签名/native租期仍可更早结束本轮。
- UI在准备时显示约索引大小和累计接收量，保留取消入口；不得以进度条宣称已解码。关闭时重发本轮固定布局/索引/最新累计桶，以免64条诊断环挤掉早期源事实；紧凑报告仍最多8条。

## 验证边界

HOST测试真实20Hz发送44MiB合成流并逐字节核对，另验证8轮、1MiB、10ms、idle不忙等与legacy单轮界限、原范围/重连/背压/取消/清理；不代表TV吞吐。新增夹具首次仍通告旧3MiB总长，正确触发502；改为声明实际44MiB。原16KiB SO_SNDBUF为背压用夹具，不能用来测正常持续吞吐；性能案例独用1MiB发送缓冲，旧背压用例仍16KiB。该调整只在HOST fixture，未写入TV代码。

单元覆盖大索引有进度跨30秒、20秒停滞、180秒绝对上限、无效size/时间戳、取消清timer；桌面实际Worker覆盖索引42MiB/已接收4MiB显示及Home后无晚播放。真实SDK重编译、原生桌面资源检查和包门禁另记。尚不承诺9小时完整播放、长片seek、该P2声画或完整F20。

来源：[公开样本](https://www.bilibili.com/video/BV1PkM66LESq/)、[公开只读view端点](https://api.bilibili.com/x/web-interface/view?bvid=BV1PkM66LESq)、[Samsung AVPlay](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)、[cURL multi_perform](https://curl.se/libcurl/c/curl_multi_perform.html)。公开Web API为当次行为观察，不是Bilibili承诺的稳定公开合同。无账号/CSRF/客户端密钥或版权媒体重新分发；原始响应/短暂签名URL/有界媒体前缀仅在仓库外私密诊断目录。


## 0.0.54：同一索引的重准备（2026-10-16）

0.0.53首次P2短暂起播USER PASS，约1秒后收到手机Seek，报告seek_restart_timeout_b0_t0/累计70MiB/native_closed_confirmed，未达到20秒稳定播放。精确目标未知，不能把用户猜测当片头/历史恢复策略证据；TV当前紧凑报告未保留init尺寸，Web42MiB与TV源仍非字节身份同一证明。

PREBUFFER_MODE重新open/prepare会再次初始化媒体。0.0.53只为operation=prepare启用索引窗口，operation=seek_restart仍30秒，实际错误吻合这一缺口。0.0.54把已知大索引的重准备也纳入同一有界规则；每次重新记录startedAt、只接受其后有效真实累计读进展、20秒停滞/size预算上限180秒、取消及晚回调隔离相同。直接原生seekTo仍30秒，未知/小索引重准备仍30秒；不扩大native租期、128MiB读取或签名截止，不自动重试。多次重读仍可能触发原资源界限，长片/重复Seek最终策略未由此证明。

UI明确显示重读与累计（非当前索引已完成量）。有seek历史时额外保留固定索引/桥流量事实，防止取证再次被手机轮询挤掉。新本地与TV分项证据见TEST_REPORT；修复实际效果仍待0.0.54设备验证。


2026-10-16再次核对Samsung官方AVPlay参考：PREBUFFER_MODE参数为毫秒起始位置，prepareAsync配合该模式的成功回调表示预缓冲完成；参考仍不承诺本机任意大MP4准备耗时。候选的178/180秒与20秒保护均为项目实验预算，不是Samsung保证值。[官方参考](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)。
