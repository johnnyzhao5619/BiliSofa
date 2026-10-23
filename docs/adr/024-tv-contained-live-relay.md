# ADR-024：W01/G4电视内受限HLS中转候选

日期2026-10-17；候选，未声明修复或W01完成。F18播放能力与后续F20可投直播保持必需。

014用户已明确纠正为直播中途自行停止/返回；匹配SDK错误PLAYER_ERROR_CONNECTION_FAILED。基本起播声画有观察，持续约30秒及主动Back停声本轮不通过。HOST新取得的同一地址40秒八次清单/TS前缀刷新正常，不能证明电视端失败根因。原始工件/失败留存，停止重复相同直接SDK操作。

015/BiliNet001.Probe采用电视内Worker/cURL中转：固定公开room6匿名入口和AVC/TS单层清单选择不变，AVPlay只收到127.0.0.1:40325的随机128-bit token/index.m3u8。SDK媒体依赖不再直接访问互联网。原生只在loopback监听，不接受HTTP参数指定上游地址；接口只认GET/HEAD与固定index/不透明segment ID，严格单Range，其余路径/未知ID拒绝。

每次SDK请求清单都重新通过原生HTTPS读取并解析，校验全部分片目的地，将媒体行重写为相对sN.ts；未知标签、master、KEY、MAP、外部/非HTTPS目标继续拒绝。URL映射仅Worker内，保留最近3代清单、最多72项，id≤1024；无上游地址、签名参数或凭据交给UI/SDK/HTTP客户端。SDK仅访问已重写的本地清单/分片，因此后续目的地与redirect由同一传输策略执行，而非声称SDK实现等于curl。

原生保持链/主机名TLS校验、固定CA、不跟redirect、不设Cookie引擎或账号header/代理；不伪装官方设备/客户端。API128KiB、清单32KiB、分片4MiB、请求头4KiB；单上游9秒、HTTP头2秒/等待上游15秒/发送5秒，128请求、64MiB总读取、原生100秒租期、页面仍最多90秒含准备。完整TS分片验证同步字节/188倍数后发送，不转发上游响应头或cookies。每连接关闭，不持有磁盘媒体缓存。限制仅内部可行性探针预算，不是完整直播产品时长/性能指标。

HTTP服务器和curl均合作式非阻塞运行、无C printf重入。取消先失效播放器回调并关闭SDK，再等待Worker关闭listener/client/easy/multi、清空URL/媒体缓冲后的ACK；未知关闭阻止继续。保留实际错误、退出原因和起播后的有限墙钟秒数，墙钟/流字段均不代替真实声画。增加有界已服务清单/分片数，失败报告保留HTTP状态/cURL阶段，不包含原始请求/响应。

验证：纯重写/IPC边界，HOST真实TLS与loopback manifest/TS/Range/HEAD/拒绝任意路径/redirect/超限/活动读取取消，浏览器真实Worker状态与SDK模拟，实际Samsung链接/包门禁。上述通过后仅请求一次同room约30秒声画及Back停止；未通过的电视功能仍OPEN，不因中转架构准备好而标通过。主060投屏应用和G5证据不改变；不重新扫码，不写云进度，不引入外部网关或新系统组件。

依据：[RFC8216](https://www.rfc-editor.org/rfc/rfc8216)的媒体URI解析与直播清单刷新、[Samsung流规范](https://developer.samsung.com/smarttv/develop/specifications/general-specifications.html)与[AVPlay](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)。支持格式、配额、token/资源所有权是本项目候选设计，不是三星保证。


016修订：015实际prepareInvalidAccessError、m0s0，未起播；本地发现HTTP清单Range/零长度被拒及connect-src缺项，修正后以接入/解析/拒绝和方法/Range/零长度位集/末HTTP状态做脱敏计数。HEAD即使带Range仍返回完整内容长度200/无正文；未知/非零/重复长度和TE继续拒绝。平台同源本地fetch仅opaque完成，不当作HTTP成功证明。新增启动报告后一次自动探针，起播后30秒观察/关闭自动取证，不循环/自动重试，不因探针新版本让用户原样复测；真实根因与断流修复仍待设备证据。


016设备结果：实际自动起播→30秒→自动清理报告匹配（a30/q30/r0/f5/h200、m18/s11、无FAIL、诊断关闭true），真实声画待用户观察。组合修订后路径走通不等于已证明015某一条修改为唯一根因；014断流/015准备失败分别保留。原生摘要没有逐资源Range分配，不能把Range位指定为清单或分片。

用户后续明确同版实际观察约20秒声画正常同步；此前30秒自动传输/清理报告保留为独立设备证据。最新报告未收到，不补记。G4此固定直播可行性通过，完整直播稳定性/F20直播不由此推定。
