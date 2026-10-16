# ADR-005：投屏探针参数兼容与 HTTPS 候选检查

日期：2026-10-15。状态：W01 内部候选实现；不固定产品接收协议或宣称 F20 通过。

## 证据与问题

0.0.24 官方 Android 操作后的匹配报告/固定摘要证明：SetAVTransportURI 包含额外标量参数、普通 metadata 超过原 2048 字符阈值、URI 为 HTTP；该窗口未见缺失/重复/属性/嵌套/外来 namespace 事实。摘要是租期累计，不保证三种差异都来自同一条报文或相同次数。本机已能解析外层 XML/动作和状态查询，拒绝点是探针的窄化参数合同。未知字段名称/值及地址/metadata 原文未收集，不据此推断 URL 域名/格式/期限或客户端合规性。

## 候选决定

仅内部 parseSoapProbeRequest 对精确 SetAVTransportURI 允许最多五个额外标量参数，忽略其内容；三个标准字段仍必需、唯一，InstanceID=0。拒绝属性、嵌套、外来 namespace 和重复字段；整条严格 UTF-8 XML 仍最多4096bytes。未使用的 metadata 丢弃为空，不提高请求预算，不将其作为脚本、身份、请求头或控制命令。一般 parseSoapRequest 与其他操作仍保持精确参数校验。这是项目对实际发送端的有界兼容选择，不声称 UPnP 标准允许任意额外参数，也不把额外字段当作已实现功能。

HTTP 原文不交给 cURL/播放器、不发 HTTP 请求。只将小写 http:// 替换为 https:// 建立同 authority/path/query 的候选，签名 query 字节保留；候选必须再次通过 HTTPS、真实 bilivideo.com 子域、无用户信息/非默认端口/fragment、/upgcxcode/*.mp4、唯一10位deadline且至少剩60秒/至多24小时等校验。原生还独立校验，不保证所有原始 HTTP 地址可升级，不做 HTTP 回退或跟随重定向。

每个用户开启的五分钟发现窗口最多一次 cURL multi 范围测试：固定 Range 0-511，最多512bytes正文/16KiB头、4秒连接/8秒传输及9秒防护期限、单easy/multi，不设置 cookie engine 或借用客户端身份/凭据，只发自有UA和固定公开 Bilibili Referer。固定CA、VERIFYPEER=1/VERIFYHOST=2、HTTPS-only协议与redirect限制，所有选项错误立即失败。成功须HTTP206、严格Content-Range、512bytes及ftyp标识；这只证明TLS/范围/容器头，不证明音视频轨、解码、权益或完整投屏。

cURL调用留在TV Worker；与发现loop共同推进，Back/Home/期满先清理easy/multi/global和缓冲，再给原生关闭ACK。remove/cleanup未知使cast_unconfirmed并禁止成功ACK/重用。native URL输入缓冲设置后擦除，响应缓冲完成/取消后擦除，无原始地址/头/正文跨IPC或入诊断。libcurl文档说明URL选项复制输入，SDK固定7.68.0与实际构建另外验证。

SOAP仍拒绝媒体设置/控制，返回NO_MEDIA_PRESENT真实探针状态；候选检查不是连接同意。后续真正接收必须经TV确认、CastSession与PlayerCoordinator，并有状态、媒体、断连与三端证明。没有放宽账号写入、CSP/WARP或引入外部服务；现有授权只用于内部游客探针。

候选未通过时也输出固定 source_policy 原因，不必先放宽目的地或发请求才能判断格式/期限。SOAP事实仍60类、v1双uint32顺序不变；新增14类候选策略和最多4类候选/原生结果进度，总去重上限86。诊断8项同时保留最新有效summary、候选策略、原生检查结果及最新故障；不含URL/字段原文。

## 验证与后续门槛

纯合同/匿名UI、HOST原生策略/回调/清理、Samsung SDK构建与本机发送端分别记录。HOST mock验证TLS选项和失败，不代替实际证书链/CDN可用性。0.0.25官方Android触发后已取得本机source_pass（TLS/206/512bytes/ftyp），实际解码与控制继续待验收；HD发现等F20要求继续开放。

依据：[AVTransport v1](https://upnp.org/specs/av/UPnP-av-AVTransport-v1-Service.pdf)、[curl_multi_perform](https://curl.se/libcurl/c/curl_multi_perform.html)、[URL生命周期](https://curl.se/libcurl/c/CURLOPT_URL.html)、[证书验证](https://curl.se/libcurl/c/CURLOPT_SSL_VERIFYPEER.html)。仅核查wire/API事实，未复制规范文本或第三方实现代码。

0.0.26候选URL短暂私有保留与电视确认媒体探针见[ADR-006](006-cast-approved-candidate-playback-probe.md)，替代本ADR中“source完成即擦除所有URL”的旧内部生命周期；原始地址仍不进入UI/诊断/存储。
