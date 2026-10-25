# ADR-108：只读列表改用常驻网络内核，复用连接，缓存签名密钥，放大上游分页

2026-10-25；F01/F02/F03/F04/F07、R05/R15、性能（W02基线）。接2026-10-25前端交互与调用逻辑review。状态：**用户确认全部5项决定（2026-10-25）。P0a（0.53.0）与P0b（0.54.0）已实现，0.54.0已签名并升级安装；设备对比与`terminate`门槛PASS，播放门槛只测到720P，-352的一天计数OPEN**（[设备证据](../design/evidence/2026-10-25-network-kernel/README.md)）。改动方案见[P0网络内核方案](../plans/2026-10-25-p0-network-kernel-plan.md)。

## 背景

用户反馈：加载效率低、经常要等很久，列表频繁加载且容易错乱，经常调用不用的接口。代码核对后，只读列表的主要原因有四个：

- **每个请求都新建一次网络栈。** `ScopedGuestWorker.run`每次调用都`new Worker`，拿到结果后`terminate`（[scoped-guest-worker.ts](../../apps/tv/src/platform/scoped-guest-worker.ts)第18、38行）。每个Worker都要先取`manifest.json`、`importScripts`约0.86 MB胶水JS，再编译约2.8 MB的WASM，加载约0.4 MB的CA数据。
- **没有连接复用。** argv风格模块的`guest_get`每次都`curl_global_init`→`curl_easy_init`→阻塞`curl_easy_perform`→`cleanup`，源码注明“不做持久连接复用”（[probe-guest.h](../../platform/wasm-network/src/probe-guest.h)第79–110行）。账号模块每次调用也是新Worker、重新导入cookie。每个请求都要重新建立TCP和TLS。
- **`nav`几乎在每个请求前都跑一次。**
  - 公开搜索每页都先跑`search-public-nav`取WBI密钥，再跑签名查询；
  - 账号只读（稍后再看、历史、收藏、关注更新、推荐、登录态公开读）每次都先跑0号`nav`身份核对。
- **上游分页只有4条。** 热门`ps=4`、搜索`page_size=4`、稍后再看/收藏内容/追番`ps=4`。C的URL里写死了4，TS解析器也按`length>4`拒收（如[watch-later.ts](../../packages/bili-client/src/watch-later.ts)第9行、[search.ts](../../packages/bili-client/src/search.ts)第27行）。网格每向下一行就是一次完整的“Worker+WASM+TLS+nav”。

后果：

- 在电视CPU上，单个列表请求估计要1–3 s（尚未实测，W02基线未建立）。
- 请求次数被放大5–10倍，也提高了ADR-105记录的-352风控暴露。

可以直接沿用的已有做法：

- `search-worker.ts`已在**同一个WASM实例上连续两次`callMain`**（`noExitRuntime:true`，先nav后签名查询），在已安装产品上运行。
- `vod-api.c`已是常驻easy+multi句柄、`emscripten_set_main_loop`驱动、`_vod_begin(op)`逐个请求、`stop`可在两次tick之间取消的结构，已有设备证据。
- WBI密钥本来就在TS层解析（`parsePublicSearchKeys`），再作为参数传给C。

## 决定

### 1. 两个常驻只读内核，取代“一请求一Worker”

| 内核 | 合并的现有模块与操作 | 凭据 | 生命周期 |
|---|---|---|---|
| `public-kernel`（公共只读） | 热门（现取自W01 `native/probe.js`）、`catalog`（全站榜、分区榜、访客标识、PGC榜与索引）、`search`（视频/UP主/番剧WBI搜索及其nav）、`hot-search` | 无账号cookie；只带B站访客标识（ADR-106） | 应用级单例；启动时预热；前台常驻 |
| `account-read-kernel`（账号只读） | `library`（0–5号）、`recommend`、`public-read`（0/4/5号）、追番列表读取 | 当前账号的独立jar，只在Worker内 | 每个活动账号一个；切换账号、移除账号、进入后台、退出时关闭 |

