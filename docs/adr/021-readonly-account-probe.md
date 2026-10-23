# ADR-021：G3单账号扫码及只读进度候选

日期2026-10-16；部署记录更新2026-10-17。W01/G3、F01/F07/F13。状态：候选实现及232不同相关本地检查/实际Samsung链接通过；独立网络0.0.8已安装/启动，首次真实扫码身份匹配/指定进度原始0及保护保存/原生关闭已配对；同UID重开恢复、本地删除及写回仍OPEN。用户指定BV14GHy6bE9n、方便稍后扫码；尚未授权云进度写入。

G1/G2最小门槛已有配对证据。下一候选只针对一个用户自行选择的账号、一条指定95秒普通视频首P：电视显示官方Web扫码地址，用户在官方手机App确认，读取本人身份、该视频进度；私密会话存KeyManager，退出重开后恢复同一账号并再次只读核对，最后清理。二维码、cookie、刷新token、UID/昵称不入诊断/源码/普通存储；二维码与昵称仅供当前TV界面，Home/Back取消并清空。真实进度写回先准备可审阅目标/秒数与有界一次请求，再取得明确授权，本候选先不发业务POST。

网络为新的独立account WASM Worker，固定passport.bilibili.com扫码generate/poll、api.bilibili.com nav/view/player/v2；公开源核查见research/2026-10-16-web-login-route.md。当前QR指向HTTPS account.bilibili.com/h5/account-h5/auth/scan-web，保留严格路径/参数与生成key绑定；不复制官方App身份/密钥。CA/TLS验证开启、不跟随redirect、不向CDN发送cookies，固定目的地/路径与选定内容，单账号jar、请求/会话/响应/IPC/清理均有界。原059媒体与007合成网络证据分别保留，不重复切P或G2。

QR渲染采用qrcode-generator 2.0.4（Kazuhiko Arase，MIT，源https://github.com/kazuhikoarase/qrcode-generator ，npm integrity在lock）。只在新扫码UI的单个适配模块允许该明确依赖，运行时本地打包；用矩阵绘制canvas，不以innerHTML执行库生成HTML或外部HTML，不请求远程二维码服务。保留上游声明及完整MIT文字。工程边界检查仅允许这一文件的这一模块，不扩大为任意npm runtime导入。

设备前需验证纯解析/秘密通道/归属和取消/私密存储、HOST原生固定请求/headers/cleanup、Worker/UI真实QR编排、严格类型/边界、实际Samsung构建和包/许可门禁。未完成不请求用户扫码；真实读结果不能用匿名零进度/fixture代替。相同失败无新证据最多两轮，先本地定位；账号写权限边界保持。

恢复窗口最多30分钟（保护存储内有效期校验，不声称进程退出后到时物理擦除）。初次只读成功并保护保存后，只有开发电脑读走无秘密报告才自动退出；再次打开自动从同一owner的KeyManager恢复，先核对同一UID再读指定视频。之后清除本次会话必须有删除/NotFound证据，未完成不能宣称已清理。单个网络会话仍四分钟、请求8秒/总请求deadline9秒、父层220秒/关闭ACK5秒，均不因持久化恢复窗口延长而改变。

实际UTC2026-10-17T02:55:34.163670+00:00，BiliNet001.Probe / 0.0.8 / account-readonly-manual安装与启动PASS。source `4db27e11fac5eb95e58d7027a54e5e8db09de916aae690afd4f741c5c35b809a`；signed SHA-256 `01eebbb3a6c9580a9d27cf40a9fb3f7c094497b678b873c24fb4b28ab52cc67d`。准确签名包/源码ZIP/部署日志在仓库外，未把后续文档构建覆盖为该包。已请求一次用户扫码/身份匹配/原始进度反馈，先等待用户看完结果，再读取诊断触发退出与重开恢复；尚无真实账号成功或清理证据，G3保持OPEN。

### 2026-10-17：009启动诊断候选

用户明确长按Return/Exit结束008后，CLI再次启动成功；本轮45秒仍无恢复报告，未判恢复PASS。源码确认：启动阶段AccountVault.load抛错只更新界面、不调用readReport，无法自动区分过期/非法保存项/不可读。新增三个合成浏览器行为案例，against未重建008包均因没有报告而失败，复现的是诊断缺口，不是实际TV会话已过期或KeyManager故障的结论。

