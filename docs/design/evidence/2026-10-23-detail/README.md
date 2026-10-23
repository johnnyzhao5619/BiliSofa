# 0.48.0 详情页补全与倍速探查（本地证据）

2026-10-23；[ADR-095](../../../adr/095-detail-facts-and-rate-probe.md)；[剩余工作计划](../../../plans/2026-10-23-remaining-work-plan.md)P1-A/P1-B。构建`node tools/build-foundation-app.mjs --product-detail` → `dist/product-detail-app`；打包`python3 tools/package-foundation-app.py --product-detail`。**已签名（`223813c40f99f3cb9f1e0e718769cb91295851575bf7cb208ac39f55d8849efc`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据），未经真机验收。** 用户真机结果：Z1 USER PASS；Z2 0.5×/0.75×通过、1×斜率0.81、1.25×为0.9、1.5×为1.05（均off）；Z3 FAIL（无法追番、仍为开发样式）。后续见[ADR-096](../../../adr/096-product-season-page-follow-toggle-and-hot-ranking.md)（0.49.0）。 ** 源码归档`8d1a535a7ef141c173f56bd1739de39d0bacaeacfc4cde1d479d2c1c53130193`，见[receipt.json](receipt.json)。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` | 303模块，退出0（含文档门禁） |
| `npm test` | 707/707（新增`tests/unit/detail-about.test.ts`4条：解析、宽容丢弃、Worker边界、倍速判定） |
| `tests/product-detail-ui`（0.48.0） | 3/3：日期/计数/头像/四行简介；简介全文分层、上下滚动、Back回按钮；“倍速探查”只在帮助与诊断、按下才运行 |
| 同3条对冻结0.47.2 | 3/3失败 |
| 回归（0.48.0） | 阅读套件17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| 包负例`tests/native/product-detail-packaging.test.py` | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.48.0-unsigned.wgt` `739b088f5fc21d8077c46ef94f7ca1083fafec48e7337eaf05c19f2f41f0e1ea` |
| 与0.47.2包对比 | 条目相同；原生模块与许可文件逐字节一致；权限不变；变化限于`app.js`、`style.css`、`config.xml`、`build.json`和打包了`VodDetail`合同的Worker |
| 冻结工件 | 构建前后dist（不含新输出）与`build/`不变 |

日志在`.local/u5-detail/`（不入库）。倍速探查的实际结果只能在电视上取得，合成环境只验证入口、无记录时的说明和关闭。

## 真机验收（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| Z1 详情 | 从首页打开一个单P和一个多P视频的详情 | 简介、发布日期、点赞/弹幕数、UP头像正确；长简介可开全文并上下滚动；缺项不留空位；Back回原卡 |
| Z2 倍速探查 | 先正常播放任意视频，再进“设置 → 帮助与诊断 → 倍速探查（诊断）” | 屏幕列出0.5/0.75/1.25/1.5/1×的结果（pass/off/stalled/rejected与斜率）；退出后正常播放不受影响 |
| Z3 追番 | 你指定一部番剧：在番剧详情“管理追番状态”追番一次，再取消一次 | 每次只提交一次；回读状态与B站一致；重进仍一致 |
