# 用安卓手机安装 BiliSofa 0.66.0

[电脑安装教程](QUICK_INSTALL.md) · [English](QUICK_INSTALL_ANDROID.en.md)

这条路径使用安卓手机安装到电视，**可尝试不使用电脑，也不需要自己编译**。Apps2Samsung 是独立第三方工具：其 2.8.3 安卓版源码包含本地 WGT 选择、电视连接及签名安装流程，但**该路径和 BiliSofa 0.66.0 尚未在电视上独立实测**，不同手机、网络或电视可能失败。

## 安装前准备

- 一台声明支持 Tizen 9.0 的 Samsung 电视、遥控器，以及一台安卓手机。
- 手机与电视连接同一个可信 Wi-Fi / 局域网，电视保持开机。
- 如果安装器需要为电视新建证书，准备好自己的 Samsung 开发者账号。
- 本版 WGT 为未签名包；需要电视 Developer Mode 和有效 Samsung 证书。安装器会尝试按提示处理签名。[Samsung 官方证书说明](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

## 1. 在手机上下载两个文件

1. 点击 [下载 BiliSofa 0.66.0 WGT](https://github.com/johnnyzhao5619/BiliSofa/releases/download/v0.66.0/BiliSofa-0.66.0-unsigned.wgt)，保存到手机的「下载」文件夹。**不要解压或尝试把 WGT 当作手机应用打开。**
2. 点击 [下载 Apps2Samsung 安卓版 APK](https://github.com/Apps2Samsung/Apps2Samsung/releases/download/v2.8.3/Apps2Samsung-v2.8.3-android.apk)。打开该 APK，按安卓系统提示安装到**手机**。如果系统要求允许当前浏览器或文件管理器安装此 APK，确认下载地址来自 Apps2Samsung 官方 GitHub，再按手机提示操作；完成后可关闭该来源的安装权限。
3. 打开手机上的 Apps2Samsung。APK 是安装工具；WGT 才是要装到电视的 BiliSofa。BiliSofa 不分发或维护该第三方工具。

## 2. 找到手机的 Wi-Fi IP 地址

打开手机 **设置 → Wi-Fi → 已连接的网络 → 详情 / 高级**，记下手机当前的 **IPv4 地址**。各品牌菜单名称不同；请确保地址来自连接电视所用的 Wi-Fi，而不是移动网络。接下来填的是**手机 IP**，不是电视 IP，也不是 `www.bilibili.com`。不要将真实 IP 发到公开 Issue。

## 3. 开启电视 Developer Mode

1. 按遥控器 **Home / 主页 → Apps / 应用 → App Settings / 应用设置**。
2. 使用遥控器或屏幕数字键盘输入 **`12345`**，打开开发者模式窗口。
3. 将 Developer Mode 设为 **On / 开**；在 IP 输入框填入上一步的**手机 IPv4 地址**，选择确认。
4. 根据电视提示**重启电视**。重新打开 Apps，检查屏幕上方是否显示 Develop Mode。

菜单因固件不同可能有差异，参见 [Samsung 官方图文说明](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)。如果遥控器没有数字键，可尝试屏幕数字键盘。

## 4. 用手机把 WGT 安装到电视

1. 在手机打开 **Apps2Samsung**，检查手机和电视仍在同一 Wi-Fi，电视已经开机并重启。
2. 在电视选择栏找到自己的电视；如果未自动发现，按工具提示手动输入电视的局域网 IP。电视 IP 通常能在电视的网络设置 / 网络状态里找到，与第三步填写的手机 IP 是两个不同地址。
3. 在应用选择栏选择 **`Custom WGT / TPK…`**（自定义 WGT），在手机文件选择器的「下载」文件夹里选择 `BiliSofa-0.66.0-unsigned.wgt`。界面文字可能随语言和版本变化；不要选择目录里其他同名应用。
4. 点击 **Download and Install / 安装**。如工具提示 Samsung 登录或证书，按工具提示在 Samsung 页面完成自己的账号和设备证书步骤；等工具完成签名和安装。
5. 保留自己的 Author 证书供后续更新。不要在不确认数据影响时选择清除旧应用、随机更换应用 ID 或卸载旧版；遇到签名冲突，先找回原证书。

## 5. 在电视上启动

在电视 Apps 中打开 BiliSofa，首次使用时，自行填写想观看的网站地址，例如 **`www.bilibili.com`**（也接受 `bilibili.com`），并确认启用（目前仅支持 Bilibili），再选择游客或按提示使用官方 Bilibili App 扫码登录。电视日常观看需要联网；安装完成后不需要手机持续运行。

## 没有成功怎么办？

| 问题 | 先做什么 |
| --- | --- |
| 手机找不到电视 | 确认同一 Wi-Fi、电视 Developer Mode 开启并已重启；核对电视填写的是手机 IP、手动发现填写的是电视 IP；检查路由器设备隔离 |
| 选择不到 WGT | 确认 WGT 下载完成，在文件选择器打开「下载」；不要选 APK 或解压 WGT |
| 登录 / 签名失败 | 按安装器提示检查 Samsung 开发者账号和电视证书；升级时先找回原 Author 证书，不默认卸载清数据 |
| 安装成功但打不开 | 0.66.0 还没有电视运行验收；记录电视型号、固件和脱敏错误后反馈，也可尝试[电脑安装路线](QUICK_INSTALL.md) |

如需帮助，请到 [Issues](https://github.com/johnnyzhao5619/BiliSofa/issues) 提供版本、型号、固件和脱敏步骤；不要公开密码、Cookie、二维码、私钥 / 证书、电视 DUID 或私人 IP。

下载 WGT 的 SHA-256 为 `13717f95c85a73e5397c5eac7a315d918eb67bf04f77d4d1ab3444d145e78477`，详见 [Release 校验文件](https://github.com/johnnyzhao5619/BiliSofa/releases/tag/v0.66.0)。签名后摘要会改变。使用前请阅读[隐私](../PRIVACY.md)、[权利联系](../RIGHTS.md)和[Bilibili 协议风险](BILIBILI_TERMS_RISK.md)。
