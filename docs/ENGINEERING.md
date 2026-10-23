# 编码与工程约束

状态：W02按ADR-027沿已验证WGT/Web＋电视内Worker/WASM/AVPlay实现；W01跳过/条件不足项仍未验证。采用TypeScript strict与本地静态构建，临时探针工具见ADR-002，多账号基础见ADR-028；不引入电视上Node/SSR运行时。

## 类型与模块

- 2 空格、UTF-8、LF，遵循 `.editorconfig`；类型/组件 PascalCase，变量/函数 camelCase，固定常量 UPPER_SNAKE_CASE。
- 外部数据按 unknown 接入，经运行时验证转 DTO。错误区分 code、可重试和需登录。协议 ID 用字符串，时间名称/类型注明 ms/s，不随意 Number 转换大 ID。
- contracts 是 UI/Worker/播放器/投屏合同来源；组件不解释原始第三方响应。类型不能代替运行时验证。
- 页面不访问 tizen/webapis/cURL 或浏览器会话；能力经适配器注入，desktop 实现标记模拟。按职责拆模块，不用一个 app/player 文件管理 UI、账户、解析和 socket。

## 异步与资源所有权

- 跨边界携带 account generation、播放 session ID、request ID；取消并校验代次，旧回包不能覆盖新账号/源。Worker 消息有版本、体积上限、超时及错误响应。
- 播放/seek/切轨命令串行核查状态；UI由真实事件更新。失败可返回内容页，stop/close 幂等，晚到回调不能复活旧播放器。
- listener、timer、ObjectURL、缓存、buffer、Worker、socket 明确 owner/dispose。生命周期单一协调，不由各页重复注册。
- 安全读取有限重试，带退避/取消/限额；写超时为 unknown。投币/三连等保留写操作不能统一网络重试，先查状态；无法查询供用户判断。评论/回复/点播与直播弹幕按ADR-003只读，不接入对应发布、删除或发送接口。

## 性能预算

- 主线程不做同步 AVPlay prepare、XHR、socket 或大包解码。本地按需加载，独立读取并行，账户依赖保留顺序。
- 虚拟化长列表，图片按尺寸/可见性加载，弹幕对象/队列有上限；动画用 requestAnimationFrame/播放器时间，不以 time tick 刷新整个界面。
- 不给所有节点强制 GPU layer；图片、canvas、WASM 堆、video buffer 纳入峰值预算。操作可响应优先于弹幕密度。
- W01按[固定退出清单](W01_EXIT_CHECKLIST.md)核对功能所需的运行能力；W02建立冷启动→可操作、键→焦点、首帧、seek、掉帧、内存基线；两小时混合播放/增长与完整恢复矩阵归W07。注明固件/样本/网络/缓存；预算是项目目标，不是三星硬标准。
- 生产日志有界脱敏、默认低频，无 frame/payload 洪流。官方旧例子的 jQuery/global cache/全局 translateZ 不是现代框架选择依据。

## 安全与发布代码

- 内容以安全文本渲染，受控弹幕字段白名单；无 eval、远程业务脚本或任意代码弹幕。
- 权限、WARP、CSP、目标/redirect 校验是不同层。CSP不约束 WASM 原生 socket，模块自行限制目的地、凭据和监听。
- 偏好/公共缓存/私密会话分开；会话不进普通 localStorage 或 UI store。W01 证明保护存储/密钥路径；固定打包密钥/base64 不算加密，保护能力不明要记录限制。
- Cookies不自动附到 CDN/redirect。日志去除 token/header/cookie/签名 URL query/DUID/地址；退出/删账号清除对应状态。
- 锁定依赖、来源/许可证；runtime代码随包本地提供，保留上游通知，生产 debug/source map 策略需明确且无凭据；私密 source map、诊断及签名密钥不公开。

## 变更和证据

记录 F/W ID、状态/合同/权限变化、恢复、实际验证和未验证。改兼容范围/运行时/存储/协议归属先更新 ADR。测试按用户请求及 [ACCEPTANCE](ACCEPTANCE.md)执行；无应用命令前不放永远成功的脚本/CI。

状态、测试、设备和签名等入口文档只维护当前结论、简表、阻塞与证据索引，不逐轮追加对话/调试/安装过程。详细历史放有日期的archive，执行日志放ignored或仓库外；保留失败和工件配对，避免复制同一hash/验收结论到多个过程段。当前包、开发源码和完整产品状态分别标明。

官方依据见 [研究 S06–S14、S16–S20](research/tizen-best-practices-2026-10-14.md)。类型、模块、generation、写入策略是本项目工程选择。
