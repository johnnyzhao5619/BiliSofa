# 问题清单（第三方独立验收，2026-10-22 21:33 EDT）

只记录问题，**未修改任何代码**。“新增”指本轮源码/本地检查新发现、项目文档未记录的问题；“已知缺口”指项目文档已登记的未完成项，本轮仅核实。所有新增问题均来自源码阅读或本地合成探针，**没有真机复现**；“确定性”栏说明证据强度。

严重度：P0 安全/数据损坏/不可恢复；P1 阻断保留功能或使验收证据失效；P2 可见功能缺陷或发布阻断；P3 次要/设计边界/文档漂移。

## A. 新增问题

### P1-01 R07倍速观测容差无法区分相邻档位（1.25×与1×判同）

- 影响对象：当前未部署R07候选。0.43.0不受影响。
- 位置：`/Users/weijiazhao/Dev/BiliSofa/packages/media/src/rate-observation.ts:19`（`ratio ∈ [expected×0.75, expected×1.25]`）；测试`/Users/weijiazhao/Dev/BiliSofa/tests/unit/rate-observation.test.ts:30`只在0.25/0.5/1.5/1.75/2档断言“实际1×不应匹配”，**跳过了0.75和1.25**。
- 触发：倍速setter被接受但实际仍以1×运行，期望1.25×。
- 实际（本轮探针，以项目自身模块运行，日志见REPORT第3节）：

  | 期望 | 被判 matched 的实际倍速 |
  | --- | --- |
  | 0.25 / 0.5 / 0.75 | 仅自身 |
  | 1 | 0.75、1、1.25 |
  | 1.25 | **1**、1.25、1.5 |
  | 1.5 | 1.25、1.5、1.75 |
  | 1.75 | 1.5、1.75、2 |
  | 2 | 1.5、1.75、2 |

- 预期：每档只能匹配自身，至少不能把“setter接受但实际1×”判为1.25×成功（ADR-086要求“以真实媒体时间检验效果”）。
- 后果：今后1.25×–2×的台架或电视“matched”结果都不能证明对应倍速生效；测试名称“accepting a property while running at 1x is not enough”对1.25档不成立。现有桌面0.25/0.5/0.75结果不受影响；1×匹配本身无区分意义。
- 建议：容差收紧到小于相邻档最小间距的一半（例如相对±8%，或绝对±0.1），并对全部8×8组合断言“仅对角线匹配”。这是收紧判定，不是为PASS放宽。修正前不得用该观测给R07记PASS。
- 确定性：本地可复现（确定）。

### P1-02 F11互动日志256条终身上限，满后关注/点赞/稍后再看/收藏永久失败

- 影响对象：0.43.0已安装包与当前源码（同一输入，hash一致）。
- 位置：`/Users/weijiazhao/Dev/BiliSofa/packages/bili-client/src/interaction-writes.ts:37`（每次提交`rows.push`，`rows.length>=256`即抛`invalid`）；`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/platform/interaction-journal.ts:5-12`（单一全局键`bilisofa.video-interactions.v1`，接口只有getItem/setItem）；全源码无任何删除/压缩该键的路径（`removeItem`检索仅见于其他存储）。
- 触发：累计约256次F11提交（含已确认、未生效、not-sent，跨所有账号）。日常连续使用点赞/稍后再看数周到数月即可达到。
- 实际：第257次起每次提交在POST前抛`invalid`，界面显示“操作未完成（invalid）”，用户无任何恢复入口（设置中的缓存清理不覆盖此键）。
- 预期：只保留未结算（pending/unknown）意图用于防重放；已结算记录应有界淘汰，不应让保留功能永久失效。
- 为何既有USER PASS未发现：所请求组只做少量切换。
- 建议：结算态行按“每账号×目标×动作族仅保留最新”压缩，或LRU淘汰已结算行；unknown/pending永不淘汰且计入独立上限；满时给出明确、可恢复的提示。增加“第257次已结算后仍可提交”与“unknown不被淘汰”回归。修复前不要求用户真实写入验证。
- 确定性：源码逻辑确定；未做运行时复现（需构造256条合成日志，未超出本轮范围）。

### P2-01 评论“楼中楼”回复全文无法打开；番剧/收藏夹播放路径的“查看楼中楼回复”超出弹窗栈

- 影响对象：0.43.0与当前源码。
- 位置：`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/vod-comments.ts:15,19,39`（回复列表卡片调用`detail()`，再次`openModal('comment-detail')`）；`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/navigation.ts:39`（`modals.length>=4`或同ID已存在即抛`invalid`）；`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/tv-shell.ts:114-128`（抛出后关闭新owner并向上抛）。
- 触发与实际：
  1. 普通视频：vod-player → vod-comments → comment-detail → comment-replies → 选回复卡 → 再开`comment-detail`（ID重复）→ 抛错，无全文。回复卡上仍有≤140字截断预览。
  2. 番剧：pgc-season → pgc-playback → vod-comments → comment-detail → “查看楼中楼回复”为第5层 → 抛错，楼中楼列表打不开。收藏夹播放路径层数更深，同理（按源码推断）。
