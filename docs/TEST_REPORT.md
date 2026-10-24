# 当前测试报告

2026-10-23；只保留已安装包与未部署候选的结果。历史版本的分层结果在各自证据README，逐版本结论见[签名与部署记录](SIGNING_DEVICE_RECORD.md)。

## 已安装0.51.3（ADR-106）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 737/737 |
| 原生主机 | catalog-visitor 20/20；catalog、catalog-up、catalog-ua、public-read、vod-api、pgc-read、source-failover均通过 |
| 合成UI | 新5条通过（前4条对冻结0.51.2失败，第5条为回归保护；Worker不传访客标识的变异使第1–3条失败）；回归102条全部通过 |
| 包 | 负例11/11；未签名WGT `830f9708…e8e6`；原生仅`catalog/`重链接（`build/catalog-visitor`），权限不变 |
| 签名/部署 | 签名`19ac5ad3…3c5f`（证书预检PASS，权限不变）；本机`/tmp/sdb.log`归root所有、SDB无法写日志，后台服务启动后随即退出（推断与此有关），改为前台运行SDB服务后连接；升级安装/启动platformSuccess（一次，不清数据）；源码归档`aaddfb3d…759a`；[回执](design/evidence/2026-10-23-up-fix3/receipt.json) |
| 用户 | **游客V1g、清除访客标识、登录状态回归 USER PASS** |

[证据](design/evidence/2026-10-23-up-fix3/README.md)；0.51.2的结果见[其证据](design/evidence/2026-10-23-up-fix2/README.md)。

## R07小数倍速候选（按ADR-097不接入生产）

本机两轮倍速探查（0.48.0/0.49.0）：0.5×/0.75×通过；0.25×停住；1.25×/1.5×/2×在无等待、缓冲充足时为1.09/1.17/0.85。生产保持1×/2×，[ADR-097](adr/097-fractional-rates-device-limited.md)。以下为原候选的桌面分层结果。

| 层次 | 实际结果 |
| --- | --- |
| strict/边界 | 当前293模块通过 |
| 全量单元/合同 | DOM关闭修正前687通过；不能当成修正后全部源码的最新全量门禁 |
| 修改后针对性 | element-video、rate-observation、vod-rate共20项通过；当前全量未重跑，不写688全量PASS |
| 桌面真实MP4 | 0.25/0.5/0.75/1×实际时间斜率、解码帧、暂停定位/DOM释放通过；1.25×比例125但窗口不足，退出1；后三档及真实DASH未执行 |
| 原失败/修正 | currentSrc历史值导致关闭未确认；保留失败，修正为本次emptied事件加真实空状态后才释放，异常仍持锁；相关回归/前四档关闭通过 |
| 未证明 | 人工声音、电视、生产SegmentBase双轨DASH、4K/HDR、跨后端互斥/切换、生产菜单；台架固定MPD路由实际为muxed MP4，不能称DASH通过 |
| 发布状态 | 没有新WGT/签名/安装；0.43.0不含此适配器 |
