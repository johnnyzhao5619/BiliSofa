# 使用 Samsung 官方工具安装 BiliSofa

本指南面向第一次侧载的使用者。下文命令以 0.66.0 预览版为例；本文为安装指导；尚未完成针对该预览版的独立电视安装验收。

## 想用更少步骤安装

已有未签名 WGT 的使用者可以先看[Apps2Samsung 快捷路径](QUICK_INSTALL.md)。该第三方工具支持选择自定义 WGT 并处理签名 / 安装，但尚未在新用户电视上独立验证 BiliSofa 安装结果；仍需要 Developer Mode、Samsung 账号 / 证书和相应权限。遇到问题使用下文官方 SDK / CLI 路线，不将便捷工具当成绕过签名的方式。

## 开始前

| 条件 | 说明 |
| --- | --- |
| 电视 | Samsung 消费级 Tizen TV；包声明最低 Tizen **9.0**，已记录分项设备证据的型号为 UN58U8200FFXZC。不是所有 Tizen 9.0 电视的兼容保证；旧版 Tizen 不在此包声明范围 |
| 电脑 | 安装 / 签名 / 更新时使用；日常观看后可关机 |
| 网络 | 安装时电脑和电视在可互通的可信局域网；观看时电视可以连接 Bilibili 及 CDN。投屏时手机也在同一局域网 |
| 开发工具 | 官方 Tizen Studio / TV Extension、Samsung Certificate Extension、Certificate Manager，以及可调用的 `sdb`、`tizen` CLI |
| 账号与证书 | 自己的 Samsung Developer 账号、Author / Distributor 证书和目标电视 DUID；不使用其他项目或维护者的身份 |
| 发布材料 | 本仓库 Release 的未签名 WGT、SHA-256、版本说明和许可材料。仅下载源码 ZIP 不会得到完整可安装包 |

先阅读[服务协议风险](BILIBILI_TERMS_RISK.md)与[隐私说明](../PRIVACY.md)。BiliSofa 不提供内容授权或会员权益，不以换区、代理、破解或关闭 TLS 校验作为安装步骤。

## 1. 下载与核对

