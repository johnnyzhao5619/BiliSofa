# 0.49.1 追番状态与写入结果（本地证据）

2026-10-23；[ADR-096](../../../adr/096-product-season-page-follow-toggle-and-hot-ranking.md)文末“0.49.1修正”。构建`node tools/build-foundation-app.mjs --product-season-fix` → `dist/product-season-fix-app`；原生`python3 tools/link-pgc-follow.py --out build/pgc-follow-status`；打包`python3 tools/package-foundation-app.py --product-season-fix`。**已签名（`e76c619c49be1e4e7e849ac6a6e1ea63e88eee4d52c7bd576514400a98d20e79`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据）；Q3复验USER PASS。** 源码归档`56cc3f29335947304cd61da85e5628f47a40e148704eaf55f471c93a07afbaa4`，见[receipt.json](receipt.json)。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm test` | 713/713（新增`tests/unit/pgc-follow-status.test.ts`2条；原生API的拒绝结果现带代码-111） |
| 原生`tests/native/pgc-follow.test.py` | 通过（状态读取改为`/pgc/view/web/season/user/status`） |
| `tests/product-season-ui`（0.49.1） | 6/6：原3条＋新3条（打开即读本人状态；被拒显示代码且不反说；受理但回读未变不报成功、下一次只查询） |
| 新3条对冻结0.49.0 | 3/3失败 |
| 回归（0.49.1） | 详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| 包负例 | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.49.1-unsigned.wgt` `eb8a2fdce29dbf45477480c29eb5c07b0207e2cf7d831f3d20c70d05c0f4eaf3` |
| 与0.49.0包对比 | 原生只有`pgc-follow/`变化；权限不变 |
| 冻结工件 | dist与`build/`（不含新`pgc-follow-status`）不变 |

## 真机复验（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| Q3 | 你指定的番剧：打开详情，看按钮；按一次，再按一次 | 打开时按钮与B站实际状态一致；每次只提交一次，提示与回读一致。若失败，记下页面提示（是否带“代码 N”或“已受理…回读仍为…”） |
