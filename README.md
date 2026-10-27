# BiliSofa

**坐在沙发上，用三星电视看 B 站。**

[English](README.en.md) · [快捷安装](docs/QUICK_INSTALL.md) · [下载 0.66.0 预览版](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) · [0.65.1 正式基线](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1) · [协议风险](docs/BILIBILI_TERMS_RISK.md)

BiliSofa 是一个面向 Samsung Tizen 电视、使用遥控器操作的独立 Bilibili 第三方客户端。

这个项目最初来自一个很具体的不便：我使用的海外三星 Tizen 电视上没有可用的 Bilibili 应用，想在大屏幕看 B 站并不方便。BiliSofa 希望让浏览、搜索和观看都能直接在电视上完成，安装之后，日常使用无需一直开着电脑，也不需要 NAS、局域网网关或项目提供的云端服务。

本项目由社区独立开发，与 Bilibili、Samsung 无隶属、合作或官方认证关系。它连接的是中国大陆 Bilibili 服务，不等同于 Bilibili 国际版服务，也不增加内容的地区或会员授权。

## 用途、内容来源与权利声明

**作者将本项目免费提供用于学习与测试，当前无任何盈利行为。** 项目不收取软件下载费、订阅费或提供收费观看服务。此项描述作者当前的运营事实和用途，不改变标准 MIT 对原创代码的许可。

运行时展示的视频、音频、封面、字幕、评论和弹幕来自 **Bilibili 及其相应分发链路**；本项目不自建影视片源、不托管节目，不提供节目离线下载、导出或永久保存副本的功能，也不以篡改节目内容或损害 Bilibili / 内容权利人权益为目的。

这里的“不提供离线下载”不等于没有技术缓冲：在线播放必须传输媒体数据，应用 / 播放器有临时缓冲，应用还有封面 / 列表缓存及本机记录，并为本机播放生成适配清单。不能据此宣称绝无缓存、绝无处理或已经获得全部版权许可。原创 UI、本地词库和自制合成诊断样本也不是 Bilibili 节目内容。

**如 Bilibili 或其他权利人认为本项目涉嫌侵权，请通过 [Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 联系作者；作者愿及时配合核查，并愿随时下架相关发行文件、停止相关分发或功能。** 请勿在公开 Issue 上传私人身份证明或账号凭据，可先请求私人联系。详见[权利联系与处理](RIGHTS.md)。

学习 / 测试、非营利和愿意下架是用途与处置声明，**不是平台授权或无侵权结论**。仍应阅读下方协议风险。

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

## 安装

当前方式是 **Samsung TV Developer Mode 侧载 WGT**，需要目标电视的有效 Samsung TV 签名。可选[Apps2Samsung 图形安装路径](docs/QUICK_INSTALL.md)处理自定义 WGT 的本地签名 / 安装，或按官方 SDK / CLI 手动完成。它不是 Android APK，也没有承诺通过电视应用商店、USB 或电视浏览器直接安装。

1. 下载 [0.66.0 预览版 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt)；需要原定冻结版本时选 [0.65.1](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1)。无需自己编译。
2. 按[五步快捷安装](docs/QUICK_INSTALL.md)，让电脑与电视在同一局域网，开启电视 Developer Mode，在 Apps2Samsung 中选自定义 WGT，使用自己的 Samsung 账号 / 证书签名并安装。
3. 0.66.0 首次启动输入 `www.bilibili.com`，确认后进入应用。不要向维护者提交账号 Cookie、证书、密码或电视 DUID。第三方安装路径尚未独立实测；也可用[官方工具](docs/INSTALLATION.md)。

安装和升级时需要电脑；日常观看仍需要电视联网，但无需常开电脑。当前有分项实机证据的型号为 **Samsung UN58U8200FFXZC / Tizen 9.0**；安装配置要求 Tizen 9.0，其他型号与固件需分别确认。

## 第一次使用

0.66.0 首次打开，先填写 `www.bilibili.com`（也接受 `bilibili.com`），再启用本地服务配置。当前只支持此配置，输入地址不是平台授权，也不能作为任意网站浏览器。0.65.1 没有该步骤。

进入应用后可以先以游客浏览。需要私人片库或互动时，在电视上选择扫码登录，并在自己的官方 Bilibili App 内核对后确认。共享电视使用完毕后，可在设置的账号区域移除本机保存的会话；这不会注销 Bilibili 账号。

方向键移动焦点，确认键执行当前动作，返回键关闭当前层或回到上一页。投屏前让手机和电视位于同一可信局域网，在电视内开启接收。退出前台后不承诺接收、唤醒或自动启动。播放或互动出现结果未知时，先在官方客户端核对，不要反复提交。

## 隐私与使用风险

BiliSofa 不需要项目运营的账号中转服务器。电视会直接访问 Bilibili 和相应 CDN；平台仍能接收到请求及相关网络信息。本机也会保存会话、偏好和观看相关数据。详见[隐私说明](PRIVACY.md)。

**第三方客户端存在服务协议及账号风险。** Bilibili 的用户协议对非官方使用途径、未经书面许可通过软件获取服务 / 内容 / 数据等作出限制。开源、免费、自行编译或个人使用都不自动构成平台授权；可能遇到接口封锁、功能失效、账号限制或权利投诉。请先阅读[协议风险说明](docs/BILIBILI_TERMS_RISK.md)及其中链接的官方原文。

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
