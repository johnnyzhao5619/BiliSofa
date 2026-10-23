# 项目结构与依赖方向

实施目标映射。已有 W01 可执行候选探针与可移植基础源码/临时工具链（ADR-002），W02按ADR-027沿已验证WGT/Web＋电视内WASM/AVPlay实现，未验证的功能验收仍开放。保留骨架，按实际工作创建文件；若 W01 选 .NET，另记 ADR 修改 UI/平台结构，领域合同/产品要求保持。

```text
apps/tv/                  应用装配与 UI
  src/app/                启动、路由、生命周期、依赖注入
  src/features/           account/home/search/library/watch/live/settings
  src/ui/                 TV 控件、FocusRouter、InputRouter、token
  src/platform/           Samsung/Tizen globals、能力查询与适配器
  public/                 本地资源，无证书/会话/私密截图
  config.xml              Web 候选源配置，W01 后创建
packages/contracts/       DTO、Worker 消息、Player/Network/Store/Cast 接口
packages/bili-client/     会话、端点映射、验证、WriteCoordinator
packages/media/           时间轴、字幕/弹幕、媒体选择、播放器协调
packages/cast/            接收协议、会话/控制权，不直接写账号/操作UI
platform/wasm-network/    TV Worker/cURL/socket 源与构建说明
platform/dotnet-probe/    备选实机探针，不假定能混入 WGT
tools/                   构建、打包、签名/安装包装、脱敏诊断
tests/unit/              纯状态/时间轴/解析，按后续授权增加
tests/contracts/         匿名接口/Worker/协议 fixtures
tests/device/            真机矩阵/匿名记录；原始私密资料在仓库外
docs/                    PRD、架构、规范、验收、来源、ADR
```

## 依赖规则

1. contracts 不依赖 UI、客户端或平台 globals。
2. bili-client/media/cast 可依赖 contracts，通过接口使用 Network/Store/Player；无循环 import、不导入 apps/tv。
3. apps/tv 是 composition root，装配领域/平台；页面经用例/状态访问，不能绕过会话/写入/播放器协调器。
4. WASM 网络实现受限消息合同；投屏命令经 CastSession→领域验证→PlayerCoordinator，不直接执行任意 URL/账号写命令。
5. tools 仅开发阶段运行，发布包无外部 Node/dev server/远程 JS；按需模块也来自本地包。

## 产物与配置

- 源 config.xml 随 app 维护，最终 WGT 根目录必须含配置/可定位入口；仓库根不等于包根。部署后 app/package ID 作为升级身份维护。
- 依赖锁文件、build target、SDK/TV Extension/Samsung Emscripten 版本/命令随可复现工程配置维护；不提前生成未经运行的 lockfile/工具链或宣称可构建。
- 生成物归 ignored dist/build 等。证书/密码/DUID/session 在仓库外私密位置，以本地参数注入；不进命令日志。
- fixtures 合成/匿名，复用文件保留通知并登记 THIRD_PARTY_NOTICES.md。新增依赖/权限记录职责/证据。
- 命令区分 dev/build/package/sign/install/device capture，默认 build 不暗中部署/发布。

结构为项目设计；包配置/签名见 [研究 S06、S17](../../research/tizen-best-practices-2026-10-14.md)。

W02账号边界：contracts/private-account定义摘要与私密会话；bili-client/accounts只通过repository/runtime合同获得权限；platform/private-account-store封装KeyManager固定槽，app/account-workspace装配TvShell生命周期。页面只读取摘要，完整cookie不进入导航/普通偏好/诊断。见ADR-028。

W02身份专用边界：contracts/identity定义有限IPC，bili-client/login管理单次扫码与保存未知；platform/identity-worker只桥接身份Worker，wasm-network/identity.c只开放QR/nav GET。app/foundation-main是内部账号包composition root，单独foundation-config.xml保持W01身份不变。见ADR-029。

W02媒体边界：media/session管理单次媒体与双关闭事实；platform/guest-playback封装匿名Worker和guest Scope；app/guest-home只装配四卡与单一shell模态，不直接调用SDK或创建第二套按键/生命周期监听。内部包构建、限制与证据见[W02_MEDIA_APP](../../W02_MEDIA_APP.md)。