- **只合并同一权限级别的只读路由。** 两个内核的链接脚本沿用现有的路由扫描，禁止出现写入、登录、CDN、playurl与心跳路由。写入、点赞/投币/收藏、追番切换、进度上报、VOD、叠加、评论、投屏模块不并入、不改动。
- **C侧采用`vod-api.c`的multi+tick结构。** 每次请求由`_kernel_begin(op)`开始，结束时只发“请求完成”帧（`KERNEL:response:<op>`），不再清理句柄。只有会话关闭才清理句柄、清空jar并发`KERNEL:closed`。
- **取消只取消当前请求，不拆会话。** `stop`在两次tick之间执行`curl_multi_remove_handle`，最长约一个tick（25 ms）。页面切换不再等待阻塞中的`curl_easy_perform`跑完。
- **会话关闭时机：**前台空闲5分钟、`document.hidden`、切换/移除账号、退出、协议错误。会话关闭仍要求原生确认（`closed`帧），这一点不变。
- 主线程用单例客户端（`PublicKernelClient`、`AccountReadKernelClient`）。同一时刻一个在途请求，加一个按优先级排列的小队列：当前页读取优先于预取，新的同键请求复用在途Promise。

### 2. 连接复用与超时

- 每个内核为`api.bilibili.com`保留一个easy句柄，`public-kernel`另为`s.search.bilibili.com`保留一个。`CURLOPT_MAXCONNECTS`设为4，开启`CURLOPT_TCP_KEEPALIVE`，使用libcurl默认的TLS会话缓存与DNS缓存。
- TLS校验、`CAINFO`、只允许https、不跟随重定向、不走代理、目标主机检查、正文上限全部保持不变。
- 超时：连接4 s、单请求8 s不变；Worker就绪超时从现有的20–24 s改为首次10 s、之后不再计入。服务端主动断开空闲连接时，由libcurl自动重连，不算失败。
- **不在本ADR启用gzip。** 现有libcurl构建为`CURL_ZLIB=OFF`，启用需引入zlib依赖并重新审核供应链，另立ADR（P1）。

### 3. 只读通道失败不再永久毒化

- 只读内核出现父侧超时、非法帧或WASM中止时：直接`terminate`该Worker，记一条脱敏诊断，下一个请求新建内核。
- 2分钟内连续3次失败时，该内核暂停60 s，界面提示稍后重试（与ADR-105的风控暂停合并计时）。
- 只读通道允许“未确认原生关闭即`terminate`”：它不持有写意图；账号jar只在该Worker的内存里，`terminate`会随之销毁。这是对ADR-027“未知关闭阻止复用”在**只读GET通道**上的放宽。
- 写入通道、播放与投屏通道保持现有规则：先确认关闭，再复用。
- **设备门槛：**`terminate`循环（50次）后，套接字/描述符不耗尽，后续请求正常，才算成立。

### 4. nav与WBI密钥缓存

- **公开WBI密钥**（img/sub）：
  - 主线程内存缓存，同时写入`localStorage`的`bilisofa.wbi-keys.v1`（`{img, sub, fetchedAt}`）。它们是B站公开下发的签名盐，不是凭据，可以按公共缓存处理，符合ENGINEERING“偏好/公共缓存/私密会话分开”。
  - 本地日期变更或超过6小时即失效。
  - 签名请求返回-352/-403/HTTP 412时：刷新密钥一次、重试一次；仍失败则进入ADR-105的暂停。
- **账号nav（身份核对）**：
  - 只在账号内核会话打开时做一次（同时导入jar并核对mid）。
  - 之后在以下情况重新核对：距上次核对超过10分钟后的下一次私人读取；接口返回-101或mid不一致；从后台恢复。
  - 账号内核内的WBI签名（推荐）复用会话内取得的密钥，规则同上。
- **不在本ADR改动**：播放、叠加、评论、互动模块内部的nav/view（在`authorized()`里），归P1播放链路。

### 5. 上游分页放大到20，界面仍按4卡一行

| 接口 | 现在 | 改为 | 界面页（4卡）上限 |
|---|---|---|---|
| 热门`popular` | `ps=4`，最多10页 | `ps=20`，最多5批 | 25（100条） |
| 视频/UP主/番剧搜索 | `page_size=4`，最多10页 | `page_size=20`，最多5批 | 25（100条） |
| 稍后再看 | `ps=4`，最多25页 | `ps=20`，最多5批 | 25 |
| 收藏夹内容 | `ps=4`，最多25页 | `ps=20`，最多5批 | 25 |
| 追番/追剧列表 | `ps=4` | `ps=20` | 不变 |
| 历史、关注更新、推荐、排行、UP投稿 | 游标或已为批量 | 不变 | 不变 |

