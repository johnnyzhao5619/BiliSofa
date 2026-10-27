# Product requirements

Public release selection (2026-10-26): 0.65.1 at `e7bc3740e0fed2f9b2c89f9a83755398fa11faf7` is the user-selected public open-source version ([ADR-118](adr/118-public-open-source-0651-baseline.md)). It can be released with explicit limitations without claiming complete v1.0.0 acceptance; retained features and unresolved requirements below are not removed.

Product experience and delivery closure (2026-10-21): use the [TV product design](TV_PRODUCT_DESIGN.md) for page/remote behavior and the [single closure register](PRODUCT_CLOSURE.md) for remaining implementation and acceptance, under ADR-070. Productization has implemented/user-tested groups; use current status for remaining final gates, not the historical 0.28.0 baseline. Existing F IDs and approved exclusions remain authoritative.

Name: BiliSofa. Meaning: Bilibili viewing from the sofa. Initial acceptance target: Samsung UN58U8200FFXZC, Chinese mainland Bilibili service, remote-control-first TV UI. Per user direction (2026-10-20), playback must adapt across Samsung TV devices through runtime attempts and bounded fallback; the measured initial model/resolution is not a playback whitelist. Other models and high-quality formats still require their own acceptance evidence (ADR-055).

Hard constraints:

1. Daily operation occurs entirely inside the TV app; ordinary Internet access to Bilibili/CDNs remains necessary.
2. No always-on computer, NAS, LAN gateway or project-hosted cloud runtime dependency.
3. Retain F01–F20 tracking. The latest user-approved exceptions are live features (ADR-068) and real dual-account functionality/acceptance (ADR-069), excluded from current delivery; retain their tracking IDs, code and prior evidence. All other required scope stays in the complete v1.0.0. Internal work packages are not product versions.
4. Public GitHub source and MIT for original code, preserving upstream licenses.
5. Official casting means the unchanged official Android/iPhone/iPad Bilibili apps can discover and control BiliSofa on the TV. This does not imply official certification.
6. Computers are permitted for development, signing, installing, upgrading and debugging, then can be shut down.

Scope updated by the user on 2026-10-14: comments, replies and VOD/live danmaku are view-only; no authoring, comment deletion or danmaku sending. F15/F16 remain as read-only tracking IDs, implemented with F10/F08/F18. Search retains app-contained pinyin-initial input and suggestions. Other planned interactions remain in scope. See [ADR-003](adr/003-read-only-comments-danmaku.md).

Additional scope decision on 2026-10-21: current delivery targets single-account use; real dual-account functionality and A/B acceptance are excluded under ADR-069. Preserve existing multi-account code/data and single-account security/lifecycle requirements; no second account is required for this version.

Scope updated on 2026-10-21: the user said live is not to be implemented. Current delivery excludes live playback, browsing/search and dependent message/casting branches; keep F18 tracking, code and historical evidence without claiming PASS or a future version commitment (ADR-068 supersedes the earlier playback-only deferral). Historical 0.28.0 exposed live entries; current source gates them off, with final scope verification still required. The user reported 4K playback success and resumed F11 reversible interactions; exact decoder/HDR evidence and real-write acceptance remain separate.

| ID | 功能与版本范围 | 验收要求 |
| --- | --- | --- |
| F01 | 扫码登录、账户信息、退出、会话失效/续期或重新扫码 | 扫码成功后真实账号一致；过期不展示假登录；退出清理个人会话 |
| F02 | 个性化推荐、游客热门、排行榜、基础分区、分页刷新 | 个性化和游客数据来源可区分；可重复翻页，无重复/漏项 |
| F03 | 中文内容搜索、应用内拼音首字母输入/联想、热搜、搜索历史；视频、UP、番剧和直播搜索 | 首字母输入到候选选择/实际检索可用，Back/焦点正确；空结果与请求失败区分，不依赖未证实的系统中文键盘 |
| F04 | 关注动态、UP 主页、投稿列表；常用图文/视频动态展示 | 源端更新能刷新；详情返回保留原卡片 |
| F05 | 云端历史、收藏夹/收藏内容、稍后再看、分页与队列播放 | 与同账号官方客户端的实际内容一致；失效视频可识别 |
| F06 | 画质/编码/可用音轨选择、暂停、跳转预览、分 P、合集、连播、循环、倍速 | 实际声画和进度符合选择；源端真实可用配置可尝试，实际失败自动回退；候选不冒充已验证硬件能力 |
| F07 | 本地续播、云端进度回传与双向接续 | 手机→电视、电视→手机分别对照；写回失败与本地保存分开显示 |
| F08 | 普通滚动/顶部/底部弹幕；开关、字号、透明度、密度、区域、关键词过滤 | 暂停/跳转/切 P/倍速后同步；弹幕过密仍可操作；数据仅按文本或受控指令解析 |
| F09 | 字幕轨道、语言选择、字号、开关、时间偏移 | 源提供的字幕正确呈现；无字幕和加载失败可区分 |
| F10 | 热门/最新评论、回复列表，播放侧面板阅读 | 评论分页正确、焦点可退出、关闭不丢播放位置 |
| F11 | 视频点赞/取消、指定收藏夹增删、稍后再看增删、关注/取消 | 每次用户操作提交一次；成功回读；未知结果不自动重发 |
| F12 | 播放/弹幕/字幕偏好、连播设置、缓存、账号管理、脱敏诊断 | 重启后设置恢复；断网、Home 隐藏、休眠与恢复有完整路径 |
| F13 | 当前版跳过真实双账号功能/验收（ADR-069），保留既有实现与编号 | 当前EXCLUDED，非PASS；单账号登录/会话恢复、保护存储、游客隔离与旧请求取消仍须满足 |
| F14 | 投币、明确的数量选择与确认；一键三连 | 实际数量与用户选择一致；不可撤销操作防误触；超时先查询状态 |
| F15 | 评论和回复只读查看，与 F10 合并实现；不提供发布、回复、编辑或删除 | 热门/最新/回复分页、失败恢复、焦点和安全文本展示可用；无编辑/提交/删除入口或对应写请求 |
| F16 | 弹幕只读查看，与 F08/F18 合并实现；不提供发送或编辑 | 点播/直播弹幕可读，观看设置和时间轴同步正确；无编辑/发送入口或对应写请求 |
| F17 | 番剧/影视详情、选集、追番/取消、追番列表、续播 | 在用户真实权益和地区允许的内容上实播、回读追番状态 |
| F18 | 当前交付按用户最新指示不做直播（ADR-068），保留编号、代码和历史 | 当前EXCLUDED，非PASS；下一候选隐藏入口，不承诺后续版本 |
| F19 | 可用会员高画质、1080P 高码率、4K/HDR，按账号和电视能力选择/回退 | 支持样本实际达到声明分辨率与 HDR；UI 标签或流地址不足以证明成功 |
| F20 | 官方 Bilibili App 投屏发现、连接、点播/分 P/番剧及可投直播、暂停/继续/跳转/停止、状态回传、断连恢复 | Android/iPhone/iPad 官方 App→本电视分别测试；镜像屏幕或复制链接不能代替此项 |

All targets remain subject to actual account entitlement, content authorization and decoder capability. Required features outside the explicit ADR-068/069 exclusions remain incomplete when unsupported/blocked; a message explaining failure does not count as implementation. F16/F20 live-dependent branches follow that deferral; their non-live branches do not.

The user selected basic functions, all viewing/interaction extensions and official casting. Uploading, private messaging, commerce, buying memberships and offline downloads were not selected. BAS/arbitrary-code danmaku and unsupported media formats are outside the agreed F01–F20 definitions.
