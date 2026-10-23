# ADR-098：热门番剧的类型与时间筛选

2026-10-23；F02/F17、R15、U5。接0.49.1（Q1–Q3 USER PASS）。用户要求：
- 因为版权限制，热门番剧提供“是否国创动画”的筛选，避免只能看到信息却无法播放；
- 目前只有公开排行一种，希望有更多时间跨度。

仅在`--product-profiles`（0.50.0）构建生效。状态：**0.50.0已签名并升级安装/启动（平台确认，不清数据）；P3 USER PASS；P4部分国创视频播放提示网络中断，见[ADR-099](099-launch-account-chooser.md)文末**（[证据](../design/evidence/2026-10-23-profiles/README.md)）。

## 来源核实（本机匿名，非电视证据）

- 公开排行`/pgc/web/rank/list`只接受`day=3`与`day=7`（`day=1`、`day=30`返回-400）；`season_type=1`（番剧）与`4`（国创）均可用。
- 公开索引`/pgc/season/index/result?...&order=3`按追番人数做全时段排序，每页20条，带`has_next`；行字段与排行相同（`season_id`、`title`、`cover`、`index_show`、`score`、`badge`）。
- B站没有可用的按播放地区筛选的公开接口。国创（国内动画）是用户指定、也是最直接可得的“大概率可播”判据，但不能保证每部都可播。

## 决定

- 热门番剧标签下增加一行筛选：
  - **类型**：国创 / 番剧（默认国创）；
  - **时间**：近三日 / 近一周（公开排行）/ 累计热门（按追番人数的全时段索引）。
- 选择保存在本机（`bilisofa.hot-filter.v1`，只有类型和时间两个值），下次打开沿用。来源说明随筛选变化，并始终注明“不是个性化推荐”。
- 原生`catalog`的固定路由改为带参数的白名单：
  - 排行：`pgc-ranking <1|4> <3|7>`；
  - 索引：`pgc-index <1|4> <1–5>`；
  - 旧的无参数形式保留为“番剧·三日”。
  - 其他参数不发请求，原生测试覆盖。
- 原生模块重链接到新目录`build/catalog-pgc2`；冻结的`build/catalog`与`build/catalog-pgc`不变，只有0.50.0从新目录打包，并要求两条参数化路由都在包内。
- 合同：请求增加`seasonType`、`span`、`page`；未带这些字段的旧请求按“番剧·三日·第1页”处理。结果增加`seasonsMore`，只在索引时出现。
- 排行一次读取，按20条分页；索引按页读取，最多5页。每个筛选分别缓存，刷新只重读当前筛选。读取中切换筛选时，以新筛选为准，旧结果按代次丢弃。
- 焦点：标签 → 筛选行 → 卡片，卡片第一行向上回到筛选行。

## 证据

单元`tests/unit/pgc-season-product.test.ts`（请求兼容与边界、索引解析）；原生`tests/native/catalog.test.py`（国创/一周、索引第2页、8种非法参数不发请求）；合成UI`tests/product-profiles-ui/hot-filters.spec.ts`。汇总见[证据](../design/evidence/2026-10-23-profiles/README.md)。
