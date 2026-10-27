# 参与 BiliSofa / Contributing

欢迎提供文档修正、可脱敏复现的错误报告、设备兼容信息和保持产品边界的改进。项目为独立 Samsung Tizen 电视应用，日常不依赖外部常开服务；当前公开下载为 0.66.0 预览版，完整 v1.0.0 的剩余工作见[收口台账](docs/PRODUCT_CLOSURE.md)。

## 报告问题

先读 [README](README.md)、[版本限制](docs/releases/0.66.0-service-configuration.md)及已有 Issues。普通问题写明应用版本 / 提交、电视型号、Tizen / 固件、最短步骤、期望与实际结果。设备信息无需包含序列号、DUID 或真实 IP；截图 / 诊断需人工检查并脱敏。

账号、会话、签名或远程控制漏洞遵循 [SECURITY](SECURITY.md)，不公开敏感细节。服务协议或权利问题请给出原始条款 / 来源和具体受影响文件，不提交其他人的私人材料。

## 开始开发

阅读 [AGENTS](AGENTS.md)、[工程规范与功能范围](docs/ENGINEERING.md)、[结构](docs/PROJECT_STRUCTURE.md)，再按任务查 TV / 平台文档。关联 F01–F20、W 工作包及适用 ADR；小型文档修正不必为凑编号创建新产品需求。

- 保持一个焦点 owner、返回栈、账号 / 媒体代次与取消、平台适配器和独立 Worker 网络边界。
- 评论 / 回复 / 弹幕只读；当前不做直播或真实双账号，不自行扩大范围。
- 不提交其他客户端密钥、私密凭据、SDK 安装物、DUID、原始抓包或未经许可的媒体素材。
- 依赖 / 派生文件保留版权和许可，更新 [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md)；不用 MIT 覆盖第三方内容。

## 构建和验证

Node 版本要求见 `package.json`；`npm ci --ignore-scripts` 安装锁定 npm 依赖，`npm run build:app` 生成 Web 阶段目录。完整 WGT 还依赖固定 Samsung SDK、CA、媒体 fixture 和原生模块；[开发说明](docs/DEVELOPMENT.md)及[工具表](tools/README.md)记录了条件，当前没有已证明的干净机器一键全量构建。

需要验证实现时，依变更选用 `npm run check`、`npm test`、`npm run test:ui:app`、对应 native 测试及 `npm run test:package:app`，不要把列表中的所有命令当成每个文档变更都必须执行。`npm run check` 包含文档门禁的 self-test。真实账号写入、签名、部署或设备测试必须有该任务的明确授权；不会从贡献指南或扫码成功推定授权。

GitHub workflow 当前只支持手动触发；推送 / PR 不自动证明 CI 已运行。报告分别列静态、合成、浏览器、设备和用户证据。纯文档修改可仅检查链接和一致性，不虚构应用测试通过。

## 提交 PR

解释具体问题、修改后的行为、F/W 关联（适用时）、权限 / 数据 / 恢复影响、实际验证与剩余限制。使用匿名 fixture；不要在无人看管循环中消耗他人的账号或资源。普通 bug 修复先缩小复现，涉及运行时 / 协议 / 范围改变时先写清 ADR 决策。

原创贡献按本项目标准 MIT 许可提交；这不是版权转让，也不取消原作者署名。你应有权提交相应内容。平台内容和第三方品牌 / 接口权限不由贡献者自动授予。遵循[社区规范](CODE_OF_CONDUCT.md)，避免“开源即平台授权”的宣传。

English: Contributions to original project code/docs use MIT. Preserve upstream notices and submit only material you can license. Include actual validation and limitations, keep personal data out of reports, and follow the project scope and security guidance.