W02投屏边界：contracts/receiver-link定义私有平台端口；platform/receiver-link封装局域网能力/guest Worker/应用非秘密UUID；app/cast-workspace管理代次、双关闭与播放器控制，app/cast-entry只挂入现有shell模态。原W01探针页面及协议Worker本批不改，真实发送端证据仍按旧包归档。见ADR-031与[W02_CAST_APP](../../W02_CAST_APP.md)。

W02本地边界：contracts/local-profile验证有限schema，platform/local-profile-store仅操作固定身份的普通KV键；app/local-playback保存实际事件，app/local-settings装配现有shell页面/确认/分页诊断；app/app-diagnostics只收固定码。KeyManager登录秘密与W01未知云写意图不迁移/覆盖。见[W02_LOCAL_APP](../../W02_LOCAL_APP.md)。

W02读取/写意图边界：contracts/content是无URL的有限route合同，platform/content-runtime通过现有匿名Worker装配popular；contracts/retained-write定义非秘密有界journal，platform/write-journal仅固定键原文比较/回读，无clear；bili-client/retained-writes负责确认、写前持久化、防重放与只读回查，app/account-workspace提供已核对身份的请求租约。旧write.ts是未装配的内存状态模型，不用它发送账号写操作。新签名/部署工具显式区分于W01，见ADR-033及[W02_NETWORK_APP](../../W02_NETWORK_APP.md)。

W02失败取证边界：contracts/media-failure限定阶段/原因及既有ugc失败码，platform/guest-playback保存闭合结果，media/session在清理前缓存首错并等待双关闭；app/media-failure-feedback负责安全反馈，app-diagnostics只收再次校验的摘要。没有把原生字符串、URL或账号信息传给页面，见ADR-034和[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)。

W03目录边界：contracts/ranking与bili-client/ranking负责有限IPC/公开响应规范化；platform/ranking-worker使用独立catalog Worker/C模块，只含固定匿名全站排行榜GET。content-runtime持有100条快照和两lane关闭屏障，guest-home沿同一UI/媒体owner显示四卡/翻页/刷新。既有identity/native产物保持，见ADR-035和[W03_RANKING_APP](../../W03_RANKING_APP.md)。


2026-10-18追加：W03搜索边界：contracts/search限定keyword、页码、规范化结果与固定终态码；bili-client/search只解析响应和已知高亮；platform/search-worker和独立search.c仅固定匿名GET。app/search-keyword经TvShell.modalInput注册当前owner命令，不再自持焦点/keydown。guest-home复用结果/媒体；InitialsWorker和AOSP数据原许可保持。见ADR-036与W03_SEARCH_APP。


2026-10-18追加：contracts/search-history与platform/search-history-store封装独立固定普通KV分区，不改local-profile v1；app/search-history沿原shell展示分页历史，local-settings管理开关/确认清空，foundation-main删除账号前等待两本地分区确认。Guest视频Worker唯一C关闭事件后允许一次范围GET超时重试，contracts固定进度、MediaSession只读recovery建议、guest-home显示提示；未知关闭不复用。见ADR-037。


2026-10-18追加：W03热搜边界：contracts/hot-search限定匿名请求/闭合结果与10词；bili-client/hot-search只规范化纯文本关键词/名次；hot-search-worker/hot-search.c固定匿名端点、64KiB响应；app/hot-search沿原shell六词分页、选词关闭后交既有搜索/历史。新模块独立打包，原四类native保持。见ADR-038与W03_HOT_SEARCH_APP。


2026-10-18追加：W03搜索格式：SearchBodyError只携带contracts规定的有限字段类别；search-worker在真实闭合后返回固定invalid_response后缀、先校验再标completed，guest-home继续只显示验证后的码。没有原始字段值/JSON跨Worker。m:s/m:ss同义解析与证据见W03_SEARCH_FORMAT_FIX。


2026-10-18追加：W03匿名WBI搜索：bili-client/search-wbi只提取公开材料与协议关键词，不接账号；search-worker串行两个实际闭合的native操作，search.c只固定nav/WBI查询并对材料/epoch再校验，原账号Worker不复用。固定阶段码复用原结果合同，公开材料不跨UI/存储。见ADR-039与W03_SEARCH_WBI_APP。