009只补这三个启动分支的脱敏自动报告，并把stop中的账号/报告Worker关闭未知分开固定代码；不改变会话期限、cookies/域/请求/权限、登录及恢复策略，不增加POST。所有C输入与已装008的四个WASM程序逐字节核对一致，复用准确SDK构建，不声称重新编译。strict/67模块通过；最终账号UI与包门禁结果后补。旧008登录成功及关闭未知报告分开保存，继续保留。新版本旨在取得缺失事实，无需用户重复扫码或清除已有会话。

### 009设备前最终检查（2026-10-17）

针对启动诊断缺口的三个新UI案例在旧008生成包全部因缺少报告而失败；009新生成包8项账号UI全部通过（15.6秒），含新增过期/损坏/不可读自动报告、既有登录保护保存/重开恢复、错UID拒绝、取消/Home及原生未知关闭。6项真实候选输入/改动注入门禁、strict/67模块通过。本轮14个不同相关行为/包检查，不与008的232累计重跑相加；无关媒体、IME、TLS矩阵未重跑。C输入和四组最终WASM与008一致，不声称SDK重编译。运行时仍只读，启动错误只输出固定分类、不删除或覆盖会话。

## W01/G3：009诊断包部署与当前阻塞（2026-10-17）

用户明确长按Return/Exit退出008后，CLI启动008成功，本轮45秒仍未收到报告；不以此判保护存储不存在或恢复失败根因。随后009补启动错误自动报告及关闭组件分类，8相关UI/6输入门禁与strict通过；C/账号网络逻辑和四组WASM全部与008相同，不重新编译SDK、不改保护存储TTL或执行POST。

UTC2026-10-17T12:48:23.173596+00:00，009/BiliNet001.Probe/account-readonly-manual安装/启动明确PASS。source `fa35f7b29d83c84384db9a3bb9c251eedd8ce6cd5e5280a2456305446d95f745`，signed SHA-256 `048bdc74b916755fc3a777f44cc46e4a15449a89a7c44a788772c86e7b398df3`。部署前capability初次失败，经同一授权目标断开/重连后成功，原始日志仓库外保存；不归因为签名错误。008原签名包、源码ZIP、deployed-network008-readonly-manifest.json及各报告保留。主059未升级。

009启动后45秒collector仍未取得报告，亦无旧build误配报告。当前源码在hasSaved返回false时不自动报告；恢复/错误报告也依赖前台、平台取地址及原生reporter，因此无报告不能单独确定保存项缺失、过期、恢复中或未进入前台。已只请求用户反馈当前顶部account代码/文字或电视主页，不请求重新扫码/反复点击，不继续猜测补包。首次008真实身份匹配/原始进度0/readonly_saved_closed证据有效；同UID重开恢复、非零进度、一次明确批准后写回/回读及最终固定测试slot删除仍OPEN。没有执行云进度写回或清理他人账号数据。

## 010候选：真实WASM stdio回调重入（2026-10-17）

用户反馈009界面为account.account_worker_close_unconfirmed，缩小为账号Worker，不是报告Worker标签。实际链接account WASM在浏览器中直接导入/导出/清空合成cookie/关闭PASS，无外部请求；同一真实WASM接上生产Worker、仅将首个auth_begin限制为返回0（保证不发HTTP）的夹具则重复超时，实际C输出为AUTH:ready以及拼接的AUTH:readyAUTH:readyAUTH:closed，未收到合法closed帧。该夹具只读本地资源、无真实凭据；私密非秘密观察记录g3-009-local-native-stdout-reentry-observation.json。早期无trace夹具失败和定位结果保留，不用HOST成功否定TV失败。

源码确认Module.print尚在C stdio刷新栈内，ready处理中的导入/错误关闭、response处理中的进度成功/错误关闭会同步重入C输出。首次登录的进度分支等待异步KeyManager保存ACK，关闭发生在另一个事件，故不走相同同步关闭路径；恢复成功直接在response4输出回调调用auth_stop，存在同一缺口。本地重入已证实，不冒称已完全重放TV每条网络事件。

010将ready后的C操作与response处理排入一个有界setTimeout(0)任务，等stdio栈返回后才调用C；ready同步验证导出/标记初始化，使取消仍调用真实auth_stop。close取消尚未运行的任务，完成/停止后不再执行它；不改TLS、cookies、请求、私密存储TTL或原生库，不把Worker终止当正常原生关闭。新增实际链接WASM/生产Worker的拒绝首HTTP及ready后立即取消验证，后者不得导入或发送请求。所有C与WASM复用009，实际TV恢复/删除仍待证据。

