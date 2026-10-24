# 归档的测试套件

此目录下的套件不再随新版本运行，原样保留以便对冻结的旧构建复核。

| 套件 | 归档日期 | 原因 |
| --- | --- | --- |
| `product-collections-ui`（配置`playwright.product-collections.config.ts`） | 2026-10-23（K4） | 按0.33.0关注/已追番剧入口布局编写；0.45.0起页面已改为整页详情、货架与“番剧影视”，对0.48.0及以后的构建全部失败，覆盖已由`product-polish-ui`、`product-season-ui`、`product-profiles-ui`等套件取代 |

归档时只把导入路径改为相对新位置（多一层`../`），并给配置加上`cwd`，测试内容未改。需要对冻结的0.33.0构建复核时：

```bash
BILISOFA_PROBE_ROOT=dist/product-collections-app npm run test:ui:product-collections
```
