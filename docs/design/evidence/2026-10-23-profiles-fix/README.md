# 0.50.1 启动选择页界面统一与播放失败摘要（本地证据）

2026-10-23；[ADR-099](../../../adr/099-launch-account-chooser.md)文末。构建`node tools/build-foundation-app.mjs --product-profiles-fix` → `dist/product-profiles-fix-app`；打包`python3 tools/package-foundation-app.py --product-profiles-fix`。**已签名（`743bbc131f519541f2367897f3f11251619d28e1fa52b2cbff8bf343a9157c8d`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据）。用户结果：P1′ USER PASS；P4′失败摘要为network、时好时坏，见[ADR-100](../../../adr/100-bounded-playback-reconnect.md)。** 源码归档`85e6d973a69148fe7673f78b16d590c4df9323ed5217410094b371399cdd7439`，见[receipt.json](receipt.json)。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 715/715 |
| `tests/product-profiles-ui`（0.50.1） | 9/9：原8条＋新1条（选择页铺满1920×1080、品牌与眉题、游客图标；帮助与诊断显示失败摘要行） |
| 回归（0.50.1） | 番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| 包负例 | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.50.1-unsigned.wgt` `8240269f73abe89600570bf86f2a6f854a38f571885dac417a1aea7dd2190f16` |
| 与0.50.0包对比 | 只有`app.js`、`style.css`、`config.xml`、`build.json`变化；原生与权限不变 |
| 冻结工件 | 0.50.0暂存目录已按ADR-099文末还原；dist与`build/`不变 |

选择页的前后对比截图只用于设计核对，不入库。

## 真机验收（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| P1′ 选择页外观 | 冷启动 | 整页与其他页面风格一致：品牌“B”、标题、卡片与焦点样式统一 |
| P4′ 失败定位 | 复现一部提示“网络连接中断”的国创，然后进“设置 → 帮助与诊断” | 顶部显示“最近一次播放失败：…”，请把这一行原样告诉我 |
