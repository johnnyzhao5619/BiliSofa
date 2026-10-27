# 项目结构与依赖方向

当前路线：单WGT/Web＋电视内WASM/AVPlay（ADR-027）。下表描述实际职责，不表示对应产品功能已全部完成。

| 路径 | 职责 |
| --- | --- |
| `apps/tv/src/app/` | 应用装配、页面、TvShell、生命周期、资源owner、账号/媒体工作区 |
| `apps/tv/src/ui/` | 遥控控件、焦点/输入、二维码等本地UI |
| `apps/tv/src/platform/` | Samsung/Tizen全局、AVPlay、Worker桥、KeyManager和普通KV适配器 |
| `apps/tv/public/`、`foundation-config.xml` | 本地入口/资源及当前应用源配置；不含证书/会话 |
| `packages/contracts/` | DTO、Worker消息、Player/Network/Store/Cast合同与运行时验证 |
| `packages/bili-client/` | 源端响应解析、会话/身份/请求与保留写入协调 |
| `packages/media/` | 播放器、真实时间轴、队列、媒体选择与串行状态 |
| `packages/cast/`、`packages/search/` | 投屏协议/会话；本地首字母候选及原许可数据 |
| `platform/wasm-network/` | 电视Worker/cURL/socket原生源、固定依赖/许可证 |
| `tools/` | 开发侧构建、打包、签名/安装和脱敏取证 |
| `tests/` | 单元/合同、相关UI、HOST native与包门禁；真机证据另存 |
| `docs/` | 工程规则与功能范围、当前状态、验收/交付索引及 ADR；旧过程在 archive 或 Git 历史 |

## 依赖与所有权

1. contracts只依赖contracts；bili-client/media/cast通过合同协作，不导入apps或平台全局，不循环依赖。
2. apps是composition root。页面不直接访问SDK、原始账号会话或源URL；Socket/cURL在Worker。
3. 账号/媒体代次、取消、旧回调拒绝贯穿异步流程；换源等待解码器与transport实际双关闭，未知状态不复用。
4. build/package/sign/install分离；发布包内运行代码本地随包，不需要Node/dev server/远程JS。
5. 凭据仅保护存储/私有lane持有；普通偏好、首P/P2+续播、搜索历史和队列按固定身份分区，未知写日志不随账号删除抹除。

## 实现映射

| 边界 | 主要合同/实现 | 决策 |
| --- | --- | --- |
| 账号/身份 | private-account、identity、accounts；account-runtime/workspace、KeyManager | ADR-028/029/050 |
| 媒体/清理 | media/session/player；guest-playback、AVPlay、MediaFailure | ADR-030/034 |
| 官方投屏 | receiver-link、CastSession、cast-entry/workspace；cast-product.c与固定hash头提取生成器、独立产品Worker | ADR-031/064；旧探针保留，新包另验 |
| 普通本地数据 | local-profile、search-history、local-queue及对应store | ADR-032/037/048/051/066/067；队列v2按BV＋P、旧键兼容/回退；local-bookmarks/read-cache-clear管理记录与私有快照 |
| 内容/写门禁 | ContentRuntime、RetainedWrites、账号请求租约与持久意图 | ADR-033 |
| 排行/搜索 | ranking/categories、search/hot/user/pgc/live合同与独立Worker/C | ADR-035–043 |
| 本人推荐 | recommendations合同/解析/window、account-runtime、recommend-worker/recommend-read.c与首页独立模块 | ADR-065；GET-only，账号/匿名明确区分 |
| 私人内容 | 规范化DTO、独立library Worker/C、内存游标/引用与身份租约 | ADR-044–047/049 |
| W05点播叠加 | overlay-dto/read/binding、overlay-data、OverlayRuntime/Worker/C、VodOverlays、OverlaySession/MediaOverlayView、OverlayMotionClock/VodControls、独立身份偏好 | ADR-059/060；0.22.0请求组USER PASS；0.22.1滚动/控制层补验USER PASS |
| W05评论/回复 | comments-dto/read、comments解析、CommentsRuntime/Worker/C、vod-comments侧面板/全文与源代次 | ADR-061；生产接入，本地/TV门禁以当前状态为准 |
| W05保留互动 | video-interactions DTO/私有合同/解析、InteractionRuntime/Worker/C、InteractionWrites/独立持久日志及播放页预览 | ADR-062/080；F11所请求正常路径USER PASS，最终故障与F17真实验收OPEN；不重放旧意图 |
| F06候选 | 私密源/生产桥、控制/分P、本地续播与运行时回退 | ADR-051/055；0.21.1已请求组及0.21.3跨内容回退USER PASS |
| F18候选 | live-product合同/解析、LivePlayback、单运行时API→匿名HLS中转、近期消息视图 | ADR-053/057；浏览组通过，实播失败并由用户延期；证据分层 |
| F17候选 | pgc-season详情/播放；pgc-follow列表/写门禁与持久回查 | ADR-052；已装机C只读组通过；真实追番写入未验收 |

生成物只在ignored `build/`、`dist/`、`.local/`；私密签名、目标和会话在仓库外。依赖版本/来源/许可见[第三方声明](../THIRD_PARTY_NOTICES.md)，命令见[开发说明](DEVELOPMENT.md)。[原结构过程](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/archive/2026-10-19-process-records/PROJECT_STRUCTURE.md)保留追溯。

R07小数倍速按[ADR-097](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/097-fractional-rates-device-limited.md)不接入生产；`apps/tv/src/platform/element-video.ts`、`packages/contracts/src/playback-rate.ts`与`tests/media-element/`保留为诊断探查代码（[ADR-086](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/086-fractional-rate-element-candidate.md)）。

## 0.66.0候选的配置层

`apps/tv/service-providers/` 放服务目录与具名地址 / 模板 JSON；`packages/contracts/src/service-configuration.ts` 定义数据校验与 native 启动边界；平台 service-configuration / service-worker 负责包内读取、普通选择存储和 Worker FIFO 引导；foundation-entry 在业务入口之前拥有配置页。地址值不编进运行 JS / WASM；native 只带生成的 schema 槽位。新构建目录是 `dist/bilisofa-configured-app` 与 `build/service-config/`，旧 0.65.1 冻结输出保留。见[ADR-119](adr/119-user-selected-local-service-configuration.md)。
