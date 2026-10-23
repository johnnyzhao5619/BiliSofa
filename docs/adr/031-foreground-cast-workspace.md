# ADR-031：统一导航壳中的前台投屏会话

日期：2026-10-17。状态：W02装配决定，关联F06/F12/F13/F20；完整W06和新应用真机验收开放。

## 目的

在ADR-029/030账号、游客播放应用内装配既有官方发送端接收链。W01探针页面自带模态、按键与生命周期，不能直接挂入TvShell形成第二套焦点负责人。ADR-030的MediaSession是单源owner，第二次ready为协议失败，也不能把它隐式改成切P。

## 边界

- 新`contracts/receiver-link`只暴露严格限定的ReceiverLink端口：启动、固定事实/命令、批准候选、同代次decoder关闭确认、真实快照、命令ACK、seek结果与原生关闭。完整发送端地址/媒体URI/账号jar仍留在平台Worker。端口类型文件即使被TS擦除，也显式纳入构建来源摘要。
- `platform/receiver-link`在电视读取瞬时局域网连接，使用独立guest Scope启动既有CastProbeWorker，选择session批准模式。只在用户点击入口后启用，保留W01首个SetAVTransportURI成功握手→独立源检查→电视自动启动桥的次序；不会通过TV手动播放掩盖失败握手。
- 仅非秘密应用级发现UUID持久化在`bilisofa.receiver.uuid.v1`；每次token随机生成，发送端身份、地址、签名URL不保存。局域网对端绑定只是协议内所有权，不是加密身份认证，更不会继承电视所选账号的凭据。
- `app/cast-workspace`负责源代次、PlayerCoordinator/CastReceiverPlayer、命令串行、200ms真实状态回传与所有关闭。新源请求先失效旧回调、清零旧进度/时长，实际关闭旧decoder后回传同代次ACK；收到Worker的native_closed、新源source_pass及fresh ready才允许新decoder准备。跳代、重复token、缺原生关闭、重复ready均停止会话，不自动回放旧源。
- 本地与手机seek共用现有AVPlay策略。控制权由手机开始；遥控操作先接管，显式“交还手机控制”后手机才能再控制。执行ACK只表示派发接受，seek回调不制造目标时间；新进度只取后端事件。旧seek完成不能恢复旧播放器或回报新代次成功。Stop后实际decoder关闭未知时拒绝Play复用。
- 限定范围读取超时沿用本地真实进度观察：当前代次持续有tick才继续；播放状态下超过五秒无变化停止，暂停/seek不当作进度证明。该观察不扩展原始授权、连接或传输预算。
- Back、Home、账号变化、网络/协议错误都通过同一个模态owner关闭：decoder NONE和原生关闭ACK分开记录，均确认才允许下一会话；关闭超时或未知不可由迟到ACK改善。Home前台返回恢复投屏入口焦点，不自动重新监听。整个应用仍只有一个InputRouter和visibilitychange协调器。

## 内部构建与未完成项

BiliSofa01.TV/BiliSofa01内部0.3.0追加cast-worker.js，使用与0.2.0相同的原生WASM/CA/静态依赖。internet权限、40324 loopback WARP/CSP保持；不引入新权限、互联网媒体/脚本origin或外部常驻服务。源/包门禁仍验证实际原生输入，未重编译未变化的C或修改既有W01探针源码/已装包。

复用接收器仍限五分钟媒体/授权窗口、四个媒体源和累计连接/传输/命令预算，发现名称仍BiliSofa W01 Discovery；界面明确标内部检查。不是产品长会话/连续切P/断连恢复/后台接收承诺，不绕过发送端画质限制。完整CastSession政策、产品租期与恢复矩阵继续W06；F20不能据此判完成。

本轮只跑本地合同、真实JS Worker/生产协议与合成C/SDK夹具，以及打包门禁。新WGT尚未签名、安装或以真实官方Android/iPhone/iPad发送端验证。此前W01三端证据仍按原source/signed配对。详细结果见[W02投屏交付](../W02_CAST_APP.md)。
