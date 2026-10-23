# F04 UP投稿当前协议核查

2026-10-19，只读研究，不部署新投稿入口。先前候选本来已使用WBI，旧HTTP412记录保留；本次不是把未签名接口换为WBI，也不把HTTP200当作投稿读取成功。

读取同一公开UP的当前空间视频页一次：HTTP200，10596字节，SHA256 `13525152992e62470291bab7a65d12dd3ba7a1fe56feab4a202c7ff6a4ba1c13`。其引用官方 `https://s1.hdslb.com/bfs/static/shanks/fresh-space/assets/index-76bd2e5f.js` HTTP200，1929586字节，SHA256 `011d38784842b6dca19c321e625b15692db27810e6b2e18b40207afded7f8e87`。

人工读取S1封装仍为`/x/space/wbi/arc/search`，当前普通参数有`order_avoided=true/platform=web`，主视频列表携带`pn/ps/tid/special_type/order/mid/index/keyword`，并经WBI编码。另有风险日志插件读取浏览器相关dm字段；本项目不执行其远程脚本、不伪造浏览器指纹或解答风控。

按当前普通参数、固定同一UP，匿名nav一次HTTP200，再签名投稿GET一次：HTTP200/API -352，120字节，未返回视频列表。参数只做当前来源支持的一次区别核对，没有重试原旧查询、轮换UA/账号/代理、模拟其它客户端身份或使用个人凭据；不记录/回放响应中的风险凭证。原始公开材料/响应仅在仓库外私密归档，摘要不包含UID/URL查询或风控值。

结果：F04投稿仍外部拒绝OPEN，当前不安排TV组；UP搜索与附带预览旧USER PASS不重复。完整UP主页/投稿和图文动态未被移除或记通过。继续独立F01账号详情，仅复用既有身份GET已返回的有限显示字段。
