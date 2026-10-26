# ADR-115：来源检查改回先查一路；超过24小时的视频可以播放

2026-10-26；F05/F06/F07/F19、R10、播放。接ADR-111第5项与ADR-112“可能的下一步”。状态：**用户已确认全部决定（2026-10-26）；0.63.0已安装；起播与0.62.0持平；超过24小时的视频尚未在设备上验证（用户没有找到这样的视频，先跳过）**。改动方案见[方案](../plans/2026-10-26-p1-1c-source-and-long-video-plan.md)。

## 背景

2026-10-26用户决定：

- 来源检查改回先查一路；
- 超过24小时的视频可以播放；
- 保证字幕按时出现（不先读弹幕）。

本ADR处理前两项，第三项不需要改代码。

### A. 成对检查没有收益

ADR-112让视频与音频两轨的512字节来源检查同时发出。0.59.0在电视上测得这一阶段没有可测的收益（[证据](../design/evidence/2026-10-26-p1-1b/README.md)）。

- 推断：两轨通常在同一个CDN主机，逐项检查时第二项复用第一项的TLS连接；并行时两路各自握手，总等待仍约等于一次握手。
- 为此新增的原生代码却不少：
  - `vod-source-pair.h`；
  - 两个包装文件`vod-api-pair.c`、`pgc-read-pair.c`；
  - 两个链接脚本，以及打包时对`VODAPI:pair`的强制检查。
- 0.58.0的逐项检查用的是`vod-api-failover`、`pgc-read-failover`两个构建目录。它们和链接脚本都还在，0.58.0已在电视上验证过。

### B. 超过24小时的视频今天打不开

ADR-111只让列表把超过24小时的时长显示为“时长未知”，打开详情和播放仍会失败。24小时（86 400 s / 86 400 000 ms）作为上限写在四十多处，可以分成几类：

| 类别 | 位置（举例） | 今天的作用 |
| --- | --- | --- |
| 列表与卡片 | `list-rows.ts`、`contracts/index.ts`、`up-archives.ts`、`recommendations.ts`、`guest-video.ts`（合同） | 时长上限；超出显示未知（ADR-111） |
| 详情与播放读取 | `vod-catalog.ts`（分P、合集、`timelength`）、`pgc-season.ts`、`guest-video.ts`、`public-kernel.ts`、`content-presentation.ts` | 超出就判为无效，整次读取失败 |
| 播放器与清单 | `vod-mpd.ts`、`guest-mpd.ts`、`session.ts`、`queue.ts`、`vod-catalog-media.ts`、`vod-workspace.ts`（起播位置）、`avplay.ts`（`getDuration`）、`element-video.ts` | 时长、起播位置、当前时间的上限 |
| 原生 | `vod-bridge-policy.h`（正式播放的本机桥，`vod/`模块）、`overlay-read.c`（弹幕分段编号上限240） | 元数据时长上限；弹幕段号 |
| 叠加层 | `overlay-read.ts`（合同）、`media-overlays.ts`、`danmaku.ts`、`overlay-clock.ts`、`timeline.ts`、`vod-overlays.ts`（段号最多240，即24小时×每段6分钟） | 弹幕、字幕时间与段号 |
| 本机记录 | `local-profile.ts`、`local-playback.ts` | 续播位置与时长 |
| 投屏 | `cast/nva.ts`、`cast/session.ts`、`cast/soap.ts`、`contracts/cast-receiver.ts`、`probe-bridge.h`（`cast-product`模块） | 手机投来的定位与时长 |

与时长无关、保持不动的：

- `vod_renew`的86 400（播放地址有效期）；
- 投屏地址、访客编号与登录有效期里的`86400000`。

时间显示`clockTime`只显示“分:秒”：25小时会显示成“1500:00”。

## 决定

### A. 来源检查改回先查一路

