# W02第三批：身份Worker与可打包账号页面

日期：2026-10-17；F01/F12/F13/W02。设计见[ADR-029](adr/029-identity-worker-and-account-package.md)。本包是内部账号检查构建，完整BiliSofa及W02未完成；不是正式产品或新增功能版本发布。

## 已接通

- 正式账号页→二维码Worker→固定TLS登录/身份路由→原生关闭→KeyManager保存→账号列表→显式选择/重新核对身份→首页。
- 列表和私密会话独立；使用游客、确认移除、Back取消QR、Home取消/恢复、错误身份/过期/未知保存/未知关闭均有反馈。
- Worker没有W01固定视频读取、云进度写入、任意URL或操作号入口。旧探针包、凭据别名及两份未知写意图保持独立。

## 构建与交付

```sh
npm run check
npm test
npm run test:native:identity
npm run native:identity
npm run build:app
npm run test:ui:app
npm run package:app
```

`native:identity`使用已配置的本地Samsung SDK/固定现代静态库，不安装依赖。`build:app`可单独生成JS/UI供合成浏览器检查。`test:ui:app`以实际UI、Worker和保护存储适配器，注入合成C模块/KeyManager边界，不访问真实B站账号；会启动本地开发服务器。各浏览器测试共享4173，应串行运行，禁止复用错误目录的服务器。

交付文件`dist/BiliSofa-W02-account-unsigned.wgt`，应用`BiliSofa01.TV`、包`BiliSofa01`、内部版本`0.1.0`。只含internet权限，附MIT、依赖与CA许可证、原生/UI输入输出清单。打包器检查固定身份/入口/权限/内容白名单、静态依赖、QR源码/许可、CA、私密模式及档案逐字节一致；不签名、不安装、不读取证书。

本轮没有更改已安装主060/独立018，也没有真实登录或云写入。此WGT与旧只含合成界面的ZIP不同；它具备真实账号路径，但目标机运行仍待验收。现有`sign-probe.py`身份白名单用于W01，不能直接拿此包冒充旧探针签名/验收记录。

## 证据边界与下一步

单元/合同覆盖新的严格IPC、QR绑定、私密结果顺序、错误身份、取消/关闭、超时/迟回包、保护保存未知和预检查取消。HOST TLS检查直接编译`identity.c`，验证三个实际GET、合成cookie导出/导入、关闭清零及拒绝越界；不是电视Socket/TLS证明。Samsung SDK编译、WASM路径扫描和WGT完整性是构建证据。浏览器跑实际应用/实际Worker，以合成native模块断言C stdio回调不被同步重入，KeyManager以合成Map模拟；不是真实账号或电视保护存储证明。

首次单元检查有一项把经运行时解析复制的对象错误要求引用相等；改为比较完整数据，未放松生产解析。第一次打包定位到QR包内没有LICENSE路径，改用项目已固定并核验SHA的原始许可证；最终仍校验实际npm运行时代码与锁定hash。失败不算通过。

W02后续为媒体/接收器装配、偏好/本地续播按账号隔离、性能和新包真机门槛。F01自动续期、F13完整多账号实机、F07云进度、F19高画质仍开放，不因本批代码或构建通过而完成。

## 本轮最终验证

- 300项全量单元/合同通过（本批新增15项）；99个TS模块依赖/平台全局边界与strict通过。
- 10项实际账号UI/Worker浏览器流程＋18项既有基础导航流程通过；其中C/KeyManager为明确合成边界。新增身份核对及Home恢复等待中的可见状态/真实焦点/Back取消检查。
- 8项HOST TLS检查通过；身份模块实际Samsung SDK编译及WASM扫描通过。
- 未签名WGT的固定权限/内容/来源/许可证/CA与ZIP逐字节校验通过；额外权限、意外运行时文件两项负例均被拒绝。源变动后旧stage打包也曾被digest门禁正确拒绝，最终重建通过。GitHub CI仅加入UI测试步骤，未运行远端CI。

账号WGT SHA256：`8702b44302113c6067aeb29ef5d4a1d86d9c4c78755119a859361b1beea55e5e`。同步更新合成预览ZIP SHA256：`30c7913b046c8e8040c69a0408cf29a143dff576f3e61ef47e5d2559abd4256d`。两者都不是v1.0.0或新设备验收。


后续第四批已将匿名游客媒体装入同一内部应用身份，版本0.2.0，`package:app`当前输出改为media-unsigned.wgt；本页0.1.0账号WGT/计数/摘要均为第三批原件记录并保留。当前命令与边界见[W02_MEDIA_APP](W02_MEDIA_APP.md)。


当前第五批内部包为0.3.0，已追加匿名投屏会话；历史0.1.0账号WGT与本页结果保留，当前命令/边界见[W02_CAST_APP](W02_CAST_APP.md)。
