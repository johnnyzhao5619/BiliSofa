# ADR-007：渐进式 MP4 的完整 HTTP 响应与有界上游读取

日期：2026-10-15。状态：W01内部0.0.29候选；依赖ADR-004/005/006，不固定最终产品网络栈。

## 证据与范围

0.0.27用户确认进入播放器但没有声画；精确build报告证明TV确认/Worker接纳/桥ready后AVPlay prepare_failed（旧catch亦覆盖同步play，不能独立区分阶段）。原报告没有实际HTTP请求类型、SDK错误枚举或媒体轨道，根因仍未定位。源码和HOST可复现的窄化行为是：progressive模式拒绝无Range GET/后缀Range，开放范围只答首2MiB。修复这些兼容缺口不能提前宣称电视实际用了这些请求或已经恢复播放。

## 实现决定

仅已通过源检查、TV确认的cast.mp4模式变更；legacy DASH桥保留现有已测路径。source的正确206/0-511范围验证同时保存整数total（512至1TiB）；URL和total只在native临时保留/移交/擦除，不进入UI、日志或普通存储。未新增目的地、权限、CSP/WARP、headers凭据、重定向或HTTP CDN回退。

本地HEAD使用已核查total返回200/Content-Length/Accept-Ranges，无正文，按HTTP语义忽略HEAD的Range，不依赖CDN是否实现HEAD。无Range GET返回200和完整representation长度；单个开放/关闭/后缀Range返回206及准确选中区间，超出文件尾裁到末尾，后缀大于文件时选全文件。拒绝零后缀、多范围、越界起点/逆序/超宽整数，416带bytes */total。GET/HEAD仅允许一个规范Content-Length:0，不接受请求正文、Transfer-Encoding或目标URL参数，仍精确随机token路径。

下游响应描述完整选中区间，但每个上游cURL仍最多2MiB。上一窗口已经完整验证并送出缓冲后才开下一段；每段必须HTTPS/TLS、206、起点/末点/total均相符、长度正确且无内容压缩。只发送一次下游响应头，顺序拼接到选中区间末尾；中段失败关闭连接，不伪造第二个成功头或发送错误页。原生只留4×64KiB背压缓冲，不将整段MP4放入内存或磁盘。

新增probe聚合上限128MiB实际复制的媒体字节、256次upstream窗口；原512客户端连接、4KiB请求、16KiB上游头、4秒connect/15秒每段transfer、32MiB固定WASM堆保持。progressive客户端20秒改为无本地发送进展的闲置上限，正常发送刷新；整个lease仍min(180秒,签名期限减5秒)，无自动续期。暂停或网络慢可能耗尽这些内部预算；这不是完整F06/F20长期播放承诺或功能删减。

source检查结束才启用TV确认，source/bridge cURL global不重叠。cancel/预算/期满停止easy/multi/clients/listener并擦除URL/total/缓冲，未知close/remove禁止成功cast ACK。没有扩大为任意代理或自动账号写入。

## 诊断与验收边界

native最多输出五种固定请求事实get_full/get_open/get_range/get_suffix/head，不记录URL、path、完整headers或query。Worker去重总预算99（94+5），SOAP60位顺序不变。UI形成5位固定media_requests_v1摘要；仅cast worker允许取消期间排队的已验证事实进入旧lease的私有Set，scope失效后不能改UI/启动播放器，清理完成后再汇总，避免快速prepare失败丢失请求类型。其他Worker关闭进度规则不变。

8项报告优先保留SOAP/source/两阶段确认/播放器失败/请求摘要与最新故障；已有source_pass且有请求摘要时不固定占位supported policy，因为source_pass已经经过策略检查。source失败/无媒体请求时仍保留策略原因。修正零剩余槽位时slice(-0)扩大报告的问题。

AVPlay适配器只分类官方固定PLAYER_ERROR枚举、允许的异常name、固定setup阶段和timeout；任何message、未知值或地址都变为unclassified，不入诊断，晚错误不能覆盖新epoch。prepare/play阶段单独记录失败，准备完成/served不是声画PASS。

一手依据：[RFC9110 Range](https://www.rfc-editor.org/rfc/rfc9110.html#name-range)、[206响应](https://www.rfc-editor.org/rfc/rfc9110.html#name-206-partial-content)、[Samsung AVPlay](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)（2026-10-15复核）。仅使用HTTP/API事实和枚举名，未复制实现。

需要HOST逐字节拼接/背压/范围矩阵/预算/取消、Worker与UI错误/关闭竞态、SDK重编译与真机新包声画。真实请求类型/实际解码/官方手机控制/HD发现/完整F20继续待验收。

## 0.0.29 背压与控制恢复修正

0.0.28用户确认实际声画正常；首次暂停/继续退出、第二次正常，首次跳5秒成功，进度超过5秒后再次回跳卡住并回发现页。精确部署源码e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60的报告含cast.media_issue_206_28、cast.source_pass、cast.avplay_started_visual_audio_check_required、cast.media_requests_v1_02和native_closed_confirmed。请求摘要02证明开放Range，不证明所有运行只使用该类型；8项摘要不能还原首次暂停的独立失败。90秒未明确反馈，仍UNVERIFIED。

cURL28是超时；源码中的15秒总transfer时间包括CURL_WRITEFUNC_PAUSE背压。因此渐进MP4改为4秒连接超时、15秒未背压的上游无数据超时；每次收到有效头/正文刷新，背压期间不计，恢复时重置。流式客户端在整个有界lease内可等待读取，不再因20秒未send被丢弃。未完成请求头和legacy DASH路径仍保留原20秒客户端/15秒总transfer限制。整个3分钟/签名期限、4连接×64KiB、128MiB/256窗口/512连接预算不变，TLS/源/长度校验不变；HTTP/1.1避免HTTP2复用暂停导致额外大缓存。没有吞掉网络错误或自动重试未知媒体。

seek已提交即标为seeking，包括排队期间；play/pause在seek callback结束前不调用backend，UI重复seek不叠加，显示“跳转中，请稍候”。保持实际时间事件、关闭/代次隔离；Back/Home仍允许取消并清理。没有证据证明同步pause状态检查为根因，本轮不盲目移除该检查。首次暂停退出原因仍待回归确认。

依据：[cURL timeout](https://curl.se/libcurl/c/CURLOPT_TIMEOUT_MS.html)、[pause](https://curl.se/libcurl/c/curl_easy_pause.html)及[curl7.68.0 speedcheck源码](https://github.com/curl/curl/blob/curl-7_68_0/lib/speedcheck.c)、[Samsung seek/pause限制](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)（2026-10-15复核）。本项目自管无数据期限，不依赖新版libcurl低速暂停语义。官方SOAP控制仍拒绝，TV手动播放候选不能验收完整F20。