1. **回到0.58.0的逐项检查。**
   - 打包改回使用`vod-api-failover`、`pgc-read-failover`两个构建目录，`vod-api/`与`pgc-read/`的原生资源应与0.58.0逐字节相同（打包时对照）。
   - 删除成对检查的代码与测试：
     - `vod-source-pair.h`、`vod-api-pair.c`、`pgc-read-pair.c`；
     - `link-vod-api-pair.py`、`link-pgc-read-pair.py`；
     - 打包里的`VODAPI:pair`检查；
     - `source-pair`原生与单元测试。
   - `VodNativeApi.inspect`只保留逐项检查。
2. **保留ADR-112里与并行无关的部分。**
   - 一轨失败只重查失败的那一轨、另一轨沿用已读到的总长度（`VodCheckError`的`failures`与`known`）：逐项检查时同样适用，单元测试已覆盖。
   - B部分（叠加层与评论复用aid、cid与签名盐）不变：它已在设备上测得各省约0.5 s，且不涉及原生。
3. **字幕按时出现**：叠加层读取顺序保持“元数据→字幕→弹幕第一段”，不改。

### B. 超过24小时的视频可以播放

4. **媒体时长上限统一改为7天。**
   - 新增一处共享常量（例如`packages/contracts/src/media-limits.ts`：`MAX_MEDIA_SECONDS = 604800`，`MAX_MEDIA_MS = 604800000`），上表“列表、详情、播放器、叠加层、本机记录”各处改为引用它。
   - 原生：
     - `vod-bridge-policy.h`的时长上限改为同一个值；
     - `overlay-read.c`的弹幕段号上限改为1680（7天÷6分钟）；
     - `vod-overlays.ts`与合同同步。
   - 理由：
     - 7天足以覆盖站内已知的超长视频（马拉松式录像通常在24–100小时）；
     - 仍是有界解析：毫秒值低于C的32位无符号上限（约49.7天），也是JS的安全整数。
   - 超过7天：列表仍显示“时长未知”（ADR-111的行为，上限换成7天）。打开播放时说明“视频时长超出支持范围”，不再只显示笼统的读取失败。
5. **投屏暂不放宽**（建议）。
   - 投屏来自官方手机端，涉及`cast-product`原生模块与F20的整套设备验证；
   - 超过24小时的投屏按今天的方式拒绝；
   - 若要一起放宽，需要另做投屏验收。
6. **时间显示：一小时以上显示“时:分:秒”。**
   - `clockTime`对一小时以上的时长与位置显示`h:mm:ss`（例如“25:03:10”），一小时以内仍是`m:ss`。
   - 影响卡片时长角标、详情、播放器时间、续播文字。这改变了今天1–24小时视频的显示（“75:30”变为“1:15:30”），一并确认。

### 版本

两部分合为0.63.0。四个原生模块的资源会变：

- `vod-api/`、`pgc-read/`：回到0.58.0；
- `vod/`、`overlay-read/`：放宽上限。

其余原生资源逐字节不变。

## 实现（0.63.0）

| 决定 | 实现 |
| --- | --- |
| 1–2 逐项检查 | 删除成对检查的头文件、包装文件、链接脚本、`VODAPI:pair`处理与测试；打包改回`vod-api-failover`/`pgc-read-failover`。0.63.0包里`vod-api/`、`pgc-read/`共8个文件与0.58.0安装包逐字节相同。`VodSourceOwner`“只重查失败一轨”的两条单元测试保留 |
| 4 七天上限 | 新`packages/contracts/src/media-limits.ts`（`MAX_MEDIA_SECONDS`、`MAX_MEDIA_MS`、`MAX_DANMAKU_SEGMENT`），27个TS文件改为引用它。实现中补上了背景表漏列的`packages/media/src/overlay-session.ts`（叠加层逐帧的时间上限）。搜索结果的“分:秒”允许5位分钟（7天＝10080分） |
| 4 原生 | `vod-bridge-policy.h`的时长上限604 800 000 ms，`overlay-read.c`段号最多4位且不超过1680；重新链接`vod/`（vod-failover）与`overlay-read/`（overlay-read-subtitle）。`probe-bridge.h`不改，所以投屏模块的原生资源不变 |
| 4 超出范围 | 新`mediaLength`：整数长度超过上限判为`unsupported`（不是数据损坏），用在分P、合集、`timelength`与番剧单集。没有游客来源码的`source.unsupported`显示“此视频的时长或格式超出支持范围，请选其他视频”。游客路径仍是原来的笼统提示 |
| 5 投屏 | `packages/cast`、`cast-receiver`合同与`cast-receiver-player.ts`保持24小时 |
| 6 时间显示 | `clockTime`一小时以上为`h:mm:ss`；卡片朗读改为“X小时Y分Z秒”（`spokenLength`） |

