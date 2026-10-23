# ADR-025：G4实际倍速与恢复探针

日期：2026-10-17；状态：内部候选，真机未验证，不决定最终运行时。

F06要求倍速。主060与此前真实UGC/PGC证据保持不变；独立BiliNet001.Probe 017仅针对匿名公开BV14GHy6bE9n首P（95秒）的AVPlay/分离MPD路线，复用已验证的现代原生网络和受限游客桥，不附带账号、二维码、进度POST或投屏Worker。固定视频不可用时明确失败，不自动换片掩盖。源/签名/依赖/自动模式分别配对归档；只升级独立探针。

[Samsung AVPlay setSpeed](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)声明long整型倍率，范围取决于协议；通用HTTP(S)还注明Repeated seek。源码/API不证明本机MPD有效变速或2倍时有声音，也不证明1.25/1.5倍音高保持。此探针只调用1和2，不添加未声明的小数倍率或将HTTP文档外推到DASH。

平台适配器仅允许稳定PLAYING、VOD、无prepare/seek/buffering/held-prebuffer时调用；live/忙碌/缺API/NotSupportedError/其他异常分开，保留固定错误枚举，不暴露SDK原文。没有页面级SDK访问。实际oncurrentplaytime与performance.now比较，先舍弃1.2秒过渡，再取至少4样本/4秒墙钟；回退、倒退、非有限值、跳跃或墙钟异常不能判成功，接口接受亦不能判成功。每阶段最多14秒，总准备最多60秒，Back/Home随时失效回调并关闭SDK与原生桥。

单次自动顺序：1倍基线→请求2倍并观察实际倍率→恢复1倍并观察。缺API/不支持则保留不支持分类并观察默认1倍；2倍不符/无进展则尝试显式恢复1倍，恢复未确认按失败关闭，不伪称全功能通过。结果含阶段和有界倍率，声音需用户实际观察；正常倍率回退仅证明恢复路径，不代表已满足产品全部倍速要求。必要能力确有阻塞时才评估替代后端。

验证范围：实际倍率和假setter/停顿/跳变的纯测试，AVPlay状态与错误门禁，真实Worker/模拟SDK下的正常序列、不支持/忽略/停顿、Home/晚prepare/关闭未知；精确包完整性/来源/许可/签名。以上通过后只请求一次当前缺口的人工声画观察，不重复G1/G5/G6或直播。G3未知云写入标记不删除/不更名，017无任何新云写入；新G3业务写入另需具体授权。
