# P1-1c 来源检查回退与超长视频播放方案

2026-10-26。对应[ADR-115](../../adr/115-serial-source-check-and-long-videos.md)。状态：**用户已确认（2026-10-26）；0.63.0已实现，未签名/未安装**（见ADR-115“实现（0.63.0）”）。分支`perf/p0-network-kernel`，实现后为0.63.0。

## 目标

- 起播的来源检查回到在电视上验证过的逐项检查，删除没有收益的成对检查。
- 超过24小时（7天以内）的视频能在列表、详情、播放器、弹幕字幕与续播里正常工作。

## 改动清单

### A. 来源检查改回先查一路

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 原生 | `platform/wasm-network/src/vod-source-pair.h`、`vod-api-pair.c`、`pgc-read-pair.c`；`tools/link-vod-api-pair.py`、`link-pgc-read-pair.py` | 删除 |
| 打包 | `tools/package-foundation-app.py` | `vod-api`、`pgc-read`改回`vod-api-failover`、`pgc-read-failover`目录；去掉`VODAPI:pair`检查；对照0.58.0的这两个模块逐字节相同 |
| 检查逻辑 | `platform/wasm-network/src/vod-native-api.ts`、`pgc-native-api.ts` | 去掉`_vod_pair_*`与`checkPair`，只保留`checkOne`逐项检查；`known`与多轨`VodCheckError`保留 |
| 测试 | `tests/native/source-pair.test.py`及4个fixture、`tests/unit/source-pair.test.ts`、`tests/native/app-packaging.test.py` | 删除成对检查测试；打包负例改回“来源模块不是failover构建就拒绝” |

### B. 超长视频

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 共享上限 | 新`packages/contracts/src/media-limits.ts` | `MAX_MEDIA_SECONDS = 604800`、`MAX_MEDIA_MS = 604800000`、`MAX_DANMAKU_SEGMENT = 1680` |
| 列表与卡片 | `bili-client/src/list-rows.ts`、`contracts/src/index.ts`、`up-archives.ts`、`recommendations.ts`、`guest-video.ts` | 上限引用共享常量 |
| 详情与读取 | `bili-client/src/vod-catalog.ts`、`pgc-season.ts`、`guest-video.ts`，`contracts/src/public-kernel.ts`、`content-presentation.ts`、`vod-catalog.ts` | 同上 |
| 播放器 | `media/src/vod-mpd.ts`、`guest-mpd.ts`、`session.ts`、`queue.ts`、`vod-catalog-media.ts`，`apps/tv/src/app/vod-workspace.ts`，`platform/avplay.ts`、`element-video.ts` | 同上 |
| 叠加层 | `contracts/src/overlay-read.ts`、`media-overlays.ts`，`media/src/danmaku.ts`、`overlay-clock.ts`、`timeline.ts`，`apps/tv/src/app/vod-overlays.ts` | 时间上限与段号上限 |
| 本机记录 | `contracts/src/local-profile.ts`、`apps/tv/src/app/local-playback.ts` | 同上（旧记录照常读取） |
| 原生 | `platform/wasm-network/src/vod-bridge-policy.h`（`vod/`）、`overlay-read.c`（`overlay-read/`） | 时长上限604 800 000 ms；段号1680；重新链接两个模块 |
| 超出提示 | `vod-workspace.ts`、`user-messages.ts`等 | 超过7天时说明“视频时长超出支持范围” |
| 时间显示 | `apps/tv/src/ui/content-card.ts`的`clockTime` | 一小时以上显示`h:mm:ss` |
| 投屏 | — | 不改（ADR-115第5项） |
| 测试 | 单元：各解析器边界、`clockTime`；原生：桥与弹幕段号边界；合成UI：30小时合成视频的列表、详情、播放、跳转、弹幕段、续播 | — |
| 版本与文档 | 版本号、`TV_PRODUCT_DESIGN.md`时间显示 | 0.63.0 |

## 设备验证

- 签名安装0.63.0（需授权）。
- 用户在应用里找一个超过24小时的视频（或指定一个），逐项看：
  - 列表与详情的时长；
  - 开始播放；
  - 跳到24小时以后；
  - 弹幕与字幕；
  - 退出后从原位置续播。
- 普通视频起播与0.62.0对比几次（复用ADR-112的起播测量脚本）。
- 证据只记时长档位与耗时，不记视频编号与标题。

## 估算

约2天：

- 回退半天；
- 上限统一与原生重链1天；
- 测试、装机与设备验证半天。

## 需要你确认的决定

1. 来源检查回到0.58.0的逐项检查，删除成对检查的原生代码与测试；保留“只重查失败的那一轨”和叠加层/评论复用？
2. 媒体时长上限统一改为7天（超过7天仍显示时长未知，并在播放时说明超出范围）？
3. 投屏暂不放宽（仍限24小时）？
4. 一小时以上的时间显示为“时:分:秒”（也会改变今天1–24小时视频的显示）？
