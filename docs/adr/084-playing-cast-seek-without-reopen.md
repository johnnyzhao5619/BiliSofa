# ADR-084：播放态非零投屏定位保留原生Seek

2026-10-22；F20/W06/U4/R11，0.42.0候选。替代0.41.0产品近零合并，不覆盖其冻结工件和失败。

## 证据

同一0.41.0签名包debug脚本hash与冻结app.js相同。用户只请求首投、观察后报告仍回退；规范化命令在真实播放1545ms时目标4000ms，距play约2167ms，state=playing、非busy、sender所有权。应用先pause，进入restartSeek/prepare_offset(4000)，其后有效SDK时间从16ms开始，再逐步推进。后续另收到两条0秒Seek，不能猜测它们的发送原因。数字/枚举派生摘要及精确工件见[本轮证据](../design/evidence/2026-10-22-cast-seek/observation-summary.json)，原始有界数字记录留保护目录；临时断点/对象已移除。

确定的应用缺口是把播放态Seek强制转换成暂停重建，并把准备回调成功当作足以恢复播放；本样本的预缓冲目标未实际生效。SDK为何忽略起点、手机为何选择4秒仍未知，不能把前者推广到所有内容。旧近零容差不覆盖此请求，不能靠扩大容差丢掉正常续播目标。

## 决定

- 0.42.0产品模式：PLAYING且目标>0的手机/遥控定位，在原PlayerCoordinator状态下直接串行player.seek。该cast后端未启用playing预缓冲重建，使用既有AVPlay seekTo；不先pause、不重开、不重复play，不丢弃初始非零定位。
- 已暂停、held prebuffer、明确回0等路径保留旧策略与暂停意图，不偷偷play/pause。0.41.0近零合并在本候选不启用，合法定位均正常分派。旧探针/冻结包保持原语义。
- 忙态缓存时长、原owner/operation/source代次、ACK仅代表接受分派、30秒操作期限、关闭/取消与晚回包拒绝保持。失败不在未完成Seek上自动重试或切换路径，关闭本次媒体。
- 回调成功、真实目标命中与声画分开。既有真实tick窗口映射为固定产品诊断seek_target_hit/seek_target_missed，不写入目标或位置、不扩大旧W01位集。
- 无新原生依赖、网络权限、URI批准/延租或账号写入；新阶段独立dist/product-cast-seek-app，0.28–0.41工件冻结。

## 平台依据与出口

Samsung [AVPlay API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html)允许PLAYING下seekTo，并要求异步期间等待完成回调再调用其他API；PREBUFFER_MODE完成仅表示预缓冲完成。[播放指南](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html)也提供播放态绝对定位。文档不证明该电视目标命中或声画；本候选必须实测，不假称SDK根因已解。

本地用真实Worker/SOAP/协调器＋SDK边界，先复现旧4秒请求成功回调却回0，再验证新路径一次open/play、真实4秒tick、后续非零/回0、暂停后定位、换源、失败和Home取消。部署后只补一次进程首投与受影响的非零定位、暂停和回0；不重复账号/整组长播。若仍回退，以实际命令与SDK时间判定，不能继续扩大容差。

后续0.42.0本机结果：不再重建，但在实际2080ms收到2000ms时无谓Seek，随后SDK到5150ms；用户报告向前跳转，约64秒主动停止。该组未做后续控制，不记通过。0.43.0按[ADR-085](085-canonical-cast-position-idempotence.md)补协议整数秒幂等，不扩大起播容差，旧工件/失败保持。
