# 投屏起播回退复核

2026-10-22；F20/W06/U4/R11。0.40.0账号更新组通过；0.41.0主动定位/停止通过，但应用进程首次投屏Android/iPhone仍回退，同进程后续正常。

| 层次 | 当前证据 |
| --- | --- |
| 发布输入 | 正式包没有自动三次回跳入口；CastWorkspace/cast-entry无定时Seek。旧APK静态恢复分支只作研究，不代表当前手机实际命令 |
| 实际同包取证 | 电视0.41.0 app.js与冻结脚本hash一致；实际1545ms、playing/非busy/sender时收到目标4000ms，距play2167ms |
| 应用与SDK | 强制pause后进入restartSeek/prepare_offset(4000)；重新播放的有效SDK时间从16ms推进，目标未生效；旧epoch的2046ms被正确忽略 |
| 其他命令 | 后续又收到两条0秒Seek，原因未知，不能凭顺序推断手机意图 |
| 第二条实际证据 | 0.42.0实际2080ms收到2000ms；未重建但原生Seek后SDK到5150ms。用户看到约1→4秒，约64秒本人主动关停；两种时间精度均保留，主动控制组未测 |
| 当前修正候选 | 0.43.0保留播放态原生路径，当前SOAP同一新鲜对外整数秒直接幂等完成；其他目标/暂停/旧缓存不合并。不扩大起播容差，不伪造tick |
| 证据边界 | 该样本的起点丢失已证，SDK为何忽略预缓冲起点、手机为何选4秒仍未知。0.43新包实际效果待USER，合成成功不代替TV声画 |

[派生数字证据及原包配对](../design/evidence/2026-10-22-cast-seek/observation-summary.json) · [ADR-084](../adr/084-playing-cast-seek-without-reopen.md) · [0.43回执](../design/evidence/2026-10-22-cast-clock/receipt.json) · [协议幂等决策](../adr/085-canonical-cast-position-idempotence.md)。0.41.0原有有限容差/失败见ADR-083，不重写旧工件或扩大旧通过。

## 取证方式与边界

按Samsung [Web Inspector](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/web-inspector.html)及[官方启动源码](https://github.com/Samsung/webIDE-common-tizentv/blob/dev/lib/appLauncher.js)、本地TV SDK启动命令核对。旧运行进程debug未取得端口；仅结束本应用后，同一签名包debug成功。先校验app.js逐字节hash，再用不暂停执行的条件断点观察规范化时间/状态和SDK事件。

临时观察不读取URL、原始SOAP、账号或网络内容，不在观察中调用SDK；有界数字记录只留开发机保护目录，公开仅派生摘要和hash。0.41观察结束已移除断点/临时对象。0.42独立签名升级后重新启动并核对脚本配对；调试连接不作为最终无电脑运行证明。未新增SDK/客户端身份/原生依赖或代理真实账号POST。