- 数据层新增`BatchedPages`适配，做法同现有排行快照（`rankingPage`）：
  - 界面第p页取第⌈p/5⌉批里的第((p−1) mod 5)段；
  - 跨批按稳定键（`bvid`、`bvid:part`或UP mid）去重；
  - 同一来源在会话内冻结快照，直到用户刷新、切换身份或TTL到期（热门5分钟，搜索10分钟，私人列表2分钟）。
  - `ContinuousGrid`与各页面的4卡逻辑不改。
- 解析器与正文上限同步放宽：
  - 列表条数上限4改为20；
  - 公共JSON上限从128 KB改为512 KB（等于现有`BILISOFA_GUEST_MAX`）；账号库已是512 KB。
- **上线前先核对每个接口的实际`ps`上限：**用一次只读主机请求，按ADR-105的节奏，不带账号。核对不通过的接口退回到它的最大值。

### 6. 内存

- 常驻内核最多两个（公共+当前账号），每个沿用`TOTAL_MEMORY=32MB`、不扩容。播放期间的VOD与叠加Worker不变。
- **设备门槛：**播放1080P时两个内核都常驻，没有内存不足或掉帧。不满足时，播放期间先关闭公共内核，播放结束再懒加载。

## 不做

- 不改播放、叠加、评论、互动、投屏、写入模块，不改它们的nav/view。
- 不做页面保活、列表持久缓存/SWR、启动顺序调整、封面缓存（P0-2/P0-3）。
- 不启用gzip，不升级libcurl/OpenSSL。
- 不改变TLS、cookie隔离、CSP/WARP、凭据存储与写入防重复规则。
- 不删除W01 `native/probe.js`：guest-video、会话等探针仍在用它，只是产品热门不再走它。

## P0a实现（0.53.0）

- **原生**：`platform/wasm-network/src/public-kernel.c`。
  - 冻结的`catalog-visitor.c`（连同catalog-ua/catalog-up/catalog）、`search.c`、`hot-search.c`原样包含，编译期间`guest_get`只记录构造好的URL；
  - 新写的只有热门（`ps=20`）与WBI搜索（`page_size=20`、页1–5）两个构造器，搜索沿用`search.c`的关键词、密钥与时间检查；
  - 常驻会话核心（multi＋tick、`stop`只摘除当前传输、9 s请求期限）写在同一文件里，没有单独抽出`kernel-core.h`，P0b需要时再抽。
- **链接**：`tools/link-public-kernel.py`输出`build/public-kernel`。路由扫描禁止播放、CDN、账号、登录、写入与直播路由，并要求每条预期路由都在。
- **Worker**：`public-kernel-worker.ts`沿用现有各lane的结果形状（错误码前缀不变），由主线程lane再用原解析器核对一遍。
- **主线程**：
  - `public-kernel.ts`：常驻客户端；
  - `wbi-keys.ts`：公开签名盐缓存；
  - `batched-pages.ts`：20条一批切成4卡一页，跨批去重，冻结快照；
  - `public-lanes.ts`：与旧Worker同形的lane，并保留旧Worker的“回复必须对应请求”检查（分区、UP、页码）。
- **接入点**：首页与货架（`content-runtime`）、搜索页、热搜、番剧热门、UP投稿、访客标识，以及旧的UP/番剧搜索面板。
- **生命周期**：启动时预热；隐藏、退出、页面卸载时关闭。
- **与方案不同之处（有意为之）**：
  - 热门与搜索仍用W01探针UA，分区类读取仍用电视运行时UA（ADR-104），与旧模块逐项一致；
  - 全站榜、番剧榜与热搜各加了5/10/5分钟的应用级复用，让货架与“查看更多”共用一次读取；
  - 直播搜索不在范围内，继续走旧`search`模块，页数上限保持10；
  - W01探针界面（`ui/popular.ts`）不改，仍用旧Worker；
  - “刷新”现在对热门也会重建快照（`ContentQuery`允许热门第1页`refresh`）。
- **仍在包内**：`catalog`、`search`、`hot-search`、`native`模块与对应Worker，按决定在P0b验收后再移出。

## P0b实现（0.54.0）

用户在P0a设备验收前选择“先开发P0b，不上电视”，所以P0b与P0a的设备门槛一并待测。

