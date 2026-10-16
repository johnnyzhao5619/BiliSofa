# Product requirements

Name: BiliSofa. Meaning: Bilibili viewing from the sofa. Target: Samsung UN58U8200FFXZC, Chinese mainland Bilibili service, remote-control-first TV UI.

Hard constraints:

1. Daily operation occurs entirely inside the TV app; ordinary Internet access to Bilibili/CDNs remains necessary.
2. No always-on computer, NAS, LAN gateway or project-hosted cloud runtime dependency.
3. One full v1.0.0, all F01–F20 completed together; internal work packages are not product versions.
4. Public GitHub source and MIT for original code, preserving upstream licenses.
5. Official casting means the unchanged official Android/iPhone/iPad Bilibili apps can discover and control BiliSofa on the TV. This does not imply official certification.
6. Computers are permitted for development, signing, installing, upgrading and debugging, then can be shut down.

Scope updated by the user on 2026-10-14: comments, replies and VOD/live danmaku are view-only; no authoring, comment deletion or danmaku sending. F15/F16 remain as read-only tracking IDs, implemented with F10/F08/F18. Search retains app-contained pinyin-initial input and suggestions. Other planned interactions remain in scope. See [ADR-003](adr/003-read-only-comments-danmaku.md).

| ID | 同一版本内完成的功能 | 验收结果 |
| --- | --- | --- |
| F01 | 扫码登录、账户信息、退出、会话失效/续期或重新扫码 | 扫码成功后真实账号一致；过期不展示假登录；退出清理个人会话 |
| F02 | 个性化推荐、游客热门、排行榜、基础分区、分页刷新 | 个性化和游客数据来源可区分；可重复翻页，无重复/漏项 |
| F03 | 中文内容搜索、应用内拼音首字母输入/联想、热搜、搜索历史；视频、UP、番剧和直播搜索 | 首字母输入到候选选择/实际检索可用，Back/焦点正确；空结果与请求失败区分，不依赖未证实的系统中文键盘 |
| F04 | 关注动态、UP 主页、投稿列表；常用图文/视频动态展示 | 源端更新能刷新；详情返回保留原卡片 |
| F05 | 云端历史、收藏夹/收藏内容、稍后再看、分页与队列播放 | 与同账号官方客户端的实际内容一致；失效视频可识别 |
| F06 | 画质/编码/可用音轨选择、暂停、跳转预览、分 P、合集、连播、循环、倍速 | 实际声画和进度符合选择；设备不支持的源不作为可选能力 |
| F07 | 本地续播、云端进度回传与双向接续 | 手机→电视、电视→手机分别对照；写回失败与本地保存分开显示 |
| F08 | 普通滚动/顶部/底部弹幕；开关、字号、透明度、密度、区域、关键词过滤 | 暂停/跳转/切 P/倍速后同步；弹幕过密仍可操作；数据仅按文本或受控指令解析 |
| F09 | 字幕轨道、语言选择、字号、开关、时间偏移 | 源提供的字幕正确呈现；无字幕和加载失败可区分 |
| F10 | 热门/最新评论、回复列表，播放侧面板阅读 | 评论分页正确、焦点可退出、关闭不丢播放位置 |
| F11 | 视频点赞/取消、指定收藏夹增删、稍后再看增删、关注/取消 | 每次用户操作提交一次；成功回读；未知结果不自动重发 |
| F12 | 播放/弹幕/字幕偏好、连播设置、缓存、账号管理、脱敏诊断 | 重启后设置恢复；断网、Home 隐藏、休眠与恢复有完整路径 |
| F13 | 多账号扫码、切换、删除，个人数据隔离 | A/B 账号互不串号；快速切换时旧请求不覆盖新账号 |
| F14 | 投币、明确的数量选择与确认；一键三连 | 实际数量与用户选择一致；不可撤销操作防误触；超时先查询状态 |
| F15 | 评论和回复只读查看，与 F10 合并实现；不提供发布、回复、编辑或删除 | 热门/最新/回复分页、失败恢复、焦点和安全文本展示可用；无编辑/提交/删除入口或对应写请求 |
| F16 | 弹幕只读查看，与 F08/F18 合并实现；不提供发送或编辑 | 点播/直播弹幕可读，观看设置和时间轴同步正确；无编辑/发送入口或对应写请求 |
| F17 | 番剧/影视详情、选集、追番/取消、追番列表、续播 | 在用户真实权益和地区允许的内容上实播、回读追番状态 |
| F18 | 直播推荐/分区、关注直播间、播放、画质切换、断流恢复、直播弹幕只读查看 | 使用真实房间验证；断流后有限恢复；直播时间轴与点播区分；不发送直播弹幕 |
| F19 | 可用会员高画质、1080P 高码率、4K/HDR，按账号和电视能力选择/回退 | 支持样本实际达到声明分辨率与 HDR；UI 标签或流地址不足以证明成功 |
| F20 | 官方 Bilibili App 投屏发现、连接、点播/分 P/番剧及可投直播、暂停/继续/跳转/停止、状态回传、断连恢复 | Android/iPhone/iPad 官方 App→本电视分别测试；镜像屏幕或复制链接不能代替此项 |

All targets remain subject to actual account entitlement, content authorization and decoder capability. Unsupported/blocked required features remain incomplete; a message explaining failure does not count as implementation.

The user selected basic functions, all viewing/interaction extensions and official casting. Uploading, private messaging, commerce, buying memberships and offline downloads were not selected. BAS/arbitrary-code danmaku and unsupported media formats are outside the agreed F01–F20 definitions.