2026-10-18追加：contracts/user-search与bili-client/user-search规范化四UP/UID/统计/单预览；platform/user-search-worker使用共享search-worker.js/C的固定UP操作，非任意URL分发。app/user-search装配原shell嵌套摘要/媒体/UP语境历史、UID焦点与资源owner；输入仅增加目标标签。见ADR-040与W03_USER_SEARCH_APP。


2026-10-18追加：0.10.1由现有body.playing-media与TvShell的section[inert]共同表达播放背景可见性；CSS隐藏绘制但保留DOM/owner/返回焦点。页面不直接改AVPlay或复制播放器，见W03_USER_PREVIEW_FIX。


2026-10-18追加：contracts/pgc-search与bili-client/pgc-search限定番剧摘要/season身份；platform/pgc-search-worker共用search Worker/C第三个固定media_bangumi操作，原闭合/预算不变；app/pgc-search沿shell管理输入/摘要/历史/代次。没有把eps/URL/追番状态装入结果，见ADR-041。


2026-10-18追加：contracts/live-search与bili-client/live-search定义房间快照、room ID和有限状态/人气；platform/live-search-worker复用search Worker/C第四个固定live_room操作；app/live-search沿shell管理结果/摘要/历史/返回与取消，不接流地址/原始图片/关注字段，见ADR-042。


W03分区边界：contracts/data/categories.json记录官方排行配置事实，category-data.py生成TS和C白名单并检查一致；contracts/categories与ranking限定操作和回显，content-runtime按榜单键持有单一快照，app/category-picker只经现有shell选择。catalog.c仍固定匿名排行GET，不接受自由URL；见ADR-043与W03_CATEGORY_RANKING_APP。


W03/F05：contracts/watch-later-dto隔离纯显示类型，watch-later验证有限私有IPC，bili-client/watch-later只规范化当前官方数据；platform/account-runtime拥有会话与独立library Worker，app/watch-later装配shell只读列表。library.c无QR/媒体/写端点，独立link-library构建/来源/扫描和打包门禁。见ADR-044。


W03/F05历史：contracts/history-dto为UI DTO，history验证私有cursor IPC，bili-client/history按源端空批次/游标规范化；account-runtime持有账号内存页面和游标，序列化所有私有能力，旧finally只关自己的Worker。library-worker/C增加固定只读operation2；app/cloud-history经原shell展示，不把cursor/资源ID交给页面。见ADR-045。


W03/F05收藏：contracts/favorites-dto为无远程ID的显示与引用；favorites验证私有folder批次/IPC；bili-client/favorites规范化官方导航与collection媒体列表。account-runtime持有夹ID与临时引用映射，library-worker/C仅追加固定GET操作3/4；app/favorites复用TvShell嵌套owner，无页面native调用。见ADR-046。


W03/F04更新：contracts/follow-updates-dto是无URL/ID的显示合同；follow-updates验证私有offset IPC，bili-client/follow-updates仅规范化官方导航字段。account-runtime管理有界快照/游标、library-worker/C新增固定只读operation5与百分号编码；app/follow-updates沿TvShell的owner/Back/生命周期，见ADR-047。


W03队列：contracts/local-queue验证有限普通数据；platform/local-queue-store固定身份键、写后回读及删除；media/queue只管串行换项与取消，app/local-queue管理页/排序/确认，queue-playback装配现有GuestPlayback/MediaSession/LocalPlayback，不直接调用SDK。guest-home仅新增显式入队，删除账号纳入队列清理，见ADR-048。


W03私人库入队：三类显示DTO新增可选严格公共BV，bili-client规范化各官方原始字段，library Worker与页面重校验；app/library-queue-action绑定摘要owner，仅显式写当前账号QueueStore，无新远程请求。见ADR-049。


W03账号资料：contracts/account-profile限定有限显示字段；bili-client/account-profile只规范化已有nav数据；identity Worker闭合后通过可选profile返回，AccountCoordinator仅当前active内存副本；app/account-details只渲染，不读凭据/请求网络。见ADR-050。


F06按ADR-051整模块开发：contracts/vod-catalog公开无URL/CID的清单与选择标识，bili-client/vod-catalog持私密源解析；media/seek-preview、vod-sequence和vod-playback只协调目标/真实关闭/串行代次，平台负责SDK和源权限。local-profile通过新增parts分区扩展P2+，原首P格式不迁移。生产Worker/UI尚未完整接入，不将本地模型标为全功能交付。
