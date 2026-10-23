# Tizen TV 平台开发约束

核查日期 2026-10-14。主要适用 Web/WGT，.NET 单列。API 文档、零售 TV 能力和项目设计不可互相替代；依据为 [来源/边界](research/tizen-best-practices-2026-10-14.md)。

## 能力基线与配置

- 记录实际型号/地区/固件/平台/引擎、API/权限、遥控器、媒体路线。2025 官方基线 Tizen 9.0/Chromium M120，不是当前 TV 实测；相似 U8000F 的 model group 不等于本机映射。
- build target 依确认后的最低设备；语法转换不补缺失 API。DOM/MSE、AVPlay、WASM、.NET 分别建表。
- config.xml 定义稳定 ID、x.y.z、入口、TV profile/最低平台、权限及访问政策。权限逐项记录 API、用途、级别、证书、设备结果，不复制全部示例；普通证书不授予 partner 权限。
- tv.inputdevice 对应额外键，internet 对应 Socket/cURL；Product API 权限按所用 API 核对。
- WARP/CSP分别设计：本地脚本、必要 image/media/connect；WASM 编译、worker/blob、Samsung API script、loopback例外逐项验证。不能用 * 或全局 unsafe-eval 默认修复，也不直接套现代浏览器 CSP 字符串。

## 媒体

- AVPlay封装实际状态/合法调用表，prepareAsync、合适阶段 listener；seek/切轨/换源串行，清理 stop/close/屏保/ObjectURL。
- display rect 1920×1080 基准与 viewport/物理4K分开；object/overlay区域同步更新。
- 按内容记录容器、codec/profile/level、尺寸/fps/bitrate、audio/HDR、manifest/DRM、后端/权益。2025表中 H.264 MSE 最高FHD，硬件4K不证明Shaka/MSE4K。
- HDR/倍速/轨道/分离音视频以实播验收；标签、URL、API存在不等价。可用回退遵循权益/设备能力，F19仍按PRD验收。
- 仅播放时关闭屏保；暂停/停止/错误/离开/隐藏恢复，加载挂起不可永久关闭。适配器核对调用与权限。

## 生命周期/存储

- 一个 visibilitychange 协调器处理显示/隐藏/恢复/结束；系统可能暂停JS/回收进程。重要状态渐进保存，不依赖终止时异步写盘必达。
- 隐藏保存路由/焦点/进度，停止或暂停媒体/不需保留工作；BiliSofa默认不继续后台接收。恢复重查网络/会话/media URL、重建必要资源，避免重复监听。
- 官方multitasking表仅到2024且低内存可能例外；缺少2025既不证明否定也不证明本机支持。
- 缓存限额，设置/会话schema迁移，退出/删除、损坏、空间不足、冷启动/升级有恢复路径。安全持久化可用性需W01实证。

## TV内网络/投屏候选

- Socket Extension非主线程；固定兼容Samsung Emscripten/TV SDK，不假定任意upstream版本等价。优先poll，遵守descriptor类型限制，限制堆/连接/正文/请求。
- cURL保留CA/TLS校验，核对时间/证书链；账号cookie jar独立，配置policy不代替native目标检查。
- 内部MPD仅loopback必要路径；LAN receiver仅启用/前台绑定所需接口端口，清理监听/公告，处理隔离/网络切换/端口占用。
- bind/listen/组播/cURL为官方候选，W01证明证书/零售权限/生命周期。Smart View需sender/receiver集成，不证明既有官方Bili客户端兼容。
- .NET备选验证TPK/网络/UI/media/持久化；native .so interop可能需partner权限，managed API文档不等于本机成功。

## 打包/签名/证据

- 本地资源build→配置/入口/资源/许可证检查→私密profile签名。保存author身份用于升级，distributor/DUID/权限级别单列；公开包无私钥/设备身份。
- 发布包无HMR/dev server；安装后独立启动/重启/Home/升级/数据保持分别验收。开发侧载、Seller Office上架分开，MIT或签名不等于认证。
- 记录 source→API/simulator→TV证据，附固件、包hash、构建/签名版本、步骤、预期/实际、匿名附件及PASS/FAIL/BLOCKED/UNVERIFIED。
- 当前实施/工件/真机结果以[实施状态](IMPLEMENTATION_STATUS.md)、[签名部署](SIGNING_DEVICE_RECORD.md)和[ACCEPTANCE](ACCEPTANCE.md)分层记录；本页的平台规则本身不证明某版已验收。