- 预期：只读评论/回复可逐层阅读全文并逐层返回（F10/F15，ADR-003）。
- 测试缺口：`/Users/weijiazhao/Dev/BiliSofa/tests/product-player-ui/player.spec.ts:31`只断言回复列表有4张卡，从未点击回复卡；没有PGC路径的评论测试。
- 与既有证据关系：0.23.0“全文/楼中楼”USER PASS属于更早界面；0.34+产品播放器改为弹窗栈后未再覆盖该分支。不推翻旧USER结果，但当前包该分支应视为FAIL（源码确定），需M1确认。
- 建议：回复详情使用独立ID（如`comment-reply-detail`）或在同层替换内容；评论阅读改为单弹窗内的子视图栈，不占用全局4层；补UGC/PGC两条合成UI回归。
- 确定性：普通视频分支源码确定；PGC/收藏夹分支依赖弹窗层数，源码推断。

### P2-02 无偏好时首播默认选择最低清晰度AVC，并记为本次会话偏好

- 影响对象：0.43.0与当前源码。
- 位置：`/Users/weijiazhao/Dev/BiliSofa/packages/media/src/vod-track-preference.ts:14,16`（无偏好排序键`[codec(avc优先), quality升序, bandwidth升序]`，取第一项）；`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/vod-workspace.ts:185`（无已存偏好时把该选择`rememberTracks`）；`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/platform/local-profile-store.ts:95-96`（偏好仅内存，重启即丢）。
- 触发：冷启动后首次播放任一提供多档清晰度的视频。
- 实际（源码推断）：选中最低档AVC（如360P），后续同会话视频按此偏好匹配；每次重启重复。
- 预期：ADR-055仅规定“无偏好优先普通AVC/AAC”，未要求最低档；TV产品设计要求“期望画质”匹配。大屏默认最低档与产品意图冲突。
- 与既有证据关系：用户4K/1080P USER PASS可能是手动选择所得，不矛盾。
- 建议：产品决定默认目标（如“设备能力内最高的AVC”或1080P上限），持久保存用户画质意图；补无偏好默认选择的单元断言。先按DEVICE_PLAN M2观察确认。
- 确定性：排序逻辑确定；实际Bilibili返回的档位集合未在本轮观察，标PLAUSIBLE。

### P2-03 0.43.0源码可追溯性依赖仓库外归档与脏工作区（R14）

- 事实：HEAD `610e8c21ec50b13449cd88625a5f726db7d83450`是唯一的初始化提交。0.43.0 UI清单249个输入中，**209个未被Git跟踪、25个相对HEAD已修改、仅15个与HEAD一致**。当前工作区743项变更（85 M，658 ??）。
- 缓解：仓库外源码归档（SHA-256 `7028663b…305`）与当前工作区294个非依赖文件逐一hash一致，249个输入全部在归档中。
- 风险：任何清理/切换分支都会丢失与已安装包对应的源码；Git不能复现0.43.0。
- 建议：在用户授权下建立受控提交/标签；发布前R14必须以Git修订或签名源码包为准。本轮不提交、不清理。
- 确定性：确定。

### P3-01 保留写入（F17追番等）按不同目标计256上限

`/Users/weijiazhao/Dev/BiliSofa/packages/bili-client/src/retained-writes.ts:59`、`/Users/weijiazhao/Dev/BiliSofa/packages/contracts/src/retained-write.ts:3`。同目标复用行，不同目标满256后`invalid`。影响远小于P1-02，但同样无淘汰。建议与P1-02一并设计已结算淘汰。源码确定。

### P3-02 投屏接收：开始接收后首个私网发送端自动获批，所有权按IPv4识别

用户必须先按“开始接收”（`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/product-cast.ts:11-12`），满足显式授权；之后`receiverApproval:'session'`（`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/platform/receiver-link.ts:25`）使Worker批准首个合法私网offer（`/Users/weijiazhao/Dev/BiliSofa/platform/wasm-network/src/cast-worker.ts:129-137`），同一对端后续换源无需TV确认（`/Users/weijiazhao/Dev/BiliSofa/packages/cast/src/receiver.ts:67-78`），对端以IPv4区分。同一局域网他人可在接收窗口内抢先投屏。属设计边界，不违背当前合同；建议在设计文档中明示，并在TV上显示当前发送端。源码追踪结论，未复现。

### P3-03 未知可逆写入可能被滞后读取结算为“未生效”

