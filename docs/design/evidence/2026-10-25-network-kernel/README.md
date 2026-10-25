# ADR-108 设备验证：常驻只读内核（0.54.0）

2026-10-25。用户授权签名并升级安装0.54.0，按[ADR-108](../../../adr/108-resident-read-kernels-connection-reuse-and-batched-pages.md)做设备验证：先在已安装的0.51.3上测基线，再测0.54.0。

- **设备**：Samsung UN58U8200FFXZC，Tizen 9.0（`capability`读到`platform_version:9.0`、armv7）。
- **包**：0.54.0未签名`114e9efe…b7f9`，签名`515a6229…29dd`（证书预检PASS，权限不变）。升级安装、启动均platformSuccess（一次，不清数据）。

## 方法

两个版本走完全相同的步骤：

- 用Samsung Web Inspector调试模式启动应用（`sdb shell 0 debug BiliSofa01.TV`后`sdb forward`）。调试启动前，应用须由用户先在电视上退出。
- 用[measure.mjs](measure.mjs)经DevTools协议注入一个探针：在页面加载前，记录首张卡出现的时刻，并统计每个Worker脚本被创建的次数；随后在页面里点击和派发按键。
- 只记录耗时、计数与通过标志，不记录标题、视频编号、URL、cookie或账号数据（JSON已核对）。
- 调试连接只用于取证，不作为“无电脑运行”的证明。

“冷启动”是Inspector触发的整页重新加载，进程本身不是新开的；两个版本测法相同，可以直接比较。每项只测一次（冷启动测3次），网络是同一条家庭宽带，结果会有自然波动。

## 结果

| 项目 | 0.51.3（基线） | 0.54.0 | 变化 |
| --- | --- | --- | --- |
| 冷启动到首张卡（3次） | 5182 / 4477 / 4373 ms | 2463 / 2171 / 2192 ms | 中位数 −51% |
| 冷启动期间启动的Worker | 2 | 1 | |
| 选择账号到“为你推荐”首卡 | 4240 ms | 4203 ms | 基本不变 |
| “查看更多·热门”向下10行，总耗时 | 42.1 s | 2.7 s | −94% |
| 其中超过300 ms的等待 | 9次（每行约2.4–4.5 s；第10行已到列表尽头） | 2次（最长516 ms） | |
| 滚动期间新启动的Worker | 8 | 0 | |
| 搜索首屏（首次 / 第二次） | 2744 / 3466 ms | 1111 / 686 ms | −60% / −80% |
| 进入“稍后再看”首屏 | 2379 ms | 650 ms | −73% |
| 整轮新启动的Worker（按脚本） | guest 14、search 4、library 2、recommend 1、catalog 1、identity 1、initials 2 | public-kernel 1、account-read-kernel 1、identity 1、initials 2 | |

原始数据：[baseline-0.51.3.json](baseline-0.51.3.json)、[baseline-0.51.3-grid.json](baseline-0.51.3-grid.json)、[v0.54.0.json](v0.54.0.json)。基线的网格一项是修正脚本后单独补测的：已登录时，热门货架要等焦点到达上一行才加载，原脚本没等到“查看更多”。

“选择账号到推荐”没有变快，是因为这一段由身份核对（identity Worker）、账号内核首次启动与会话nav、推荐请求依次组成，P0b只把后续的私人读取并到了同一会话里。启动顺序调整属于P0-3。

## 设备门槛

| 门槛 | 结果 |
| --- | --- |
| `terminate`循环（ADR-108第3节） | **PASS**：50个公共内核在请求进行中被终止（`killed` 50/50，共18 s）；随后新建的3个内核都正常返回（`ok` ×3）。[gate-terminate.json](gate-terminate.json)，脚本[gate-terminate.mjs](gate-terminate.mjs) |
| 两内核常驻时播放（第6节） | **部分满足**：先读稍后再看与首页（两个内核都在），随即播放首页第一个视频，观察585 s：状态始终`PLAYING`，播放位置从0推进到554 s、单调不回退，界面无错误，页面JS堆约10 MB；用户观看全程，确认“画面与声音全程流畅”。但这个视频选中的是**720P**（1280×720），不是1080P，1080P一项仍待用一个确有1080P的视频补测。[gate-playback.json](gate-playback.json)，脚本[gate-playback.mjs](gate-playback.mjs) |
| -352次数 | 本次测量期间没有任何列表读取失败。ADR要求的“一天内次数”需要日常使用一天后再看，仍OPEN |

## 不在本次范围

- 播放链路（P1）、页面保活与启动顺序（P0-2/P0-3）。
- 旧的`catalog`、`search`、`hot-search`、`native`、`library`、`recommend`、`public-read`模块仍在包内，按ADR-108在两步通过设备验收后移出。
