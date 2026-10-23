# 0.50.0 启动账号选择与热门番剧筛选（本地证据）

2026-10-23；[ADR-098](../../../adr/098-hot-bangumi-type-and-time-filters.md) · [ADR-099](../../../adr/099-launch-account-chooser.md)。构建`node tools/build-foundation-app.mjs --product-profiles` → `dist/product-profiles-app`；原生`python3 tools/link-catalog.py --out build/catalog-pgc2`；打包`python3 tools/package-foundation-app.py --product-profiles`。**已签名（`22ec2901c5602ab983fe6305edbbebfc83ae6255355cd91abe6f088b70f3b5d2`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据），未经真机验收。** 用户结果：P1/P3 USER PASS；P2暂缓（待多账号）；P4部分通过，见[0.50.1](../2026-10-23-profiles-fix/README.md)。 源码归档`87fd5a2c7796dde64a1af5282b2b36b132d270694dc607487457e2e34412fb4f`，见[receipt.json](receipt.json)。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` | 通过（含文档门禁） |
| `npm test` | 715/715 |
| 原生`tests/native/catalog.test.py` | 13/13（国创·一周、索引第2页、8种非法参数不发请求） |
| `tests/product-profiles-ui`（0.50.0） | 8/8：热门番剧筛选3条、启动账号选择5条 |
| 同8条对冻结0.49.1 | 8/8失败 |
| 回归（0.50.0） | 番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏定位与同秒幂等10/10 |
| 包负例 | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.50.0-unsigned.wgt` `3db7d810c8b09e896edaa448c462f26a4051ce81206ac656fa787451397a664a` |
| 与0.49.1包对比 | 原生只有`catalog/`变化（参数化排行与索引路由）；权限不变 |
| 冻结工件 | dist与`build/`（不含新`catalog-pgc2`）不变 |

测试夹具：共享W04/W06夹具默认写入“已选游客”标记，与用户已关闭欢迎页的状态一致；账号选择规格自行清除该标记。

## 真机验收（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| P1 启动选择 | 冷启动应用（先退出再进入） | 出现“谁在观看？”，焦点在上次账号；选择后进入首页且为该账号；Back以游客进入 |
| P2 失效与添加 | 在选择页选“添加账号”；若有失效账号则选它 | 进入账号页扫码；失效账号进入重新扫码，成功后回到原页面 |
| P3 热门番剧筛选 | 番剧影视 → 热门番剧，切换国创/番剧与近三日/近一周/累计热门；退出再进入 | 列表随筛选变化、说明文字一致；累计热门可向下翻页；重进后保持上次筛选 |
| P4 可播性抽查 | 在国创中任选两部播放 | 能正常播放（若不能，记下提示） |
