# P1-2 交互精简改动方案

2026-10-26。对应[ADR-113](../../adr/113-direct-play-quick-settings-and-navigation-trim.md)。状态：**用户确认（2026-10-26）：第1项按用户修改为“OK直接播放、长按卡片调出菜单”，播放器不加“详情”按钮；第2–5项按方案。P1-2a在0.60.0实现并安装，实按结果与待修两处见ADR-113“P1-2a设备实按”；P1-2b在0.62.0实现并已安装，实看通过、按键响应与0.61.1持平（见ADR-113“P1-2b实现”）**。分支`perf/p0-network-kernel`，实现后为0.60.0。

## 目标

常用操作的按键次数明显减少：

- 从卡片开始播放，2次变1次；
- 播放中换画质，7–13次变4次左右；
- 续播与换分P不再弹窗。

功能一个不少：详情页的所有操作仍然可以从长按卡片调出的菜单进入（参照YouTube电视端）。

## 分批

| 批次 | 内容 | 估算 |
| --- | --- | --- |
| **P1-2a** | 设备按键确认、卡片短按播放与长按菜单、续播不再弹窗、快捷设置条 | 约3天 |
| **P1-2b** | 账号并入设置、文案与死代码清理、按键开销 | 约1.5天 |

两批都签名安装、实按验证，再进行下一批。

## P1-2a 改动清单

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 设备按键确认（**已完成**，[证据](../../design/evidence/2026-10-26-ok-key/README.md)） | 经Inspector监听 | 10次全部有`keyup`、按住无连发；长按改用计时判定（0.5 s），短按在`keyup`时响应，`keydown`时开始预读 |
| 长按识别 | `apps/tv/src/ui/input.ts`（输入路由）、`apps/tv/src/ui/content-card.ts` | 输入路由增加`keyup`；内容卡片在`keydown`时计时，0.5 s内松开判为短按，到0.5 s打开菜单并忽略随后的松开；其他按钮不变；指针右键或`contextmenu`打开菜单 |
| 卡片直接播放 | `apps/tv/src/app/product-home.ts`、`product-shelves.ts`、`product-search.ts`、`product-library.ts`、`product-page.ts`（UP投稿、关注更新）、`product-continuing.ts` | 短按回调改为“播放”（带本机进度）；本机队列条目从这一项开始播放队列；番剧照旧进季页 |
| 长按菜单 | 新的`apps/tv/src/app/card-menu.ts`、`product-video-detail.ts`、`video-interactions.ts` | 卡片下方的菜单：详情、从头播放、稍后再看（登录时）、加入本机队列、UP主页（读一次视频信息取mid）；队列条目另有只播放此项、上移、下移、删除；Back回到原卡片 |
| 提示 | `content-card.ts`、本机设置存储 | 同一身份前3次进入首页时，焦点卡片下方显示“长按OK：更多选项” |
| 预读 | `apps/tv/src/app/vod-prefetch.ts`、`product-page.ts` | 短按OK时直接开始读取并交给播放器；长按打开菜单时不预读 |
| 续播策略 | `vod-workspace.ts`（`withResume`、`restart`）、`queue-playback.ts`、`product-season.ts`、`local-settings.ts`、`packages/contracts/src/local-profile.ts`（文案） | 有进度直接继续，控制层出现8 s并聚焦“从头播放”；“本地续播提醒”改名为“自动续播”，关闭时一律从头 |
| 快捷设置条 | `vod-workspace.ts`、`player-presentation.ts`、`vod-controls.ts` | 控制层可见时主行按↓打开一排：画质、倍速、弹幕、字幕、连播；Back或↑收起；隐藏层键位不变 |
| 文档 | `docs/TV_UI.md`、`docs/TV_PRODUCT_DESIGN.md` | 卡片长按菜单（对卡片放开“长按”）、详情、续播、快捷设置条的规则同步 |
| 测试 | 单元：长按判定（短按、长按、按住连发不重复提交）、菜单项按卡片类型、续播策略、快捷设置条选项；合成UI：改写`playFromShelf`等约十个文件，新增长按菜单各项、短按播放、快捷设置条等（见ADR-113） | — |

## P1-2b 改动清单

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 账号并入设置 | `apps/tv/src/app/product-frame.ts`、`product-settings.ts`、`product-account.ts`、`foundation-main.ts` | 侧栏去掉“账号”；设置第一组“账号”嵌入今天的账号内容；启动选择账号与删除确认流程不变 |
| 文案 | `product-library.ts`、`product-library-read.ts`、`video-interactions.ts`、`player-interactions.ts`、`foundation-main.ts`等 | 去掉“只读”“防重复写操作记录”；“未确认”改为说明下一步；诊断页保留原用语 |
| 死代码 | `foundation-main.ts:172-179`、`product-page.ts:140-145`、`apps/tv/src/app/guest-home.ts`及其只被它用到的模块 | 删除（先确认没有其他引用） |
| 按键开销 | `vod-workspace.ts`的200 ms刷新、`player-presentation.ts`、`apps/tv/src/ui/focus.ts`、`product-frame.ts` | 隐藏时只更新时间轴；变化时才重写控件；有显式邻居时不扫描整层；`focusin`不重复扫描 |
| 测试 | 合成UI：设置里的账号组、侧栏7项；单元：刷新只在变化时写入 | — |

## 设备验证

- 按ADR-113的按键数表逐项实按。
- 在首页与长列表上，用Inspector注入的按键测连续方向键的响应，与0.59.0对比。
- 先确认按键事件（见P1-2a第一行）。
- 回归以下路径：
  - 长按菜单的每一项：详情（再选分P）、从头播放、稍后再看、加入本机队列、UP主页、队列操作；
  - 番剧仍先进季页；
  - 本机队列管理；
  - Home返回后的继续观看提示。

## 已确认的决定（2026-10-26）

1. 卡片短按OK直接播放（有进度就续播），长按卡片调出菜单（详情、从头播放、稍后再看、加入本机队列、UP主页等，参照YouTube电视端）；播放器主行不加“详情”；番剧照旧进季页。（用户修改）
2. 续播不再弹窗：直接从进度继续，控制层出现8 s并聚焦“从头播放”；“本地续播提醒”改为“自动续播”。
3. 控制层可见时主行按↓打开快捷设置条（画质、倍速、弹幕、字幕、连播），⚙面板保留。
4. 侧栏去掉“账号”，账号内容并入“设置”第一组；投屏保留在侧栏。
5. 按键开销的两项改动放在P1-2b一起做。

由修改带来、需要你留意的细节：长按阈值约0.5 s；卡片提示“长按OK：更多选项”只在前3次显示；本机队列条目短按改为从这一项开始播放队列。
