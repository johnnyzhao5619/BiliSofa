# ADR-029：正式身份Worker与W02账号检查包

日期：2026-10-17；范围：W02/F01/F12/F13。继承ADR-027/028；实际产品全部功能、身份Worker新组合与新应用ID的TV运行仍未验收。

## 选择与隔离

新建`identity.c`，以已有W01现代网络身份传输为基础，保留TLS证书/主机校验、固定CA、禁止redirect、Cookie主机范围、输入/响应/头部边界、单请求和原生关闭清零。只保留三个固定GET操作：官方Web二维码generate、poll与nav。操作3/4及任意外部URL没有入口；最终WASM和Worker扫描拒绝固定测试视频、播放器进度与heartbeat路径。原W01 C/Worker、已装060/018、未知云进度意图都不修改或迁移。

沿用固定Samsung Emscripten、现代cURL/OpenSSL静态库与CA，不安装新工具。`native:identity`单独编译身份模块，输出`build/identity`；使用同一依赖构建证明，不重链接全部旧探针或引入登录代理。编译不是新模块在电视的TLS/账号证明。

## 状态与私密数据

Worker IPC为`identity`专用、有界8192字节、完整scope、login/verify模式；不接受URL、原生操作号或云写入。QR校验官方主机/路径/key/callback；每次独立cookie jar。与C的交互从Module.print延迟到可取消任务，避免已观测stdio重入问题。

登录只在nav确认身份后导出会话；成功/身份结果必须等到`AUTH:closed`后发回。未确认关闭只发固定错误，不能伪装成功。UI侧Worker适配器独立等待关闭ACK，超时/异常保留不可复用，迟回包不能翻成成功。verify重新导入本次账号的会话、核对同UID后关闭；不会因为本地有cookie就当作登录成功。

私密消息直接进入LoginCoordinator→AccountRepository，UI只收到QR/确认状态和保存后的账号摘要。服务器未标Secure的会话导出时收紧为Secure-only；native本来仅允许HTTPS。持久期限取必需cookie较早到期点，session-only cookie采用本地30分钟保守期限，最长本地缓存366天；这些是缓存重新登录策略，不代表服务端续期或账号权益，启用时仍重新核对身份。F01自动续期未因此完成。

关闭网络和确认保护保存是两件事：保存取消/未知时，本次登录owner同样保持未确认；不借网络ACK宣称所有SDK资源已关闭，不再创建下一次QR。保存项可在重开后核查，但不能自动重写。读取保护列表前后的取消代次阻止迟到创建Worker。旧两次云写授权均已消耗，新链路没有云进度写入能力。

## 应用与生命周期

`foundation-main.ts`使用实际TvShell/AccountWorkspace、KeyManager与身份Worker：账号列表、扫码保存、显式选择后核对、游客、确认移除、退出。外部名称按文字渲染；单一焦点/InputRouter；Back取消二维码并等待清理，Home通过一个visibility协调器取消并重校验。新页面不把开发地址、Cookie、UID日志或原始网络异常显示到状态栏。

内部检查包ID固定为`BiliSofa01.TV`/package `BiliSofa01`，版本`0.1.0`；与W01探针并列保留便于取证，不是另一个产品发布或完整v1.0.0。仅internet权限，包内Worker/WASM/CA/界面/QR依赖，无浏览器外网WARP、LAN诊断监听或项目服务。CSP只允许本地脚本、Worker、资源及WASM编译，沿用已测本地widget脚本来源；不加unsafe-eval。

构建、链接、打包、签名和安装分别执行。`package:app`只生成未签名内部WGT并校验来源/内容/许可证/目标权限；不会签名安装。当前没有执行新TV安装或真实扫码，不将旧单槽/另一包结果外推为新组合通过。

## 后续

W02还需正式媒体/接收器装配、设置/本地续播账号隔离、性能基线与新应用真机检查；W03/04/06/07继续实现内容/完整媒体/投屏/整体验收。账号新链路具备下一轮有限真机验证的构建材料，届时只测试实际功能缺口；不重复已通过旧探针声画/投屏或已跳过云进度/高画质。