### 010修复设备前结果（2026-10-17）

真实链接WASM连接生产Worker的重入夹具修复前10秒无终止帧，native trace可见拼接终止消息；延后C调用后，同一夹具65毫秒内收到独立AUTH:ready/AUTH:closed及合法invalid_closed（首HTTP故意拒绝，未发真实账号请求）。ready后microtask取消60毫秒内确认cancelled_closed，未导入/发送请求。直接C导入/导出/清空关闭与成功进度回调重入模拟、登录/恢复/错UID/取消/Home/原生未知关闭/三种启动错误共12个相关浏览器案例PASS（19.2秒）；7账号单元、6候选输入门禁、strict/67模块PASS，共25不同相关检查，不累加重跑。原生C输入/四组WASM及私密精确symbol map保持，无SDK重编译声明。

新增测试直接运行本地实际链接的account WASM，生产Worker夹具仅拦截首个auth_begin在HTTP前返回0，并使用合成cookie；不通过模拟C函数掩盖stdio行为。诊断阶段输出过的合成fixture trace只在本地保存，没有读取真实cookies或将原始TV捕获放进源码。008首次登录/009关闭未知仍保留；010待实际TV恢复，未宣称G3或所有关闭故障已修复。

## W01/G3：010已部署，旧会话恢复窗口失效（2026-10-17）

UTC2026-10-17T13:03:52.074085+00:00，BiliNet001.Probe / 0.0.10 / account-readonly-manual安装/启动明确PASS；source `daa6ce0615c4a901e3cd8b87efff1b41947903218d4e12e5ebeaafdd499f7d35`，signed SHA-256 `3de86ffdddd0d0f47de8e3d46aec50535d9405beba7cac5da18c35924a08b55d`。准确源码ZIP/签名包/部署日志私密保留，主059未升级，账号C/WASM与008/009一致。本地25项相关检查与strict有效，不把TV尚未运行的恢复路径标通过。

UTC2026-10-17T13:04:01.925184+00:00精确配对报告为account.saved_session_expired_startup UNVERIFIED，GET PASS/监听关闭true；说明固定保护保存项可读，但有效期在允许30分钟窗口外，启动时未进入账号网络Worker。该分支不能证明重入修复的TV效果，也不能反推008/009的Worker关闭未知是过期导致。报告另存device-network010-g3-expired-startup-report.json。首次008登录、原始进度0、关闭未知及本次超窗口各证据分开。

因此只请求用户一次必要的新登录：先清除本探针固定测试slot并看到local_session_deleted，再在010扫码、核对身份/指定视频进度。待用户看到结果后立即采集，明确等待自动退出后再重开取同UID恢复报告；不重复G1/G2或请求更多视频。真实云进度写入仍未授权、未执行；G3剩恢复、一次可审阅且批准后的写回/回读及最终固定slot删除，G4/G5/G6不变。

## W01/G3：010真实重开恢复通过（2026-10-17）

用户确认旧测试slot清除后、新扫码、本人身份与指定视频进度显示均按预期；旧slot删除为USER OBSERVATION PASS，没有将未采集的旧删除报告伪称DEVICE证据。UTC2026-10-17T13:08:41.140155+00:00收到readonly_saved_closed PASS，等待自动退出后启动同一010，UTC13:09:07.557567+00:00收到restore_readonly_closed PASS；两份报告精确匹配source `daa6ce0615c4a901e3cd8b87efff1b41947903218d4e12e5ebeaafdd499f7d35` / signed `3de86ffdddd0d0f47de8e3d46aec50535d9405beba7cac5da18c35924a08b55d`，各GET后监听关闭true。后者要求从KeyManager导入凭据、nav完整UID与保存UID相同、固定view/首P和进度读取成功及原生关闭ACK，不能由CLI启动或可见旧身份代替。本次恢复路径DEVICE PASS，008/009关闭未知历史保持。

报告分别归档device-network010-g3-fresh-login-readonly-report.json / -restored-readonly-report.json，用户清除/新登录观察另存；本次反馈未提供新的进度原始数值，不把旧0机械赋给这次读取。010本次新保存项仍用于下一只读预览，未宣称已最终删除。G3最后的一次云进度写入仍未授权、未执行；一次明确批准后的写回/回读及最终清除继续开放。
