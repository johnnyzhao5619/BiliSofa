# ADR-035：W03匿名排行榜与独立目录网络模块

日期：2026-10-18，W03/F02。W02新ID人工最小组合已收束，量化性能缺口保持。

首条新内容路线为全站排行榜。实际HOST通过项目固定CA、TLS验证及无凭据GET访问官方`https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all`，取得HTTP200/API0、100条、153725字节；仅是本机接口证据，不是电视证明。浏览工具无法直接打开该API，系统默认CA请求也失败；未关闭TLS，改用既有固定Mozilla CA后成功。

采用独立catalog C/WASM，只开放这一固定GET，复用既有cURL/SSL库、CA及guest GET缓冲/头部/TLS/无redirect规则。响应限512KiB，Worker解析100条规范化显示DTO（IPC限128KiB），原JSON不出Worker。新模块不改既有identity/media/cast原生源码或产物，不接受URL、header、Cookie、账号或任意操作。

ContentRuntime增加ranking route。一次读取最多100条，按服务顺序保留、每页4条、最多25页；同一页面owner持有有界快照，后续翻页不再次请求全表。重新点排行榜入口明确刷新快照，失败清旧列表，切路由/返回/账号失效拒绝迟回包；关闭确认两个读取Worker均已释放。列表项沿用已实现的匿名360P首P播放与失败说明，不宣称登录后即可播放会员内容。

UI复用同一焦点/返回栈、卡片与媒体owner，补排行榜入口、前后翻页、排名及加载/空/失败/重试状态。无图片网络、账号写操作、新权限或外部服务。内部0.6.0同一App身份；完整F02个性化、分区及其他W03功能仍开放。

新C模块需真实Samsung链接/扫描、CA/静态库/许可/来源门禁；HOST边界与合成Worker/UI测试分开记录。只在包已就绪时安排一次实际排行榜显示/翻页检查，不重复W02账号、Home或三端测试。