打开本仓库 [Releases](https://github.com/johnnyzhao5619/BiliSofa/releases)，确认所选版本及完整软件提交。不要使用陌生来源声称的“免签直装版”。

下载 `BiliSofa-0.66.0-unsigned.wgt` 和随 Release 提供的校验文件、版本 / 许可说明。在全新工作目录中操作，先计算哈希并逐字比较 Release 中同名文件的 SHA-256：

```sh
# macOS
shasum -a 256 BiliSofa-0.66.0-unsigned.wgt
# Linux
sha256sum BiliSofa-0.66.0-unsigned.wgt
```

Windows PowerShell：

```powershell
Get-FileHash .\BiliSofa-0.66.0-unsigned.wgt -Algorithm SHA256
```

哈希相同只能说明文件与公布的校验值一致；仍须核对仓库来源。各版本哈希以对应 Release 的 `SHA256SUMS.txt` 和来源 manifest 为准，不要跨版本混用。

## 2. 安装官方工具

按 Samsung 的 [Installing TV SDK](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) 安装 Tizen Studio、TV Extension 和 Samsung Certificate Extension，并确保 Certificate Manager 可用。安装位置和 CLI 启动方式因系统而异；下文假定 `sdb` 和 `tizen` 已在 PATH 中，Windows 可使用对应的 `.exe` / `.bat` 启动器。

普通安装者不需要 Node、npm 或 Samsung Emscripten。它们用于从源码构建，不是安装已构建 WGT 的前提。

## 3. 开启电视开发者模式并连接

Samsung 官方当前流程：在 Smart Hub 的 **Apps → App Settings** 中用遥控器或屏幕数字键盘输入 `12345`，将 Developer Mode 设为 On，填写**开发电脑的局域网 IP**并重启电视。固件界面可能不同，以[官方 TV Device 指南](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)为准，不修改工程菜单或刷机。

在 Tizen Studio → Tools → Device Manager → Remote Device Manager 添加电视并连接。也可在终端执行以下命令；将 `TV_IP` 替换成自己的电视地址，不要原样输入占位符：

```sh
sdb connect TV_IP:26101
sdb devices
```

记录 `sdb devices` 返回的目标 serial，后续用它替换 `TV_SERIAL`。不要将开发端口转发到互联网，也不要在公开 Issue 上传真实 IP、DUID 或完整设备输出。

## 4. 创建自己的 Samsung TV 证书

在 Certificate Manager 选择 **+ → Samsung → TV**，新建自己的 profile（以下示例名为 `BiliSofa`）。首次安装创建自己的 Author，创建 Distributor 时加入目标电视 DUID；已有自己签过的 BiliSofa 要保留原 Author。向导登录及同意厂商条款由使用者自己完成。

证书和密码保存 / 备份在仓库之外。DUID 只在自己的官方证书工具内填写，**不需要发给维护者，不要把私钥或 Cookie 上传给代签网站**。官方依据：[Creating Certificates](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)。

## 5. 本地签名

未签名包不能直接安装。以下以 macOS / Linux shell 为例，在空工作目录内将 WGT 解压到新的 `unsigned` 子目录，输出到新的 `signed` 子目录：

```sh
mkdir unsigned signed
unzip BiliSofa-0.66.0-unsigned.wgt -d unsigned
tizen package -t wgt -s BiliSofa -o ./signed -- ./unsigned
```

Windows 可用受信任的 ZIP 解压工具解压 WGT 到空目录，再执行同样的 `tizen package` 命令；替换路径与 profile 名称。

检查解压后的 `config.xml`：版本应为 `0.66.0`，Application ID 为 `BiliSofa01.TV`，package 为 `BiliSofa01`。来自项目的 unsigned 包应没有 `author-signature.xml` 或 `signature1.xml`；若存在，先停止并核对来源，不把不明签名包当作这里的未签名附件。保留包内许可证、manifest 与其他文件，不改版本或身份。

签名后以工具实际生成的 `.wgt` 文件名为准；它的哈希会与原未签名包不同，这是预期行为。签名 / 重打包流程依据 [Samsung CLI 文档](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)。仓库 `npm run sign:app` / `deploy:app` 使用维护者本机布局及私密 manifest，**不是新使用者的通用安装入口**。

## 6. 安装并启动

以下 `SIGNED_FILE.wgt` 是 `signed` 目录中实际输出的文件名，`TV_SERIAL` 是刚才确认的 serial：

```sh
tizen install -n SIGNED_FILE.wgt -s TV_SERIAL -- ./signed
tizen run -p BiliSofa01.TV -s TV_SERIAL
```

也可以在电视 Apps 中启动 BiliSofa。安装成功的 CLI 回执不等于播放和所有功能均通过；先观察电视界面、遥控导航和一段自己有权观看的普通视频。操作完毕可用 `sdb disconnect TV_IP:26101` 断开开发连接。不要把持续运行的终端、电脑或 SDB 连接当作日常观看条件。

## 7. 登录、投屏与本机数据

- 可以先游客浏览。需要登录时在电视内选择扫码，使用自己的官方 Bilibili App 扫码并确认；检查手机上的授权页面，勿扫描来历不明的登录二维码。
- 投屏需先在电视前台开启接收，并让官方手机 App 与电视在同一可信局域网。手机与电视账号独立；不承诺所有发送端版本、后台唤醒或跨网段发现。
- 账号区域可移除本机保存的会话；搜索记录、本地观看记录 / 队列、访客标识分别在相应设置中管理。移除会话不等于删除全部本机数据，也不注销平台账号。
- 写入超时或结果未知时，先到官方客户端核对。投币 / 三连当前暂停，不将旧记录自动重发。

## 更新、回退与卸载

升级前保存原安装包和自己的 Author / profile 备份，核对新版本的身份、数据格式及限制。后续版本继续使用同一 Author 和 Application ID；升级保持数据的已有证据限于项目记录中的具体路径，不能保证换证书、跨任意版本或其他电视也保持数据。

出现 Author 不匹配时，找回自己的原 Author。**不要把先卸载清数据作为默认修复**；不同 Author 之间未提供无损迁移流程。回退可能受到版本策略和存储格式限制，跨版本回退没有完整验收；不要承诺任意降级或用重建旧包冒充原包。

决定卸载前，先按需要移除会话、处理本机记录并在官方客户端核对账号安全。电视 Apps 的删除操作可能清除本机数据；没有已验收的通用导出 / 恢复功能。卸载不会注销 Bilibili 账号，也不会撤销已完成的点赞、收藏或其他云端操作。

## 常见问题

| 现象 | 处理 |
| --- | --- |
| 无法连接电视 | 核对开发电脑 IP、Developer Mode、电视重启、同网段 / AP 隔离与电脑防火墙；确认目标后重连一次，勿循环重装 |
| 证书 / 安装权限错误、118 / -12 | 核对 Samsung TV profile、证书有效期、电视时间、Distributor 中的本机 DUID，以及 Device Manager 的安装许可（如工具要求）；勿使用 SDK 默认过期证书或关闭签名检查 |
| Author 不匹配 | 找回原 Author 和正确 profile；卸载会有数据损失风险，不自动执行 |
| 提示系统版本不支持 | 当前包最低声明 Tizen 9.0；不要仅编辑 XML 降低版本冒充兼容 |
| HTTP 412、API -352、要求登录 | 可能是平台风控 / 来源限制；停止密集重试，必要时在官方客户端核对。不是更换证书或重复安装能修复的问题 |
| 能启动但不播放 / 不发现投屏 | 核对内容权益、地区、网络、前台接收和设备能力；按版本说明中的限制反馈，不假定安装即证明媒体 / 投屏兼容 |

提交普通问题时提供版本、型号 / 固件和最短步骤即可。不要提交二维码、Cookie、带签名播放地址、证书或原始抓包；敏感问题见[SECURITY](../SECURITY.md)。

0.66.0 首次打开需填写 `www.bilibili.com` 再进入应用；仅启用本地支持的配置，不访问任意用户网址。详见[预览版说明](releases/0.66.0-service-configuration.md)。
