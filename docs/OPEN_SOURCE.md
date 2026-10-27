# BiliSofa 开源发布

更新：2026-10-26。用户已明确授权将 `johnnyzhao5619/BiliSofa` 设为 public，并提供可下载的安装包与便捷手册。远端实际结果单独记录在[公开发布记录](releases/2026-10-26-publication.md)，不以文档勾选代替。

项目起因是在作者使用的海外 Samsung Tizen 电视上缺少可用的 Bilibili 应用。原创代码与文档采用标准 MIT；保留第三方许可，不增加“禁止商用”限制。作者免费用于学习 / 测试、当前无盈利及愿下架的声明见 [RIGHTS](../RIGHTS.md)，不代表取得平台授权。

## 两个明确的版本

| 对象 | 身份与证据 |
| --- | --- |
| [0.65.1 正式开源基线](releases/0.65.1.md) / `v0.65.1` | 软件精确固定 `e7bc3740e0fed2f9b2c89f9a83755398fa11faf7`，不把标签挪到新文档或新代码；现存 WGT 由独立精确源码目录重建 Web 层、复用来源校验通过的原生模块，字节与冻结包一致 |
| [0.66.0 服务配置预览](releases/0.66.0-service-configuration.md) / `v0.66.0` | 先填写网站再启用包内地址配置；重新编译原生模块和 Web，单独固定新源码提交。静态检查 / 打包通过，不借用 0.65.1 的设备结论 |
| 配套文档 | 基线之后的新文档，发布 manifest 独立记录 docsCommit / 文件摘要，不能冒充旧 tag 自带文档 |
| 使用者签名包 | 未签名 WGT 由使用者在本机为自己的电视签名，哈希将改变；不分发维护者的私密设备签名包 |

0.65.1 的公开决定见 [ADR-118](adr/118-public-open-source-0651-baseline.md)，配置变更见 [ADR-119](adr/119-user-selected-local-service-configuration.md)。完整 v1.0.0 尚有未完成项；保留 F01–F20 和全部证据、暂停与来源阻塞。直播 / 真实双账号不在当前交付范围，讨论只读不变。

## 用户安装

[五步快捷安装](QUICK_INSTALL.md) · [English](QUICK_INSTALL.en.md) · [Samsung 官方工具](INSTALLATION.md)。下载 WGT 无需自行编译；Apps2Samsung 自定义 WGT 路径依据上游 v2.8.3 文档，BiliSofa 尚未独立实测，仍需 Developer Mode 和目标电视有效签名。日常不依赖常开电脑、NAS、网关或项目云端。

## 来源、风险与发布记录

[发布清单](RELEASE_CHECKLIST.md)记录材料与远端操作，[公开发布记录](releases/2026-10-26-publication.md)记录实际结果。所有公开附件提供哈希、源码身份和未验证项；历史秘密扫描不等于漏洞审计或法律审核。未接受的本地 logo 草稿不加入此次提交 / 附件。

[Bilibili 协议评估](BILIBILI_TERMS_RISK.md)识别到非官方访问及 5.6(3) 的授权风险。没有取得 Bilibili 书面授权；开源、免费、用户输入地址、自签名和愿下架都不消除协议 / 版权风险。本次按用户授权免费公开分发，未宣称已获平台许可。MIT 不授予第三方内容、接口或商标权。没有收费、预装或为他人操作账号。

[许可范围](LICENSING.md) · [第三方声明](../THIRD_PARTY_NOTICES.md) · [隐私](../PRIVACY.md) · [贡献](../CONTRIBUTING.md) · [安全私密报告](../SECURITY.md) · [最佳实践来源](research/open-source-release-2026-10-26.md)
