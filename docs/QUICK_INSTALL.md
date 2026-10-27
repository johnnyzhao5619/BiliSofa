# BiliSofa 0.66.0：一步一步安装到三星电视

[English](QUICK_INSTALL.en.md) · 更新：2026-10-26

只需要跟着下面的步骤操作，**不用写代码，也不用自己编译**。安装时需要一台 Windows / Mac 电脑；装好后，电脑可以关机。整个过程要让电脑和电视连接同一网络。

> **安装前先了解：** 当前提供的是 0.66.0 预览版，声明要求 Tizen 9.0。应用包已编译并通过静态打包检查，但 0.66.0 尚未在电视上完成安装和运行验收；下述第三方安装路径也尚未用本项目独立实测。电视型号、固件或 Samsung 证书条件可能影响结果。

## 准备好这些东西

1. 一台 Samsung Tizen 电视及其遥控器，电视已联网。
2. 一台 Windows 或 Mac 电脑，并连接与电视相同的路由器 / Wi-Fi。
3. 一个 Samsung 账号：安装器需要新建电视签名证书时会提示登录。
4. 下面下载的两个文件：BiliSofa 安装包和 Apps2Samsung 安装工具。

## 第一步：下载两个文件

**① 下载应用包**：点击 [下载 BiliSofa 0.66.0 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt)，保存到电脑的「下载」文件夹。文件名是：

```text
BiliSofa-0.66.0-unsigned.wgt
```

这就是待安装的电视应用包；**不用双击它，也不用解压**。

**② 下载安装工具**：根据你的电脑选择一个，下载后安装并打开：

- [Windows 电脑：下载 .msi](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-win-x64.msi)
- [Mac（Apple 芯片，如 M1 / M2 / M3）：下载 .dmg](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-arm64.dmg)
- [Mac（Intel 芯片）：下载 .dmg](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-macos-x64.dmg)
- [Linux 与其他版本：打开下载页面](https://github.com/Apps2Samsung/Apps2Samsung/releases/tag/v2.8.3)

不知道 Mac 芯片类型：点击屏幕左上角 **苹果菜单 → 关于本机**，查看「芯片」或「处理器」。Apps2Samsung 是独立的第三方工具；上面的链接来自其官方 GitHub，不由 BiliSofa 开发或分发。

## 第二步：找到电脑的局域网 IP

稍后需要把**电脑的 IP 地址**填进电视，先查好并暂时记下：

- **Windows**：按 `Win + R`，输入 `cmd` 并回车；在打开的窗口输入 `ipconfig` 并回车。在当前使用的 Wi-Fi 或以太网连接下，找到「IPv4 地址」。
- **Mac**：打开 **系统设置 → 网络 → Wi-Fi → 详细信息 → TCP/IP**，找到「IPv4 地址」。如果电脑使用网线，选择当前的以太网连接。

填写的是电脑当前网络的 IPv4 地址，不是电视 IP，也不是 Bilibili 网站地址。不要把真实 IP 发到公开 Issue。

## 第三步：在电视打开开发者模式

1. 按电视遥控器的 **Home / 主页**，进入 **Apps / 应用**。
2. 找到并打开 **App Settings / 应用设置**。在该界面用遥控器或屏幕数字键盘输入 **`12345`**。
3. 出现 Developer Mode / 开发者模式窗口后，把开关设为 **On / 开**。
4. 在 IP 输入框里填入**第二步查到的电脑 IPv4 地址**，选择 **OK / 确定**。
5. 按电视提示**重启电视**。重启后再次打开 Apps，检查屏幕上方是否显示 Develop Mode。

电视菜单因型号 / 固件可能不同；找不到入口时参照 [Samsung 官方图文说明](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)。

## 第四步：用电脑安装

1. 在电脑打开 **Apps2Samsung**，确认电视已经开机，且电脑与电视仍在同一网络。
2. 在工具里找到并选择你的电视。如果没有自动发现，按工具提示输入电视的局域网 IP；电视 IP 通常可在电视的网络状态 / 网络设置中查看。
3. 找到 **Custom WGT / Custom WGT File / 自定义 WGT** 选项，选择第一步下载的 `BiliSofa-0.66.0-unsigned.wgt`。不要选择其他同名应用。
4. 点击 **Install / 安装**。如果工具要求登录 Samsung，按提示在 Samsung 官方页面完成登录，并让工具为你的电视准备签名证书。
5. 等待工具完成签名与安装。如果出现错误，记下脱敏后的错误信息，先看下方「遇到问题」。

Samsung 要求应用在安装前使用有效证书签名；下载包里的 `unsigned` 表示未签名，安装器会在本机处理签名，不是免签安装。保管好自己的 Author 证书，以便将来更新。不要把 Samsung 密码、证书、电视 DUID 或账号 Cookie 发给维护者，也不要为安装关闭 TLS、root 或刷机。详见 [Samsung 证书说明](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)。

## 第五步：在电视上打开

1. 在电视 **Apps / 应用**中找到并打开 **BiliSofa**。
2. 首次打开时，用遥控器输入 **`www.bilibili.com`**，选择确认。也可以填 `bilibili.com`；这里不要填密码、Cookie 或 API 密钥。
3. 选择游客浏览；需要自己的私人片库时，再按电视提示用自己的官方 Bilibili App 扫码并确认。
4. 以后观看时，电视需要联网；安装电脑可以关闭。

网址只用于选择应用包中已有的本地配置，不会变成任意网站浏览器；填写网址也不代表已经取得平台授权。

## 遇到问题

| 现象 | 先检查什么 |
| --- | --- |
| 开发者模式窗口没出现 | 确认进入的是电视 Apps 的 App Settings，再输入 `12345`；尝试屏幕数字键盘，参考 Samsung 官方图文 |
| 安装器找不到电视 | 确认两台设备在同一路由器下，电视已开启开发者模式并重启；检查第二步填写的是电脑 IP，路由器没有开启设备隔离 |
| Samsung 登录或签名失败 | 根据安装器提示检查账号和该电视的证书；以前安装过 BiliSofa 时先找回原 Author 证书，**不要先卸载清数据** |
| 找不到 WGT 文件 | 在文件选择窗口进入「下载」文件夹，选择 `BiliSofa-0.66.0-unsigned.wgt`；不要解压它 |
| 安装后打不开 / 输入网址后无法使用 | 记录电视型号、Tizen / 固件版本和脱敏错误；此预览版尚无电视验收结果，也可能受到接口、账号或地区限制 |

仍有问题时，可在 [GitHub Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 提供版本号、电视型号和脱敏后的最短步骤。不要公开密码、二维码、Cookie、签名证书、DUID、私人 IP 或原始抓包。

### 可选：校验下载文件

在 [0.66.0 Release](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0) 查看 `SHA256SUMS.txt`。未签名 WGT 的 SHA-256 应为：

```text
13717f95c85a73e5397c5eac7a315d918eb67bf04f77d4d1ab3444d145e78477
```

Mac 终端可运行 `shasum -a 256 文件路径`；Windows PowerShell 可运行 `Get-FileHash 文件路径 -Algorithm SHA256`。签名后的文件摘要变化是正常的。如不使用第三方安装器，可参考 [Samsung 官方工具完整安装指南](INSTALLATION.md)。

应用内容来源、非营利用途和权利联系见 [RIGHTS](../RIGHTS.md)；使用前请阅读 [隐私](../PRIVACY.md) 和 [Bilibili 协议风险](BILIBILI_TERMS_RISK.md)。
