# P2b 首页快照、首页结构与搜索改动方案

2026-10-26。对应[ADR-116](../../adr/116-home-snapshot-home-structure-and-search.md)。状态：**用户已确认（2026-10-26）；0.64.0已实现，未签名/未安装**（见ADR-116“实现（0.64.0）”）。分支从`main`新建，实现后为0.64.0。

## 目标

- 冷启动和返回首页时不再从骨架卡开始等。
- 分区一步直达；货架行尾可以继续看。
- 搜索一屏看到视频、UP主和番剧；输入首字母不再等词典重新解析。
- 删掉走不到的旧搜索分支和恒为真的开关。

## 改动清单

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 快照存储 | 新`apps/tv/src/platform/home-snapshot-store.ts`，新合同`packages/contracts/src/home-snapshot.ts` | 公共快照与按账号推荐快照的读写、校验、24小时过期、体积上限、清除 |
| 首页货架 | `apps/tv/src/app/product-shelves.ts`、`product-home.ts` | 先画快照再后台刷新；原位替换保焦点；失败保留并提示；运行内5分钟复用；行尾追加一页 |
| 分区横排 | `product-shelves.ts`、`product-home.ts`、CSS | 排行榜下14个分区按钮直达网格；去掉“浏览分区” |
| 热搜快照 | `apps/tv/src/app/hot-search.ts` | 读到后写快照，打开时先显示 |
| 账号清除 | `foundation-main.ts`（移除账号）、`local-settings.ts`（清除本机数据） | 一并删除该账号的推荐快照 |
| 翻页按钮 | `product-home.ts`、`product-library.ts`、`product-following.ts` | 删除隐藏的上一页/下一页与`if(!feed)`分支 |
| 旧搜索分支 | `product-page.ts`、`product-home.ts`、`user-search.ts`、`pgc-search.ts`、`foundation-main.ts` | 删除死分支、搜索模式、两个模块与三个恒为真的开关 |
| 综合结果 | `apps/tv/src/app/product-search.ts`、`product-search-read.ts` | 新增“综合”页签（默认），视频后依次读UP主与番剧各一行 |
| 词典常驻 | `apps/tv/src/platform/initials-worker.ts`、`keyword-pad.ts`、`search-keyword.ts`、`foundation-main.ts` | 应用级单例，空闲预加载，pagehide关闭 |
| 测试 | 单元与合成UI（见ADR-116“验收与证据”） | — |
| 版本与文档 | 版本号、`TV_PRODUCT_DESIGN.md`首页与搜索描述、状态页 | 0.64.0 |

## 设备验证

- 签名安装0.64.0（需授权）。
- 用Inspector测两项，与0.63.0对比：
  - 冷启动到首页第一张卡出现：有快照与无快照两种；
  - 进入搜索后第一个字母到候选出现：首次与再次。
- 实看首页快照与刷新、分区直达、行尾追加、综合页。

## 估算

约3天：

- 快照与首页结构1.5天；
- 搜索综合结果与词典常驻1天；
- 清理、测试、装机与测量半天。

## 需要你确认的决定

1. 首页快照：热门、排行榜与热搜存公共快照，“为你推荐”按账号分区存（随账号移除与清除本机数据删除），24小时内先显示再后台刷新，刷新失败保留并提示？
2. 首页结构：排行榜下加14个分区横排直达；行尾自动追加一页（推荐不追加）；继续观看这一批仍只用本机记录？
3. 删掉旧搜索分支、`user-search.ts`、`pgc-search.ts`、三个恒为真的开关和隐藏的翻页按钮；“关注”页的追番直达卡保留？
4. 搜索加“综合”页签作默认：视频、UP主一行、番剧一行，后两行在视频之后依次读取（每个新关键词多两个请求）？
5. 拼音词典Worker应用级常驻，空闲时预加载，退出时才关闭？
