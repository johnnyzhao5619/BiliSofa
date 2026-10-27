# BiliSofa

[访问 BiliSofa 门户](https://johnnyzhao5619.github.io/BiliSofa/)

**在三星电视上探索 B 站内容的独立第三方项目，免费用于学习和测试。**

[English](README.en.md) · [下载与版本说明](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0) · [报告问题](https://github.com/johnnyzhao5619/BiliSofa/issues)

BiliSofa 的起点是一个实际的不便：作者使用的海外 Samsung Tizen 电视上没有可用的 Bilibili 应用。项目尝试让用户通过电视遥控器浏览和观看；安装后日常使用不需要一直开着电脑，也不需要项目提供的云端服务。

BiliSofa 与 Bilibili、Samsung 无隶属、合作或官方认证关系。项目当前无盈利行为。

## 下载安装

当前提供 **0.66.0 预览版**，下载无需编译：

**[第一步：下载 BiliSofa 电视应用包（WGT）](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt)**

**第二步：选择一个安装工具和教程：**

| 你手头有什么 | 安装入口 | 操作说明 |
| --- | --- | --- |
| 安卓手机 | [下载 Apps2Samsung 安卓安装器](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-android.apk) | [手机一步一步安装](docs/QUICK_INSTALL_ANDROID.md)；可尝试不使用电脑 |
| Windows 电脑 | [下载安装器（.msi）](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-win-x64.msi) | [电脑一步一步安装](docs/QUICK_INSTALL.md) |
| Mac 电脑 | [Apple 芯片（.dmg）](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-arm64.dmg) · [Intel 芯片（.dmg）](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-x64.dmg) | [电脑一步一步安装](docs/QUICK_INSTALL.md) |
| Linux | [选择对应版本](https://github.com/Apps2Samsung/Apps2Samsung/releases/tag/v2.8.3) | 参考[电脑安装步骤](docs/QUICK_INSTALL.md)及上游文档 |

上表的 Apps2Samsung 是独立第三方工具，下载链接指向它的官方 GitHub。安卓 APK 是**手机上的安装工具**，不是要安装在电视上的 BiliSofa；电视应用包是上面的 `.wgt` 文件。

### 安装需要什么？

需要声明支持 **Tizen 9.0** 的 Samsung 电视、电视遥控器、与电视处于同一局域网的安装设备，以及工具需要新建签名证书时使用的 Samsung 开发者账号。你需要在电视上开启 Developer Mode，选中下载的 WGT，按安装器提示为自己的电视签名。签名材料和账号留在自己的设备上，不需要发给 BiliSofa 维护者。参见 [Samsung 证书要求](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)。

**能否直接安装？** 其他用户可以直接下载 WGT，无需自己编译；该包是未签名包，不能保证像应用商店那样点一下就能安装到所有电视。手机 / 电脑图形安装路径依据 Apps2Samsung 上游文档及源码整理，**尚未用 BiliSofa 完成独立实测**。0.66.0 已完成编译和静态打包检查，尚未完成电视安装、升级和运行验收；型号、固件、网络和证书都会影响安装结果。

首次打开 0.66.0，输入 **`www.bilibili.com`** 或 `bilibili.com`，确认后启用包内已有的服务配置。输入网址不等于平台授权，也不会把地址从安装包中删除。遇到问题可到 [Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 描述版本、电视型号和脱敏后的错误。

WGT 的 SHA-256：`13717f95c85a73e5397c5eac7a315d918eb67bf04f77d4d1ab3444d145e78477`。签名后文件摘要变化属正常；完整校验文件见 [0.66.0 Release](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0)。发行附件中的文档是发布时快照，请优先使用本页链接的最新安装教程。

## 项目功能与状态

项目已有推荐 / 搜索、点播 / 番剧、选集、字幕与弹幕阅读、评论 / 回复阅读、扫码账号和电视前台投屏等实现；内容、账号、地区、接口和设备能力会影响实际使用。评论、回复和弹幕为只读；直播和真实双账号不在当前交付范围。图文 / 关注动态存在来源阻塞，投币 / 三连暂停，双向云进度等仍未完成验收。详见[预览版说明](docs/releases/0.66.0-service-configuration.md)和[状态台账](docs/PRODUCT_CLOSURE.md)。

仓库记录的已安装工件为0.65.1；这是维护者过去的设备记录，不能证明 0.66.0 已通过设备验收。完整 v1.0.0 验收仍未完成。

## 内容来源与权利联系

作者免费提供本项目用于学习与测试，当前不收取软件下载费、订阅费或观看费用，**无盈利行为**。电视应用浏览或播放的节目视频、音频、封面、字幕、评论和弹幕来自 Bilibili 及其相关分发链路；项目不自建片源、不托管节目，也不提供面向用户的节目离线下载或导出功能。项目无意篡改节目内容或损害平台、创作者及其他权利人权益。

在线播放仍会传输媒体数据，并使用临时缓冲、封面 / 列表缓存、本机记录及播放适配清单。上述说明不构成零缓存、零处理或已获得全部权利的保证。Bilibili、Samsung 及相关名称和标识的权利属于各自权利人；本项目提及它们仅为说明兼容目标和内容来源，不代表品牌授权、合作或背书。

如 Bilibili、创作者或其他权利人认为本项目、软件包或项目材料可能侵犯其权益，请通过 [GitHub Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 联系作者。作者愿及时核查，并随时配合下架相关发行文件、停止相关分发或功能。请勿在公开 Issue 中提交身份证件、私人联系方式、账号凭据或其他敏感信息；可先请求私密沟通。详见[权利联系说明](RIGHTS.md)。

## 使用风险与隐私

本项目是非官方第三方软件。Bilibili [用户使用协议](https://www.bilibili.com/blackboard/protocal/licence.html)第 5.6(3) 条限制未经事先明确书面许可通过软件获取平台服务、内容或数据；本项目的访问方式存在现实协议风险。学习 / 测试、免费、开源、用户输入网址和愿意下架都不能替代平台许可或消除版权、商标及协议风险。可能出现接口拒绝、服务不可用、账号限制或权利投诉。使用前请阅读[协议风险分析](docs/BILIBILI_TERMS_RISK.md)和平台原文，尊重会员、地区及内容授权，不绕过付费、数字版权保护或其他访问限制。

电视直接连接 Bilibili 及相应 CDN；平台仍可能接收连接和请求信息。本机保存会话、偏好及观看相关数据，详见[隐私说明](PRIVACY.md)。公开分发与具体地区法律问题，建议作者取得平台书面许可并咨询具备相应执业资格的律师。

## 开发、许可与反馈

原创实现使用 TypeScript / Web UI、电视内 Worker / WASM / cURL 和 AVPlay。源码与原创文档采用标准 [MIT License](LICENSE)，第三方组件保留其各自许可，详见[第三方声明](THIRD_PARTY_NOTICES.md)和[许可范围](docs/LICENSING.md)。MIT 不授予第三方内容、商标或接口权利。项目按现状提供，许可与免责声明以 MIT 和适用法律为准，不排除法律规定不得排除的责任。

从源码构建请阅读[开发说明](docs/DEVELOPMENT.md)和[工具目录](tools/README.md)；Web 阶段构建不等于可安装 WGT，干净环境全链构建尚未证明。欢迎按[贡献指南](CONTRIBUTING.md)提交改进；安全问题请按[私密报告方式](SECURITY.md)处理。
