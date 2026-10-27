# 安全报告 / Security

请不要在公开 Issue、PR 或聊天中提交密码、Cookie、token、二维码、带签名的播放 URL、Samsung 私钥 / 证书密码、DUID、私人地址或原始抓包。

## 影响版本与维护范围

公开基线为 0.65.1，服务配置预览版为 0.66.0。安全修复和后续版本是否发布以真实公告为准；项目没有承诺旧版本长期支持、审计认证或固定响应 / 修复时限。若私密会话或电视控制可能受影响，应优先停止受影响功能并保护自己的账号。

## 私密报告

使用 GitHub 的 **[Report a vulnerability](https://github.com/johnnyzhao5619/BiliSofa/security/advisories/new)** 私密报告入口。远端启用与访问核对记录见[公开发布记录](docs/releases/2026-10-26-publication.md)。

若看不到私密入口，可以先在普通 Issue 中仅请求建立安全联系，不包含漏洞细节、有效载荷或私人资料；待真实私人渠道建立后再提交脱敏报告。不要自行猜测邮箱或通过公开复现泄露凭据。

报告尽量包括版本 / 软件 SHA、受影响模块、风险范围和最短的合成或脱敏复现。不需要有效账号凭据、真实电视 DUID 或其他用户数据；不要在未授权设备 / 账号上测试。

## 泄漏与处置

账号凭据泄漏时，在官方客户端 / 平台采取相应会话失效和账号保护措施；Samsung 签名材料泄漏时按官方流程处理。删除公开帖子本身不保证副本消失，也不撤销已泄漏凭据。

实现原则：保留 TLS 验证和目的地限制；外部文本不作为代码执行；协议解析和资源有界；会话、普通缓存和 UI 分离；写入未知结果先查询，不自动重放。它们是设计要求，不是全仓或全设备已完成安全审计的结论。

Bilibili 服务协议、版权 / 品牌投诉及本项目软件漏洞需要分别处理，协议风险入口见[专项说明](docs/BILIBILI_TERMS_RISK.md)。

English: Never post credentials, signing keys, device identifiers or unredacted captures publicly. Use the repository's private vulnerability reporting button if available. If it is unavailable, request a private contact channel without disclosing details. No response SLA or long-term support is promised.
