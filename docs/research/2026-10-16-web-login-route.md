# G3 官方Web扫码与进度读取路线核查

2026-10-16（America/Toronto）。仅公开页面/匿名接口；无账号、无poll、无Cookie持久化、无业务写入。不能以这些HOST结果代替电视扫码成功。

官方登录页 https://passport.bilibili.com/login 的当前公开入口为 https://s1.hdslb.com/bfs/static/2233-monorepo/passport/static/js/index.2c6a212d.js ，1110164 bytes，SHA256 fd3107612999ee78a1aca21b1f133a876ade7f783635690807eafe0c14456cb9。只检查公开静态字段，未复制执行其代码、身份或密钥。入口中不含旧qrcode_key/poll路由字面量，不能假称从该文件证明完整旧Web协议。

匿名GET https://passport.bilibili.com/x/passport-login/web/qrcode/generate ：UTC2026-10-17T02:27:42返回HTTP200/API0，data只有url/qrcode_key，key为32hex；返回QR已指向HTTPS account.bilibili.com的新/h5/account-h5/auth/scan-web路由，非早期passport.bilibili.com/h5-app/...地址。后续普通Python UA请求出现HTTP412；不关闭TLS、不冒用官方App身份/轮换地址绕过。需要明确project UA并在TV核对一次；风控失败保留具体状态。QR secret不保存、不输出、不poll，没有访问用户账号。

用户指定BV14GHy6bE9n用于G3。匿名官方view HTTP200/API0：aid117400733288351、首P cid42548528128、1P、95秒；均为公开内容元数据。匿名官方GET /x/player/v2?aid=117400733288351&cid=42548528128 返回HTTP200/API0且有整数last_play_time/last_play_cid；匿名零值不是真实账号进度证据，单位/实际命中仍需一手播放器源码或目标账号对照。后续不得把它标为云进度验证通过。

本机Python默认信任配置最初缺少issuer，改用已固定且校验hash的Mozilla CA快照，保持TLS主机名/链校验后公开请求成功；该HOST配置错误不分配给电视网络。当前没有真实账号写入授权；先准备可审阅QR/只读流程。任何进度写回先展示BV/分P/旧值/候选秒数和一次请求边界，取得用户明确批准；未知写结果先只读查询，不能盲重试。

当前匿名QR响应的callback为固定标记close，不是URL；最初纯URL callback白名单在HOST拒绝了该真实返回，已加仅account.bilibili.com新固定路由允许close，其余任意标记仍拒绝。它只作为二维码参数，不在TV执行或解释为脚本。公开route与生成key绑定已核对，未poll/登录。

补充：该新QR还带from=空参数。Python默认parse_qs忽略空值，使早期字段清单漏了一项；URLSearchParams保留它，实际合同对照因此拒绝。已明确仅新account固定路由允许唯一空from，其余未知字段、非空from和重复key仍拒绝；不靠删除校验解决。检视只输出字段名/布尔，不输出QR key。

## 2026-10-17 官方播放器公开源码对照

匿名获取用户指定公开视频页面（HTTP200）所引用的官方播放器核心 https://s1.hdslb.com/bfs/static/player/main/core.147ce847.js ，解压UTF-8正文2038536 bytes，SHA-256 `05ff4195f5df34eeb8ed3271b0c9fa09b4f10c651e8762bfad732dacade4235b`。只作一手源码阅读，不执行下载代码，不复制官方客户端身份/密钥。web读取器无法访问页面，HOST使用固定Mozilla CA保持主机名/链校验，明确project UA与gzip解压/正文上限后读取成功，无登录凭据。

代码将API的last_play_time映射为lastPlayTime；续播计算将其除以1000后与播放器秒数比较。因此此版本官方Web播放器将该字段按毫秒处理（SOURCE证据）；电视008仍显示原始数值，不用零值判断单位或证明非零接续。用户本轮在电视确认身份匹配、原始进度0；不等于已经对照手机历史或完成写回。

官方播放器以POST向api.bilibili.com的/x/click-interface/web/heartbeat提交媒体进度，含aid/cid、秒级played_time/last_play_progress_time、播放类型/时长等字段；csrf来自本账号bili_jct。当前实现还启用WBI参数处理。本条仅定位后续可审阅候选路线，不表明任意精简请求必然可用，不复制固定备用签名材料，不增加真实账号写入授权。本次未调用此POST，也未向官方服务器发送合成播放事实。准备阶段还需确定最小有据字段、动态公开签名输入、一次提交/持久去重/unknown只读核查及具体目标/旧值/秒数，再请求用户明确同意。
