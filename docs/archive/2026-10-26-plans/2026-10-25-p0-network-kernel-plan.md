# P0 网络内核改动方案（常驻Worker、连接复用、nav/WBI缓存、上游分页）

2026-10-25。对应[ADR-108](../../adr/108-resident-read-kernels-connection-reuse-and-batched-pages.md)。状态：**用户确认5项决定（2026-10-25）；P0a在0.53.0、P0b在0.54.0实现（均未签名/未安装；按用户选择，P0b在P0a设备验收前开发）。实现细节与偏差见ADR-108“P0a实现”“P0b实现”**。分支`perf/p0-network-kernel`。

## 目标与范围

- **目标：**首页、搜索、我的、追番这些只读列表的每次请求，不再支付“新Worker＋WASM编译＋TLS握手＋nav”的固定成本；滚动不再每行一个请求。
- **范围：**只读列表通道。播放、叠加、评论、互动、投屏、写入不在本批（P1）。
- **用户可感知的变化：**
  - 首页、搜索首屏更快；
  - 向下滚动基本不等待；
  - “重试”在一次超时后仍然可用；
  - 界面布局与操作不变。

## 分两步交付

先做公共通道（风险低、覆盖首页与搜索），设备验证通过后再做账号通道。两步都可以单独回退。

| 步骤 | 内容 | 依赖 | 回退 |
|---|---|---|---|
| **P0a 公共内核** | `public-kernel`、WBI密钥缓存、热门/搜索`ps=20`与`BatchedPages`、只读失败不毒化 | 无 | 重装上一个已签名包（0.52.0）。按ADR-107不加构建开关，旧模块在P0b验收前保留在包里 |
| **P0b 账号只读内核** | `account-read-kernel`、会话内nav核对一次、稍后再看/收藏/追番`ps=20` | P0a的`KernelClient`与`BatchedPages` | 重装P0a的已签名包 |

## 改动清单

### 原生（C/WASM）

| 文件 | 改动 |
|---|---|
| `platform/wasm-network/src/kernel-core.h`（新） | 从`vod-api.c`的结构抽出常驻会话核心：每主机一个easy句柄＋一个multi；`kernel_start/begin(op)/tick/stop_current/close`；`KERNEL:ready`、`KERNEL:response:<op>`、`KERNEL:closed`；`MAXCONNECTS=4`、`TCP_KEEPALIVE`；TLS、CA、https、不跟随重定向、不走代理、正文上限保持原值 |
| `platform/wasm-network/src/public-kernel.c`（新） | 操作：热门(page)、全站榜、分区榜(id)、访客`finger/spi`、PGC榜/索引、搜索nav、视频/UP主/番剧WBI搜索、热搜。参数校验沿用现有C函数；热门与搜索的`ps/page_size`改为20 |
| `platform/wasm-network/src/account-read-kernel.c`（新，P0b） | 操作：nav核对、稍后再看、历史游标、收藏夹列表、收藏内容、关注更新、推荐、分区榜（本人会话）、UP投稿（本人会话）、追番列表。只读GET；jar只在会话内；关闭时清空jar（`COOKIELIST ALL`） |
| `tools/link-public-kernel.py`、`tools/link-account-read-kernel.py`（新） | 照现有链接脚本：固定SDK、CA哈希、路由扫描（禁止写入、登录、CDN、playurl、心跳），输出manifest |
| `tools/build-foundation-app.mjs`、`tools/package-foundation-app.py` | 打入两个新模块与新Worker。live搜索仍用`search`模块（直播在当前交付中排除，代码保留）；`catalog`、`hot-search`、`library`、`recommend`、`public-read`模块在两步都验收后移出产品包 |

现有C源码不删除，新内核通过`#include`复用它们的URL构造与参数校验，避免出现两份不一致的实现。

### Worker胶水（TS，跑在Worker内）

| 文件 | 改动 |
|---|---|
| `platform/wasm-network/src/public-kernel-worker.ts`（新） | 加载一次WASM，常驻；收`{op,args,requestId}`，用`_kernel_begin`发起请求，读取正文并在Worker内解析成有界结果，回传`{requestId,kind,...}`；`stop`取消当前请求；`close`确认关闭 |
| `platform/wasm-network/src/account-read-kernel-worker.ts`（新，P0b） | 同上；会话打开时导入cookie并做nav核对，记录核对时间；超过10分钟或返回-101时重新核对 |

### 主线程（TS）

