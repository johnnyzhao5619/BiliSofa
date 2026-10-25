# 归档的测试套件

此目录下的测试不再随产品构建运行，内容原样保留，只改了导入路径与`tests/`文件路径，使其指向新位置。当前运行的合成UI见`playwright.app.config.ts`（`npm run test:ui:app`，对`dist/bilisofa-app`）。

| 套件 | 归档日期 | 原因 |
| --- | --- | --- |
| `product-collections-ui` | 2026-10-23（K4） | 按0.33.0关注/已追番剧入口布局编写；0.45.0起页面已改为整页详情、货架与“番剧影视”，对0.48.0及以后的构建全部失败，覆盖已由`product-polish-ui`、`product-season-ui`、`product-profiles-ui`等套件取代 |
| W02–W06与早期产品套件（`cast-app-ui`、`catalog-ui`、`favorites-ui`、`follow-updates-ui`、`history-ui`、`identity-ui`、`library-ui`、`local-app-ui`、`local-data-ui`、`media-ui`、`queue-ui`、`queue-parts-ui`、`recommend-ui`、`search-ui`、`w04-media-ui`、`w05-product-ui`、`w06-cast-ui`、`product-ui`、`product-library-ui`、`product-discovery-ui`、`product-player-ui`、`product-actions-ui`、`product-interactions-ui`、`product-browse-ui`、`product-instant-ui`、`product-stream-ui`、`product-recovery-ui`、`product-acceptance-fix-ui`、`product-remote-ui`的旧规格，以及`product-cast-*-ui`中的`recovery`/`settings`规格和重复副本） | 2026-10-24（版本链收敛） | 逐个规格文件对冻结0.51.3运行（每例30秒）：均失败，原因是它们等待已被取代的旧首页网格、旧面板或旧设置页。对0.51.3全部通过的套件与规格保留，并在单一构建0.52.0上结果相同；仍被保留套件引用的fixture留在原目录 |

这些规格对应的冻结构建目录已在本机清理；如需复核，须先从对应提交重建那一版的构建。