- **原生**：`platform/wasm-network/src/account-read-kernel.c`。
  - 冻结的`recommend-read.c`（连同`library.c`）原样包含：独立jar、cookie行检查、Set-Cookie域检查、正文与头上限、tick与关闭，都是这个内核的引擎；
  - 0号nav、2号历史、3号收藏夹、5号关注更新、6号推荐，走它们原来的构造器；
  - 新增四个构造器：稍后再看（7号）与收藏内容（8号）每批20条、页1–5，以及登录态的分区榜（9号）与UP投稿（10号）。分区与UP原先在`public-read`（`vod-api.c`引擎）里，改走同一个账号会话；
  - `kernel_stop`只摘除当前传输，会话、jar与连接都保留；
  - 会话最长10分钟（原来20秒），到期由原生自行关闭并清空jar；
  - 1号与4号（每批4条的旧路由）在内核入口拒绝。
- **链接**：`tools/link-account-read-kernel.py`输出`build/account-read-kernel`。路由扫描禁止写入、登录、播放、CDN与搜索主机路由，并要求10条预期路由都在。
- **Worker**：`account-read-kernel-worker.ts`。
  - 第一次读取时打开会话、导入jar并核对nav（`isLogin`且mid与账号一致）；
  - 之后的读取不再跑nav；
  - 距上次核对满10分钟，或任何列表返回登录失效，下一次读取先重新核对；
  - 换账号（或同一账号的cookie变了）时，先关闭旧会话、清空旧jar，再为新账号开会话；
  - 推荐用会话nav取得的WBI签名盐。
- **主线程**：
  - `public-kernel.ts`泛化为`ResidentKernel`（Worker文件与WBI签名可选），公共与账号两个内核共用排队、去重、取消、失败更换与暂停规则；
  - `account-runtime.ts`的推荐、历史、收藏夹、收藏内容、关注更新、稍后再看与登录态公开读，全部改走当前账号的内核；
  - 账号运行时关闭（切换账号、移除、进入后台、退出）时，内核随之关闭；
  - 稍后再看与收藏内容用`BatchedPages`从20条批切出4卡页。第1页每次进入都重新读取，避免刚在别处移除的条目又出现；其余页最多复用2分钟。
- **与方案不同之处（有意为之）**：追番列表仍在`pgc-follow`模块。该模块同时承担追番切换（写入）与追番状态读取，拆出列表读取要复制它的签名构造器，而这个列表请求很少；本批不拆，`ps`仍为4。
- **仍在包内**：`library`、`recommend`、`public-read`模块与对应Worker不再被产品调用，但还留在包里，等两步都通过设备验收后再一起移出。

## 旧模块移出（0.55.0）

0.54.0设备对比完成后，用户决定不补测1080P，并要求继续。按第4项决定，被两个内核取代的模块从产品包移出：

- **移出的Worker（7个）**：`guest`、`catalog`、`search`、`hot-search`、`library`、`recommend`、`public-read`。产品包里已经没有任何代码引用它们（核对了`app.js`与各Worker的引用）。
- **移出的原生模块（6个）**：`catalog`、`search`、`hot-search`、`library`、`recommend`、`public-read`。
- **保留**：`native`（访客视频与投屏Worker仍在用）。C源码与链接脚本也保留：两个内核都靠`#include`复用它们。
- **包大小**：解压后66.9 MB→47.9 MB，文件121→90个；WGT 19.5 MB。
- **打包门禁**：两个内核的manifest必须列出冻结的来源文件（公共内核：`catalog-visitor.c`、`catalog-ua.c`、`search.c`、`hot-search.c`；账号内核：`library.c`、`recommend-read.c`），缺一个就拒绝打包；原来针对`catalog`模块的负例改为针对这一条。
- **合成UI**：测试适配器转发用的旧lane Worker改为由`playwright.app.config.ts`从源码打包，经`tools/serve.mjs`的测试专用目录（`BILISOFA_TEST_OVERLAY`）在同源提供；产品包不受影响。
- **版本**：内容变了，所以升为0.55.0；已签名安装的0.54.0不改。0.55.0未签名、未安装。

## 验收与证据

- **上游`ps`上限核对（2026-10-25，主机，不带账号，每次间隔6 s，项目固定CA，TLS校验开启）**：热门`ps=20`返回20条（31 KB）；视频与UP主搜索`page_size=20`各返回20行（30 KB / 44 KB），回显`pagesize=20`、`numPages=50`；番剧搜索的测试词无结果，但同样回显`pagesize=20`。均低于512 KB上限。
- **主机原生**（`tests/native/public-kernel.test.py`，8/8）：
  - 200次连续请求只建立1条连接；
  - 每条路由的路径、主机、UA、Cookie与Referer都正确；
  - 非法参数不发出请求；
  - 请求中途`stop`在50 ms内返回，下一次请求正常；
  - 慢响应在8 s超时（cURL 28）；
  - 不受信证书在HTTP之前失败；
  - 正文上限生效；
  - 关闭后拒绝新请求。
