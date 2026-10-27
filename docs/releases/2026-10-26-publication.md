# 2026-10-26 公开发布记录

关联 F01–F20 / W07 / R14。用户已明确授权公开仓库、构建可下载版本和便捷安装手册。已执行并回读确认；本页记录实际结果。发布时间为 2026-10-26 21:15 America/Toronto（UTC 2026-10-27 01:15）。

## 版本与材料

- 0.65.1 正式基线软件精确固定 `e7bc3740e0fed2f9b2c89f9a83755398fa11faf7`；WGT SHA-256 `dd778893ca4e26c2ca462cf757dc31fd7db00b56b02b2f4693c595bfa6a5b783`。
- 0.66.0 服务配置预览固定源码 `c17bf9bbb7961c9cd4c501f9ef545d965caa2177` / `v0.66.0`，尚无本轮 TV 安装或运行验收。两版附件的配套文档提交均为此 SHA；发布完成记录是其后的文档更新。
- 软件、文档、下载包及哈希独立记录，0.65.1 的配套新文档不冒充旧源码 tag 自带内容。
- 本地未接受 logo 草稿不加入发布提交，应用图标沿用现有已跟踪文件；不会推送本地 Codex checkpoint refs。

## 敏感资料检查

已对本地全部 refs 的 Git 历史运行 gitleaks 8.30.1（redacted，报告只留在忽略目录）。24 个命中逐项核对为本机 storage key、十六进制字符校验字母表、合成测试 token 或测试中的公开 WBI 样例参数；未发现需要发布有效账号 / 签名凭据的命中。无证书、私钥、环境文件、原始抓包或日志扩展文件进入历史文件清单。当前私网地址字面量出现在合成测试夹具。

读取全部历史图像 blob 并用六张索引图审阅 67 个图像对象：公开分支中的 UI 截图为合成数据 / 占位画面，无登录二维码、私人片库或有效账号凭据；其余包含仅本地 checkpoint 的 logo 草稿，未加入此次 main 推送。此检查不是全量第三方漏洞审计或法律结论。

最终待发布源代码快照的 gitleaks 扫描同样出现 24 个上述类型的误报；两版 WGT 已解包核对路径与私钥标记。解包 WGT 的 gitleaks 扫描每版 20 个命中，均为构建输入 SHA-256 或本机 storage key；没有发现有效凭据。最终附件摘要已与 GitHub 服务器记录逐项比较，并完成匿名 WGT 下载回读；不以 `.gitignore` 代替历史检查。未取得 Bilibili 书面授权，按用户授权免费公开分发，并公开披露协议 / 权利风险。

## 远端执行

- 已提交并推送授权范围的实现 / 文档；本地未跟踪 logo 保留。两个 annotated tag 均已推送：`v0.65.1` 指向原 e7bc374，`v0.66.0` 指向 c17bf9b，没有强制移动旧 tag。
- [仓库](https://github.com/johnnyzhao5619/BiliSofa) 已从 private 改为 **public**；GitHub 回读 `private: false`、`visibility: public`、MIT、Issues 开启。
- GitHub private vulnerability reporting 已启用，API 回读 `enabled: true`；[私密报告入口](https://github.com/johnnyzhao5619/BiliSofa/security/advisories/new)提交时需要 GitHub 登录。密钥扫描及推送保护均回读 enabled；没有声称所有附加安全功能均开启。
- 两个 Release 先在草稿备齐附件，再公开：0.65.1 为正式 / latest，0.66.0 为 prerelease。GitHub 服务器的全部 7 / 14 个附件大小与 SHA-256 均逐项匹配本地。
- 使用系统 curl，开启 TLS 验证且无认证信息，匿名请求仓库、Issues、两个 Release 和快捷手册均返回 HTTP 200；两个 WGT 均完整下载，SHA-256 与本地一致。未降低 TLS 验证来完成回读。
- 没有启用 / 声称 release immutability 或生成 attestation；没有签名、连接 / 部署 TV、运行应用测试或取得新增设备验收。

## 公开下载与摘要

[五步安装](../QUICK_INSTALL.md) · [English](../QUICK_INSTALL.en.md)。不需要自己编译；下载 WGT 后在本机为自己的电视签名，仍需 Developer Mode 与有效证书。Apps2Samsung 路径依据上游文档，尚未独立实测。

| 版本 | Release / 文件 | 字节 | SHA-256 |
| --- | --- | ---: | --- |
| 0.65.1 | [BiliSofa-0.65.1-unsigned.wgt](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.65.1/BiliSofa-0.65.1-unsigned.wgt) | 19557394 | `dd778893ca4e26c2ca462cf757dc31fd7db00b56b02b2f4693c595bfa6a5b783` |
| 0.65.1 | [BiliSofa-0.65.1-download.zip](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.65.1/BiliSofa-0.65.1-download.zip) | 19594153 | `4bca20287969f7e27e36a96ade5ddeeaef42b911424b331065b3fbd8f5db773f` |
| 0.66.0 | [BiliSofa-0.66.0-unsigned.wgt](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt) | 19591157 | `13717f95c85a73e5397c5eac7a315d918eb67bf04f77d4d1ab3444d145e78477` |
| 0.66.0 | [BiliSofa-0.66.0-download.zip](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-download.zip) | 28375164 | `91f7102ae913d09ceec987acc04f3ced8de5863e5d3659a99d73d24c2b15a8e9` |

完整附件清单、源码 / 文档身份与其余校验见各 Release 的 `release-manifest.json` 和 `SHA256SUMS.txt`。0.65.1 另有独立软件源码 / 配套文档快照；0.66.0 下载 ZIP 包含源码快照、快捷手册、MIT、第三方声明、隐私、权利及配置 ADR。用户自签名后包摘要改变属正常。

## 验证边界

0.66.0 TypeScript 无输出检查、模块 / 全局边界（319 modules）、文档链接 / 状态门禁、Git whitespace、14 个原生模块重新编译 / 链接、Web 构建与打包门禁完成；包内 JS / WASM 业务域名字面量扫描为零，域名仍在 JSON 和平台声明中明文存在。0.65.1 的 Web 层从精确 Git 归档重建，原生复用并由原门禁核对，冻结 WGT 未改变。这不是陌生环境全链复现。

没有执行应用单元 / native 测试、浏览器交互、Worker / WASM 运行时、遥控 / IME、扫码 / 会话、真实账号写入、播放 / 投屏、第三方安装器或电视安装 / 升级验收。保留完整 v1.0.0 尚未完成项，0.65.1 的既有分项设备结果不外推到 0.66.0。
