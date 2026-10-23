# W02第四批：账号应用中的游客播放

日期：2026-10-17。范围：W02/F02/F06/F12/F13，设计见[ADR-030](adr/030-owned-media-in-account-app.md)。内部版本0.2.0，不是产品发布，完整W02尚未完成。

## 这次接通的路径

首页→读取游客热门→两行四卡/下一页→选卡→真实匿名媒体Worker→本机token化MPD→AVPlay→暂停/继续、跳5秒→Back或播放完成→原卡。首页保持原账号管理入口；即使已选择账号，这一游客路径也只使用匿名Scope，不接收账号凭据，不触发云进度/互动写入。

MediaSession管理解码器和媒体桥的共同生命周期；Back、Home、账号失效/切换、播放结束、准备失败均通过页面owner关闭。只有实际decoder NONE与原生Worker关闭ACK同时确认才允许复用；任一未知会阻止后续打开并要求重开应用。准备/seek迟到回调与重复ready不隐式换源，seek成功不制造进度tick。C回调内读取WASM导出延后到stdio栈返回后。首页卡片以安全文本渲染，显式两列邻居/边界，模态与主页面共用现有唯一InputRouter。

## 工件与命令

应用`BiliSofa01.TV`、包`BiliSofa01`，与上一账号包同一内部身份；本次未安装。输出：

- `dist/BiliSofa-W02-media-unsigned.wgt`
- SHA256：`497e1f04a505368d82f39ddfdbc18d3bf6a2871deee84ce0192bf417dd20f93e`

原`dist/BiliSofa-W02-account-unsigned.wgt`保留，不覆盖第三批0.1.0或已安装W01主060/独立018。

```sh
npm run check
npm test
npm run build:app
npm run test:ui:app
npm run test:ui:media
npm run package:app
python3 tests/native/foundation-packaging.test.py
```

身份与媒体原生工件已存在时不重复编译。本次打包实际核验并复用`build/identity`及`build/network-candidate/probe`，检查源码/静态库/CA/嵌入媒体/许可证和最终字节；不只是复制版本号。新环境需先按[第三批](W02_IDENTITY_APP.md)和[现代网络候选](adr/016-modern-network-main-media-probe.md)准备本地工具链与真实原生输入，缺失时报阻塞，不用合成模块替代发布工件。

WGT权限仍仅internet，WARP只允许40324 loopback；CSP媒体/连接仅本地受控端点，Samsung API脚本沿用既有本机加载路径。账号identity模块与匿名native模块分开打包。正式包不含测试夹具、开发服务器或签名证书。打包器拒绝额外权限、额外loopback origin、意外stage脚本及过期来源摘要；未签名包不等于可安装成功。

## 本轮验证与限制

- 全量308单元/合同通过（本批新增8项）；strict及102模块边界通过。
- 实际账号UI/Worker合成回归10项通过；新增游客/媒体UI6项通过。新路径使用真实JS Workers、实际生产解析与平台AVPlay适配器；C模块、SDK和KeyManager为合成夹具，没有访问真实B站账号/视频或电视。
- 新增3项打包负例通过：意外脚本、增加权限、增加loopback origin，后两项即使重算stage摘要仍被拒绝，原WGT摘要保持不变。
- 实际生成未签名WGT并核验ZIP内容、身份/入口/依赖/许可证/私密扫描与逐字节摘要；新媒体原生C未修改、未再次编译。
- 截图复核后收紧首页间距，检查两行卡片及翻页按钮全部位于1920×1080视口；播放器控制层与返回焦点正常。桌面显示AVPlay插件不可用，因此截图不是视频声画证据。
- 首次strict发现测试断言将数组收窄为never，已改为长度断言并重新通过；没有放松运行时合同。首次布局截断第二行，修正后重新跑6项UI，保留初轮日志。

复用桥仍限制匿名360P首P、15分钟媒体租期和有限总读取/请求预算；不是完整画质、长视频、分P、PGC/直播或F20实现。首页只提供游客四卡/十页，不等于F02完整推荐/排行榜/分区。尚未签名、安装或获得新包真实声画、KeyManager、Voice Guide、屏保、性能证据。远端CI只新增媒体UI命令，未运行GitHub CI。

## W02剩余边界

1. 投屏CastSession装配：电视授权、官方握手、命令/时间回传、代次换源及双方关闭屏障，随后对新包做一组有界功能检查。
2. 按账号隔离的非秘密偏好/本地续播与恢复，不能用普通存储保存会话或绕过两份未知云写入意图。
3. 通用内容网络/保留写操作协调、脱敏诊断装配，以及新包真机启动/输入/保护存储/媒体组合与性能基线。

F01完整续期、F07云进度、F13多账号实机、F19高画质及其他F项保持未完成。此轮无需用户重复W01测试；后续先完成可审阅工件再安排最小的新包检查。


后续第五批已将前台投屏会话装入相同应用ID，内部0.3.0；`package:app`当前输出cast-unsigned.wgt。本页0.2.0/308项与摘要仍是第四批原件记录，不覆盖；当前构建和下一步见[W02_CAST_APP](W02_CAST_APP.md)。
