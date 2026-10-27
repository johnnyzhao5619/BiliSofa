# 0.65.1 开源发布资料调研

调研日期：2026-10-26。来源优先官方指南和协议；本页记录文档决策及证据边界，不是发布执行回执。

## 开源项目应让初次访问者找到什么

[GitHub Open Source Guides](https://opensource.guide/starting-a-project/) 建议提供许可证、解释用途与入门方式的 README、贡献指南和社区行为规范，并在公开前处理敏感历史与品牌问题。本次据此将首页改为“起因 → 使用场景 → 版本 / 兼容 → 安装 → 隐私 / 风险 → 贡献 / 许可”，把内部逐批验收留在专门文档。

[OSI 的 MIT 原文](https://opensource.org/license/mit)提供标准许可文本。本项目保留其原文，新增中文许可边界解释，不叠加“禁止商用”等许可限制。平台服务授权和依赖许可分别说明。

## 发布内容应能对应到固定的软件

[GitHub 不可变发布说明](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)说明固定 tag / 附件及发布证明的机制；[附件 SHA-256 说明](https://github.blog/changelog/2025-06-03-releases-now-expose-digests-for-release-assets/)介绍平台生成的摘要。本次选定精确软件 SHA、单列后续文档身份，并要求列出附件校验值、构建来源、许可及限制。只有实际启用 / 生成后才能声称不可变或已证明来源，本轮未更改 GitHub 设置。

0.65.1 的源码 tag 若精确指向 e7bc374，就必然包含该提交当时的 README。本轮新文档应在后续文档提交 / 配套文档附件中提供，不能假装已存在于旧提交，也不能重打包后沿用旧哈希。

## Samsung 安装的官方依据

| 官方来源 | 用于本文档的事实 | 项目边界 |
| --- | --- | --- |
| [TV Device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) | Developer Mode、Apps Settings 的 12345 入口、开发电脑 IP 与设备连接 | 菜单可能随固件不同；本轮未操作电视 |
| [Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) | Author / Distributor、Samsung TV profile 和目标 DUID | 自己本地签名，不把开发者设备包宣称为通用安装包 |
| [Installing TV SDK](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) | 官方工具与扩展安装入口 | 不随源码分发完整 SDK，不在调研轮安装工具 |
| [CLI](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html) | WGT 签名、安装和以完整 Application ID 启动 | 新用户路径使用通用 CLI；维护者 npm 脚本依赖私密本机 manifest，不作通用安装器 |

项目对最低 Tizen 9.0 和 Application ID 的陈述来自基线 `apps/tv/foundation-config.xml`，不是从三星通用指南推导。实机覆盖只来自仓库已有记录。

## 社区与安全报告

[GitHub 私密漏洞报告指南](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)说明启用后才有对应入口。SECURITY.md 因此写成“有入口时使用，无入口时不要公开敏感细节”；本轮没有查证远端是否已开启，不虚构邮箱、响应时限或长期维护承诺。

## Bilibili 协议

官方用户协议和隐私政策的动态页面已读到，版本日期、条款与实现风险见[专项评估](../BILIBILI_TERMS_RISK.md)。静态抓取只返回页面外壳，因此没有依据搜索摘要编造条款。全文不复制到仓库，仅保留官方链接、版本日期和必要的意译分析。

## 本轮完成与未完成

完成：当前提交 / 版本 / 文档 / 打包脚本审阅，官方资料阅读，现存未签名包的身份、许可目录与 SHA-256 读取，面向公开用户的文档重写。

未完成：全历史敏感信息审计、依赖漏洞 / 全素材权利审计、干净机器完整构建、第三方自签安装实测、全设备兼容、重新签名 / 部署、托管 CI、Git tag / 提交 / 推送、仓库可见性或 Release 操作。调研不补写这些结果。

## 2026-10-27：文档维护补充

[GitHub 仓库最佳实践](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)建议以 README、许可证、贡献指南和行为规范帮助访问者理解项目；[安全政策指南](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository)说明应提供漏洞报告渠道。[Open Source Guides](https://opensource.guide/best-practices/)建议更新或标注过时文档。项目据此保留用户、安全、许可及现行工程入口，减少已被取代的重复方案，通过固定 Git 提交追溯；不将建议理解为要求删除验收、许可或来源证据。