- **单元**（`npm test`，747/747）：
  - 新增`tests/unit/public-kernel.test.ts`：切片、跨批去重、冻结与续期、WBI缓存、在途去重与优先级、取消、超时更换Worker、3次失败暂停、签名被拒后重试一次、空闲关闭、20条批与4卡页的契约；
  - 原有14条按新行为改写：页数上限25、热门可刷新、共享内核不再逐请求终止Worker。
- **打包**：0.53.0未签名包验证通过；打包负例11/11；`npm run check`通过。
- **P0b主机原生**（`tests/native/account-read-kernel.test.py`，5/5）：
  - 9种私人读取共用一个会话与一条连接，每次都带同一个jar；
  - 新路由每批20条，各路由的Referer正确；
  - 非法参数与已退役的1/4号不发出请求；
  - `stop`后会话与jar仍在；
  - 会话到期后关闭，新会话不带旧jar；
  - 关闭后所有缓冲与句柄清空。
- **P0b单元**（`npm test`，749/749）：
  - 新增`tests/unit/account-kernel-worker.test.ts`，用伪造的原生导出验证会话规则：nav每会话一次、10分钟或登录失效后重核、换账号先关旧jar、nav身份不符时拒绝、`stop`与关闭；
  - 新增稍后再看按批分页测试；
  - 原有11条账号运行时测试改用伪造的账号内核：取消改为只停当前传输；原先“未知关闭阻止复用”一条改为“只读内核崩溃时换新、清理缓存仍成功”（第3节）。
- **P0b打包**：0.54.0未签名包验证通过；打包负例11/11。
- **合成UI**（`npm run test:ui:app`）：保留的100条全部通过（首轮99/100，另1条按新行为改写后，所在的阅读套件17/17）。
  - 改写的一条：首页搜索结果第1批里有一行付费课程被跳过时，旧版只显示3张卡；现在由下一批补满第4张（`tests/product-reading-ui/fixes2.spec.ts`）。
  - 测试用的`tests/ui-kernel/kernel-adapter-worker.js`代替两个内核Worker，把每个请求转给同一lane的旧Worker，现有原生夹具原样提供数据；所以合成UI验证的是lane、批次与页面行为，不是内核WASM本身。
  - 0.54.0：保留的100条全部通过，无需改写；其中`product-up-fix*`的规格经适配器走账号内核，覆盖登录态分区读取以及稍后再看、云端历史、收藏夹列表。
- **设备（0.54.0，2026-10-25，用户授权签名与升级安装）**，详见[设备证据](../design/evidence/2026-10-25-network-kernel/README.md)：
  - 与已安装0.51.3同步骤对比：冷启动到首张卡中位数4477→2192 ms；“查看更多·热门”向下10行42.1→2.7 s（超过300 ms的等待9→2次）；搜索首屏2744→1111 ms（第二次3466→686 ms）；稍后再看首屏2379→650 ms；选择账号到推荐首卡4240→4203 ms，基本不变；
  - `terminate`循环：**PASS**（50/50在请求中终止，之后新内核3/3正常返回）；
  - 两内核常驻时播放：585 s内始终PLAYING、无错误、用户确认全程流畅，但选中的是720P，**1080P仍待补测**；
  - -352：测量期间没有列表读取失败，**一天内次数仍OPEN**。
- **当时的设备门槛清单**：
  - 改动前后各测一次：冷启动到首张卡、首页向下滚动10行、搜索首屏、从“我的”进入稍后再看；
  - `terminate`循环50次；
  - 两内核常驻时的1080P播放；
  - 一天内的-352次数。

## 风险

- **长连接被中间设备或服务端提前断开。**由libcurl自动重连；连续失败才计入第3节的失败。
- **Tizen套接字关闭语义。**现有libcurl带`tizen-close-drain`补丁；常驻后关闭次数减少，但`terminate`路径是新的，需设备证据。
- **账号jar在Worker内存中停留更久。**只在前台、单账号、只读内核内；进入后台、切换账号即关闭。
- **上游`ps`上限或风控随时调整。**每个接口单独设回退值；核对失败不阻塞其他接口。
