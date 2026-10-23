# W03 匿名视频搜索内部交付

2026-10-18，W03/F03，ADR-036。`BiliSofa01.TV`/`BiliSofa01`内部0.7.0。0.6.0排行榜显示/前后页/普通卡短播/Back已获USER全部通过并收束；本批不重复那组人工测试。

## 已实现

首页新增“搜索视频 · 首字母输入”。同一TvShell的InputRouter向当前owner的模态分发字符/Back；面板不注册页面keydown，不创建另一个FocusRouter。初始A，2×4候选/键盘显式邻居，左右边界停留、两行首列可达。候选确认只组词，关键词显式确认后关闭输入、待父owner仍有效才发起搜索。Back先清字母，再退出并恢复入口；Home/账号失效取消所有权及迟回。关键词最多32码点/128UTF-8 bytes，只留当前页面内存，不进诊断、普通偏好或全局历史。

匿名video route固定官方GET、四条/页、1–10页。独立search C/WASM校验UTF-8/分页，curl编码关键词；固定协议/主机/路径/参数/Referer，无调用方URL/header/账号Cookie。正文512KiB/头16KiB、连接4s/总8s，CA/TLS校验、禁止redirect/proxy，cURL真实清理后才确认closed。读取替换/缓存翻页均等待三个lane关闭屏障，迟回不能覆盖当前keyword。

Worker解析video类型、BVID/作者/时长/播放数/页信息并只移除已知搜索高亮em标签，其余外部文本通过textContent显示，原JSON/URL不跨Worker。只返回规范化四卡和固定错误码；API错误保留整数，HTTP/解析显示search.…固定码，不透传外部message。失败清旧卡、无自动重试。结果用既有游客360P首P/本地续播与单媒体owner，Back回原搜索卡。

复用固定AOSP词库与InitialsWorker，原Apache-2.0 NOTICE和生成数据hash纳入包门禁。原identity/native/catalog共12条文件与0.6.0逐字节一致，新增search模块独立加入，无新SDK、依赖、权限、客户端身份/keys或账号写操作。

## 证据边界

| 层级 | 实际结果 |
| --- | --- |
| HOST官方搜索接口 | 首次HTTP200/API0，6494字节，pagesize4/四条，返回页数250；只检查基本结构/字段类型。后续一次生产解析器取数遇HTTPError，未取得成功解析实际响应的证据；有界双UA对照分别412与200/API0，不能认定UA为原因。原JSON未保留/输出，不通过代理、Cookie或客户端身份绕过 |
| 单元/合同 | 364通过：原358及新增6个视频搜索合同/文本/分页/结果/适配/取消检查。已有三个首字母测试保持 |
| strict/边界 | 127模块通过 |
| HOST原生 | 8通过：固定编码GET/无凭据、禁止redirect、未信任CA明确CURLE_PEER_FAILED_VERIFICATION、正文/头上限、非法argc无网络、UTF-8/32码点/128bytes及分页、溢出/精确边界。测试进程的CA/CONNECT_TO不进入生产 |
| SDK | 新search已真实Samsung链接、CA/静态库/来源/私密模式扫描；旧12原生产物不重编译 |
| 浏览器 | 5新流程：NH/两行首列/不误搜索/确认后四卡/分页，Back与composition，原媒体播放及Back原卡，API/HTTP/空/重试，Home取消和迟回。已有4目录＋8媒体＋10本地＋6投屏＋10身份回归；共43独立流程，不计重复运行。合成C/SDK，不是TV声画 |
| 包 | 7负例通过：保留5项，增加AOSP notice及search固定路径不能靠重hash替换；完整词库/notice/原生来源/CA/固定目标/许可门禁通过 |
| TV | 安装/启动和USER组另附；未收到结果前不记视频搜索通过 |

开发中先有测试fixture的重复字段/命名错误，strict修正后通过；新增测试误用了已有search.test.ts路径，比较旧日志后从0.6.0冻结ZIP逐字节恢复原三个检查，新六项改为video-search.test.ts。最终364通过，没有以新文件替掉旧检查。包负例与一轮新UI启动窗口曾交叠；随后最终43流程整组串行完成，不在运行期间改stage，首次日志保留。未运行远程CI，也未提交/推送。

未签名包：`dist/BiliSofa-W03-search-unsigned.wgt`，SHA256 `7dd714ab789862a461132e9feb030638f37fd128a4e2011cf826ec95e1f28503`；UI sourceHash `abc89980ab8d58cd07121e543591c6f337cb2b69dc7558b6ff644745c191608f`。签名/源ZIP/部署配对另存仓库外，旧0.6.0及W01/W02原件不覆盖。

## 一次人工组与后续范围

已安装时：进入首字母输入，用N、H选“你好”，确认后检查真实视频四卡/标题；下一页再上一页，选一张普通卡短播约10秒并Back回原卡。再进入输入，ZG后一次Back只清字母，再一次退出。若任一步失败或HTTP/API/search.…码，记录一次即停止，不重复扫码、Home、三端/长播或排行榜。

这只是video route首批。F03热搜、按身份的持久化历史、UP/番剧/直播搜索仍开放；持久化历史需明确迁移和账号移除清理，不用临时全局KV假装完成。F02分区/个性化、F04/F05内容、F01续期/替换与真实两账号对照、F07云端/W04–W07仍开放。两次旧未知云写意图保留，不重发；无评论/弹幕编辑入口。


2026-10-18部署追加：同一0.7.0包已由自有profile签名，signed SHA256 `d95c4be17b1c91fb8438e0c3bafd2eb66d7eea0663c1fecfb2b59a34cf5ec49b`，433文件源ZIP SHA256 `8e3a9c296f7344f13be1f6895e2ee1452af1a96761755b65b2410f3df7e40e97`。UTC2026-10-18T19:51:14.920430+00:00开始的state/capability/install/launch均exit0且平台明确确认，首次实际部署成功，无重连/失败安装或新证书操作。current installed配对已保存后才请求用户检查；0.6.0及其USER记录完整保留。已请求一次NH→你好真实搜索/前后页/短播Back与ZG输入Back组，USER结果尚未收到；不将CLI启动、合成43流程或HOST API0当作电视搜索/声画验收。


2026-10-18 USER结果：首次你好搜索search.http_412失败，第二次相同词成功；首次搜索卡播放ugc.audio_transport_28失败，第二次同视频成功；ZG后Back先清字母、再退出验证通过。保留首次失败与用户重试恢复，不记全组/稳定首播通过；回复未分别确认翻页和播放Back，不替用户补全。未另收原生报告，原因未定。本组停止重复人工尝试，后续改进显式重试与F03本地历史，不自动重发412。
