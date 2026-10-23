# 浏览与互动技术复核

2026-10-22；review后实施0.39.0。以下代码事实来自0.38.0配对源码；设备事实来自用户。与同行的对照采用公开一手工程原则，不声称实测当前YouTube/Netflix/Bilibili TV客户端。

| 发现 | 影响/证据 | 重构 |
| --- | --- | --- |
| ContinuousGrid只删除顶部行，未保留整体滚动范围；同时手工修正与浏览器锚定参与 | 用户观察内容跳动；代码可确定高度变化，但不是所有跳动唯一根因 | 前后虚拟空间、连续3批窗口和固定锚点；迟到预取不删中间批，加载提示不参与网格高度 |
| CoverArt全局队列16项后直接返回undefined；封面 eager、每批独立请求/no-store | 缺图不会因队列腾空自动恢复；与用户缺图一致，不能排除个别源/CORS错误 | 可见需求、共享去重、有限排队/重试、租约与有界空闲缓存，最后owner关闭释放 |
| publicArtwork丢弃合法resize后缀 | 可用列表却无封面引用 | 仅已知格式归一到受控原图，统一请求480×270；未知路径/查询/域名仍拒绝 |
| 全组互动读→全组写前检查→全组回读，Nav还重复取余额 | 常规22次往返；用户操作等待约5秒以上 | toolbar延后收藏夹/余额；每个操作只读本族，常规10次，未测真机p95 |
| 关注额外校验了非必需mid元数据 | 官方网页只使用attribute；用户仍invalid | 不让元数据改变目标，目标由固定请求/视频owner验证；原始TV响应未知，实际通过仍待验 |
| 控制栏重复返回/步长按钮 | 用户要求简化 | 暂停为默认焦点，进度条负责预览，Back负责退出 |

## 采用的一手原则

- [Samsung Web App Memory Optimization](https://developer.samsung.com/smarttv/develop/guides/web-app-memory-optimization-guide.html)：图片、DOM和Web内存分层；按显示需求控制资源。本项目保留原格式/尺寸校验，正常请求固定缩略图，不以JS heap替代解码/系统内存验收。
- [Android TV scrollable layouts](https://developer.android.com/training/tv/playback/compose/lists)：焦点驱动滚动，保持活动项可见/位置可预测。借鉴语义，继续采用DOM焦点和现有InputRouter。
- [Google web.dev virtualization](https://web.dev/articles/virtualize-long-lists-react-window)：限制可见窗口并复用资源。此处移植窗口/空间预算原则，不新增React依赖。
- [官方B站脚本](https://s1.hdslb.com/bfs/static/jinkela/video/video.f3c638cfcd3c13717cc5595a65e400dee88fb2f9.js)的resize模式和attribute消费沿用前次配对的静态源码。主机匿名GET已实际取得固定480×270请求HTTP200、image/webp、CORS `*`、11882字节；未带Cookie，不是电视/全CDN保证。

## 边界

局部位置稳定、24张排队/去重/取消、URI白名单与目标请求计数可由合成检查证明。网络源缺图、电视解码/长期内存、实际交互延迟与关注状态需设备证据。点赞API-403仍未解决，不把缓存或UI改进记为账号权限修复。范围和当前证据以[状态](../IMPLEMENTATION_STATUS.md)及[回执](../design/evidence/2026-10-22-stream/receipt.json)为准。
