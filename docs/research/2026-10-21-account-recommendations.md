# F02账号推荐一手协议核查

2026-10-21；匿名只读，不使用个人会话或真实账号POST。普通HTTP读取主页遇302旧浏览器页；干净Chromium普通访问[官方首页](https://www.bilibili.com/)获HTTP200，DOM148185字符，UTF-8内容SHA256 `6c0a9ac2c01c0710374dfaca695df6e127489131d6d8ac0a2463ea06ddaaac91`。

页面当前引用[官方首页静态代码](https://s1.hdslb.com/bfs/static/shanks/laputa-home/assets/index-fcc06688.js)，HTTP200/1669552字节，SHA256 `5d5dff3c07b3b6a4105568ab9666953bf87bf7bad014223308aa387d85c7887f`。仅静态阅读其协议/卡片字段；不在电视执行远程代码。浏览器research正常执行官方页面不等于将其SDK/脚本打入产品。

一手封装使用浏览器WBI路径`/x/web-interface/wbi/index/top/feed/rcmd`，`web_location=1430650`，feed_version默认V8；Init=0、DropDown=4、Refresh=5。普通分页参数包含fresh_idx、fresh_idx_1h、fetch_row、brush、ps与last_showlist。卡片映射读取goto/id/bvid/title/owner/duration/rcmd_reason；响应data含item和mid。项目不接入它的曝光/点击上报、AB实验、广告SDK或风险插件，不复制JS内置签名材料。

使用当前nav动态WBI材料、BiliSofa自有UA及固定Referer，仅做一次匿名推荐请求：HTTP200/API0/12条，全部goto=av；匿名mid=0。正文SHA256 `2e2ca723605dfe07872aecc77d18e50e1ae2e4510ff8e1b10a8adc98866db020`。这证明路由/样本形态可用，不能证明真实登录个性化；生产必须另核对账号nav与推荐mid，匿名结果不得标为本人推荐。

原始公开HTML/JS/响应及摘要保存在仓库外`w03-recommend-protocol-20261021`；不将视频标题、风险值或原始响应放入文档/诊断。新模块的本地门禁、包身份及真实电视结果分别见TEST_REPORT、SIGNING_DEVICE_RECORD和IMPLEMENTATION_STATUS。