`/Users/weijiazhao/Dev/BiliSofa/packages/bili-client/src/interaction-writes.ts:30-32`：后续任意读取即可结算unknown，未像提交后回读那样等待缓存收敛（同文件:43-45）。滞后GET可能把已生效的点赞判为not-applied，之后用户可再次手动提交。需用户再次点击、操作可逆，故P3。源码追踪结论。

### P3-04 会话恢复后返回栈被替换为单页

`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/navigation.ts:48-51`。恢复后Back直接到根。符合ADR-082“仅恢复目的页”，但可在设计中明示。

### P3-05 `network-policy.ts`为死代码且与直播Cookie域矛盾

文件未被引用；其“不向api.live发送凭据”与`/Users/weijiazhao/Dev/BiliSofa/platform/wasm-network/src/live-api-routes.h:46`实际Cookie域不符。直播已EXCLUDED，生产不可达；建议删除或改正，避免审计误读。

### P3-06 R07候选关闭异常后实例永久持锁

`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/platform/element-video.ts:146,152,164`：`resetFailed`置位后从不清除，`prepare`在`:46`永远拒绝。这是有意的“不确定不释放”保护，但生产接入时需定义组合根级恢复（应用重启/提示），否则该会话无法再播放。

### P3-07 文档与源码表述漂移

- IMPLEMENTATION_STATUS F03写“四类搜索”；0.43.0产品搜索只有视频/UP/番剧影视三类（`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/app/product-search.ts:31`），直播类按ADR-068隐藏——行为正确，措辞陈旧。
- `apps/tv/src/app/main.ts`与`apps/tv/config.xml`、`apps/tv/public/index.html`是W01探针入口/配置，不是产品；产品入口为`foundation-main.ts`，CSP与`<access>`由`tools/build-foundation-app.mjs`生成。审计时易误读。
- TEST_REPORT“当前全量未重跑”：本轮已重跑，688/688通过（见REPORT），旧表述已被本轮结果取代，但未改原文件。

## B. 已知缺口（项目已登记，本轮核实仍成立）

| 编号 | 内容 | 本轮核实 |
| --- | --- | --- |
| K-01 / R07 | 小数倍速仅未集成候选；排他claim未与AVPlay统一（全源码只有`element-video.ts`有`claimDecoder`）；无异步后端切换；生产`rates:[1,2]`（`/Users/weijiazhao/Dev/BiliSofa/apps/tv/src/platform/samsung.ts:19`）；台架MPD路由返回muxed MP4；1.25×窗口不足退出1；后三档/DASH/TV未执行 | 成立；另见P1-01 |
| K-02 / R07 | setter读回相等≠实际倍速（`element-video.ts:125`仅比较属性） | 成立，合同已声明需另行观测 |
| K-03 / R07 | currentSrc历史值：修正后需本次emptied＋空状态（`element-video.ts:157`）；DOM释放≠TV解码器释放 | 成立 |
| K-04 / R04 | 完整动态HTTP412、UP主页/投稿无页面（路由存在、无页面构建） | BLOCKED成立 |
| K-05 / R05 | 动画/舞蹈等分区API-352 | BLOCKED成立 |
| K-06 / R06 | 自然服务端失效未实测 | UNVERIFIED |
| K-07 / R08 | F14：运行时`allowIrreversible=false`拒绝投币/三连，UI不可成功 | PAUSED，与文档一致 |
| K-08 / R09 | F17真实追番写入未授权验收 | UNVERIFIED |
| K-09 / R10 | HDR/独立decoder/其他型号缺证；无HDR专门处理 | 条件未验证 |
| K-10 / R11 | iPad当前包、PGC/长P、争用/断连；61秒/近结束定位精度 | OPEN |
| K-11 / R12–R13 | 30条/两小时、性能、故障/升级回退矩阵 | 未执行 |
| K-12 / R14 | 最终候选未冻结；见P2-03 | OPEN |
| K-13 / 设备 | 0.43.0重开超时，当前前台未知 | BLOCKED（影响全部真机组） |
| K-14 / 云进度 | 用户跳过，旧unknown保留不重发 | 跳过，非PASS |

## C. 未发现问题的核查面（摘要）

TLS（VERIFYPEER=1/VERIFYHOST=2、仅HTTPS、不跟随重定向）、Cookie仅限bilibili域、CDN/图片匿名、4 MiB响应上限、SOAP有界解析（4096字节/64节点/深度6、无DTD）、私网限定、无`innerHTML/eval/new Function`、平台全局仅在适配器、单一keydown监听、无常开电脑/NAS/云依赖、账号/媒体代次与晚回调拒绝、unknown不自动重发、WGT与源码中无凭据/私钥/局域网地址。详见REPORT第4节与MATRIX。