| 文件 | 改动 |
|---|---|
| `apps/tv/src/platform/kernel-client.ts`（新） | 通用常驻客户端：单在途请求＋优先级队列；同键在途去重；取消只发`stop`；5分钟空闲关闭；失败时`terminate`并重建，2分钟内3次失败暂停60 s；`document.hidden`时关闭 |
| `apps/tv/src/platform/wbi-keys.ts`（新） | 公开WBI密钥：内存＋`localStorage`的`bilisofa.wbi-keys.v1`；6小时或跨日失效；-352/-403/412时刷新一次 |
| `apps/tv/src/platform/batched-pages.ts`（新） | 上游20条一批 → 界面4卡一页；跨批稳定键去重；会话内冻结快照；按来源TTL；刷新、换身份时失效 |
| `apps/tv/src/platform/content-runtime.ts` | 改用`public-kernel`与`BatchedPages`；删掉每次`read()`都`dispose`四个Worker的步骤；首页与货架共用应用级实例（不再各建一个`PublicContentRuntime`） |
| `apps/tv/src/app/product-search-read.ts` | 改用`public-kernel`＋`BatchedPages`；搜索不再每页先跑nav |
| `apps/tv/src/app/hot-search.ts`、`apps/tv/src/app/pgc-hot-read.ts`、`apps/tv/src/platform/visitor-id.ts`、`apps/tv/src/platform/public-lists.ts` | 改用`public-kernel`；`pacedRead`加在途去重 |
| `apps/tv/src/platform/account-runtime.ts`、`apps/tv/src/app/public-signed.ts`、`apps/tv/src/app/pgc-follows.ts`（P0b） | 私人读取改用当前账号的`account-read-kernel`；账号切换、移除、后台、退出时关闭该内核；推荐窗口的现有缓存保留 |
| `apps/tv/src/app/foundation-main.ts` | 启动时预热`public-kernel`（显示“谁在观看”的同时进行）；`dispose`时关闭两个内核 |

### 契约与解析器

- **只放宽“上游批”的契约：**每批从≤4条改为≤20条，公共JSON上限从128 KB改为512 KB。涉及：
  - `packages/contracts/src/index.ts`（热门结果）、`search.ts`、`user-search.ts`、`pgc-search.ts`、`pgc-follow-dto.ts`；
  - 稍后再看与收藏的DTO；
  - `packages/bili-client`中对应的`parse*Body`。
- **界面页契约保持每页≤4条不变**（`HistoryPage`、`WatchLaterPage`、`FavoriteItemsPage`、`RecommendationPage`、`FollowUpdatesPage`）。它们由`BatchedPages`切出，页面代码不改。
- `live-search.ts`不改（直播排除）。

## 测试

- **单元（`npm test`）：**
  - `BatchedPages`：切片、尾批、跨批去重、冻结、TTL、刷新；
  - `wbi-keys`：TTL、跨日、损坏数据、-352刷新一次；
  - `kernel-client`：在途去重、优先级、取消、空闲关闭、3次失败暂停、`hidden`关闭；
  - 契约：20条接受、21条拒绝，界面页仍≤4。
- **主机原生（`tests/native/public-kernel.test.py`、`account-read-kernel.test.py`，复用现有夹具做法）：**
  - 连续200次请求，`CURLINFO_NUM_CONNECTS`累计≤2；
  - 请求中途`stop`在50 ms内返回；
  - 空闲关闭后发出`closed`；
  - 路由扫描；
  - 账号jar在关闭后清空。
- **合成UI（`npm run test:ui:app`）：**保留的100条，加上首页、搜索、我的、追番的滚动、返回与焦点回归。
- **`npm run check`：**类型检查、边界检查、文档检查。

## 设备验证（每步一次，需另行授权签名与安装）

1. **改动前（0.52.0）先测基线：**
   - 冷启动到首张卡；
   - 首页向下滚动10行的等待次数与总时长；
   - 搜索“原神”首屏；
   - 从“我的”进入稍后再看首屏。
2. **改动后同样四项。**
3. `terminate`循环50次后请求仍正常。
4. 两个内核常驻时播放1080P 10分钟，无内存不足或掉帧。
5. 当天-352的出现次数。

**预期：**以上四项首屏/滚动等待显著下降（估算单请求从1–3 s降到0.2–0.5 s，以实测为准）。

## 工作量（估算）

| 步骤 | 原生 | TS | 测试 | 合计 |
|---|---|---|---|---|
| P0a | 1.5天 | 1.5天 | 1天 | 约4天 |
| P0b | 1天 | 1天 | 1天 | 约3天 |

## 需要你确认的决定

1. **分两步交付**（先P0a公共、验收后再P0b账号）？
2. **只读通道允许未确认关闭即`terminate`**（写入、播放、投屏通道不放宽）？
3. **公开WBI密钥写入`localStorage`**（它们是公开签名盐，不是凭据）？
4. **合并同权限的只读模块**（公共4个→1个、账号只读4个→1个），两步验收后从产品包移出被替代的模块？
5. **上游每批20条**：先用一次不带账号、按ADR-105节奏的只读主机请求，核对各接口的实际上限？
