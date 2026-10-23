# ADR-022：G3指定视频一次进度写回候选

2026-10-17，W01/G3、F01/F07/F13，已执行一次用户明确批准的固定写回：HTTP200/API0接受、原生关闭确认，云端回读未知；禁止重发。010真实扫码及同UID重开只读恢复已配对通过。以下准备过程保留其历史时点，最新证据见文末；本文不扩大用户授权。

唯一拟议操作为用户指定BV14GHy6bE9n首P（aid117400733288351/cid42548528128、95秒）的云端位置从重新读取的0设置为15秒。若提交前同账号/内容/旧值不一致，拒绝发送；不得将此授权推广到其他内容或互动。固定Web heartbeat路线依据research/2026-10-16-web-login-route.md的一手公开播放器源码，UGC type3/Web dt2，played_time与last_play_progress_time按秒，回读last_play_time按毫秒。realtime/real_played_time为0，不伪造观看时长，不调用点击/播放量等额外统计接口；不借用App身份或固定备用签名材料。精简字段是否为当前服务接受仍待一次获准后的实接口核对。

只读account原生程序保持不含POST；新的独立progress-post程序复用该程序的固定GET、cookie域限制、CA/TLS和关闭逻辑，新增一个固定HTTPS目的地的POST能力，不接收任意URL/正文。WBI从本次本人nav的公开图片字段提取动态32hex名字，由自有有界代码生成参数签名；CSRF只在原生jar中提取，UID/keys/cookies/form不出私密通道或诊断。不得自动重试POST。

预览和回读复用已验收的只读账号Worker。提交前将不含UID/cookie的单次写意图持久化并读回，再开始私密Worker；任何既存意图（包括未知/拒绝/完成）均阻止这次探针再次提交，重开也不重置。实际完成必须有同UID、固定cid及约15000毫秒的回读；HTTP/API成功本身不作为完成。未知结果只读核查，未确认原生关闭时阻止继续使用，不自动重发。最后清除本次固定保护会话；保留不含凭据的单次意图防重复，不能把TTL当物理删除。

界面先给出指定视频、旧值、15秒目标及明确确认按钮；只有用户获知具体操作并明确批准才执行。构建/相关合同、真实HOST TLS、Worker/UI/取消/重复/未知回读和包许可检查先完成，再请求最终授权。当前阶段仅实现/合成验证，不执行真实业务POST。

候选本地结果：13账号/写意图单元、13 HOST真实TLS（原只读8/新增POST5）、18不同浏览器案例及6实际输入门禁共50不同检查PASS。浏览器为先17项整组、完善bootstrap未知关闭后最终6项写回定向，其中5项重叠，不累加重跑。strict/70模块与Samsung六程序链接PASS；主probe/account/validation/https-session四组WASM与010逐字节一致。新progress-post程序使用新建HTTP/1.1连接并禁止复用，单次调用、不跟随重定向，避免对旧连接的POST重发路径。HOST初次好例因fixture Content-Length多写一字节失败，修正fixture后五项通过，未放宽产品代码的传输判定。

写请求整体最多120秒（含前置只读和回读，最多三次回读受同一时限），POST父层90秒，原生单请求8/9秒及关闭ACK5秒保持。异步Worker启动异常不得因Promise拒绝丢失而伪称已关闭；无原生关闭确认显示worker_close_unconfirmed，禁止回读/复用。单次意图普通存储只含schema/BV/15秒/状态，无UID或凭据，任何既存值均阻止再次提交；KeyManager会话需另外明确清除。011将在电视先只读预览；实际业务POST仍未执行、未授权。上述本地/合成成功不代替实际服务器接受、真实写回/回读与最终删除证据。

提交前补齐固定故障分类：原生POST结果的HTTP状态/cURL数字/API登录、拒绝或风控类别经严格合同传到脱敏报告，与回读最终状态分别记录，不保存错误原文/请求地址/UID。未确认原生关闭单独保留，不能写成unknown_closed。最终6项写回UI、6写意图单元及strict复核通过；50不同案例总数不因重跑增长。初版011已只读安装启动，但报告窗口未取到报告，没有执行真实POST；最终诊断修订将保留新source/signed配对后再请求授权。

## W01/G3：011写回候选与真实只读预览（2026-10-17）

只读登录/同UID重开已由010两份报告证明，见上一节。011在独立BiliNet001中加入ADR-022的一次确认能力，主059保持原包。最终011/account-progress-preview-manual实际UTC2026-10-17T13:34:48.757599+00:00安装/启动PASS，source `8ba7f48d667354d41ba7b206e522cf6d5169d815cba95b856e172cd50c82efdd`，signed SHA-256 `593a00c2a91daa25867c377831a6e86750b10294a144c904838b432647d5d183`。初版011 source57fa1fab/signed4abacfd原件另存，最终诊断修订未改C/WASM或写回策略；源码/签名包/部署记录按各自完整hash保存，不覆盖假配对。

