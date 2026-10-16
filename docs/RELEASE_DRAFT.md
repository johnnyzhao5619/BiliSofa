# 发布材料草稿（不可发布状态）

预期标题：BiliSofa v1.0.0。

目标：Samsung UN58U8200FFXZC 上一个独立 App，完整 F01–F20。日常无常开电脑、NAS、局域网网关或自建云端。

当前交付只包含 W01 基础探针和可移植基础候选；不得用此草稿创建已完成 v1.0.0 Release。最终包形态和设备兼容声明等 W01、F01–F20、W07 后补。

## 当前可审阅附件

- `dist/BiliSofa-W01-basic-unsigned.wgt`：内部基础探针 unsigned ZIP，未签名/安装；不含原生 Socket/cURL。
- `dist/BiliSofa-W01-native-unsigned.wgt`：官方 Samsung SDK 编译的内部 native 网络候选 unsigned 包，当前内部版本 0.0.11；带公开 CA、原始依赖许可证及原创合成媒体。已部署 0.0.5 的网络/元数据证据另见 SIGNING_DEVICE_RECORD，新工件仍须单独验收。
- `dist/BiliSofa-W01-source-snapshot.zip`：与构建相对应的无 HEAD 源码快照。
- `dist/DELIVERY.json` / `dist/source-manifest.json` / `.wgt.sha256`：包与源码 hash、工具/证据边界。
- docs/TEST_REPORT.md、DEVICE_CAPABILITIES.md、IMPLEMENTATION_STATUS.md、W01_PROBE_GUIDE.md。

## 发布前需替换/完成

全部 F 真机验收、官方三平台投屏、保护存储、实际声画/HDR/倍速、账号读写与隔离、30 视频/两小时/升级回退/电脑关机；最终依赖许可；用户自行签名指南与私密签名包；owner/remote 和明确公开发布授权。

未 commit/push、未创建远程仓库、未上传源码/安装包、未执行 hosted CI。私密 profile、DUID、账号资料不进入附件。公开 unsigned 构建产物与用户私密签名包必须分别标识。

当前发布范围依据[ADR-003](adr/003-read-only-comments-danmaku.md)：评论/回复与点播/直播弹幕只读，F15/F16保留追踪并与F10/F08/F18合并验收；不要求编辑/发送/评论删除。须验证没有对应入口/写请求。F03首字母输入/联想及其他保留功能仍需通过，不因本次范围调整自动标记完成。
