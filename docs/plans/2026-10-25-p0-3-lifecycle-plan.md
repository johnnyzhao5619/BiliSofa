# P0-3 改动方案（封面缓存、身份只核对一次、生命周期测量）

2026-10-25。对应[ADR-109](../adr/109-cover-cache-single-account-verification-and-lifecycle-measurement.md)。状态：**用户确认3项决定（2026-10-25）；P0-3a在0.56.0实现并已安装，设备结果见ADR-109“设备结果”：建议不做DOM保活，后台恢复待可靠测量**。分支`perf/p0-network-kernel`。

## 为什么改了范围

原P0-3里的“列表频繁重新加载”“返回时重拉”“冷启动浪费的游客请求”“列表页关闭超时”，已经由ADR-108的应用级缓存和常驻内核解决或基本解决（0.54.0设备对比见[证据](../design/evidence/2026-10-25-network-kernel/README.md)）。剩下三件事：

| 问题 | 现状 | 本批 |
| --- | --- | --- |
| 切页后封面重新下载 | 没有页面持有时全部清空；最多48张；2路并发 | P0-3a 修 |
| 选择账号到推荐需约4.2 s | 两个WASM实例、两次nav | P0-3a 修 |
| 页面DOM保活、后台恢复保留快照 | 没有实测数据 | P0-3a 先测；P0-3b 再决定 |

## 改动清单（P0-3a）

| 文件 | 改动 |
| --- | --- |
| `apps/tv/src/platform/cover-art.ts` | 去掉“无引用即全部清空”；空闲LRU上限160张、24 MB、10分钟；并发4路；新增`clearCovers()` |
| `apps/tv/src/app/read-cache-clear.ts` | 清除读取缓存时一并清空封面 |
| `platform/wasm-network/src/account-read-kernel-worker.ts` | 新增`identity`请求：打开会话、导入jar、跑nav并按`parseAccountIdentity`返回身份；会话随即标记为已核对 |
| `packages/contracts/src/account-kernel.ts` | 身份请求与结果的合同 |
| `apps/tv/src/platform/account-runtime.ts` | `verify`改走账号内核，不再创建身份运行时；关闭时不再关闭身份Worker |
| `apps/tv/src/app/foundation-main.ts`、`launch-chooser.ts` | 选择页显示时预热账号内核（只编译WASM） |
| `apps/tv/src/platform/public-kernel.ts` | 允许“只启动不请求”的预热（公共内核已有，账号内核复用） |
| 测试 | 封面LRU单元；账号内核身份请求单元（复用身份Worker现有的nav样例）；账号运行时`verify`改用伪造内核；合成UI保留套件 |

不需要改C：身份核对用的就是账号内核已有的0号nav。

## 测量（P0-3a装机后）

用ADR-108的Inspector脚本扩展四个场景：
1. Home键离开再回来，到首页可操作；
2. 详情页、UP主页返回列表；
3. 顶层页往返（首页→搜索→我的→首页）；
4. 切换账号。

另外复测：选择账号到推荐首卡、切页往返后封面出现的时间。

## 工作量（估算）

| 部分 | 时间 |
| --- | --- |
| 封面缓存 | 0.5天 |
| 身份并入账号内核 | 1天 |
| 测试 | 0.5天 |
| 装机测量 | 0.5天 |
| **合计** | **约2.5天** |

## 需要你确认的决定

1. 按上表重新划定P0-3：先做封面缓存与身份并入（P0-3a），DOM保活与后台快照等实测后再决定（P0-3b）？
2. 封面空闲缓存上限定为160张、24 MB、10分钟？
3. 身份核对改由账号内核完成，身份Worker只保留扫码登录？
