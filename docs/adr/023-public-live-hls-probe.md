# ADR-023：W01/G4固定公开直播HLS探针

日期：2026-10-17。状态：限定候选，尚无目标电视直播声画证据，不锁定最终运行时。

F18真实直播仍是G4缺口。电脑端匿名访问官方公开room6接口，返回live_status1、非锁定/隐藏/加密的AVC/HLS TS；清单HTTP200、1352字节，两条媒体URI；首分片有界Range0–511为HTTP206/video/mp2t及TS同步字节。所测清单/分片均不需要Referer。上述仅HOST来源证据；动态地址不进入源码、日志或工件。

独立BiliNet001.Probe 0.0.14包含新live C/WASM Worker和原有脱敏报告器，不含账号/QR/进度写入/投屏Worker。已确认删除真实凭据的013原件保留；防重复写入标记不改。主060接收器仍保持已安装原包。

新增合同只接受guest scope、固定operation和有限关闭结果。原生仅GET固定官方公开room6入口，或通过双层验证的HTTPS bilivideo.com/.cn子域m3u8/ts；无Cookie引擎、账号、POST、代理、redirect、身份伪装，校验TLS链/主机名。API128KiB、清单32KiB、媒体512字节、头8KiB、单请求9秒/会话40秒；取消后释放curl multi/easy并清空响应/URL，ACK后才允许使用预检结果。

纯解析只接受AVC/TS单层直播清单：有限条目/时长、media sequence/target duration，逐条校验媒体URI；拒绝master、加密、MAP、未知URI属性/标签和点播ENDLIST。不代表最终产品只支持此格式，其他格式留F18正式实现。跨域地址只在Worker与平台适配器的私密消息/闭包中短暂存在，不交UI或诊断。

预检成功后AVPlay直接读取该HTTPS HLS，SDK执行后续清单刷新/分片请求。本候选没有SDK内部逐请求redirect、后续清单依赖或TLS实现的可观察证明；不能把curl预检策略宣称为SDK内部同等强制策略。WARP/CSP仅新增bilivideo.com/.cn媒体子域，与原生限制分层。此路径限固定公开无凭据样本的可行性检查；生产采纳前必须解决后续依赖/redirect控制或明确平台保障，必要时改成电视内清单/分片代理，不引入外部常驻网关。

仅必要设备用例：点一次播放，核对约30秒真实声画/持续刷新，再Back停止及脱敏关闭记录；90秒探针上限、Home/pagehide立即停止，禁止把时间回调或格式标签当声画通过。不测直播投屏、搜索、评论/弹幕编辑或长时间耐久；不重复G1/G2/账号流程。失败先读固定层级代码，本地定位后才请求受影响单次复测。

来源：[Bilibili公开直播接口](https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo)、[Samsung AVPlay](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)、[RFC8216](https://www.rfc-editor.org/rfc/rfc8216)。来源不等于UN58U8200FFXZC验收。


2026-10-17设备补充：014用户确认基本直播声画与Back停声；匹配报告的SDK起播/关闭及HTTP监听清理有证据，同时记录PLAYER_ERROR_CONNECTION_FAILED。未保留事件墙钟/退出原因，故不把该错误解释为正常Back，不把30秒持续性/稳定性/F20直播关闭。仅向用户请求无需重测的时序核对；HOST同一新HLS地址40秒8次刷新均可用不能代表TV。源码已本地修正失败结果不被清理PASS覆盖并补有限退出原因/墙钟；四项浏览器与strict通过，未部署，不为此诊断更改另开人工测试。014原工件及失败原报告保留。
