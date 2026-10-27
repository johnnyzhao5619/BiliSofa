# 五步安装 BiliSofa

[English](QUICK_INSTALL.en.md) · 更新：2026-10-26

**无需编译。下载 WGT，用电脑上的图形工具为自己的电视签名并安装；日常观看可关闭电脑。** 适用于包声明的 Tizen 9.0 范围；其他系统版本不在当前兼容承诺内。

## 1. 下载应用和安装工具

- **[下载 BiliSofa 0.66.0 预览版 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt)**：包含首次填写网站功能。此版本已编译，尚未完成电视运行 / 安装验收。
- 需要原定 `e7bc374` 软件时，选 **[0.65.1 正式基线](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1)**；它没有首次填写网站步骤。
- 安装工具 Apps2Samsung：**[Windows](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-win-x64.msi)** · **[Mac Apple 芯片](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-arm64.dmg)** · **[Mac Intel](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-x64.dmg)** · **[Linux / 其他版本](https://github.com/Apps2Samsung/Apps2Samsung/releases/tag/v2.8.3)**。

Apps2Samsung 是独立第三方工具，不随本项目分发。[上游 v2.8.3 文档](https://github.com/Apps2Samsung/Apps2Samsung/blob/v2.8.3/README.md)提供自定义 WGT 和签名安装能力；**BiliSofa 尚未通过这条安装路径独立实测**。不愿使用第三方工具时，见 [Samsung 官方工具安装](INSTALLATION.md)。

在所选版本的 Release（[0.65.1](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.65.1) 或 [0.66.0](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0)）下载 `SHA256SUMS.txt` 校对同名 WGT。Mac 用 `shasum -a 256 文件名.wgt`，Windows PowerShell 用 `Get-FileHash .\文件名.wgt -Algorithm SHA256`。完整下载 ZIP 另含本指南、许可、隐私和来源记录。

## 2. 打开电视 Developer Mode

电脑和电视连接同一可信局域网。在电视打开 **Apps → App Settings**，用遥控器输入 **12345**，将 **Developer Mode** 设为 **On**，填入安装电脑的局域网 IP，按提示重启电视。不同固件菜单可能不同，见 [Samsung 官方设备指南](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)。

## 3. 在安装器选择电视和 WGT

打开 Apps2Samsung，选择 / 连接自己的电视，找到 **Custom WGT / 自定义 WGT**，载入刚下载的 WGT：0.66.0 选择 `BiliSofa-0.66.0-unsigned.wgt`，0.65.1 选择 `BiliSofa-0.65.1-unsigned.wgt`。无需在工具的社区应用目录找到 BiliSofa。界面名称以实际工具版本为准。

## 4. 按提示签名并安装

使用自己的 Samsung 账号，按安装器提示在 Samsung 官方页面完成登录及目标电视的证书步骤，然后执行安装。**Samsung TV 要求有效签名；这份 unsigned 包供安装器本地签名，不是免签包。** 作者和分发证书的要求见 [Samsung 证书文档](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)。

保管好自己的 Author 证书，更新继续使用同一 Author 和应用身份 `BiliSofa01.TV`。不要向维护者提交密码、证书、Cookie 或 DUID；遇到 Author 冲突先找回旧证书，不默认卸载清数据。无需 root、刷机或关闭 TLS。

## 5. 在电视输入网站并开始使用

打开 BiliSofa，**0.66.0 首次启动输入 `www.bilibili.com` 并确认**，启用包内对应配置后进入游客 / 账号界面。也接受 `bilibili.com`；当前不支持任意网站。此处不要填 Cookie、token 或 API 密钥。0.65.1 直接进入原应用。

先以游客浏览；需要私人片库时再用自己的官方 Bilibili App 扫码并核对确认。方向键移动、确认键选择、返回键返回。安装完成后可关闭电脑。手机投屏需在电视前台主动开启接收，并与手机处于同一局域网。

## 遇到问题

| 问题 | 先做什么 |
| --- | --- |
| 找不到电视 | 确认同一局域网、电脑 IP 正确、Developer Mode 已开启并已重启；检查路由器的设备隔离 |
| 签名 / 安装失败 | 查看安装器错误及 Samsung 证书步骤；更新时核对原 Author。不要先卸载应用 |
| 无法输入 / 加载网站配置 | 确认使用 0.66.0 且填写上述支持地址；仍失败时保留错误信息并反馈，不反复重装 |
| 接口 / 播放失败 | 先在官方客户端确认内容和账号状态；安装成功不等于所有设备 / 内容都兼容 |

通过 [Issues](https://github.com/johnnyzhao5619/BiliSofa/issues)反馈应用版本、电视型号、Tizen / 固件版本与脱敏错误。不要上传二维码、私人 IP、DUID、Cookie、证书或原始抓包。

本项目免费供学习 / 测试，当前无盈利；内容来自 Bilibili 及其分发链路，在线播放仍有必要缓冲 / 缓存。输入网址和自行签名不消除平台协议风险。详见 [权利与下架联系](../RIGHTS.md)、[隐私](../PRIVACY.md)、[协议风险](BILIBILI_TERMS_RISK.md)。
