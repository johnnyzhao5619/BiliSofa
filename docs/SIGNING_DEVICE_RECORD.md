# 签名与部署记录

2026-10-22；用户最新要求先不部署；以下为既有开发侧载记录，非Samsung认证/公开发布。应用ID `BiliSofa01.TV`、自有BiliSofa profile及Author保持。

| 工件 | 当前结论 |
| --- | --- |
| 0.47.1第三批真机反馈修正 | **已签名并升级安装/启动（平台确认，不清数据）**；签名`b9786074…5284`（证书预检PASS，权限与0.47.0相同）；首次SDB能力确认超时、重连未连上；用户确认电视开机并处于开发者模式后，重启本机SDB服务再连接，**第二次升级安装/启动platformSuccess（不清数据）**；源码归档`345e5979…dda1`；设备复验待用户S1/S3/S5；仅前端（app.js/style.css/config.xml/build.json变化，原生/许可78个文件与0.47.0一致）；未签名WGT `1fa9162e3c60ae008c55154f7c3c623f8c389212a9b600f9ce8d7dc8e1eaa5d6`；[验证](design/evidence/2026-10-23-reading-fix/README.md) |
| 0.47.0第三批 | **已签名并升级安装/启动（平台确认，一次成功，不清数据）**；ADR-092/093；用户S2/S4/S6 USER PASS；S5连播记忆PASS但⚙“循环”上移FAIL；S1、S3 FAIL；[hash/源码/验证](design/evidence/2026-10-23-reading/README.md) |
| 0.46.0第二批2A | **已签名并升级安装/启动（平台确认，不清数据）**；首次SDB未连上，同目标重连后第二次成功；ADR-090/091；所请求P1–P7 USER PASS；[hash/源码/验证](design/evidence/2026-10-23-polish/README.md) |
| 0.45.0第一批遥控快改 | **已签名并升级安装/启动（平台确认，一次成功，不清数据）**；ADR-088；新增tv.inputdevice权限；本地696单元/13合成UI/8包负例通过；所请求R1–R6 USER PASS（R7按ADR-089移除）；[hash/源码/验证](design/evidence/2026-10-23-remote/README.md) |
| 0.44.0第三方验收修正 | **已签名并升级安装/启动（平台确认，不清数据）**；首次capability超时，SDB同目标重连后第二次成功；M1回复全文/M2默认画质USER PASS；ADR-087修正（F11日志淘汰、回复层级、默认画质），本地692单元/12合成UI/6负例通过；[hash/源码/验证](design/evidence/2026-10-22-acceptance-fix/README.md) |
| 0.43.0当前位置幂等 | Android所请求组、iPhone首投/声画时间/停止及F11关注/收藏所请求组USER PASS，完整矩阵OPEN；[hash/源码/平台回执](design/evidence/2026-10-22-cast-clock/receipt.json) |
| 0.42.0播放态投屏定位 | 用户报告向前跳转，所请求控制组未测；[hash/源码/平台回执](design/evidence/2026-10-22-cast-seek/receipt.json) |
| 0.41.0投屏起播定位 | 已签名升级启动，所请求主动定位/停止通过、进程首次投屏FAIL；[hash/源码/平台回执](design/evidence/2026-10-22-cast-start/receipt.json) |
| 0.40.0单账号恢复 | 所请求A/B/C USER PASS；[hash/源码/平台回执](design/evidence/2026-10-22-recovery/receipt.json) |
| 0.39.0稳定浏览/目标控制 | 所请求三组及随后一次点赞USER PASS；[hash/源码快照/平台回执](design/evidence/2026-10-22-stream/receipt.json) |
| 0.38.0冻结 | 倍速USER PASS；关注invalid/点赞-403/互动慢/跳动缺图未通过；[用户事实](design/evidence/2026-10-22-direct/USER_ACCEPTANCE.md) |
| 0.37.0及以前冻结 | 原最小通过组与失败保持；不覆盖原工件或把旧UI通过扩展为新设备通过 |

原0.43.0安装时state/capability/install/launch明确成功。后续结束旧观察进程获平台确认，普通/调试重新启动超时，当前前台未知。R07候选未集成/打包/签名/部署，不将旧WGT重标为新候选。未卸载、清数据、执行代理账号POST或发布Git。0.28–0.43工件冻结，17原生模块/68资源沿用。签名包、源码快照、证书及原始日志均在仓库外保护目录；公共回执仅含hash与平台结果。

[当前验收](CURRENT_DEVICE_TEST.md) · [0.38.0原记录](archive/2026-10-22-direct-038/SIGNING_DEVICE_RECORD.md)
