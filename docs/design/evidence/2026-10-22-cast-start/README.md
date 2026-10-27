# 投屏起播定位候选

2026-10-22；0.41.0、F20/W06/U4。[复核](../../../research/2026-10-22-cast-startup-review.md) · [合同/容差边界](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/083-bounded-cast-initial-alignment.md) · [精确源码/包/平台回执](receipt.json)。

已排查正式包的自动回跳入口；修正首次近起点定位无条件暂停/重开解码器的路径。合并一次已对齐的0～1秒目标，保留真实时间；其余非零定位、后续回0、暂停、明确回放和换源代次照旧。产品诊断仅记录固定枚举，区别定位、合并与换源，不扩大旧W01位集。

291模块边界、672单元/合同、25合成UI（起播5、投屏所有权/故障7、恢复7、设置6）、6包负例通过。249输入/27输出与签名包配对；351旧冻结文件及17原生模块/68资源不变。平台state/capability/install/launch明确成功；首次能力连接关闭，原地址一次重连后成功，原尝试回执保留。没有卸载/清数据、代理真实账号POST或Git提交/发布。

**USER部分通过，首次投屏仍FAIL**：[验收](USER_ACCEPTANCE.md)。主动30秒/回0/停止及所请求iPhone检查通过；但Android和iPhone在应用重开后的首次投屏均约1秒回到0，同一进程后续投屏正常。用户读取诊断为autoplay_started → seek_nonzero → seek_completed → closed；还没有目标值/SDK调用证据。0.41.0近零合并未关闭此缺陷，不继续盲调容差，不重做已通过组。

继承[0.40.0账号更新A/B/C USER PASS](../2026-10-22-recovery/USER_ACCEPTANCE.md)及0.39.0所请求组/随后一次点赞成功；自然服务端失效、量化性能、其他发送端完整矩阵仍未外推。直播/真实双账号EXCLUDED、F14 PAUSED、旧云进度unknown不重发。
