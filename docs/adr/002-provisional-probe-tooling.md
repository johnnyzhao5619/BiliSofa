# ADR-002：W01 临时探针与可移植合同工具

日期：2026-10-14。状态：仅开发候选获准；最终 TV runtime 尚待 W01。

使用项目本地、固定版本 TypeScript strict 和 esbuild，构建无框架 Web 探针。Node/Python 仅在开发电脑执行，运行资源全部打包到 WGT。探针使用 ES2020 构建目标作为待实测候选；不声明最低支持引擎。不选定产品 UI 框架。

基础 Worker 包含原创最小 WASM 加法模块，用于证明实际 Worker 内实例化/调用，不证明 Socket Extension。另提供原创 POSIX/cURL 探针，必须以 Samsung Emscripten SDK 编译，在 Worker 运行。缺 SDK 时 native build 明确失败，基础 unsigned WGT 显示原生网络缺失，不能冒充完整网络探针。

探针身份 `BiliProbe1.Probe` / package `BiliProbe1` / 版本 `0.0.1`，与未来产品身份隔离。W01 后另行确定产品升级身份、最低平台、CSP、框架和运行时。探针不采集 DUID、地址、cookie/token，不执行账号写入。

build、unsigned package、签名、安装分离。无明确 profile/设备授权不连接电视。W01–W07 和 F01–F20 均保留真机门槛。

同日续跑：Rosetta 2 经明确授权安装；官方 SDK native WASM 已编译。basic 0.0.1 / native 0.0.2 为同一探针身份的内部工件，完整产品仍只有 v1.0.0。生成 runtime/CA/原始许可证在 native 包本地提供，不引入外部 runtime 服务或 string eval。native 初始化进度只能是 UNVERIFIED；桌面 networking timeout 不能计为零售通过。legacy SDK 网络依赖与保护存储仍不能作为最终运行时决定。


0.0.12新增合成持久性候选，不改变runtime决定：固定本App专用alias、普通存储只放生成的非秘密期望/启动代次，不将真实会话放入UI存储；重名saveData替换语义未明而拒绝覆盖。新document读回/清理是单独证据，不等同跨App隔离/加密。专用内部automation=2首报告GET后退出，CLI重开取第二报告；默认manual及guest模式不因此改变。


0.0.13开发实验新增BiliIsola1.Probe独立WGT，仅对主探针固定的非秘密KeyManager项做一次跨包只读观察，复用短时Worker HTTP报告后退出。它不是产品运行模块或额外常开服务，不改变最终一个独立App约束。两包同Author/Public Distributor，隔离结论限于该条件；主包前后存在性与实际运行身份必须齐备。产品私密存储/加密与最终运行时继续未定。


0.0.14允许开发探针固定游客热门只读路线及规范化摘要，仍为候选，不固定产品框架或最低引擎。旧SDK网络依赖仅用于无凭据探针，真实账号仍待最终安全栈评估；游客GET不引入外部常开服务/客户端身份/账号cookie。正文仅在电视Worker中有界解析，UI不执行外部文本或请求任意URL。
