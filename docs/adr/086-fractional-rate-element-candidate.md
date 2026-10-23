# ADR-086：小数倍速后端候选与启用门槛

2026-10-22；F06/R07/U5。状态：**候选实现，尚未接入生产**。0.43.0及其已验收的AVPlay/投屏工件保持冻结。本决定允许实现和评估候选，不表示已完成小数倍速功能。

## 依据与选择

重新核查[Samsung AVPlay API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)：`setSpeed(long)`和枚举档位不能证明小数倍速。[Samsung video元素指南](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-video-elements.html)列有`playbackRate`及0.5×示例；它没有证明本项目的双轨SegmentBase DASH、4K和当前电视的实际效果。既有[电视属性级前置证据](../design/evidence/2026-10-22-cast-clock/FRACTIONAL_RATE_FEASIBILITY.md)只证明API存在。

新增独立`ElementVideoBackend`候选，使用同一播放器协议的prepare/play/pause/seek/close及真实事件；额外接受固定0.25–2档位。既有`VodRate`/AVPlay/生产菜单仍只启用1、2，不将整数SDK参数截断当成小数支持。不先引入第三方播放器或更改Worker、TLS、CSP/native HTTP。

## 生命周期与安全合同

- 默认只接收当前VOD桥的固定loopback端口、32位十六进制租约与`manifest.mpd`路径；拒绝直播、其他主机、端口、路径、查询。URL不进入业务DTO或日志。
- host必须提供跨所有后端共享的排他解码器claim；没有claim时不创建/加载元素。生产接入前必须将AVPlay也纳入同一所有权，不能把候选自身锁误当跨后端互斥。
- 元素不提供controls、焦点或键盘监听。视图层负责可见布局，唯一TvShell继续管理遥控和返回。prepare/seek有有限期限、按epoch取消；旧play Promise、旧元素及晚到事件不能更新新源。
- seek等待真实seeked并核对实际位置；保持暂停，不用目标时间伪造tick。倍速赋值及精确读回只表示命令接受，另以真实媒体时间/单调时钟检验效果；失败还原旧值，还原失败为unknown并停播。
- close先取消旧工作、暂停、移除src/load，再确认无src属性、NETWORK_EMPTY、HAVE_NOTHING与paused后释放元素/claim。currentSrc可保留历史URL，此时还必须收到本次owned emptied事件，不将历史字符串当活跃资源，也不只靠移除属性释放。异步空事件可完成关闭；异常或未空不释放，不允许另一解码器覆盖。DOM媒体清空仍须电视证明，不冒充原生关闭证据。

## 分层验证与下一步

1. 单元验证来源限制、排他claim、取消/旧回调、暂停定位、落点、倍速钳制/还原及未知关闭。
2. 本地浏览器使用原始合成MP4检查真实解码、八档时间斜率、暂停/定位和实际DOM释放。该台架将固定`a/manifest.mpd`路由的Content-Type设为`video/mp4`，有意隔离媒体容器差异；绝不能据此称DASH或电视通过。`b/manifest.mpd`另用真实合成DASH分类原生支持，失败不隐瞒、不伪造成功。
3. 精确电视上检验生产SegmentBase MPD/音轨及实际倍速；若原生video不支持，再基于具体失败设计MSE/CORS/有界分段方案，不能因为MediaSource符号存在直接选型。
4. 生产接入须实现异步后端切换结果，保存真实位置/暂停状态、等待旧解码器实际关闭、保留transport租约并保证Home/取消清理。不得将“开始切换”返回为倍速已生效，也不得无提示降低既有4K/轨道能力。

全部实际门槛满足后才扩展生产倍速合同/菜单，并集中验收一组倍速、定位、叠加与生命周期。此时R07保持OPEN；F11与既有投屏通过不重测，不依赖常开开发电脑。
