# F10/F15当前官方读取证据

核查：2026-10-20；本页仅记录主机公开源/API证据，不代表电视运行。原始文件/hash由仓库外`w05-comments-primary-latest.json`定位，不进入源码包。

| 直接来源 | 用途 | SHA-256 |
| --- | --- | --- |
| [官方视频入口脚本](https://s1.hdslb.com/bfs/static/jinkela/video/video.f3c638cfcd3c13717cc5595a65e400dee88fb2f9.js) | 入口明确加载官方评论组件 | `090cd2bd27906e2df872155014217f226a8801d03a35ec8393eaa1bf6e9788f9` |
| [官方评论组件](https://s1.hdslb.com/bfs/seed/jinkela/commentpc/bili-comments.js) | WBI根列表、offset游标、楼中楼root/pn/ps；mode与关闭状态分支 | `7a18334ea3d7d5e974cea488e9e05eaa909367303901330bbfaf870045e2fa30` |

未使用搜索得到的第三方逆向文档作为技术事实来源；未复制官方业务脚本或内嵌签名材料。生产实现使用自己的有界解析和当前nav材料。

匿名普通视频真实请求：热门/最新各HTTP响应成功、API0；自己的解析各21条（置顶与主列表去重），回复8条；另一次热门游标续页API0、20条且未结束。原文/游标/用户正文保持私密，不公开源URL query或正文。代码另通过TLS/目的地/签名/账户jar/取消/关闭等HOST检查，范围见[测试报告](../TEST_REPORT.md)。本轮无真实账号POST或电视实读证据。
