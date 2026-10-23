# 0.46.0 第二批2A：工件与部署证据

2026-10-23；[ADR-090](../../../adr/090-player-main-row-settings-and-next-up.md) · [ADR-091](../../../adr/091-home-shelves-and-full-page-detail.md) · [回执](receipt.json) · [计划](../../../archive/2026-10-23-superseded/plans/2026-10-23-batch2-player-home.md)。**已签名并升级安装/启动（平台确认，不清数据）；用户所请求P1–P7 USER PASS。**

| 项 | 值 |
| --- | --- |
| UI stage | `dist/product-polish-app`（新目录） |
| 未签名 | `dist/BiliSofa-0.46.0-unsigned.wgt`，SHA-256 `6831517c1209156524acda7c284aa6eb616bfa6c039bf22139725e1f2c17fae1` |
| 签名 | 仓库外私有目录`productpolish-20261023T043553650166Z`，SHA-256 `13d1f3d64378abdf3e0d3d226115ecb7b772a99216140046491d7bd52cb543bf`；证书日期/签发方预检PASS |
| UI sourceHash | `f6303e5db1a91f325cfd085bc669bfb1df8c879939f4ee034c9716158a29c53a` |
| 源码归档 | 签名目录内`source-inputs.tar.gz`，SHA-256 `410ca969a717d6ff5110f544aa599d85f6e59ac6539cbc15687b5b91137560fe`，319个源文件 |
| 权限 | 与0.45.0相同：internet、productinfo、tv.inputdevice |
| 相对0.45.0 | 254个UI输入中16个变化、4个新增；17原生模块/68资源逐字节一致 |

## 本地验证

check 298模块；单元699/699；合成UI 18/18（含ADR-088移植8项）；冻结0.45.0负对照18/18失败（多数因无货架入口）；投屏只唤回1/1、投屏定位/同秒幂等10/10；包负例8/8；冻结dist 862/build 176文件不变；签名包无凭据/私钥/局域网地址。

## 部署

| 尝试 | 结果 |
| --- | --- |
| 1 | state查询报target错误（SDB未连上）→ 脚本按设计BLOCKED，未安装 |
| 恢复 | 对同一授权目标一次SDB disconnect/connect；state与capability恢复 |
| 2 | state/capability/install/launch均platformSuccess；覆盖同一应用ID，未卸载、未清数据 |

没有扫码、真实账号写入或旧unknown重放。平台成功不代表界面、媒体或体验通过。

## 用户验收

2026-10-23用户反馈“P1–P7全部验证通过”：P1控制栏图标/状态/弹幕开关、P2 ⚙侧栏、P3长按加速、P4连播倒计时与取消、P5首页货架、P6整页详情与分P、P7 Android投屏不夺权，均USER PASS。

不外推：iPhone/iPad投屏回归、长时间使用/性能、请求量在真实网络下的长期表现、完整T1–T8矩阵仍OPEN。ADR-088的R1–R6与0.44 M1/M2继承。