UTC2026-10-17T13:35:29.899486+00:00的最终配对报告为progress.preview_ready_no_write UNVERIFIED，HTTP报告PASS/GET后监听关闭true。此固定分支只有同UID/指定单P与95秒读取成功、返回原始进度0、无防重复意图时出现；实际仅GET，没有启动POST Worker，也未创建写意图。这证明最终候选的真机只读预览，不证明真实写回已通过。报告私密归档device-network011-g3-final-readonly-preview-report.json。

50个不同相关检查PASS（13单元、13真实HOST TLS、18不同浏览器、6输入门禁），strict70模块及Samsung六链接/包许可门禁PASS。最终传递固定HTTP/cURL/API类别与实际回读结果，未知关闭单独报告；不存原始错误/UID/地址。真实账号写入仍未执行：已向用户提出具体授权请求——刚才同一账号、BV14GHy6bE9n首P、0→15秒、至多一次POST、只读回查、不自动重发。用户明确同意并在电视确认之前不执行；账号会话最终清除仍待，普通防重复意图不含凭据且保留以阻止再发。G3及W01保持OPEN；G1/G2既有通过不重跑。


## W01/G3：011一次授权写入已接受，回读未知（2026-10-17）

用户明确回复“授权且已确认＋Unverified progress.write_unknown_closed”，授权范围仅为刚才扫码同一账号、BV14GHy6bE9n首P、0→15秒、至多一次POST及只读回查。UTC2026-10-17T13:42:33.796936+00:00采得报告，精确匹配source `8ba7f48d667354d41ba7b206e522cf6d5169d815cba95b856e172cd50c82efdd` / signed `593a00c2a91daa25867c377831a6e86750b10294a144c904838b432647d5d183` / BiliNet001.Probe 0.0.11；固定代码为progress.post_accepted_closed及progress.write_unknown_closed，报告GET后监听关闭true。前者要求真实POST HTTP200/API0和原生关闭ACK，后者表示有限回读没有确认同CID约15000毫秒；不等于服务端没有副作用，也不等于云进度完成。不得重发POST或清除防重复意图。

原始脱敏报告私密另存device-network011-g3-once-write-accepted-readback-unknown-report.json，用户明确授权/观察另存；旧预览和010登录/恢复报告保留。当前只推进只读结果核查：011回读异常被折叠，诊断未区分“成功返回其他数值”和“读取失败”；30分钟本地恢复窗口也可能影响后续读取，采集时间不能反推出POST/回读时刻，不将其认定根因。已只请求结果页是否显示回读数值，无重复写入或重复播放。G3最后的回读确认及本地固定会话删除保持OPEN，G1/G2通过复用，G4–G6范围不变。


### 011未知结果后的本地改进（未部署）

保留电视011结果页和所有精确工件，不为补诊断覆盖当前用户可见结果。回读新增固定分类：目标命中并关闭、其他值并关闭、本地会话过期、读取不可用；本地过期后停止无效重复GET。已存在单次意图时，只读预览可单独记录当前固定CID/约15秒目标观测，但不据此推断是哪次请求造成，也不删除意图或允许新POST。界面明确已锁定、只读核查。未延长30分钟保护窗口、未放宽目标/账号校验，也未执行第二次业务POST。

本地8个写意图/合同单元和7个定向浏览器案例PASS，strict70模块PASS；新增接受后仍零、提交后过期与只读再次观测/重开防重复覆盖。浏览器在仓库外临时副本中运行，正式dist/已安装源码配对没有被测试bundle覆盖；初次临时配置服务路径错误、随后报告异步采集断言抢跑均保留失败日志，修正夹具路径/等待报告后7项通过。最终只读文案修订属于低影响文本，无额外测试计数。未重新编译C/WASM、打包、签名或安装，不把此本地通过记为011真机故障已修复。下一步只等待当前结果页的回读数值/无数值反馈，选择一次必要只读核查，不重发写入。


## W01/G3：012只读核查实际结果与013限定对照（2026-10-17）

用户确认011结果页无回读数值；这意味着没有有效回读，不等于读到了0。012（BiliNet001.Probe，account-progress-reconcile-readonly-manual）UTC2026-10-17T13:58:15.774673+00:00安装/启动PASS，source `64fab7122ecffa40557031196da4ab7eccdb0eb9520b936bcab40c431b7068e1`，signed `4c59a6c865b57a711da74bf8845b3b645e23ca9733f980bffe74e64b9d571aaa`。UTC13:58:38.513027+00:00报告为account.restore_readonly_closed PASS、progress.readonly_other_observed_closed UNVERIFIED，GET后监听关闭true。用户随后反馈0毫秒、未有对应分P历史（原文“上午对应分P历史”，按上下文解释为“尚无”）。本次从既有保护会话完成只读读取，没有重新扫码或第二次POST；本次恢复成功不能把011失败根因归为过期。准确工件及两类报告/用户观察私密保留。

