# P1-1 播放起播改动方案

2026-10-25。对应[ADR-110](../adr/110-playback-start-prefetch-handoff-and-overlay-lane.md)。状态：**用户确认4项决定（2026-10-25）；P1-1a在0.57.0实现（未签名/未安装），见ADR-110“P1-1a实现”；P1-1b未开始**。分支`perf/p0-network-kernel`。

## 目标

从卡片到首帧、从首帧到弹幕的等待都明显缩短；网络故障时更快恢复，并让用户看到进行到了哪一步。按键次数与界面布局不变（交互精简在P1-2）。

## 分两批

| 批次 | 内容 | 改原生 | 估算 |
| --- | --- | --- | --- |
| **P1-1a** | 详情走公共内核；详情页预读并交给播放器；续播直接起播；按原因降级；超时缩短且不毒化；分阶段提示 | 否 | 约3天 |
| **P1-1b** | 视频与音频的来源检查并行；叠加层常驻并复用aid/cid；评论复用aid | 是 | 约3天 |

每批结束后签名安装，用Inspector实测，再决定下一批。

## P1-1a 改动清单

| 文件 | 改动 |
| --- | --- |
| `platform/wasm-network/src/public-kernel.c`、`public-kernel-worker.ts`、`tools/link-public-kernel.py`、`tools/package-foundation-app.py` | 新增“视频信息”操作（只读view）；路由扫描放行这一条，playurl、CDN与`player/`系路由仍然禁止 |
| `packages/contracts/src/public-kernel.ts` | 视频信息请求与结果的合同（分P、简介、UP、计数，沿用`VodAbout`） |
| `apps/tv/src/app/product-page.ts`、`product-video-detail.ts` | `parts()`改走公共内核；详情页打开时后台开始`VodAccess`读取；按播放时把读取交出，不再“先关闭再重读” |
| `apps/tv/src/app/vod-workspace.ts`、`packages/media/src/vod-catalog-media.ts` | 接收预读（`{access, result}`或进行中的读取），比对`bvid/part`与读取时间（不超过5分钟） |
| `packages/media/src/session.ts`、`apps/tv/src/platform/avplay.ts` | 有续播位置时，首次打开就用`PREBUFFER_MODE`；失败退回先准备再seek |
| `packages/media/src/vod-catalog-media.ts` | 网络或超时先换线路、再降画质；不支持则直接降画质；总次数不超过4 |
| `apps/tv/src/platform/vod-runtime.ts`、`apps/tv/src/app/reconnect-policy.ts` | 就绪与读取上限15 s；超时只作废当前访问，重连新建 |
| `apps/tv/src/app/vod-workspace.ts` | 分阶段状态文字 |
| 测试 | 交接、续播起播、降级顺序、超时后重连的单元测试；合成UI补三条规格；公共内核主机测试补view路由 |

## P1-1b 改动清单（概要）

- `platform/wasm-network/src/vod-api.c`：第二个CDN句柄，两项来源检查并行，主机测试补并行用例。
- `overlay-read.c`、`overlay-native-api.ts`、`overlay-runtime.ts`、`packages/contracts/src/overlay-read.ts`：
  - 目标增加可选`aid/cid`，有就跳过nav/view；
  - 叠加层客户端改为每次播放一个常驻Worker。
- `comments-native-api.ts`：复用aid。

## 设备测量（每批后）

用`docs/design/evidence/2026-10-25-network-kernel/measure.mjs`的方式，新增四个场景：

1. 首页卡片→详情→立即按播放，到首帧；
2. 详情页停留3 s后按播放，到首帧；
3. 续播（有记录的视频），到首帧；
4. 首帧到首条弹幕。

基线为已安装的0.56.0。

## 需要你确认的决定

1. 分两批，先做不改原生的P1-1a？
2. 公共内核放行只读的`/x/web-interface/view`（playurl、CDN仍禁止），用于详情信息？
3. 详情页一打开就在后台开始播放读取（离开即取消），按播放时直接交给播放器？
4. 网络或超时故障先换线路、再降画质，不支持才直接降画质？