与0.62.0相比，原生资源只有`vod-api/`、`pgc-read/`、`vod/`、`overlay-read/`四个目录变化。各Worker的JS包因共享合同重新打包。

结果：

- 单元778/778：新增`media-limits.test.ts`六条；ADR-111的24小时边界测试改为7天；删除`source-pair.test.ts`。
- 合成UI 112/112：新增`long-video.spec.ts`，30小时合成视频播放、显示`26:00:00 / 30:00:00`、在26小时处保存，并从“继续观看”从那里继续。
- 打包负例11/11：删除成对检查一条。
- 原生overlay-read、vod-bridge、vod-bridge-failover、vod-api、source-failover、pgc-read通过，新增：25小时与7天被桥接受、多1 ms被拒；段号1680可签名、1681被拒。
- `npm run check`通过。

## 设备验证（0.63.0）

[证据](../design/evidence/2026-10-26-p1-1c/README.md)。

- **起播**：卡片到首帧0.62.0为8.1–11.1 s；0.63.0第一轮8.4–9.6 s，另有一次17.4 s（来源检查段9.7 s，原因未查，按ADR-110的决定只记录），第二轮7.4–8.0 s。逐项检查没有可见的变慢。
- **超过24小时的视频**：用户在应用里没有找到，决定先跳过，遇到时再验证。第4项在设备上仍未确认，包括AVPlay对超长DASH的时长、跳转、续播与叠加层。

## 不做

- 来源检查提前到详情页预读阶段（ADR-112的另一个选项）。
- 叠加层常驻Worker。
- 投屏的时长放宽（见第5项，除非用户另行要求）。
- 超过7天的视频。

## 验收与证据

- **原生**：
  - 宿主上的VOD/PGC/叠加层原生测试通过；
  - 新增：25小时与7天边界的元数据被桥接受、7天以上被拒；段号1680可读、1681被拒。
  - `vod-api/`、`pgc-read/`与0.58.0安装包逐字节对照。
- **单元**：时长上限各解析器的边界（24小时以上通过、7天以上拒绝）；`clockTime`的`h:mm:ss`；逐项检查的重查规则保留。
- **合成UI**：
  - 一个30小时的合成视频：列表显示时长，可以打开详情与播放；
  - 跳转到26小时，弹幕段号正确；
  - 续播记录在26小时处保存并能从那里继续。
- **设备**（签名安装需逐版本授权）：
  - 一个真实的超过24小时的视频（由用户在应用里搜到或指定，证据只记时长档位）：列表与详情的时长、开始播放、跳到24小时以后、弹幕与字幕在那里出现、退出后从那里续播；
  - 一个普通视频：起播正常；
  - 起播耗时与0.62.0对比几次，确认改回逐项检查后不变慢。

## 风险

- **AVPlay对超长DASH的处理未知**：
  - 时长、定位、`getDuration`在24小时以上是否正确，只能在设备上确认；
  - 若AVPlay本身不支持，这一项要按设备结果收窄，例如只能播放、不能跳到24小时以后。
- **播放地址过期**：超长播放必然跨过地址有效期，依赖现有的`vod_renew`续期。它对数小时的视频已在工作，但没有在24小时以上的连续播放中验证。
- **显示格式变化**：1–24小时视频的时长写法改变，用户可能需要适应。
