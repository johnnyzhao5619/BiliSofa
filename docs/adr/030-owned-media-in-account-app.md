# ADR-030：账号应用中的匿名媒体所有权

日期：2026-10-17。状态：W02实现决定，F02/F06/F12/F13；不关闭W04/W06或新应用真机验收。

## 问题

ADR-029账号包只有身份与导航。W01播放器和媒体桥分别提供解码器状态与原生关闭证据；单独调用PlayerCoordinator.close、Worker.terminate或解除模态页都不足以批准下一个媒体源。直接复制探针主页面还会引入第二个焦点/生命周期负责人，并把临时租期误当作完整产品能力。

## 决定

1. `packages/media/src/session.ts`提供一次性MediaSession。MediaTransport只提供run与实际close；OwnedPlayerBackend在原PlayerBackend上增加closureConfirmed。单次ready绑定一个来源，第二次ready是协议失败，不隐式换源。另一个会话仍占用解码器时拒绝open。
2. 关闭结果独立记录decoderClosed与transportClosed，两者同时确认才closed。先失效会话和停止解码器，再发原生stop，等待实际ACK；共享一次关闭Promise，有界等待后未知不可被迟到ACK改善。页面资源owner/TvShell接收该结果，未知阻止继续复用。准备/seek/完成回调不能复活已关闭播放器。
3. 账号应用新增游客热门四卡、最多十页，以及匿名360P首P播放模态。PopularWorker与GuestPlayback各自使用guest Scope；完整账号cookie从不进入这些接口。播放页仅通过MediaSession执行暂停/继续与跳5秒，进度只取后端事件。Back/完成回原卡，Home取消并在前台重开后等待重新选择。
4. 复用W01现有匿名guest桥与已核验现代静态WASM，不改原生C/CA/CDN政策/重试/预算。仍有15分钟媒体租期、GuestBridgeWorker约17.5分钟绝对上限和12秒关闭ACK限；这只是内部整合包的边界，产品长播/任意分P/权益画质仍需实现。C stdio回调中的读取WASM导出改为下一任务执行，避免原生栈未退出时重入。
5. 应用ID仍BiliSofa01.TV、包BiliSofa01，内部版本0.2.0。仅internet权限，WARP/connect-src/media-src增加固定loopback40324，加载本机Samsung API脚本及AVPlay object；不开放远程脚本或浏览器媒体互联网。身份与匿名媒体分别使用identity/和native/路径，并共同校验静态依赖/许可证/CA/来源。打包命令不签名或侧载。

## 范围与恢复

正常Back在确认关闭后恢复原卡真实DOM焦点/滚动。准备/播放/Worker失败时关闭同一owner；关闭已确认允许用户重新选择，未确认显示需重开应用。Home不保留活动媒体或自动续播。TvShell资源等待15秒、账号组合等待16秒，覆盖媒体12秒ACK与13秒外层预算，仍为有界关闭。屏保调用沿用适配器，但本次双关闭结果不等同于屏保API回调成功或真实电视屏保恢复证明。

本批没有投屏入口。后续CastSession应复用相同的双关闭屏障，同时独立实现旧解码器关闭→旧原生桥关闭→新源验证→新token/代次；不能把单源MediaSession第二次ready当成切P。不得把W01四源/五分钟接收器租期直接宣称为产品会话能力。

## 验证

见[本批交付](../W02_MEDIA_APP.md)。单元与真实JS Worker浏览器夹具证明本地状态/取消/解析/焦点合同；C、KeyManager、AVPlay在浏览器中均是明确合成边界。新WGT尚未签名/安装/实播。旧060/018及其用户/设备结果保持原配对，不转记给本包。
