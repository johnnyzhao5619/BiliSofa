# ADR-112：P1-1b——视频与音频来源检查并行、叠加层与评论复用已读到的视频编号

2026-10-25；F06/F08/F09/F15、R03/R09、性能。接[ADR-110](110-playback-start-prefetch-handoff-and-overlay-lane.md)第7、8项。状态：**用户确认全部4项决定（2026-10-25）；在0.59.0实现并已签名安装；设备对比0.58.0：首帧到首条弹幕3.50→2.94 s、打开评论到第一条3.69→3.22 s；来源检查并行在设备上运行但这一段没有变快（见“设备结果”）**。改动方案见[P1-1方案](https://github.com/johnnyzhao5619/BiliSofa/blob/6e327470c9f8d6814cebe0e5796b01f81bd9534e/docs/archive/2026-10-26-plans/2026-10-25-p1-1-playback-start-plan.md)“P1-1b”。

## 背景

0.57.0的设备测量（[证据](../design/evidence/2026-10-25-playback-start/README.md)）显示，从状态行出现“正在获取播放源”到首帧还要3.5–6 s，首帧到首条弹幕约3.7 s。逐一核对代码（行号为2026-10-25的源码）：

### 来源检查

- **两项检查是串行的**：`VodNativeApi.inspect`（`platform/wasm-network/src/vod-native-api.ts:170`）在一个批次里先查视频轨、再查音频轨，每项读512字节，单项上限约9–10 s。
- **C层同一时刻只允许一个传输**：`vod-api.c`已经在用curl multi，但只有一个CDN句柄，`vod_begin`在有传输进行时拒绝新的（:184），各种状态都是全局单份。
- **主备切换会把两轨都重查一遍**：某一轨失败时，`VodSourceOwner.inspectOrdered`（`vod-source-owner.ts:140`）把这一轨换成备用线路，然后重跑整个批次，没有失败的那一轨也会再查一次。
- **`vod-api.c`牵连面大**：它是12个原生模块的源码输入，打包时会逐个核对摘要。直接修改它，就得重新链接全部12个模块。0.50.4的做法是不动它，只加一个包装文件、新建一个构建目录（[证据](../design/evidence/2026-10-23-source-failover/README.md)）。`vod-api.c`本身提供了`VOD_API_NO_MAIN`，包装文件可以自带`main`与tick。

### 叠加层与评论

- **每次读取一个Worker**：弹幕元数据、字幕、每6分钟一段的弹幕，每次读取都新建一个Worker并启动WASM（`overlay-runtime.ts:27`）。一段10分钟、开着弹幕和字幕的视频，大约要启动4个。
- **每次读取都先跑nav与view**：`overlay-native-api.ts:10-44`每次都先读nav（取WBI签名盐并核对账号），再读view（取aid与cid），番剧还要多读一次season，最后才读真正要的内容。弹幕分段要等元数据读完才开始，所以首条弹幕前要串行两个Worker、两组nav＋view。
- **C层其实早就接受aid/cid作为输入**：`overlay-read.c`的弹幕分段（6号）与`player/v2`（4号）都直接取cid、aid，nav与view只是JS这一层的选择。
- **aid在别处已经读到，但没有留下来**：
  - 播放读取在源Worker里已经读过view，cid只保存在私有的播放目录里，经私有端口`PrivateOverlayBinding {bvid, part, cid}`交给叠加层Worker（`overlay-binding.ts`）；
  - aid没有保存在任何地方（`parseVodDetail`忽略了它）；
  - 播放读取用过的WBI签名盐也没有往外传。
- **评论没有绑定端口**：评论每次打开也先跑nav＋view取aid（`comments-native-api.ts:7-17`）。
- **CID只能走私有端口**：`overlay-binding.ts`的约定是只有源Worker到叠加层Worker的私有端口可以携带CID。ADR-110第8项原写“`OverlayTarget`增加可选的aid/cid”，与这一约定冲突。

## 决定

### A. 来源检查并行

1. **两项检查同时发出。**
   - 新增一个C头文件（例如`vod-source-pair.h`），由两个来源模块的包装文件`vod-api-failover.c`与`pgc-read-failover.c`包含：
     - 两个各自带状态的匿名CDN句柄（写回调与头回调通过`CURLOPT_WRITEDATA`/`HEADERDATA`/`PRIVATE`区分，沿用`probe-bridge.h`的做法），挂在同一个multi上；
     - 自己的tick：没有成对检查时退回`vod_tick`；
     - 两项都结束后输出一行固定的完成信号，每一轨的HTTP状态、传输码、是否合格、总长度通过按轨导出的函数读取。
   - `vod-api.c`不改，只重新链接这两个模块（新的构建目录），其余10个模块的原生资源逐字节不变。
   - 单项上限保持9 s，成对检查的总上限也是9 s（取较长的一项，而不是两项相加）。
2. **失败时只重查失败的那一轨。**
   - 一轨失败（网络或超时）：只把这一轨换成备用线路并重查，另一轨沿用已经读到的总长度；
   - 两轨都失败：两轨一起换成备用线路，重查一次；
   - 每一轨仍然最多换一次线路，与ADR-102相同。“运行内避开”的规则不变。
   - `VodCheckError`改为可以同时标明两轨。

### B. 叠加层与评论复用

3. **aid、cid与WBI签名盐经私有绑定端口交接，不进公共合同。**
   - 源Worker在播放读取时保留aid（只在私有目录里），连同cid、本次读取用过的WBI签名盐，写进`PrivateOverlayBinding`；
   - 公共的`OverlayTarget`保持`{bvid, part, seasonId?}`不变；
   - 这样修订ADR-110第8项的写法，以符合“CID只走私有端口”的约定。
4. **叠加层读取不再跑nav、view与season。**
   - 绑定里有aid、cid和签名盐时，叠加层Worker导入账号cookie（本地操作，不联网）后直接读`player/v2`或弹幕分段，每次读取只剩真正要的那一个请求；
   - 番剧也一样：源Worker在播放读取时已经核对过季与集。
   - 绑定缺少这些字段时（例如旧源Worker，或读取在交接前就开始了），退回今天的nav＋view路径。
   - 登录失效由`player/v2`与弹幕接口自己的-101返回发现，按`login`处理，与今天一致。
5. **评论同样拿到绑定。**评论读取也从源Worker取得一个私有绑定端口（aid与签名盐），不再为取aid读view。没有绑定时退回今天的路径。
6. **叠加层常驻Worker这一批先不做。**
   - ADR-110第8项原计划一次播放只启动一个叠加层Worker。但常驻需要新的原生会话：今天`vod-api.c`的会话固定90 s，停止会拆掉整个会话。弹幕与字幕结果最大约2 MiB，也超过`ResidentKernel`的帧上限。
   - 先做第4、5项（不改原生），测量后再决定是否值得做常驻Worker。

## 实现（0.59.0）

- **成对检查**：
  - `platform/wasm-network/src/vod-source-pair.h`：两个各带状态（正文512字节、头部、Content-Range总长）的匿名CDN句柄，挂在独立的multi上；
  - 自带tick：先跑`vod_tick`，再推进成对检查；两项都结束后输出一行`VODAPI:pair`；
  - 每轨的HTTP状态、传输码、是否合格、总长度经`vod_pair_http/curl/valid/total`读取；
  - 成对检查进行中`vod_begin`拒绝；半路失败时已挂上的一轨会被摘下；
  - 会话结束时，经`BILISOFA_EXTRA_CLEANUP`一并清理。
- **新包装与构建目录**：
  - 新包装`vod-api-pair.c`、`pgc-read-pair.c`包含原样的`vod-api.c`／`pgc-read.c`与这个头文件；
  - 新的链接脚本`tools/link-vod-api-pair.py`、`link-pgc-read-pair.py`输出到`build/vod-api-pair`、`build/pgc-read-pair`；
  - 打包改用这两个目录，并要求源码清单里有`vod-source-pair.h`、模块里有`VODAPI:pair`；
  - 与已安装的0.58.0相比，56个原生文件中只有`vod-api/`与`pgc-read/`的`manifest.json`、`probe.js`、`probe.wasm`变化，其余逐字节一致。
- **JS**：
  - `VodNativeApi.inspect`：模块有成对导出时一次检查两轨，没有时（叠加层、评论等模块）照旧逐项检查；
  - `VodCheckError`新增`failures`（每个失败轨）与`known`（已通过轨的总长）；
  - `VodSourceOwner.inspectOrdered`：只重查失败轨；两轨都失败时一起切换；任何一轨的备用线路也失败就停止。
- **绑定与复用**：
  - 私有详情保留aid（UGC取view的`aid`，番剧取季信息里每集的`aid`）；
  - 播放读取返回本次nav的签名盐；
  - `PrivateOverlayBinding`可选携带`aid/img/sub`，三项同时出现或都不出现。
- **叠加层**：有完整绑定时只导入cookie，直接读`player/v2`或弹幕分段，番剧也不再读季与view；失败（取消、登录失效除外）时退回nav＋view重读一次。
- **评论**：
  - 每次读取都从源Worker取得同样的私有绑定端口；
  - 绑定属于同一视频时跳过nav与view，失败时同样退回一次；
  - 没有绑定（3 s内未到）时走旧路径。
- **测试**：
  - 主机原生：新增`tests/native/source-pair.test.py`共32条（继承的VOD/PGC读通道与Akamai检查，以及成对检查本身：两条各延迟700 ms的检查总耗时低于1.3 s，两轨结果分开，一轨失败或非范围响应，忙时拒绝，取消，超时，目的地规则）；`source-failover`、`vod-api`、`overlay-read`、`comments-read`沿用通过；
  - 单元774/774：新增`source-pair.test.ts`、`comments-binding.test.ts`，以及主备、叠加层、源Worker绑定、详情aid的用例；
  - 打包负例12/12（新增：缺少成对检查的源模块不打包）。

## 设备结果（0.59.0对比0.58.0）

[证据](../design/evidence/2026-10-26-p1-1b/README.md)。每个版本12次起播，中位数：

| 指标 | 0.58.0 | 0.59.0 |
| --- | --- | --- |
| “正在获取播放源”到“缓冲中” | 1344 ms | 1368 ms |
| “正在获取播放源”到首帧 | 5280 ms | 5618 ms |
| 首帧到首条弹幕 | 3495 ms | **2936 ms** |
| 打开评论到第一张卡片 | 3687 ms | **3219 ms** |

- **B有效**：叠加层与评论跳过nav/view，各省约0.5 s。
- **A没有可测的收益**：
  - 挂到播放源Worker上确认：每次起播走1次成对检查、0次逐项检查，成对检查耗时545 ms与1484 ms，占这一阶段的大部分；
  - 推断：两轨通常在同一个CDN主机。0.58.0逐项检查时第二项复用了第一项的TLS连接；并行时两路各自新建连接，总等待仍约等于一次握手。这一推断尚未用分项计时证明。
- **可能的下一步**（另行决定）：把来源检查提前到详情页预读阶段，或回到先查一路、复用连接再查另一路的做法。
- **用户决定（2026-10-26）：改回先查一路**（复用连接再查另一路，即0.58.0的逐项检查）；B（叠加层与评论复用）保留。由[ADR-115](115-serial-source-check-and-long-videos.md)在0.63.0实施。

## 不做

- 调整叠加层读取顺序：
  - 今天各项读取共用一个`reading`标志，叠加层通道一次只读一项，所以顺序是元数据→字幕（开启时）→弹幕第一段（`vod-overlays.ts:68-93`）；
  - 先读弹幕第一段可以让首条弹幕更早出现，但会推迟字幕。用户2026-10-26决定不做：保证字幕按时出现。
- 修改`vod-api.c`本身，或任何其他使用它的模块。
- 写入、投屏与直播通道。

## 验收与证据

- **主机原生**：
  - 成对检查同时进行：本地TLS夹具让两轨各延迟固定时间，总耗时接近较长的一项；
  - 一轨失败、两轨都失败、一轨不合格（非206、长度不对）；
  - 超时；
  - 取消后可以再次开始；
  - 原有的单项检查与其余操作不受影响；
  - Akamai备用线路规则照旧。
- **单元**：
  - 成对检查的帧协议、按轨错误；
  - 主备切换只重查失败轨；两轨同时失败一起切换；
  - 绑定携带aid与签名盐时不发nav/view/season，缺少时退回；
  - 绑定与`bvid/part`不符时拒绝；
  - 评论使用绑定。
- **打包**：只有`vod-api/`与`pgc-read/`的原生资源变化，其余原生资源与0.58.0逐字节一致。
- **设备**：与0.58.0同方法对比：
  - “正在获取播放源”到首帧；
  - 首帧到首条弹幕；
  - 打开评论到第一条出现；
  - 播放中主备切换的现有回归（如能复现）。

## 风险

- **两路并发对CDN的压力**：每次起播多一个并发连接，只针对同一个视频的两条轨，数量有上限。
- **签名盐过期**：签名盐在播放读取时取得，长时间播放后可能过期。签名被拒（-352/-403/412）时，退回nav＋view重读一次。
- **绑定被重放到别的视频**：绑定按`bvid/part`核对，并且只在同一次播放的私有端口里传递。
