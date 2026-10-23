# ADR-047：关注更新导航只读

2026-10-19，W03/F04，内部0.17.0，BiliSofa01.TV；接受候选实现，真实账号与TV待验。0.16.1收藏短列表补验USER通过，原缺陷与复现日志不覆盖，不重复旧组。

## 一手来源与限制

`https://t.bilibili.com/`通过Web读取HTTP412，HOST urllib为未取得HTTP状态的URLError，两种失败不混写；停止重复此页，不更换UA/代理/身份绕行。当前同日官方header源码（原SHA256 `95dbb3382a1d1bc977cadecd53efb64fc0bd5fc0a6e1e5c36d0a79e8b96cf4d8`）明确调用GET `/x/polymer/web-dynamic/v1/feed/nav`，参数update_baseline/offset，消费items/offset/has_more；AllInOneItem展示title、author.name、pub_time，按type=64区分专栏，其余为导航视频更新。源码只是文本核对，无远程执行或复用该组件。

本批固定update_baseline为空、offset为空或上页游标，不实现官方组件的本地未读cookie更新。独立同UA/CA、无Cookie的匿名HOST请求HTTP200/API-101，只证明该匿名结果，不证明登录内容可用，也不代表主动态页412已解决。

导航更新不是完整动态流/全文/图集：界面明确“网页导航更新摘要”，只读标题、作者、源端时间与类型。完整常用图文/视频动态、UP主页/投稿、详情与播放仍在F04/W04保留，不用本批摘要替代完整F04。

## 账号、边界与恢复

沿ADR-045共享私有native lane：当前账号nav核对后，再作operation5固定更新GET；身份失配取消私有DOM，实际native关闭后返回。所有旧私有能力仍串行关闭，未知关闭poison不复用。

offset为平台内存的有界ASCII不透明字符串（最长1024），由curl_easy_escape编码为单一查询参数，不解释为URL或代码；native request_url容纳最坏三倍编码，继续固定HTTPS目的地、禁止redirect/proxy、校验TLS/CA、cookie jar与既有响应/时限。无新权限/SDK/存储格式，不加POST/点赞/稍后再看写入。游标、ID、链接、封面不跨UI/普通KV/诊断。

每批最多50条、四卡页；账号内存保留至多25页，每次跨批至多一次GET，上一页使用快照、不漏不足四项的页。刷新/代次改变/关闭清空快照；重复/停滞游标、非法类型/字段拒绝，不自动重试。源端has_more=false为终点，内部25页显示限制，不伪造总数。

UI沿原TvShell焦点/返回与生命周期owner，加载可Back/Home，摘要Back回原卡，关闭未知禁止再次读取。唯一TV新组为同账号更新标题/作者对照、条件前后页、刷新、摘要Back；空列表不要求新增关注/发动态，不重复收藏/历史/媒体，也不测试账号写入。
