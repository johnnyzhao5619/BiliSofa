# ADR-036：统一输入所有权下的匿名视频搜索

2026-10-18，W03/F03；0.6.0排行榜最小组已获USER全部通过，本组不重复。

本批接通应用内拼音首字母选词和匿名普通视频搜索。HOST用项目固定CA/TLS、无凭据GET访问官方`/x/web-interface/search/type?search_type=video&keyword=…&page=1&page_size=4`得到HTTP200/API0/4条，pagesize4/numPages250；浏览工具无法直接打开。该公开接口实测不是稳定性承诺或TV证据，不嵌入官方客户端身份/keys，不做风控绕过或自动重试。

新search C/WASM只接受UTF-8关键词（最多32码点/128bytes）和1–10页，固定官方端点/参数、curl编码、无账号Cookie/可变URL/headers。沿用512KiB正文/16KiB头/4s连接/8s总超时、CA/TLS/禁止redirect。Worker解析四条video结果，严格校验分页/类型/ID/时间，只移除已知搜索高亮em标签，其他外部文本以textContent显示。规范化DTO不含URL/原JSON/外部HTML；未知/超限响应失败关闭。

复用既有InitialsWorker/词库，保留AOSP Apache-2.0原notice和hash。新输入面板不创建FocusRouter、InputRouter或页面keydown；TvShell向当前模态分发Back/字符命令，Home/账号变化沿原owner关闭。Back先清首字母，再关闭模态；确认候选只组词，显式确认关键词后才发起搜索。候选2×4/键盘显式邻居、左右边界停留；关闭回原入口，候选迟回无效。搜索结果沿既有四卡/媒体owner，Back恢复原卡；当前关键词仅页面内存，不写诊断或普通偏好。

同一App内部0.7.0。现有identity/native/catalog原生条目不改，新search模块独立加入。不把首批video route标完整F03：UP/番剧/直播搜索、热搜、按身份的持久化搜索历史仍开放，另接有界合同/迁移/清理；不在本批临时写全局localStorage导致账号串历史。无评论/弹幕编辑，F15/F16只读边界保持。

本地合同/编码/TLS/关闭/输入和结果UI回归后才打包/签名/安装。唯一人工组为NH→你好确认、视频结果翻页/短播Back与输入Back，失败一次即结束，不复测账号、投屏、长播或排行榜。


2026-10-18追加：0.9.1格式合同修订：官方SSR实际video.duration含5:8；同卡片仅补零后旧解析即通过，新解析直接接受m:s与m:ss，秒仍0–59/总时长上限不变。固定invalid_response字段码补齐，不含外部消息或字段值。HTTP412未解决，不猜测绕过或自动重试。隔离真实卡片证据与合成分页/TV未确认分层，见W03_SEARCH_FORMAT_FIX。
