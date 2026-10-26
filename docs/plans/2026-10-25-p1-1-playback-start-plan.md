# P1-1 播放起播改动方案

2026-10-25。对应[ADR-110](../adr/110-playback-start-prefetch-handoff-and-overlay-lane.md)。状态：**用户确认4项决定（2026-10-25）；P1-1a在0.57.0实现并已签名安装，设备结果见ADR-110“设备结果”；P1-1b在0.59.0实现并安装，见ADR-112**。分支`perf/p0-network-kernel`。

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

## P1-1b 改动清单

对应[ADR-112](../adr/112-parallel-source-checks-and-overlay-binding-reuse.md)，**用户确认4项决定（2026-10-25）；0.59.0已实现并签名安装，设备结果见ADR-112“设备结果”（B各省约0.5 s，A无可测收益）**。上一版概要写的是直接改`vod-api.c`和常驻叠加层Worker；核对代码后改为下表（原因见ADR-112背景）。

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 原生：成对检查 | `platform/wasm-network/src/vod-source-pair.h`（新）、`vod-api-failover.c`、`pgc-read-failover.c` | 两个带各自状态的CDN句柄挂在同一multi；自带tick（没有成对检查时退回`vod_tick`）；一行完成信号加按轨导出；`vod-api.c`不改 |
| 链接与打包 | `tools/link-vod-api-failover.py`、PGC对应脚本、`tools/package-foundation-app.py` | 新构建目录；路由扫描与Akamai规则照旧；只有`vod-api/`、`pgc-read/`的原生资源变化 |
| JS：检查与主备 | `platform/wasm-network/src/vod-native-api.ts`、`vod-source-owner.ts`、`pgc-native-api.ts` | `inspect`改为一次成对检查；`VodCheckError`可标明两轨；只重查失败轨，两轨都失败一起切换 |
| 私有绑定 | `packages/bili-client/src/vod-catalog.ts`、`packages/contracts/src/overlay-binding.ts`、`vod-source-owner.ts` | 私有目录保留aid；绑定增加`aid`与本次签名盐；评论也取得绑定 |
| 叠加层 | `platform/wasm-network/src/overlay-native-api.ts`、`overlay-worker.ts` | 有完整绑定时跳过nav/view/season，签名被拒时退回重读一次；缺字段时走旧路径 |
| 评论 | `platform/wasm-network/src/comments-native-api.ts`、`apps/tv/src/platform/comments-runtime.ts`、`vod-runtime.ts` | 评论读取接收绑定端口，跳过nav/view |
| 版本 | 配置、打包、签名、部署脚本与诊断构建号 | 0.59.0 |
| 测试 | `tests/native/vod-api.test.py`与夹具、`source-failover.test.py`；单元`vod-native-api`、`vod-source-owner`、`vod-source-failover`、`overlay-read`、`comments`；打包负例 | 见ADR-112“验收与证据” |

不做：常驻叠加层Worker（需要新的原生会话，测量后再定）、调整叠加层读取顺序、修改`vod-api.c`。

估算约2.5天：原生成对检查与主机测试1天，JS主备与绑定1天，测试、打包、装机半天。

### 需要你确认的决定

1. 成对检查以新头文件实现，只重新链接`vod-api`与`pgc-read`两个模块，`vod-api.c`不动？
2. 失败时只重查失败的那一轨，两轨都失败一起切换，每轨仍最多切换一次？
3. aid、cid与签名盐只经私有绑定端口交接（修订ADR-110第8项“`OverlayTarget`加aid/cid”的写法），叠加层与评论有完整绑定时跳过nav/view/season？
4. 常驻叠加层Worker这一批先不做，测量后再定？

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
