# 用户选择网站：实现与表述边界

初次调研：2026-10-26；当前源码与本地发行工件核对：2026-10-27。以下记录技术事实和基于官方条款的风险分析，不是平台授权或法律裁判。

## 对外统一描述

首次使用时，由用户自行填写想观看的网站地址，例如 `www.bilibili.com` 或 `bilibili.com`，并确认启用。目前仅支持 Bilibili；后续启动可复用已保存的选择，具体观看内容由用户自行选择。

网站输入用于匹配随安装包提供的服务配置。相关 API / CDN 地址、登录、浏览、媒体适配和保留的账号互动由应用提供，不能描述为用户提供了所有服务地址，或应用只有通用本地播放功能。项目不自建片源、不托管节目、不提供节目离线下载；在线播放仍有必要传输、缓冲和缓存。

## 代码核对

| 环节 | 源码事实 |
| --- | --- |
| 首次输入 | [foundation-entry](../../apps/tv/src/app/foundation-entry.ts) 创建空网址输入框，示例提示从本地支持目录读取；用户确认成功后才激活配置并启动业务模块 |
| 后续启动 | 同一入口先读取已保存的用户选择，重新校验配置后可直接启动；不是每次启动都要求重新输入 |
| 允许范围 | [service-configuration](../../apps/tv/src/platform/service-configuration.ts) 仅接受域名或 HTTPS 来源，并与[本地目录](../../apps/tv/service-providers/catalog.json)匹配；未知网站拒绝，不直接请求输入的网址 |
| 配置来源 | [本地 profile](../../apps/tv/service-providers/bilibili-web.json) 已包含 Bilibili、账号、API、图片与 CDN 域名和请求模板，由开发者随包提供 |
| 执行模块 | [Worker 工厂](../../apps/tv/src/platform/service-worker.ts)、[引导代码](../../platform/wasm-network/src/service-bootstrap.ts)与[配置合同](../../packages/contracts/src/service-configuration.ts)在业务执行前传递、校验并激活配置；原生模块使用配置槽位 |
| 平台声明 | [构建脚本](../../tools/build-foundation-app.mjs)复制本地配置并生成图片 origin；XML / HTML 中仍有必须随包声明的域名 |

本地 `dist/releases/0.66.0/BiliSofa-0.66.0-unsigned.wgt` 的 SHA-256 与公开校验值一致：`13717f95c85a73e5397c5eac7a315d918eb67bf04f77d4d1ab3444d145e78477`。工件中目录与 profile 均存在，profile 与源码逐字节一致；扫描 JS / WASM 未发现所核对的 Bilibili、hdslb、bilivideo 域名字符串，JSON、XML 和 HTML 仍包含配置域名。

首次输入示例提示已在当前源码中更新，既有发行工件尚未重建。上述工件检查证明的是该工件内容，未新增电视运行、首次启动网络抓取或全功能验收。旧 0.65.1 没有此选择流程，历史文档和工件不因此改变。

## 法律与宣传边界

Bilibili 官方[用户使用协议](https://www.bilibili.com/blackboard/protocal/licence.html)第 5.6(3) 条对未经明确书面许可、通过软件等方式获取平台服务、内容或数据设限。用户输入域名是一项主动选择，不能据此认定已获平台许可或排除合同、内容、品牌及隐私问题；实际结论仍取决于实现、使用方式、权利材料和适用法律。

“域名值从运行代码移到配置文件”和“开发者未提供平台地址”是不同事实。当前实现支持前者，不支持后者。与通用本地播放器的类比也不能替代对平台专用浏览、登录、接口和互动功能的说明。

免费、学习用途、开源和愿意下架可以如实说明，但均不是自动免责依据。详细边界见[协议风险](../BILIBILI_TERMS_RISK.md)、[权利联系](../../RIGHTS.md)和[隐私说明](../../PRIVACY.md)。
