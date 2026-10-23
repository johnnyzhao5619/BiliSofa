# 0.47.0 第三批：工件与部署证据

2026-10-23；[ADR-092](../../../adr/092-one-page-search-and-single-column-comments.md) · [ADR-093](../../../adr/093-overlay-stepping-resume-after-home-and-continuous-preference.md) · [回执](receipt.json) · [计划](../../../archive/2026-10-23-superseded/plans/2026-10-23-batch3-search-reading-resume.md)。**已签名并升级安装/启动（平台确认，一次成功，不清数据）；设备验收待用户S1–S6。**

| 项 | 值 |
| --- | --- |
| UI stage | `dist/product-search-reading-app`（新目录） |
| 未签名 | `dist/BiliSofa-0.47.0-unsigned.wgt`，SHA-256 `2cbe5a54852392ef609f484af9af6d9b7a03551c0ac102739bb0603acec36dd3` |
| 签名 | 仓库外私有目录`productreading-20261023T045634209008Z`，SHA-256 `53a81495e09454f54f5394e381e57e685ae0b5b13c8a25faf156a997d30eb598`；证书日期/签发方预检PASS |
| UI sourceHash | `815c929d41334a67e98c7366fb5deb9f6e8981280021f2d7df346a4d8ddfa6e6` |
| 源码归档 | 签名目录内`source-inputs.tar.gz`，SHA-256 `7687e28dfe74ee009850533606b7011ec369aa182755f4ba593afc596e5c9158`，322个源文件 |
| 权限 | 与0.46.0相同：internet、productinfo、tv.inputdevice |
| 相对0.46.0 | 257个UI输入中16个变化、3个新增；17原生模块/68资源逐字节一致 |

## 本地验证

check 301模块；单元701/701；合成UI 7/7；冻结0.46.0负对照7条中6条失败；回归0.46.0全套18/18、投屏只唤回1/1、投屏定位/同秒幂等10/10；包负例8/8；冻结dist 892/build 176文件不变；签名包无凭据/私钥/局域网地址。

## 部署

一次尝试：state/capability/install/launch均platformSuccess；覆盖同一应用ID，未卸载、未清数据。没有扫码、真实账号写入或旧unknown重放。平台成功不代表界面、媒体或体验通过。

## 待用户执行

S1搜索、S2评论、S3设置调值、S4 Home续看、S5连播偏好、S6回归（多P连播＋Android投屏），步骤见计划第5节。此前R1–R6、P1–P7与0.44 M1/M2未受影响部分继承。
