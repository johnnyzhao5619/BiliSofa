# 0.45.0 第一批遥控快改：工件与部署证据

2026-10-23；[ADR-088](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/088-remote-media-keys-and-direct-controls.md) · [回执](receipt.json) · [实施计划](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/archive/2026-10-23-superseded/plans/2026-10-23-batch1-remote-quickfix.md)。**已签名并升级安装/启动（平台确认，不清数据）；用户所请求R1–R6 USER PASS，R7按[ADR-089](../../../adr/089-voice-guide-not-required.md)移除。**

| 项 | 值 |
| --- | --- |
| UI stage | `dist/product-remote-app`（新目录） |
| 未签名 | `dist/BiliSofa-0.45.0-unsigned.wgt`，SHA-256 `f9192505811bafecdb846f66f7c83ff3eecd7f454f94483071118763428159b4` |
| 签名 | 仓库外私有目录`productremote-20261023T035700247801Z`，SHA-256 `acb95126691bc715cb34962943a1db601cc2add5bfbd5be7cd81b7cc86aa580e`；证书日期/签发方预检PASS |
| UI sourceHash | `907a1ac9d64ce89661c864d10565a7531f666306d3264a891b0374e30160be7e` |
| 源码归档 | 签名目录内`source-inputs.tar.gz`，SHA-256 `aef732f8fc586558ebe25b82a6cfa37bf323b010b611d2e0bbd6a65c6cf514b0`，315个源文件 |
| 权限 | internet、productinfo，新增`tv.inputdevice`（媒体键注册，public级） |
| 相对0.44.0 | 25个UI输入变化（含新增`user-messages.ts`）；17原生模块/68资源与0.44.0签名包逐字节一致；R07适配器不在包内 |

## 本地验证

check 294模块；单元696/696；0.45.0合成UI 13/13；冻结0.44.0负对照12条中11条失败（投屏只唤回为不变护栏）；0.44.0保留规格11条通过（`reply.spec`因按钮改名失败，已移植）；包负例8/8；冻结dist 832/build 176文件不变；签名包无凭据/私钥/局域网地址。

## 部署

一次尝试：state/capability/install/launch均platformSuccess；`tizen install`覆盖同一应用ID，未卸载、未清数据。没有扫码、真实账号写入或旧unknown重放。平台成功不代表界面、媒体或遥控体验通过。

## 用户验收

2026-10-23用户反馈“R1–R6全部通过”：

| 组 | 结果 |
| --- | --- |
| R1 媒体键（播放/暂停、快进、快退、停止） | USER PASS |
| R2 隐藏态确认暂停/继续、左右预览后自动提交、上只唤回 | USER PASS |
| R3 画质/分P选单落在当前项 | USER PASS |
| R4 页面巡检（无冗余按钮、主操作焦点、无英文代码） | USER PASS |
| R5 续播按钮可达 | USER PASS |
| R6 Android投屏回归：隐藏态按键不夺权 | USER PASS |
| R7 Voice Guide | 用户移除，非需求（ADR-089），不计PASS/FAIL |

不外推：iPhone/iPad投屏回归、长时间使用、完整T1–T8矩阵仍OPEN。0.44.0 M1/M2及更早未受影响的USER PASS组继承。
