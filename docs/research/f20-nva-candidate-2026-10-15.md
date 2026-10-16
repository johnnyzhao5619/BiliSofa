# F20 NVA 接收路线候选核查

2026-10-15，W01/W06；SOURCE研究及独立候选实现；未取得本电视官方发送端证据。

一手实现来源为作者维护的[Macast-plugins](https://github.com/xfangfang/Macast-plugins)，固定文件commit `e4a18457aa7addd3a46041420d277343b66647ee`（2024-07-13）。[NVA源码](https://github.com/xfangfang/Macast-plugins/blob/e4a18457aa7addd3a46041420d277343b66647ee/nirvana/nirvana.py)自报0.33；SHA-256 `8a8678f2894aca5be4ad01f20e19bcb8b6e27f4f8bc4303a0e8eb0d7fb62b3b3`。这是一手“该作者如何实现”的证据，不是Bilibili官方协议规范或2026兼容保证。

实现包含HTTP服务描述、NVA会话、二进制命令及状态回传，并含其他客户端身份材料。仅做候选分析；未复制源码、keys、签名、官方包名/身份或日志进入BiliSofa。根[MIT许可证](https://github.com/xfangfang/Macast-plugins/blob/e4a18457aa7addd3a46041420d277343b66647ee/LICENSE)的固定SHA-256为 `30f9028ae3c850bfb373c4d3a071fae6126cc973bee988c98c8f6dd20f01a54b`；源中另有第三方组成来源，实际复用前仍逐段审计/保留通知，不因根MIT视为所有组成许可已核完。原文件仅在仓库外研究缓存。

[Bilibili官方帮助](https://www.bilibili.com/blackboard/activity-U_aG4BWWl.html)仍只支持使用条件核查；[开放平台文档](https://open.bilibili.com/doc)本轮网页工具读取无正文，不能据此断言不存在SDK/授权路线。其他电视项目对Web widget“不能监听”的笼统说法与本仓库已取得的Worker原生监听证据不一致，不采用为平台事实。

下一实施顺序：先建设独立、有界、可逐字节拆包的候选协议解析和匿名边界测试；再做显式启动/取消、使用BiliSofa自身身份、固定描述路由的前台发现探针，收到请求仅记录固定类型/计数。官方身份/凭据要求若无法从合法自身身份满足，记录实际拒绝及剩余路线；不借用身份消除阻塞。客户端信息、账号、源URL和headers不进诊断；不执行网络触发账号写入，不照搬无界缓存/日志/线程。

Android/iPhone/iPad官方App的发现/连接/普通视频/分P/PGC/可投直播/控制/状态/恢复分别待真机证明；通用DLNA或源码存在仍不关闭F20。当前没有接收包，不要求用户盲测投屏或另装第三方发送端。


实施更新：已用原始wire事实独立实现有界NVA解析和匿名vector测试；未拷贝作者代码/身份/密钥，尚未与监听/播放器接通。0.0.20新建自身身份的发现/只读格式查询探针，拒绝连接SETUP及实际媒体控制。精确预算与证据界限见[F20记录](../F20_PROTOCOL_EVIDENCE.md)。历史“没有接收包”描述属于此前研究阶段；当前构建/签名/安装各自另记，不由源码存在提前判通过。
