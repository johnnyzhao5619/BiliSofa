# BiliSofa

**面向 Samsung Tizen 电视的独立第三方客户端，供学习与测试。**

[English](README.en.md) · [快捷安装](docs/QUICK_INSTALL.md) · [下载 0.66.0 预览版](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [0.65.1 正式基线](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1) · [协议风险](docs/BILIBILI_TERMS_RISK.md)

BiliSofa 是一个面向 Samsung Tizen 电视、使用遥控器操作的独立 Bilibili 第三方客户端。

这个项目最初来自一个很具体的不便：我使用的海外三星 Tizen 电视上没有可用的 Bilibili 应用，想在大屏幕看 B 站并不方便。BiliSofa 希望让浏览、搜索和观看都能直接在电视上完成，安装之后，日常使用无需一直开着电脑，也不需要 NAS、局域网网关或项目提供的云端服务。

本项目由社区独立开发，与 Bilibili、Samsung 无隶属、合作或官方认证关系。它连接的是中国大陆 Bilibili 服务，不等同于 Bilibili 国际版服务，也不增加内容的地区或会员授权。

## 下载与安装

| 版本 | 下载 | 状态 |
| --- | --- | --- |
| 0.65.1 | [下载未签名 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.65.1/BiliSofa-0.65.1-unsigned.wgt) · [版本与校验文件](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1) | 指定提交的正式开源基线；有特定电视和功能路径的分项记录 |
| 0.66.0 | [下载未签名 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [版本与校验文件](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0) | 网站配置预览版；尚未完成电视安装或运行验收 |

下载后**无需自行编译**。两版均需一台电脑、电视 Developer Mode，以及使用者自己的有效 Samsung TV 签名证书；WGT 需要在安装前签名。请按[五步快捷安装](docs/QUICK_INSTALL.md)操作，或选用 [Samsung 官方工具安装指南](docs/INSTALLATION.md)。快捷手册介绍的 Apps2Samsung 是独立第三方工具，该路径尚未与本应用完成独立实测。应用声明要求 Tizen 9.0；设备和固件兼容性以实际验证为准。

发行附件中的说明文档为发布时快照；本仓库主分支的 README 和安装手册提供后续更新。

0.66.0 首次启动需输入 `www.bilibili.com` 或 `bilibili.com`，以启用 WGT 中已有的本地服务配置；0.65.1 没有此步骤。输入网址不取得平台授权，相关地址仍存在于配置文件及平台声明中。

## 项目用途、内容与权利

作者目前免费提供本项目用于学习与测试，**无盈利行为**，不收取软件下载费、订阅费或观看费用。这是作者对当前用途与运营方式的说明，原创代码仍按标准 MIT 许可，第三方权利不由 MIT 授予。

应用浏览或播放的节目视频、音频、封面、字幕、评论及弹幕，来自 Bilibili 及其相关分发链路；项目不自建片源、不托管节目，也不提供面向用户的节目离线下载或导出功能。本项目无意篡改节目内容或损害平台、创作者及其他权利人的权益。

在线播放仍会传输媒体数据，并使用播放器 / 本机流桥的临时缓冲；应用还使用封面 / 列表缓存、本机记录及播放适配清单。以上用途声明不构成“没有任何缓存或处理”的保证，也不意味着已获得全部相关权利。原创界面、本地词库和合成诊断样本不是平台节目内容。

Bilibili、Samsung 及相关名称和标识的权利属于各自权利人；本项目对它们的提及仅用于说明兼容目标与内容来源，不代表品牌授权、合作、赞助、背书或认证。本项目目前没有可公开证明已获得 Bilibili 接口、内容或品牌授权的材料。

如 Bilibili、创作者或其他权利人认为本项目、软件包或项目材料可能侵犯其权益，请通过 [GitHub Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 联系作者。作者愿及时核查，并随时配合下架相关发行文件、停止相关分发或功能。请先在 Issue 中说明涉及的项目、内容和问题；不要公开身份证件、私人联系方式、账号凭据或其他敏感资料，可先请求建立私密沟通渠道。详见[权利联系说明](RIGHTS.md)。

## 使用前请了解

本项目是非官方第三方软件。Bilibili [用户使用协议](https://www.bilibili.com/blackboard/protocal/licence.html)第 5.6(3) 条对未经事先明确书面许可，通过软件获取平台服务、内容或数据作出限制。该条款与本项目访问平台的方式存在**现实的协议风险**；具体适用与法律后果需结合协议、实际行为及适用法律判断。可能出现接口拒绝、服务不可用、账号限制或权利投诉。

学习 / 测试、免费、开源、用户输入网址和权利人联系机制都不能替代平台许可或消除版权、商标及协议风险。使用前请阅读[协议风险分析](docs/BILIBILI_TERMS_RISK.md)、[隐私说明](PRIVACY.md)及平台原文；请尊重内容授权、会员和地区限制，不使用本项目绕过付费、数字版权保护或其他访问限制。涉及公开分发与具体地区法律问题时，建议作者取得平台书面许可并咨询具备相应执业资格的律师。

本项目按现状提供，原创代码的许可和免责声明以 [MIT License](LICENSE) 为准，并受适用法律约束；本说明不宣称免除法律规定不得排除的责任，也不保证平台服务持续可用。

## 当前状态

公开版本基线为 **0.65.1**，软件提交固定为 [`e7bc3740e0fed2f9b2c89f9a83755398fa11faf7`](https://github.com/johnnyzhao5619/BiliSofa/commit/e7bc3740e0fed2f9b2c89f9a83755398fa11faf7)。仓库记录的已安装工件为0.65.1。

0.65.1 是正式开源基线；这不表示完整 v1.0.0 验收已经完成，也不表示所有三星电视均兼容。当前仍有来源阻塞、暂停功能及条件未验证项，见[版本说明](docs/releases/0.65.1.md)。

**0.66.0 服务配置预览版**在上述基线上增加“先填写网站，再启用包内地址配置”。下载见 [v0.66.0](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0)；已完成编译与静态打包检查，尚未完成电视运行、安装和升级验收，不沿用 0.65.1 的设备结论，见[预览说明](docs/releases/0.66.0-service-configuration.md)。

## 可以做什么

| 使用场景 | 0.65.1 的范围 |
| --- | --- |
| 找视频 | 推荐、热门、排行榜、分区、视频 / UP / 番剧搜索；应用内拼音首字母选词 |
| 看视频和番剧 | 点播、分 P / 选集、队列、本地续播、可用画质及音轨选择、1× / 2× 播放 |
| 读字幕和讨论 | 字幕、弹幕、评论与回复阅读；评论、回复和弹幕不提供发送功能 |
| 使用自己的账号 | 扫码登录、私人片库、收藏夹、历史和稍后再看；保留点赞、收藏、关注和追番等互动 |
| 从手机投屏 | 电视前台显式开启接收后，使用未修改的官方 Bilibili App；已有 Android / iPhone 所请求路径的设备记录，iPad 等完整矩阵尚未完成 |
| 管理本机数据 | 播放与阅读偏好、搜索记录、本地记录 / 队列和脱敏诊断 |

接口可能拒绝请求或发生变化。画质、内容和互动均受账号权益、地区、来源及电视能力限制。图文 / 关注动态有来源阻塞；投币 / 三连暂停；云端进度双向接续未完成验收。直播和真实双账号不在当前交付范围。完整限制和证据见[版本说明](docs/releases/0.65.1.md)，不以此功能表代替验收结论。

## 第一次使用

0.66.0 首次打开，先填写 `www.bilibili.com`（也接受 `bilibili.com`），再启用本地服务配置。当前只支持此配置，输入地址不是平台授权，也不能作为任意网站浏览器。0.65.1 没有该步骤。

进入应用后可以先以游客浏览。需要私人片库或互动时，在电视上选择扫码登录，并在自己的官方 Bilibili App 内核对后确认。共享电视使用完毕后，可在设置的账号区域移除本机保存的会话；这不会注销 Bilibili 账号。

方向键移动焦点，确认键执行当前动作，返回键关闭当前层或回到上一页。投屏前让手机和电视位于同一可信局域网，在电视内开启接收。退出前台后不承诺接收、唤醒或自动启动。播放或互动出现结果未知时，先在官方客户端核对，不要反复提交。

## 隐私与使用风险

BiliSofa 不需要项目运营的账号中转服务器。电视会直接访问 Bilibili 和相应 CDN；平台仍能接收到请求及相关网络信息。本机也会保存会话、偏好和观看相关数据。详见[隐私说明](PRIVACY.md)。

协议与账号风险见上文及[协议风险说明](docs/BILIBILI_TERMS_RISK.md)。

## 开发与贡献

自有实现采用 TypeScript / Web UI、电视内 Worker / WASM / cURL 和 AVPlay，打包为一个 WGT。

```sh
git clone https://github.com/johnnyzhao5619/BiliSofa.git
cd BiliSofa
git switch --detach v0.66.0
npm ci --ignore-scripts
npm run build:app
```

上面生成 Web 阶段文件；**不等于得到可安装的完整 WGT**。原生模块和固定 Samsung 工具链另有前置条件，详见[开发说明](docs/DEVELOPMENT.md)与[工具目录](tools/README.md)。当前完整构建配方仍依赖本地 SDK / 原生产物准备，尚未证明陌生用户在干净环境可一步复现。产品版本来自 `apps/tv/foundation-config.xml`；根 `package.json` 是私有构建工程，不是 npm 发布版本。

欢迎提交兼容性反馈、文档修正和有依据的改进。普通问题请使用仓库 Issues，写明应用版本、电视型号、Tizen / 固件版本和最短复现步骤，并去除私人信息。参与前请读[贡献指南](CONTRIBUTING.md)、[社区规范](CODE_OF_CONDUCT.md)及[安全报告方式](SECURITY.md)。

## 许可证与致谢

原创代码和原创文档采用标准 [MIT License](LICENSE)。你可以按许可证使用、修改和分发，包括商业使用；保留版权及许可声明。第三方代码、数据和工具各自保留原许可，见[第三方声明](THIRD_PARTY_NOTICES.md)和[许可范围说明](docs/LICENSING.md)。

MIT 不授予 Bilibili / Samsung 的商标、内容、接口、账号或分发权限，也不承诺第三方服务持续可用。感谢开源依赖作者、平台文档维护者和提供设备反馈的参与者。

[产品要求](docs/PRD.md) · [架构](docs/ARCHITECTURE.md) · [当前实施状态](docs/IMPLEMENTATION_STATUS.md) · [剩余任务](docs/PRODUCT_CLOSURE.md) · [开源发布说明](docs/OPEN_SOURCE.md)
