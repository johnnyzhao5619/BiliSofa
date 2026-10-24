# 2026-10-24 归档：W01–W06阶段交付与过程记录

U5集中验收（V1–V6，0.51.3）通过后，从`docs/`移出的阶段交付说明、逐轮部署记录与早期研究。文件逐字保留（`git mv`），其中的相对链接按原位置书写，可能已失效；不再维护。

当前结论以[当前实施状态](../../IMPLEMENTATION_STATUS.md)、[收口台账](../../PRODUCT_CLOSURE.md)、[签名与部署记录](../../SIGNING_DEVICE_RECORD.md)和[U5验收报告](../../acceptance/2026-10-23-u5-final/REPORT.md)为准；设计决定见`docs/adr/`，平台事实见[来源登记](../../research/tizen-best-practices-2026-10-14.md)。

| 文件 | 原标题 |
| --- | --- |
| [F06_MODULE_DELIVERY.md](F06_MODULE_DELIVERY.md) | F06 整模块交付门槛 |
| [F12_LOCAL_DATA.md](F12_LOCAL_DATA.md) | F12本机记录与列表缓存管理 |
| [RESEARCH.md](RESEARCH.md) | Standalone runtime research, 2026-10-14 |
| [W01_EVIDENCE_INDEX.md](W01_EVIDENCE_INDEX.md) | W01阶段证据索引 |
| [W01_EXIT_CHECKLIST.md](W01_EXIT_CHECKLIST.md) | W01 剩余门槛与固定结束条件 |
| [W01_LESSONS_FOR_SKILL.md](W01_LESSONS_FOR_SKILL.md) | W01经验到tizen-tv-development的移交清单 |
| [W01_PROBE_GUIDE.md](W01_PROBE_GUIDE.md) | W01 内部探针指南 |
| [W02_ACCOUNTS.md](W02_ACCOUNTS.md) | W02第二批：受保护多账号与生命周期装配 |
| [W02_CAST_APP.md](W02_CAST_APP.md) | W02第五批：前台投屏会话装配 |
| [W02_DEVICE_ACCEPTANCE.md](W02_DEVICE_ACCEPTANCE.md) | W02新应用组合验收 |
| [W02_FOUNDATION.md](W02_FOUNDATION.md) | W02首批：导航与资源所有权 |
| [W02_IDENTITY_APP.md](W02_IDENTITY_APP.md) | W02第三批：身份Worker与可打包账号页面 |
| [W02_LOCAL_APP.md](W02_LOCAL_APP.md) | W02第六批：本地设置、续播与诊断 |
| [W02_MEDIA_APP.md](W02_MEDIA_APP.md) | W02第四批：账号应用中的游客播放 |
| [W02_NETWORK_APP.md](W02_NETWORK_APP.md) | W02第七批：内容读取与持久化写意图 |
| [W02_SOURCE_DIAGNOSTICS.md](W02_SOURCE_DIAGNOSTICS.md) | W02 0.5.1：首次取源失败的脱敏取证 |
| [W03_ACCOUNT_DETAILS_APP.md](W03_ACCOUNT_DETAILS_APP.md) | W03/F01 当前账号详情 |
| [W03_CATEGORY_RANKING_APP.md](W03_CATEGORY_RANKING_APP.md) | W03 / F02 分区排行榜内部交付 |
| [W03_CLOUD_HISTORY_APP.md](W03_CLOUD_HISTORY_APP.md) | W03 / F05 云端历史只读交付 |
| [W03_FAVORITES_APP.md](W03_FAVORITES_APP.md) | W03 / F05 收藏夹只读交付 |
| [W03_FAVORITES_PAGINATION_FIX.md](W03_FAVORITES_PAGINATION_FIX.md) | W03 / F05 收藏短列表分页修复 |
| [W03_FOLLOW_UPDATES_APP.md](W03_FOLLOW_UPDATES_APP.md) | W03 / F04 关注更新只读交付 |
| [W03_HISTORY_RECOVERY_APP.md](W03_HISTORY_RECOVERY_APP.md) | W03 搜索历史与有界读取恢复交付 |
| [W03_HOT_SEARCH_APP.md](W03_HOT_SEARCH_APP.md) | W03 热搜交付与验收记录 |
| [W03_LIBRARY_QUEUE_APP.md](W03_LIBRARY_QUEUE_APP.md) | W03/F05 私人列表本机入队 |
| [W03_LIVE_SEARCH_APP.md](W03_LIVE_SEARCH_APP.md) | W03 直播间搜索交付 |
| [W03_LOCAL_QUEUE_APP.md](W03_LOCAL_QUEUE_APP.md) | W03 / F05 本机播放队列交付 |
| [W03_NETWORK_FAILURE_INVESTIGATION.md](W03_NETWORK_FAILURE_INVESTIGATION.md) | 0.18.0 全部联网失败核查（F01/F02/F05，W03） |
| [W03_PGC_SEARCH_APP.md](W03_PGC_SEARCH_APP.md) | W03 番剧搜索交付 |
| [W03_QUEUE_PARTS.md](W03_QUEUE_PARTS.md) | F05本机队列与分P播放整合 |
| [W03_RANKING_APP.md](W03_RANKING_APP.md) | W03 匿名排行榜内部交付 |
| [W03_RECOMMENDATIONS.md](W03_RECOMMENDATIONS.md) | F02账号视频推荐 |
| [W03_REMAINING_CHECKLIST.md](W03_REMAINING_CHECKLIST.md) | W03 剩余工作 |
| [W03_SEARCH_APP.md](W03_SEARCH_APP.md) | W03 匿名视频搜索内部交付 |
| [W03_SEARCH_FORMAT_FIX.md](W03_SEARCH_FORMAT_FIX.md) | W03 搜索时长格式修复 |
| [W03_SEARCH_WBI_APP.md](W03_SEARCH_WBI_APP.md) | W03 匿名WBI搜索交付 |
| [W03_USER_PREVIEW_FIX.md](W03_USER_PREVIEW_FIX.md) | W03 UP 预览画面遮挡修复 |
| [W03_USER_SEARCH_APP.md](W03_USER_SEARCH_APP.md) | W03 UP 主搜索交付 |
| [W03_WATCH_LATER_APP.md](W03_WATCH_LATER_APP.md) | W03 / F05 稍后再看只读交付 |
| [W04_DEVICE_ACCEPTANCE.md](W04_DEVICE_ACCEPTANCE.md) | W04验收与收尾 |
| [W04_MEDIA_DELIVERY.md](W04_MEDIA_DELIVERY.md) | W04整包交付门槛 |
| [W04_PGC_MEDIA.md](W04_PGC_MEDIA.md) | W04 番剧/影视媒体候选 |
| [W04_PRODUCTINFO_FIX.md](W04_PRODUCTINFO_FIX.md) | W04 型号权限门禁修复 |
| [W05_OVERLAYS_AND_INTERACTIONS.md](W05_OVERLAYS_AND_INTERACTIONS.md) | W05叠加与互动 |
| [W06_CAST_DELIVERY.md](W06_CAST_DELIVERY.md) | W06官方投屏 |
