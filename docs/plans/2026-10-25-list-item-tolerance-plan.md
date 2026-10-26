# 列表逐卡容错改动方案

2026-10-25。对应[ADR-111](../adr/111-list-item-tolerance-and-unknown-duration.md)。状态：**用户确认4项决定（2026-10-25）；0.58.0已实现（未签名/未安装），见ADR-111“实现”**。分支`perf/p0-network-kernel`，实现后为0.58.0。

## 目标

一张不合格的卡片不再让整个列表“暂时无法加载”；超过24小时等异常时长按“时长未知”显示，卡片照常可见。超过24小时的视频能否播放，不在本次范围。

## 统一规则（列表正文解析器）

每个列表正文解析器的每一行按下列顺序处理：

1. **规范化**：
   - 标题去掉控制字符、去首尾空白、截断到合同上限；
   - UP名同样处理；
   - 时长：不是整数、为负、超过上限或“分:秒”格式错误时记为0（未知）。
2. **仍不合格就跳过并计数**：
   - 身份字段不合格（bvid、mid、season_id、房间号等）；
   - 规范化后标题为空；
   - 与前面的行重复。
3. **整体失败（`invalid`）**：
   - 根结构、`code`、列表类型或大小不对（与今天相同）；
   - 列表非空但每一行都被跳过。

共用一个小工具（放在`packages/bili-client/src/`），提供逐行`try`、计数、“全部被跳过”的判断，各解析器不各写一遍。

## 改动清单

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 共用 | `packages/bili-client/src/list-rows.ts`（新） | 逐行解析、跳过计数、全部跳过即`invalid`；时长规范化（秒、`分:秒`）；文字规范化 |
| 推荐 | `bili-client/src/recommendations.ts`、`contracts/src/recommendations.ts` | 逐卡容错；批次带`skipped`；`omitted`保持“非普通视频”原义 |
| 热门、排行、分区排行 | `bili-client/src/popular.ts`、`ranking.ts`；`contracts/src/index.ts`（`PopularResult`）、`ranking.ts`、`public-read.ts` | 逐行容错；结果带可选`skipped` |
| UP投稿、番剧排行 | `bili-client/src/ranking.ts` | 已经跳过，补上计数 |
| 视频搜索 | `bili-client/src/search.ts`、`contracts/src/search.ts` | 逐行容错；时长格式错误或超长记为0，不再抛`duration` |
| 用户搜索 | `bili-client/src/user-search.ts`、`contracts/src/user-search.ts` | 预览不合格只去掉预览；行不合格跳过 |
| 番剧搜索、热搜 | `bili-client/src/pgc-search.ts`、`hot-search.ts` 及合同 | 逐行容错；热搜的名次检查在跳过之后重新编号 |
| 资料库 | `bili-client/src/watch-later.ts`、`history.ts`、`favorites.ts`、`follow-updates.ts`、`pgc-follow.ts` 及合同 | 逐行容错；分页游标、总数照旧以源数据为准 |
| Worker | `platform/wasm-network/src/*-worker.ts`中传递结果的地方 | 透传`skipped` |
| 诊断 | `apps/tv/src/app/app-diagnostics.ts`、各lane读取处 | 新增固定代码（如`list_items_skipped`），出现跳过时记一次 |
| 时长显示 | `apps/tv/src/ui/content-card.ts`、`ui/popular.ts`、`app/recommendations.ts`、`app/guest-home.ts`、`app/user-search.ts`、`app/product-search.ts` | 时长为0时不显示角标与时长文字，读屏省略时长 |
| 版本 | 配置、打包、签名、部署脚本与诊断构建号 | 0.58.0 |

直播搜索不改（ADR-068）。详情、播放、续播、弹幕与投屏的时长上限不改（ADR-111第5项）。

## 测试改动

- **需要改写的现有断言**（“一行不合格就整体拒绝”）：
  - `popular.test.ts`、`ranking.test.ts`、`video-search.test.ts`、`search-format.test.ts`；
  - `user-search.test.ts`、`pgc-search.test.ts`、`hot-search.test.ts`；
  - `watch-later.test.ts`、`history.test.ts`、`favorites.test.ts`、`follow-updates.test.ts`。
- **保留**：各合同测试中“Worker结果里一张卡不合格就拒绝”的断言。
- **新增**：
  - 每个解析器各一条：一行不合格时其余保留、计数正确；全部不合格时`invalid`；
  - 推荐用166242 s的卡片做回归；
  - 合成UI：时长为0的卡片不显示角标。
- **原生主机测试**：不改C，沿用。

## 设备验证

- 用定位时的方法（重载页面，每次立即选择账号）重复20次，“为你推荐”不应再出现`invalid`。
- 检查“帮助与诊断”在有跳过时出现对应事实。
- 抽查首页、搜索、资料库各一页显示正常。

## 估算

约1.5天：共用工具与推荐、热门、排行、搜索半天；资料库与其余列表半天；测试改写、合成UI与装机半天。

## 需要你确认的决定

1. 未知时长沿用0表示（合同形状不变），界面上时长为0时隐藏？
2. 跳过数只进诊断、不向观众显示；列表非空但全部被跳过时仍整体失败？
3. 范围包括资料库各列表与番剧搜索、热搜，不含直播搜索？
4. Worker与主线程之间的合同保持严格（不在主线程逐卡容错）？
