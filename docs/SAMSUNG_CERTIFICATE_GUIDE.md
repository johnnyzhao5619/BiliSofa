# BiliSofa：创建自己的 Samsung TV 签名证书

日期：2026-10-14；适用 W01 内部探针。目标 UN58U8200FFXZC，Developer Mode 已开启，SDB 已确认 profile tv / Tizen 9.0。

用户已说明这台电脑先前安装应用所用证书属于其他开源项目。那些文件保留，但不能作为 BiliSofa 的作者身份导入或使用。当前 BiliSofa 使用用户自己的 Author 和新 Public Distributor，两个内部探针已成功签名/安装/启动。

当前状态：首次默认 Distributor 于 2022 年过期导致 118/-12；用户授权后，官方 SDK 单独生成本电视适用的新 Public Distributor，原 Author 字段和文件 hash 不变，实际安装/启动成功。详见 [签名部署记录](SIGNING_DEVICE_RECORD.md)。以下向导用于今后用户自行恢复/续期；无需重复创建当前资源。

## 证书的作用

Samsung 签名 profile 包含 Author（作者身份）及 Distributor（分发权限和测试设备）证书。电视安装时检查包的签名。由用户自己的 Samsung Developer 账号在官方工具内创建新的 Samsung TV profile；不需要购买网站 HTTPS 证书。以后同一应用升级保留这个 Author，并安全备份其文件和密码。[官方证书说明](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

## 在这台电脑创建

1. 保持电视开启，电脑和电视在可直接连接的局域网。已连接目标，无需把 IP 或 DUID 发到聊天。
2. 打开本项目隔离安装的官方 Certificate Manager：`<仓库>/.local/tizen-studio/tools/certificate-manager/Certificate-manager.app`。主程序已通过下列 vendor launcher 启动，但自动化 UI 工具返回 `Invalid app`，尚未核查可见窗口；必要时手动运行命令。若出现迁移旧 profile 的提示，取消迁移；不要导入其他项目的身份。
3. 点击 `+` → `Samsung` → `TV`。Profile Name 填 `BiliSofa`。若该名字已存在，先核实所有者，不能覆盖。
4. 选择 `Create a new author certificate`。作者名称填自己的名称，证书密码自行设置并保管；不要发给代理或写入项目。
5. 按官方向导登录自己的 Samsung Developer 账号、完成验证码。账号注册或条款同意也由用户完成。
6. 备份位置选仓库外，例如 `~/.local/share/BiliSofa/certificates`。保存 Author 和 Distributor 及相关 profile；另做一份安全备份，密码单独保存。
7. 选择 `Create a new distributor certificate`。当前探针使用 `Public`；不以签名选项推断获得 partner 权限。
8. 在已连接设备列表中将这台 UN58U8200FFXZC 加入 DUID 列表（设备行旁 `+`）。DUID 只留在官方向导和私密签名配置中。
9. 完成向导，在 profile 列表确认 `BiliSofa` 出现。只需告知“BiliSofa profile 已创建”；无需发送密码、证书或 DUID。[官方向导步骤](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

Samsung Certificate Extension 已安装 2.0.75。官方说明：2025-09 后低于 2.0.73 的旧扩展不能创建证书；遇到旧教程时不要降级。[官方 SDK 安装说明](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)

Certificate Manager 3.0.0 主程序安装 exit 0，包管理器已更新到 0.5.67；CLI 仍为 2.5.25。若界面未显示，在终端运行：

```sh
<仓库>/.local/tizen-studio/tools/certificate-manager/Certificate-manager.app/Contents/MacOS/CertificateManager
```

上述向导步骤依据官方文档；当前生成资源和部署证据另见 SIGNING_DEVICE_RECORD。Codex UI 工具不能绑定该已运行的官方进程（`Invalid app`）；若用户也无法看到窗口，应报告这一工具故障，不能把它当成证书申请成功，也不要绕过系统安全提示。

## 替代界面与已知工具状态

官方新版 VS Code 流程是 Tizen 活动栏 → ACTIONS → `Create Certificate` → profile 名 → `Create Samsung Certificate` → Author Details / Distributor Details → 选择设备 → Create → Samsung 登录。[官方 VS Code 证书步骤](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode/creating-certificates.html)

本机独立 VS Code extension 目录已安装 `tizen.vscode-tizen-csharp@10.4.3`。官方 overview 链接指向的 TV 辅助扩展 `samsungtvsdk.tv-vscode-tizen` 在本次 Marketplace CLI 查询返回 `Extension not found`，不把安装尝试记为成功；主路线使用现有官方 Certificate Manager。上述 VS Code 私有目录不改变用户日常编辑器的扩展/profile。[官方扩展入口](https://developer.samsung.com/smarttv/develop/tools/additional-tools/vscode-extension-new.html)

## 创建后签名与安装

开发代理核查 profile 的非敏感元数据和设备适用性，执行 `npm run sign:app`（`tools/sign-foundation-app.py`），输出签名包到仓库外并记录包 SHA-256，再按逐版本授权用 `npm run deploy:app` 安装/启动。工具拒绝 SDK 默认 Distributor、过期/尚未生效的证书和不匹配资源；它不替代电视的证书链信任验证。新 Author 与旧第三方应用不互相替换。逐版本结果见[签名部署](SIGNING_DEVICE_RECORD.md)；W01 探针时期的独立命令见[探针指南](archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md)。