012没有progress-worker.js、progress-post目录及确认写入按钮；只读account WASM/Worker与011逐字节一致。13项只读UI/strict70模块/包与许可门禁通过。保留旧写模式的7项夹具初次因012物理移除Worker而失败；补齐显式历史Worker夹具后7项通过，不向012包重新加入该模块、不扩大写入授权。

已审阅官方公开播放器core.147ce847.js（SHA256 05ff4195f5df34eeb8ed3271b0c9fa09b4f10c651e8762bfad732dacade4235b）使用/x/player/wbi/v2，而现有探针读取/x/player/v2；尚不能从路径差异推定实际根因。013仅准备一次自动同会话对照：GET nav完整UID与保存UID匹配、固定view、旧player/v2，再从本次nav公开WBI图片名生成签名，GET固定aid/cid的player/wbi/v2；后者必须自身login_mid等于保存UID，不能仅凭API0将匿名0当账号进度。所有值/账号资料只在私密Worker及电视显示；报告仅固定两路线目标命中/未命中、身份未确认或传输/API类别。两条GET读取都不命中时保留未知，不自动重发或添加其他业务写入。

新增独立account-readback原生程序仅有固定GET；原account/progress-post源码未改。只读比较候选继续不打包进度POST模块/按钮，保留无凭据的未知意图，最后固定保护slot删除仍待。新方案的构建/部署/设备结果另记，不能把候选准备当作013已验收或G3完成。G1/G2不重复，G4–G6范围保持。


## W01/G3：013双路线回查未命中，最终本地会话删除通过（2026-10-17）

013/BiliNet001.Probe实际UTC2026-10-17T14:08:32.551203+00:00安装/启动PASS，source `cf8dbf060ca365f084b4c679d8ce3d1bc95a977ab88371a950d067f1091e4b19`，signed `11ca7100b494479e05e1fa3681247cddd668027c354ad01549336e6195b3ed9b`。UTC14:08:55.132579+00:00收到account.readback_neither_target_closed及progress.readonly_other_observed_closed，GET后监听关闭true。该分支要求先前nav与保护会话完整UID匹配、固定内容/95秒相同、旧player/v2与动态WBI player/wbi/v2均读取成功且都未命中同CID约15000毫秒；后者自身login_mid也必须与保护UID相同。没有重新扫码、没有第二次业务POST。因此“单纯旧回读接口不对”假设不成立，仍不能把HTTP200/API0当持久化完成。服务端未返回可证明未生效原因的证据，不能猜测已确认是缓存、过期、账号隐私设置、缺设备cookie或缺少某个播放事件。

用户随后点击固定测试会话清除并确认“已清除”。UTC14:11:26.832442+00:00同一source/signed报告保留上述回查并新增account.local_session_deleted PASS，GET后监听关闭true；实现要求remove固定KeyManager alias后getData返回NotFound。此为最终本地测试会话删除DEVICE/USER PASS，不删除云端历史或防重复普通意图。013只读包没有进度POST程序/按钮；19个运行时文件与安装签名包一致，原011写回、012只读零值、013比较/删除及各源码/签名原件分别保留，不能以删除报告覆盖未知结果。

013设备前4 HOST真实TLS、4定向浏览器及strict71模块PASS；Samsung七程序实际链接/许可/包门禁PASS，原account WASM仍为bc5696343d6496a2d109482a738e3fc3847bab8ae052f395b8c4384b54d218c5，新account-readback符号表按实际WASM hash私密归档。观察包打包曾在主原生包重建并行期间被来源校验拒绝，按依赖顺序重建后通过；没有放宽门禁或改变已装包。G3恢复和最终删除已通过，仅云进度提交有效性OPEN；一次授权已使用，禁止自动重发/增加点击统计或伪造观看时长。下一写入方案需先基于真实播放与当前Web流程准备成可审阅候选，再单独取得具体授权，当前阶段继续其他不受影响门槛。

### G4推进边界

用户明确“没有该画质/权限，先跳过”：4K/HDR样本记录为外部条件不足/未验证，保留F19与W01缺口，不购买、不借账号或降级需求。继续直播/1080P相关准备；普通1080P标签不等于高码率，元数据分辨率也不等于实际HDR输出。060候选新增仅只读的AVPlay当前流信息提取，起播实际时间推进后记录有界宽/高/码率/白名单视频及音频codec；不输出原始extra_info、不改变播放/清理/手机控制。健康诊断保留该单条事实，已有FAIL/BLOCKED/未知清理优先。依据Samsung AVPlay API的getCurrentStreamInfo状态与extra_info字段合同，官方文档本身不作为目标TV解码或声画验收证据。

官方来源：https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/avplay-api.html 。060局部单元和包/部署证据另记，未提前宣称G4或最终W01通过。
