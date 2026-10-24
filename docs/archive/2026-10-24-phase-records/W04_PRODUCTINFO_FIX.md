# W04 型号权限门禁修复

版本：**0.21.1**，已签名安装启动，用户已确认普通视频正常起播、声画正常。0.21.0用户报告所有视频在播放前被门禁拦截，A–E全部未完成；不归为媒体声画通过。

## 根因与证据

W04新增`retailVodCapabilities()`，先调用ProductInfo `getModel()`核对已有零售样本型号。0.21.0整包配置却只声明internet；原W01探针声明过的ProductInfo权限未带入新应用。按[Samsung官方API合同](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/productinfo-api.html)，`getModel()`需要Public权限`http://developer.samsung.com/privilege/productinfo`，缺失时抛SecurityError。旧catch把任何读失败都返回“无能力”，使播放在源请求之前被拦截。

已从归档的原0.21.0签名WGT核对权限确实缺失。原浏览器fixture无条件返回U800FD，没有模拟包权限，故此前21项通过没有覆盖该失败。改为按实际stage配置模拟平台权限后，旧包的正向起播用例失败并复现门禁。没有取得电视端SecurityError原始栈，不把本地复现写成电视异常抓取。

## 修复

- 0.21.1 W04声明internet＋ProductInfo两项必需Public权限；默认旧W03配置不变。严格包门禁要求完整且最小的权限集，重哈希后删除ProductInfo也必须拒绝。
- 适配器区分型号API缺失、SecurityError、读取失败、型号未验证；界面使用固定`media.model_permission`等代码。型号读取错误不再冒充缺少硬件/码流能力。
- 保持已有U800FD、AVC/AAC、最高1280×720及1/2倍范围；未知型号或权限被拒绝仍不启动播放器，不以绕过门禁解决故障。
- 浏览器平台fixture从实际config.xml决定是否允许型号读取；新增权限正向起播、拒绝权限及未知型号的独立用例。原生C/WASM未变，6模块与0.21.0归档字节一致，不重编译或虚构新HOST/SDK结果。

## 交付与验收

512项单元/合同、217模块静态检查、24项W04浏览器、37项打包负例、16项旧媒体浏览器检查通过。0.21.1平台state/capability/install/launch成功，保持Author/App ID，不卸载或清数据。精确包hash见[签名部署](SIGNING_DEVICE_RECORD.md)。

用户回复“可正常起播，声画正常”，据此关闭该起播门禁故障；未单独声明时长/Back，不扩大验收范围。继续[W04集中清单](W04_DEVICE_ACCEPTANCE.md)的未完成项；分区API-352、高画质缺权益/样本和真实账号写入边界均保持。

ignored证据：`.local/w04-211-root-cause.json`、`w04-211-permission-reproduction.log`（修复前预期失败）、`w04-211-check.log`、`w04-211-unit.log`、`w04-211-ui.log`、`w04-211-package-negative.log`及签名部署日志。旧0.21.0签名/源码及失败证据保留，具体地址/原始设备输出仅在仓库外。
