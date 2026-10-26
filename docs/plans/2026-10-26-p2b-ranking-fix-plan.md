# P2b 排行榜修复方案：登录走本人会话、风控提示与暂停、首页各行依次读取

2026-10-26。对应[ADR-117](../adr/117-ranking-session-refusal-and-row-order.md)。状态：**待用户确认**。实现后为0.65.0。

## 目标

- 登录时首页排行榜和全站排行网格能读出来。
- 被B站拒绝时说清是风控、还要等多久，暂停期间不再发请求。
- 首页各行不等焦点，进首页后依次读完；骨架卡只在真正读取时出现。

## 改动清单

| 范围 | 文件 | 改动 |
| --- | --- | --- |
| 合同 | `packages/contracts/src/public-read-types.ts`、`public-read.ts` | 新命令`{kind:'ranking'}`与结果`{kind:'ranking', items}`，校验同分区 |
| 账号内核（原生） | `platform/wasm-network/src/account-read-kernel.c` | 新操作`ACCOUNT_RANKING`（11）：输入只能是`all`，固定URL `ranking/v2?rid=0&type=all`，Referer为B站首页；其余与`ACCOUNT_CATEGORY`相同 |
| 账号内核Worker | `platform/wasm-network/src/account-read-kernel-worker.ts` | 映射新命令，正文用`parseRankingBody`，非0即`refused` |
| 本人会话读取 | `apps/tv/src/app/public-signed.ts` | 新增`ranking(signal)` |
| 节奏 | `apps/tv/src/platform/public-lists.ts` | 列表类型加`ranking`；新增按键清除复用（供“刷新”）；“帮助与诊断”写“最近一次全站排行读取” |
| 内容读取 | `apps/tv/src/platform/content-runtime.ts` | 构造参数改为`{category?, ranking?}`；全站排行经`pacedRead`：有本人会话走会话，否则走匿名内核；“刷新”清除复用但仍受暂停约束 |
| 首页与网格 | `product-page.ts`、`product-home.ts`、`product-shelves.ts` | 把本人会话的排行读取传给首页货架与网格；货架失败时风控用`limitedText`，其余照旧 |
| 依次读取 | `product-shelves.ts` | 一行读完（成功或失败）即开始下一行，一次一行；焦点到达仍可提前开始；不自动重试 |
| 测试 | 原生主机、单元、合成UI（见ADR-117“验收与证据”） | — |
| 版本与文档 | 版本号、`TV_PRODUCT_DESIGN.md`首页读取顺序、状态页 | 0.65.0 |

## 设备验证

- 签名安装0.65.0（需授权）。
- 用[kernelwatch.mjs](../design/evidence/2026-10-26-p2b-device/kernelwatch.mjs)同法观察（不扣请求）：
  - 登录：选账号后不动焦点，记录三行各自的请求与结果时刻；排行榜应走本人会话并读出卡片；
  - 游客：排行榜若仍-352，显示风控提示与秒数；暂停期间按“重试”不发请求；
  - 网格：首页“查看更多”打开全站排行，登录时同样走本人会话。
- 按ADR-114同法测首页连续方向键的响应，与0.64.1对比，确认依次读取不拖慢按键。

## 估算

约1.5天：

- 账号内核新路由、合同与原生测试半天；
- 节奏、首页与网格接线、依次读取半天；
- 测试、装机与测量半天。

## 需要你确认的决定

1. 登录时全站排行走本人会话（账号内核加一条固定只读路由）；游客照旧匿名，不加访客标识和WBI？
2. 全站排行纳入ADR-105的节奏：10分钟复用，被拒后与分区、UP投稿共用60秒暂停，首页与网格显示“B站暂时限制了访问（风控 -352），约 N 秒后可重试”（游客另加“登录后通常更稳定”）？
3. 首页各行依次自动读取（前一行读完就开始下一行，不并行、不自动重试），取代ADR-091“焦点到上一行才读”？
4. 在`feat/p2b-home-search`上继续，先提交0.64.0/0.64.1的改动，再实现0.65.0？
