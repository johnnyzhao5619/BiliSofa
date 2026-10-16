# 实施状态

日期：2026-10-15。范围：完整单一 v1.0.0、F01–F20、电视内独立运行。

## 当前摘要（优先于下方按版本保留的历史）

2026-10-15文档复核：外部2026-10-14方案为初始化快照，当前范围以PRD/ADR-003为准。评论、回复、点播/直播弹幕只读；不恢复其发布/删除/发送功能。独立电视运行、单一完整v1.0.0/F01–F20目标保持。见[本轮复核](reviews/2026-10-15-status-and-standalone-plan.md)。

- 0.0.31的最终结果：用户确认两次独立尝试均首跳失败并回主页面；匹配报告FAIL avplay.seek_restart_callback_pending、history_f，清理与报告读取通过。该阶段标签不足以判定SDK根因。
- 0.0.30用户已澄清：前两次回跳恢复声画/进度，第三次失败并自动返回；前两次USER PASS，第三次USER FAIL。整体回跳未通过。
- 0.0.32已完成候选实现和250项本地检查；真实自动记录history_se：第一跳SDK成功，第二跳InvalidValuesError（SDK仍PLAYING），整体FAIL。底层错误可能在关闭期间丢失，声画未取得本轮用户验收。
- 0.0.33已修复关闭期间底层错误留存及compact优先级；197本地检查通过，但同包两次实际prepare15秒超时，均未进入seek。
- 0.0.34用户确认实际起播；自动第二跳仍FAIL（history_se/SDK InvalidValuesError），现已完整保留独立native issue_0_28（尚无HTTP响应的上游超时）。
- 0.0.35已签名/安装/启动并核对启动清理报告；262不同本地检查通过。仅对零HTTP响应/零正文的匿名媒体GET超时有界重连（每连接1次/整租期3次/250ms），不重试SDK命令或写操作，不延租。实际history_sss/35秒完成，用户确认声画正常无卡住：单样本USER PASS。无重连记录，重连支路TV仍UNVERIFIED；完整功能未完成。
- 0.0.36已签名/安装/启动，233本轮本地检查及启动清理通过；新增独立的已确认SOAP手机控制候选：单发送端/原始URI绑定、实时状态查询、暂停/继续/seek/Stop及同源重播、遥控器接管/交还、Back/Home清理。合同与联调已实现，官方手机兼容性待新包真实反馈；不得以桌面假后端替代F20通过。见[ADR-009](adr/009-approved-soap-receiver-probe.md)。
- 0.0.36官方Android单样本手机连接及暂停/继续USER PASS；手机暂停后遥控回跳USER FAIL，匹配SDK InvalidValuesError/sh与native206_28，首次观测有界重连排队但恢复未证。0.0.37候选已完成异步seek期间禁止duration读、已校验206范围续读与会话摘要保留，287不同本地检查/真实SDK编译/三类包门禁通过；未提前记真机修复通过。
- 0.0.37已签名/安装/启动，匹配启动/清理报告通过；287不同检查及真实SDK重编译/包门禁PASS。暂停组合修正待用户实测，官方Android连接/暂停继续已通过的0.0.36样本保留，完整F20开放。
- 0.0.37本轮用户确认手机不能投屏、电视也无声画；暂停组合未到达。匹配报告只有approved/control_denied/denied_stale与API started，无真实声画证明。0.0.38修正prepare期间心跳空窗及已批准首次Play握手，补快照/tick/流量诊断，228不同本轮检查及三类包门禁通过；效果待设备验证。
- 当前电视0.0.38已签名/安装/启动，匹配启动/清理报告通过；228不同本轮检查/三类包门禁通过，原生工件与0.0.37逐字节相同。准备阶段心跳/初始幂等握手及新快照/tick/流量诊断已接入，实际连接/声画待新反馈，未提前记修复PASS。
- W01完整门槛仍开放；真实账号/安全网络依赖、PGC/live/F19、三端官方控制与性能未完成。下方早期“待反馈”和历史计数属于对应版本快照，以上最新观察优先。

## 启动核查（初始2026-10-14）

- `git status --short`：原有文档、目录骨架全部 untracked，未发现已有应用源码。
- `git branch --show-current`：main。
- `git rev-parse --verify HEAD`：exit 128，无 HEAD；未为此提交。
- `git remote -v`：空。`rg --files`：27 个非隐藏文件，仅文档/项目元数据。
- 初始文件 hash 清单保存在 ignored `.local/baseline-2026-10-14.json`。已有文件保留。
- macOS arm64；Node v24.21.0、npm 11.19.0、Python 3.12 可用。
- PATH 及常见安装位置未发现 Tizen CLI/SDB/Samsung Emscripten/.NET；未发现常见签名目录，不读取私钥。
- 启动时未连接电视；随后用户明确授权本项目内部探针侧载，开发者模式和签名资源稍后补充。真实账号写操作未获授权。历史 Tessel 授权未作为本项目授权来源。

## W 状态（实现 / 验收分开）

| ID | 实现状态 | 验收状态 | 下一门槛 |
| --- | --- | --- | --- |
| W00 | 文档骨架完成，启动核查完成 | SOURCE PASS | 保留未提交工作 |
| W01 | 0.0.38已部署，228本轮检查通过；起播状态/握手修正待验收 | 单样本三跳/后续35秒声画USER PASS；重连分支/完整W01 UNVERIFIED | 官方手机会话/控制、iPad路线、真实会话/安全网络栈、PGC/live/F19/性能 |
| W02 | 部分候选：contracts/session/write/player/cast/lifecycle/focus/input/偏好存储与有界协议解析 | 143单元/合同及相关HOST/桌面PASS；产品DEVICE UNVERIFIED | W01最终运行时决策；真实NetworkRuntime/保护存储/持久写ledger/性能基线 |
| W03 | F03本地关键词输入候选、F02固定游客热门实读；账号与其余内容未实现 | LOCAL词候选/焦点验证；USER OBSERVATION输入/导航PASS，完整F03 UNVERIFIED | 真实NetworkRuntime/内容接口与账号测试 |
| W04 | 游客首P最低AVC+AAC与电视内媒体桥接入；0.0.19合规备用源/有界大详情/短片租期已部署并验收所测短片 | 部分USER OBSERVATION PASS：所测视频>180秒/自然结束/回卡/重播，0.0.17暂停/seek/Home；整体UNVERIFIED | 大详情特定目标回归、长片/续期、更多样本/权限/PGC/live/F19 |
| W05 | 未实现；评论/回复/弹幕只读，其他互动按原范围 | UNVERIFIED | 阅读/显示与媒体时间轴，保留互动授权 |
| W06 | 候选NVA/SOAP解析、前台发现/TV候选播放及0.0.36单源手机控制链 | Android单样本连接/手机暂停继续USER PASS；暂停遥控seek FAIL；iPhone发现PASS/iPad未见；完整F20 UNVERIFIED | HD发现协议、真实连接/媒体/控制与三端验收 |
| W07 | 未完成 | UNVERIFIED | F01–F20、真机全量门槛 |

## F 映射

| F | 工作包 | 当前实现 | 真机验收 |
| --- | --- | --- | --- |
| F01 | W03 | 未实现 | UNVERIFIED |
| F02 | W03 | 部分候选：固定游客热门读取/摘要/分页；其他推荐/排行/分区未实现 | 0.0.14 TV实读及显示/方向/摘要/分页/Back重入PASS；整体UNVERIFIED |
| F03 | W03 | 部分候选：本地首字母/关键词输入；真实搜索/热搜/历史/分类未实现 | 0.0.11输入/候选/两行第一列导航/选词USER OBSERVATION PASS；真实内容搜索等整体UNVERIFIED |
| F04 | W03 | 未实现：关注动态、UP主页/投稿与图文/视频动态 | UNVERIFIED |
| F05 | W03 | 未实现 | UNVERIFIED |
| F06 | W04 | 部分游客首P/AVPlay/TV内桥与TV确认渐进MP4候选 | 0.0.35单样本三跳/35秒声画USER PASS；其余历史/失败保留，完整媒体UNVERIFIED |
| F07 | W03 | 未实现 | UNVERIFIED |
| F08 | W05 | 未实现 | UNVERIFIED |
| F09 | W05 | 未实现 | UNVERIFIED |
| F10 | W05 | 未实现 | UNVERIFIED |
| F11 | W05 | 未实现 | UNVERIFIED |
| F12 | W02/W05 | 未实现 | UNVERIFIED |
| F13 | W03 | 未实现 | UNVERIFIED |
| F14 | W05 | 未实现 | UNVERIFIED |
| F15 | W05 / F10 | 评论/回复只读，移除发布/编辑/删除；阅读未实现 | UNVERIFIED |
| F16 | W05 / F08/F18 | 弹幕只读，移除发送/编辑；显示未实现 | UNVERIFIED |
| F17 | W04 | 未实现：PGC详情/选集/追番与续播；普通UGC首P不算本项实现 | UNVERIFIED |
| F18 | W04/W05 | 未实现；直播弹幕仅只读，保留其他直播功能 | UNVERIFIED |
| F19 | W04 | 未实现：会员高画质/1080P高码率/4K/HDR选择与能力回退；游客最低AVC+AAC不算本项实现 | UNVERIFIED |
| F20 | W01/W06 | 自身身份发现/SOAP/HTTPS检查、TV确认候选及0.0.36已批准SOAP控制候选；官方手机兼容待验证 | Android单样本连接/手机暂停继续USER PASS，暂停遥控seek FAIL；0.0.35单样本三跳声画PASS；iPhone发现PASS/iPad HD仅AirPlay；完整F20 UNVERIFIED |

不受设备条件影响的合同、状态机、解析与探针构建继续推进。未取得设备证据前，不固定最终 UI 框架、最低引擎、网络或安全存储实现。

## 本次交付边界

- W01：基础包可执行桌面布局/焦点/Worker/WASM/非敏感存储探针。API 符号检查保持 UNVERIFIED。
- W02：账号 request generation、取消与 late response、unknown 写结果锁/查询/快照恢复、分页去重/失效、HTTPS 目标/redirect 策略、PlayerCoordinator、候选 AVPlay adapter、CastSession、生命周期/真实 DOM focus/IME 所有权。
- W05 候选：规范化字幕/弹幕的有界解析与媒体时间窗。尚未接入第三方 XML/protobuf 数据、UI overlay 或实际媒体。
- WriteCoordinator 快照能把 pending/checking 恢复为 unknown，但尚未接入真机 protected storage/原子持久 journal；不能据此称真实写操作具备 crash safety。
- CastSession含控制权/白名单合同，另有独立候选NVA解析和0.0.20发现探针；完整官方投屏连接/播放/控制仍未接通，没有使用官方/第三方客户端身份或keys。
- Native C 已通过 clang 语法检查和官方 Samsung WASM 编译；生成 JS/WASM/CA data 与第三方许可证已整合到独立 unsigned native 探针包。W01已取得guest/synthetic sockets/TLS/cookie engine、手机直连、合成MPD/声画及KeyManager往返证据；真实headers/Set-Cookie/会话、私密保护/持久性和真实媒体/官方发送端仍开放。
- 当前20项基础桌面UI、4项独立观察UI、2项native桌面加载/停止（Chromium156）与47项单元/合同PASS；本轮另重跑15项HOST行为检查。native 在桌面完成 WASM 初始化后网络执行超时，能力结果 FAIL；检查通过不代表 native networking PASS。无模拟器；电视安装/启动与用户反馈见 SIGNING_DEVICE_RECORD，CI 尚未远程运行。
- 无 HEAD/remote，未 commit/push。最终源码/包对应关系在 `dist/DELIVERY.json`，无需伪造 SHA。

外部动作队列：Developer Mode、目标连接及用户自己的 Author 已确认；原第三方项目身份保留并排除使用。用户授权协助更新 Distributor 后，官方 SDK 接口成功生成新 Public Distributor，Author 文件 hash 不变。基础/原生探针均被电视接受安装/启动，旧 Distributor 证书链阻塞已解除。用户反馈两项最终 PASS 已登记；手机直连后继续保护存储/真实媒体/官方发送端等W01门槛。Rosetta/编译/签名已解除；真实账号写入/公开发布继续分开。

Tizen CLI 2.5.25 与更新后的 SDB 4.2.36 可运行。最初默认 Distributor 导致 118/-12；更新签名资源后实际安装/启动成功，部署工件 hash/源码对应及 SDK 恢复依据见 SIGNING_DEVICE_RECORD。sign-probe.py 保持仓库外 staging，安装前拒绝默认 Distributor、失效证书和不匹配资源。

## 0.0.3 短时手机诊断候选

新增固定路径脱敏报告、Worker http operation、集中地址适配器、自动关闭/停止/代次取消；并修复异步地址读取晚到后覆盖新 Worker 的竞态。23 项单元/合同和 3 项主机 HTTP 行为测试已通过；新增桌面交互及 Samsung 编译/包/部署结果在 TEST_REPORT 持续记录。历史 0.0.2 用户 PASS 不归属新版本；手机和媒体/F20 的完整设备项继续开放。

0.0.3 手机入口用户反馈 FAIL；源码发现 Samsung SDK 的 socket F_SETFL 会 abort，已在 0.0.4 候选切换为官方支持的 SOCK_NONBLOCK/accept4 并显示分阶段代码。状态标签只有对应验证或判定纠错后才更新；API 符号/初始化等 UNVERIFIED 不能机械改 PASS。

0.0.4 修复后用户反馈手机访问成功，入站链路 USER OBSERVATION PASS；完整报告尚待自动取证。0.0.5 新增显式内部 build 的 guest/synthetic 单次自动流程；默认 build 仍 manual，停止/新操作/Home 会取消剩余流程，无账号写入或业务 auto-run。

已自动获得 0.0.5 固件/平台/原生最终代码及前台报告 GET 后关闭证据，见 DEVICE_CAPABILITIES。0.0.6 增加 loopback MPD + 合成 H.264/AAC AVPlay 场景，未等同于 UGC/PGC/live/F19/F20 通过。

0.0.6 真机反馈：合成视频可见、无声、重复媒体 bind stage12失败。0.0.7 实现 cooperative Worker stop/原生 fd关闭ACK/串行重入/清理不明阻止重试、音频增益/轨信息/分项asset诊断。完整W01及F06仍开放。

0.0.7 用户实际复测通过：合成声画、暂停/继续、seek5秒、Back后重新进入，未再出现stage12。0.0.8将正常静音/音量读数和初始化进度独立显示，保留能力待验收及原始verdict；Home/冷启动、真实内容/账号和官方三端投屏继续开放。准确工件见SIGNING_DEVICE_RECORD。

0.0.8已实际签名/安装/CLI启动；用户反馈保存/Home/退出重开流程marker0→1，非敏感标记退出重开保持USER OBSERVATION PASS。Home停声/媒体复用细项和断电/电脑关机仍待明确实测，不能由标记或source测试推导。

0.0.9候选新增只处理原创随机合成值的KeyManager save/get/remove探针：专用本次alias、不枚举其他alias、不授予其他App权限，不保存真实账号；5秒deadline、取消/晚回调清理、未知结果禁止新写，清理后getData明确NotFound才可复用。API往返PASS只证明该行为，跨App隔离/加密/重建持久性仍待证明。未添加自Tizen3.0起禁用声明的旧keymanager权限。实际验证与部署随后记录。

0.0.9已实际部署并自动读取source匹配的TV报告：WASM/原生五项/KeyManager合成往返清理PASS，marker1在本次CLI更新后保持。完整W01仍未关闭；Home停声/恢复播放、中文IME/Voice Guide、电脑关机冷启动和真实账号/媒体/官方三端投屏需各自证明。已向用户请求当前Home/中文输入实际反馈；不在等待时升级为PASS。

## 用户调整范围与0.0.9最新反馈（2026-10-14）

依据[ADR-003](adr/003-read-only-comments-danmaku.md)，评论/回复/点播与直播弹幕仅查看。F15/F16保留编号，合并到F10/F08/F18，不再实现对应编辑器、发布/回复/删除评论或弹幕发送。不把范围调整当作PASS；只读功能仍未实现/验收。F03规划首字母输入/联想，完整中文文本编辑不再是W01/F15/F16门槛。点赞、收藏、关注、投币等其他已规划操作保持。

用户明确反馈0.0.9播放中Home停声、回到探针再次播放通过，记USER OBSERVATION PASS；Home期间socket关闭、休眠/冷启动等仍开放。系统中文键盘用户反馈“貌似不支持”，没有取得可用中文输入证据；首字母搜索未实现，不据此判F03通过。

## 0.0.10 首字母关键词输入候选（W01/W02/F03）

新增独立本地词候选Worker、版本/Scope/体积/字符白名单合同、单in-flight+单replacement队列、过期结果拒绝和关闭/Home清理。11个主按钮中的“首字母搜索输入”打开单焦点模态，提供36字母/数字键、8候选/页、最多64词、翻页/退格/清空/使用字母数字/确认关键词；候选确认不执行内容检索。输入不进入诊断、网络或持久存储。

AOSP原始词库固定提交/原始sha与Apache-2.0通知；构建生成64,816词语/首字母对，1,052,146 bytes，本地随包加载，解析在Worker；basic/native签名前同时校验数据和通知hash。无额外平台权限、外部输入服务或第三方IME引擎代码。

只实现F03输入/词语候选层，不是B站热搜/联想/内容查询，不等同完整F03通过；罕见词和实际内容标题联想需要后续真实搜索路线。F15/F16仍只读，不增加评论/弹幕编辑。系统输入探针保留诊断，并纠正Done/Cancel及输入框IME按键处理。TV新键盘/Voice Guide/性能尚待本机测试。

0.0.10已用原Author/Public Distributor实际签名、更新安装并CLI启动，均平台成功；签名包/准确源码配对见SIGNING_DEVICE_RECORD。47项本地检查已通过，新首字母输入TV结果仍待反馈；真实F03内容检索/热搜/历史尚未实现。44个基线文件0缺失，无commit/push/remote或发布。

0.0.10用户复测：首字母输入与你好候选显示通过，其他操作报告通过；候选两行第一列不可达FAIL，方向可达性仍开放。0.0.11修复显式网格导航/区域入口/边界/禁用项/刷新恢复，电视修复结果未验证前不转PASS。F03依然只完成本地关键词输入候选层，真实内容搜索未接入，评论/回复/弹幕只读范围保持。

0.0.11完成49项本地检查并实际签名/安装/启动，修复真实电视第一列反馈的显式导航候选；尚待用户TV回传。无业务接口/权限/账号写入范围变化，F03内容检索与完整W01继续开放。源码/部署工件按SIGNING_DEVICE_RECORD精确对应，不伪造HEAD/远程CI。


## 0.0.11 真机候选导航回归通过（F03/W01/W02）

用户对本轮步骤明确回复“已修复，全部验收通过”：NH后从键盘上移进入首候选你好、向下进入第二行第一项男孩、两行第2项向左返回第1项、选中你好，均记USER OBSERVATION PASS。工件为signed `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe` / source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。已更新该部署清单并仓库外保存脱敏用户观察；保留0.0.10第一列FAIL历史。当前输入回归关闭，真实内容搜索/热搜/历史、Voice Guide和其余W01门槛仍开放。


## 0.0.12 合成 KeyManager 退出重开探针（W01/W02，F01/F13前置）

新增固定专用alias的非秘密值两阶段探针，普通存储只记本探针nonce/启动随机代次，不接收会话/任意alias。先预查alias不存在、先持久记录合成期望再异步写，读回一致后仍UNVERIFIED并要求退出重开；新document才可核查值保持、删除、再次getData明确NotFound及清理journal，全部成功才PASS。同document/Home恢复不算重建。拒绝覆盖已有alias，saveData重名语义未假定；journal≤256字符且严格schema。损坏/存储拒绝/值不符/清理不明阻止错误结论，超时/取消结果未知并阻止同进程新写，晚回调仅清理归属数据。无枚举、跨App授权、实际credentials或新权限。

新增显式BILISOFA_PROBE_AUTORUN=2，仅执行合成持久性→短时报告，不跑真实账号或媒体。首次报告确实GET成功后探针自行退出，开发电脑可CLI重新打开同一工件；第二次启动检查后保持页面。manual为默认，不自行退出。完整保护存储、加密、跨包隔离、断电/电脑关机、升级与回退不由此探针宣称通过。未选择产品PrivateSessionStore或固定最终runtime。

本地实际检查：TypeScript strict/24模块边界PASS；39单元/合同PASS；16桌面UI PASS（新增合成重开/清理/脱敏及自动报告后退出、手动取消）。native加载/停止、打包、签名与电视结果另记。无C/媒体/网络依赖变化，不重复历史HOST socket测试。


## 0.0.12 合成持久性真机双阶段通过

已实际签名/安装/CLI启动synthetic-persistence-report-once 0.0.12：signed SHA-256 `952e914ee70edb16212f37e8857f4f4f0ae6958f55017e8faefd952a5290aa63` / source `57c584c953ba5a2dcbdd138a0ca8a0520674e79524a48306ca287ef3e6346687`。install/run均exit0/平台成功；同Author/Public Distributor。第一份source匹配TV报告为`keymanager.persistence_prepared_exit_reopen_required`，GET后探针调用自身exit；随后CLI重开相同签名包成功，第二份source匹配报告为PASS `keymanager.synthetic_document_restart_read_cleanup_only`。值一致、remove后get明确NotFound、合成journal清除全部核查。两次GET后40322均关闭；客户端均授权开发电脑，未冒充手机。原始日志/签名包/准确源码和两份脱敏报告在仓库外归档。设备固件/平台读数未变化，marker1保持。

本次合计57项本地检查PASS（39单元/合同、16桌面UI、2native桌面加载/停止），1920×1080十二按钮截图已目检，无裁切/overlay，DOM焦点/正常console/交互通过。C/媒体未改且包完整性通过，13项HOST socket历史检查未重跑。读取/清理是本次合成退出重开证据，不证明进程PID更换、断电、升级/回退、加密或跨App隔离，不据此开始保存真实cookies或关闭W01。下一步恢复默认manual工件供人工Voice Guide/独立运行核查，mode/hash另记。


## 0.0.12 manual 人工验收工件

自动双阶段取证后，已恢复默认manual模式并实际同版本更新安装/CLI启动（均exit0/平台成功）：signed SHA-256 `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。manual没有自动写/报告/退出；运行界面保留首字母导航修复及独立存储重开按钮。准确源码归档与私密包保留，新的部署清单为device-native012-manual-deployment.json，自动测试原清单/两报告均另存不覆盖。自动模式的持久性PASS属于前一配对；手动工件的Voice Guide/电脑关机冷启动仍UNVERIFIED，已请求实际Voice Guide反馈。后续文档重建的unsigned/source与此已安装快照区别记录。


待外部实际反馈：0.0.12 manual的Voice Guide与焦点/Back已给出具体步骤，未反馈维持UNVERIFIED。电脑关机冷启动、真实账号/内容/媒体权益、三端官方发送端仍分别开放。期间已整理F20一手资料边界和逐平台证据矩阵（F20_PROTOCOL_EVIDENCE）；未创建虚假接收端或默认网关。跨包安全存储探针/最终网络依赖评估仍可继续准备；尚无据选择产品私密存储或导入真实凭据。


## 0.0.12 Voice Guide / Back 真机反馈

用户对主页面和NH候选间方向移动的Voice Guide检查明确反馈“朗读与焦点一致，Back 正常”，记USER OBSERVATION PASS；对应manual signed `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。已更新部署与仓库外脱敏观察。关闭该探针主界面/首字母候选的朗读与Back项，不扩展为尚未实现产品页面的全量无障碍验收。冷启动/电脑关机、保护存储隔离、真实内容与官方三端投屏仍开放。


## 0.0.13 跨包只读合成观察候选（W01/W02、F01/F13前置）

新增开发专用第二包BiliIsola1.Probe（package BiliIsola1），与主探针BiliProbe1.Probe及最终单App产品身份分离。只尝试getData读取主探针固定合成alias，带明确packageId；不枚举、save/remove别包数据、setPermission或输出返回值。运行时先核对自身appInfo.id，不符则不读。NotFound/SecurityError只作UNVERIFIED观察，其余错误不能冒充隔离；意外读成功明确FAIL。

主探针自动持久性模式新增运行身份核对。三阶段要求主包先save/read确认、独立观察包不可读、主包再启动确认同一合成期望仍在并删除/确认NotFound。离线工具核对三份报告source/签名包/实际身份代码/automation/型号固件/严格先后时间及一小时窗口；缺一项不输出PASS。实验限定相同Author的不同包单次合成读取，不能扩展为所有威胁下的保护存储/加密/真实会话验收。

签名/验证/collector增加显式isolation变体，构建输出独立WGT，保留原Author与Public Distributor且无新权限/依赖；所有网络仍在Worker。未变更C/媒体，helper复用已验证native短时报告服务，GET后退出供主包再启动。别包观察的签名/报告路径独立，公开日志不含alias返回值、LAN地址或凭据。临时观察包不进入日常运行依赖。

桌面新增测试发现导出文本Back原先硬编码返回ime，独立观察包没有ime时落到首按钮。改为本地data-return-focus-id，输入框仍回ime，导出回export；主包/观察包均覆盖Back→退出弹窗→取消恢复调用点，未新增页面键监听。首轮观察UI 2通过/1失败，修复后4项通过；保留失败记录，未把fixture提升为真机。

已实际TypeScript strict/26模块边界PASS，42单元/合同PASS，16主包桌面UI及4观察UI PASS；1920×1080观察布局/导出已目检，无裁切/overlay，单焦点/正常console/脱敏通过。native加载停止及真正签名/三阶段TV结果另记。


## 0.0.13 跨包合成读取隔离真机通过

主包signed SHA-256 `f356bc696920f9729acc8f75383d690c9ed6c0ccde2a73d9b521eac683d07ef1`、观察包signed `0d8e4117804ac756ec17d1d026f8193386122b8188c4fef8f5343eb6f61e6794`，共同source `7ebe69086b15d726d03a8fdb8faef5ba673c5d992d4575d9f5ba42a3110d0997`，两包均使用原Author/Public Distributor、install/run exit0/平台成功。before→observer→after时间2026-10-15 00:00:09→00:00:36→00:00:52 UTC（本地2026-10-14）。主包自身身份确认后保存/读回；观察包实际身份BiliIsola1.Probe确认，带packageId查询固定合成项返回NotFound；主包再CLI启动，读回同一journal期望、删除/明确NotFound及journal清除PASS。三次source/工件/固件/平台/身份/顺序均匹配，GET后监听全部关闭。开发电脑client身份明确，不冒充手机。

离线核对输出DEVICE REPORT PASS `keymanager.same_author_different_package_synthetic_read_isolation_only`，ISOLATION_RESULT.json与三报告仓库外保留。三报告不齐时工具曾实际exit1/UNVERIFIED，补齐后exit0/PASS。此结论只覆盖相同Author不同包固定合成项读取，不代表加密、root/篡改保护、任意其他App、真实多账号、断电或原子更新通过，仍不保存真实cookies。

本轮64项本地检查PASS：42单元/合同、16主包桌面UI、4观察UI、2native加载/停止。最初观察UI Back恢复一项FAIL已修复并回归，未隐藏；C/媒体未改且完整性核对，13项历史HOST socket不重复。44个启动基线文件0缺失，无HEAD/remote、未commit/push/公开发布。自动工件准确源码/私密包与原始安装日志均已归档。

临时观察包清理首轮exit1：按CLI帮助的package ID传BiliIsola1，返回package not exist，无App被删除。复核Samsung TV官方CLI文档后改传完整application ID BiliIsola1.Probe，实际exit0 / uninstall completed。仅移除本次新装观察包，主探针/已有App/证书保留；首轮失败与修正日志及两份清单均在仓库外。


## 0.0.13 当前manual工件与待人工独立运行

跨包实验后已恢复默认manual并实际安装/CLI启动，均exit0/平台成功：signed SHA-256 `5f6d72988c2c078fd603eca5295832895a323d029cebc3797f17568e125e0818` / source `7abca084fc175f14f1ec99b94b2aaaeb8383cb0be21444a868b0de657f9a64d8`。精确源码/包仓库外归档；device-native013-manual-deployment.json及dist/DEVICE_DEPLOYMENT.json记录当前工件。没有自动写入/报告/退出；临时观察包已成功卸载。历史三报告/隔离PASS仍只对应7ebe6908…自动配对，未归到本manual新hash。

已给用户具体电脑关机/电视正常重启（开机标志）→手动启动→合成存储读回PASS→本地MPD声画的步骤，等待USER OBSERVATION，不把CLI重开当冷启动。用户测试期间不更新电视上的包。声画/首字母/Voice Guide的历史通过仍按原版本记录；真实账号/完整搜索/PGC/live/F19及官方三端F20、最终网络依赖和持久写ledger等仍开放。后续只因本段文档重建的unsigned/source另有hash，不宣称已安装。


## 0.0.13 电脑关机后的电视正常重启/存储/声画通过

用户对已列步骤明确回复“全部通过，请继续”：合成KeyManager准备后退出，开发电脑关机，电视正常重启并有开机标志，再独立启动主探针、合成值读回/清理PASS、电视内MPD绿色渐变与声音正常，记USER OBSERVATION PASS。对应manual signed `5f6d72988c2c078fd603eca5295832895a323d029cebc3797f17568e125e0818` / source `7abca084fc175f14f1ec99b94b2aaaeb8383cb0be21444a868b0de657f9a64d8`。脱敏反馈仓库外保存，当前部署清单已更新。此项证明所测探针流程在该条件下独立运行；不扩大为真实登录/内容/互动/F20全产品验收，不将正常重启推断为拔电/写中断原子性或全部升级回退通过。


## 0.0.14 游客热门真实读取候选（W01/W02/W03/F02）

固定无账号GET `https://api.bilibili.com/x/web-interface/popular?ps=4&pn=1`，HOST实测curl exit0 / HTTP200 / 6035bytes / API code0 / 4条，正文/headers在仓库外，公开只记录结构/计数。此为2026-10-14本地时区一手端点观察，不是官方稳定接口承诺或TV证据；历史HOST search HTTP412继续单独保留。未借用官方客户端appkey/身份、浏览器cookie或账号。

新增原创原生guest-popular入口：page1–10、固定host/path/ps4，无调用方URL/headers/cookies；TLS peer/host+固定CA保持开启，redirect/proxy禁用，新cURL句柄无cookie engine/共享jar；8秒总超时/4秒连接，正文128KiB、headers16KiB。CURL句柄/headers/global清理后才发固定GUEST:closed事件，Worker经导出getter读取有界WASM内存并UTF-8/JSON解析，原始正文/头不进stdout/postMessage/诊断。原生page再次核查。新header加入所有native源hash检查，Samsung SDK已实际重编译，四个getter与HEAPU8导出确认。

契约只含guest scope/page与最多4条规范化BV/title/owner/durationSec/views；4KiB Worker消息、严格字段与状态/code一致性，HTTP/API/解析/传输错误不混作空结果。取消先拒绝旧结果，等待关闭帧才启用替换Worker；20秒请求deadline、12秒清理期限，无确认则阻止复用/要求重开，不伪造关闭。

新增只读“读取游客热门”模态：2×2摘要、分页/重读/空态/错误/返回、显式方向邻居、选择摘要、Back恢复调用点/Home取消晚结果。外部标题仅textContent；诊断只输出固定状态和条数。没有内容播放入口、个性化/排行榜/分区/登录或热搜；F02整体和最终NetworkRuntime/安全网络依赖继续开放。默认build仍manual，显式BILISOFA_PROBE_AUTORUN=4仅一次guest热门→短时report，Back/手动操作/Home取消剩余自动步骤，不执行账号写入。

实际检查截至本段：strict/30模块边界PASS，47单元/合同PASS，20基础桌面UI PASS；HOST HTTP6、media3、stop4与guest原生边界2全部PASS。两张1920×1080桌面截图已目检，主屏/热门页无裁切或overlay、单DOM焦点/安全文本/正常console/交互通过；桌面匿名fixtures不是TV数据。native桌面加载/停止、观察UI、正式包完整性及TV结果随后记录。源码中首次strict因optional字段赋undefined不符报错，已改为显式union；不把当时命令末尾测试exit0当作静态检查通过，修复后独立check exit0。


## 0.0.14 游客热门真实TV读取通过

显式guest-popular-report-once实际签名/安装/CLI启动，均exit0/平台成功；原Author/Public Distributor，signed SHA-256 `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`。collector exit0，TV报告source匹配，`guest.popular_http200_api0_items4` PASS；即电视内原生HTTPS实际取得HTTP200/API0并成功规范化4条游客热门。固件/平台读数同前、marker1保持；授权开发电脑读取固定/report，GET后端口关闭，客户端非手机。精确源码/签名包/原始日志与脱敏报告在仓库外归档。没有把title/UP主/BV/原始正文/headers送入诊断。

本轮88项本地检查PASS：47单元/合同、20主包UI、4观察UI、2native桌面加载/停止、HOST HTTP6/media3/stop4/guest原生参数及内存2。strict/30模块边界与C syntax另外通过，Samsung重编译成功，basic/native/isolation三unsigned完整性通过。桌面native网络超时仍是既有桌面限制，不改变TV实读结论。44基线0缺失，无HEAD/remote、未commit/push/发布。新包的合成声画/Voice Guide/冷启动未从0.0.13直接继承为新实测；其原工件用户通过记录保留。

当前电视停在0.0.14真实游客热门页，已准备人工检查4卡可见/方向选摘要/下一页/Back重入；未回传前popularUiDeviceAcceptance保持UNVERIFIED。该自动工件首开只读一次guest并短时报告，不自动写账号；默认build仍manual。后续仅因文档更新重建的unsigned/source另有hash，不伪装为当前已安装工件。F02仅游客热门读取部分有TV证据，个性化/排行榜/分区与内容播放、F03真实检索、账号/媒体权益/官方三端投屏及完整W01/v1.0.0继续开放。


## 0.0.14 游客热门TV交互通过

用户对四张真实卡片标题/UP主、方向确认选卡摘要、下一页更新内容、Back回主页面再进入明确反馈“全部验证通过，请继续”，记USER OBSERVATION PASS。准确工件为signed `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`，guest-popular-report-once模式。脱敏观察/部署清单已更新。F02热门读取/摘要/分页有TV交互证据；其他推荐/排行/分区及实际内容播放不由本次反馈宣称完成。


## 0.0.15 游客首P播放源检查候选（W01/W03/W04/F04/F06）

日期：2026-10-15（用户本地时区）。新增固定guest-view/playurl GET，详情绑定同BV/首P的安全整数CID→字符串；仅普通公开vupload，拒绝已知pay/ugc_pay/互动/preview/DRM/付费充电等标记。qn16只选唯一AVC id16与AAC id30216，校验时长、mime/codec/尺寸/带宽/SegmentBase的相邻有界范围；不从其他返回track推定账号权益。播放签名URL只留Worker瞬时变量，验证HTTPS/无userinfo/443/bilivideo.com真实子域/m4s/唯一deadline及1分钟–24小时有效期；未知备份域名不自动放行。

原生边界再次核查BV/CID/CDN/有效期，固定规范公开视频页Referer，不借用官方客户端身份/keys。两轨分别只GET bytes0–511，16KiB头/512bytes正文/TLS验证/redirect与proxy关闭/无cookie；必须206、精确Content-Range 0–511及ftyp，CURL完全清理后才固定GUEST:closed。多阶段Worker逐次等待关闭再调下一次main，阶段间处理stop。4KiB IPC仅规范化摘要/固定code，不传CID/URL/signature/原始JSON/header；父适配器取消后拒绝晚结果，等确认再换Worker，无确认阻止复用。原热门与新入口共用ScopedGuestWorker管理该所有权。

热门选卡后可按方向到“检查游客播放源”，成功显示首P摘要；错误保持返回入口，Back/Home取消所属读取。显式autorun=5只读一次热门第一条及播放源/小范围，再短时report；没有真实媒体自动播放或账号写。默认build=manual。本步尚未新增40324监听、WARP/CSP或接通真实AVPlay；电视内媒体桥后续按ADR-004实现，当前F06真实声画继续UNVERIFIED。

strict/35模块边界、53单元/合同、21主包桌面UI、HOST guest边界4已实际通过；新UI用实际Worker配合匿名native shim覆盖四阶段、源动作方向/Back、URL不进DOM，不能视作真实TV/API证据。已有HOST HTTP/media/stop、native桌面和观察UI回归及签名/TV结果随后记录。首次strict因共享类抽取的parseQ/parseR重命名未完成报错，已修正并独立重跑通过。第三方旧TLS依赖仅用于W01探针，仍未接入credentials。


## 0.0.15 真实TV游客源检查通过

source `e76620edb780788e52c31310906d695dc413238c30afbdb628350e3b513d3e24` / signed `54522f6e0614c4492328ff1f58e87cb27b5a713da4b76a3da3d84ffbefd982ae`，guest-video-source-report-once。首次安装60秒、重试40秒均超时；SDB devices曾保留device行，但capability查询超时，原地址connect失败。用户确认电视开机/IP未变；TCP26101可达且路由en0，CLI version正常。确认无其他已列设备后只重启本机SDB服务，重连成功；未改证书/卸载App/重启电视。随后同包install/run exit0且平台成功。准确源码快照/签名包/失败与恢复日志私密归档，不抹除失败历史。

collector exit0，source匹配，U800FD / T-KSU2EFAKUC-0090-1300.9 / Tizen9.0 / marker1；guest热门HTTP200/API0/4条及 `ugc.source_ranges_ok` 均DEVICE REPORT PASS：同一公开首P的详情/播放计划符合约束，视频与音频各512bytes、206/精确Content-Range/ftyp通过。开发电脑读取报告后listenerClosedAfterGet=true；不是手机或真实AVPlay声画验收。未请求账号写入。新的播放源动作TV方向/Voice Guide尚未反馈，F04/F06全量与媒体桥继续UNVERIFIED。


## 0.0.16 电视内真实媒体桥候选（W01/W04/F06）

新增原创probe-bridge.h，经cURL multi、4个64KiB缓冲与pause/resume推进；每次随机token、固定loopback40324、仅owned manifest/video/audio路径。原生另校验两条HTTPS CDN/BV/过期与规范数值metadata，自行生成MPD，SegmentBase/init范围对齐。GET/HEAD/单Range≤2MiB，open/过大end截至上限，4KiB请求/16KiB上游headers/4并发/512连接/20秒客户端/15秒上游/min(180秒,签名期限减5秒)租期；TLS peer/host/CA保持，redirect/proxy/cookies关闭，未知编码/不匹配长度/非206范围不转成成功媒体。只新增显式loopback WARP/CSP，无权限等级扩大。

ready IPC只含摘要和本次local lease URL，不含外部CDN签名；Ready不等于关闭。共享父Worker在Ready后保持运行，Back/Home/错误关闭播放器并等待native释放cURL/multi/fd再ACK；失败17/abort不冒充closed，阻止复用。界面选卡后新增明确“播放游客360P · 首P”，默认及自动取证模式均不自动播放真实内容；Back恢复同页同卡，Home停声且不自动续播。本包最长3分钟是内部探针预算，不缩减完整F06需求，完整选P/画质/PGC/live/F19继续开放。

目前strict/36模块边界、56单元/合同、23主包桌面UI已实际PASS。实际Worker+匿名native shim+模拟AVPlay覆盖四阶段→Ready→显式播放、pause/seek、Back选择保持、再次播放、Home清理及signed URL不入DOM。HOST桥验证有真实socket/multi与匿名HTTP上游，单Range逐字节、2MiB背压完整性、manifest仅owned URL、cookie/header隔离、未知路径/token/POST/多Range拒绝、上游忽略范围失败、partial请求stop与关闭错误无假ACK；不是TV播放证据。HTTP fixture guard仅测试编译定义，Samsung构建不定义。SDK最终重编译/其余回归、签名/部署/实际声画结果随后追加。


0.0.16打包前补充：56单元/合同、23主包UI、2native桌面加载/停止、4观察UI、HOST HTTP6/media3/stop4/guest4/bridge8共110项检查PASS；strict/36模块边界/C syntax、Samsung SDK实际重编译和三unsigned完整性另外通过。桥新增负向验证上游Content-Length/Content-Encoding不匹配时502，关闭错误没有成功ACK。实际Worker+模拟播放器另覆盖prepare失败返回原卡并显示ugc错误、再次明确播放与Home停止。1920×1080的4卡/选卡/两动作截图已目检，无裁切；它是匿名桌面fixture，不是TV画面。W01 runtime决策/真实声画/Voice Guide新入口/长期运行/F20继续开放。


## 0.0.16目标TV部分真实播放证据与首播问题

实际installed/run均exit0/平台成功，guest-video-source-report-once；source `8ee04fda0300e20e098f2cbf60107e3fb8171342c9048223c63f1a9e6371919a` / signed `e237999b2da18c8568f31b169e2f961bd921bad8ce7ee8db65eeefae26c23e09`。精确源码/签名包/部署日志在仓库外保留。自动/report两次未取得，不标report PASS；SDB能力查询仍响应，debug尝试未取得调试入口；不凭空断言启动失败或源hash缓存错误。

用户反馈游客热门可见、点击真实视频可播放；首次播放失败，手动检查游客播放源后可播。只记画面USER OBSERVATION PASS与首播USER OBSERVED FAILURE，声音、暂停/seek/Back/Home、跨2MiB窗口连续播放尚未确认。用户关于地址动态刷新的推测保留为推测；实现每次播放本就重取详情/playurl并校验两轨，不据此断言根因。当前可播放工件保留，不伪装为完整F06通过。已请求主页面开启短时诊断以提取失败代码。

后续0.0.17候选增加有界原生事实进度：manifest/video/audio首次完整传输与首个HTTP/cURL问题代码，不含URL/headers；ready后父Worker最多接8条进度，关闭仍需独立ACK。另收紧两轨无Range GET为400、Range unit按大小写不敏感处理，避免主动发送未请求的206。新工件另配hash，不覆盖0.0.16观察。修改是协议/诊断改进，尚未宣称修复首播。


0.0.17诊断候选继续本地准备：对Ready后的manifest及两轨首次完整范围响应、首个HTTP/cURL问题发固定有界事实，不把这些进度标为声画PASS；HEAD不记正文传输。collector保留被拒source的已脱敏报告于私密目录，并优先使用实际部署清单核对expected source，避免“最新已签名”和“当前已安装”不同工件混淆。0.0.16当前仍保留在电视，等待用户开启诊断；0.0.17未安装时绝不继承0.0.16画面结论。所有44个基线文件仍存在，未commit/push/发布。


## 0.0.16手动报告已读取；0.0.17有界重新获取

用户开启诊断后collector exit0，source/signed准确匹配0.0.16：`ugc.playurl_invalid_response`（首次未通过播放数据解析/校验）、后续`ugc.source_ranges_ok`、两次`avplay.tracks_video1_audio1`及两次`ugc.native_closed_confirmed`。USER OBSERVATION画面可播放，与DEVICE REPORT轨道读数/原生清理分开成立；音频轨存在不等于用户听到声音。报告经开发电脑读取、监听关闭true；先前自动报告未取得的历史保留。现有证据定位到playurl数据校验，未定位具体字段，不能归因为签名过期、CDN或电视启动失败。

0.0.17针对已证实失败点：只在真实播放的playurl校验失败（或源过期/时长不一致）且原生读取已经关闭后，750ms退避，最多一次重新读取view→playurl→两轨范围，仍按原权益/TLS/域名/codec/范围规则校验。API业务拒绝/付费/互动/未知协议不以自动重试绕过；第二次失败显示FAIL与具体阶段，Back可取消退避，不自动重播已开始的内容。每次播放使用新状态，不要求用户先点检查。过期来源与时长不一致单列code，但不把此次根因猜作其中一种。桥Ready前仍预留签名有效期；真实媒体最长3分钟仅为探针限制。诊断八条保留最近失败（或一次重新获取）与最近清理事实，避免后续进度挤掉根因。

桌面实际Worker+匿名native shim已验证“首个playurl异常→一次重新读取→直接播放”，重复异常只重新获取一次后失败，以及退避时取消，未以宽松解析伪造成功。0.0.17设备结果待实际部署/反馈，不继承0.0.16画面。无账号写入，未更换Author/profile或引入外部服务。


## 0.0.17已签名安装，直接首播验收待用户

manual，source `dab113be9bbeb2a8fb0f1eed6f31a8a9e243b9334e3e52ef47b9274be2aeffe1` / signed `c37add0baf461495dc006ae9e1d7b253b2337a163acc7020871fb77835acfc71`，install/run exit0且平台成功；未自动播放真实内容。原Author/Public Distributor，准确source ZIP/manifest/DELIVERY与signed WGT均私密保存；部署清单已更新，collector expected优先绑定该真实部署而非下一份待部署签名。0.0.16可播放工件及报告完整保留。

当前本地累计113项PASS：57单元/合同、25主包UI、2native桌面加载/停止、4观察UI、HOST HTTP6/media3/stop4/guest4/bridge8；strict/37模块边界、C syntax、Samsung SDK实际编译、三unsigned完整性与签名预检另外通过。没有远程CI结果或commit。已请用户不点预检直接播放、连续90秒声画、pause/seek/Back同卡与重播/Home，并在失败时回传ugc代码。未反馈前firstPlaybackRecovery/mediaPlayback均UNVERIFIED，不继承0.0.16画面或0.0.13合成声画结论。


## 0.0.17 用户声画/控制反馈与未解决首播（W01/W04/F06）

2026-10-15，准确已安装manual工件source `dab113be9bbeb2a8fb0f1eed6f31a8a9e243b9334e3e52ef47b9274be2aeffe1` / signed `c37add0baf461495dc006ae9e1d7b253b2337a163acc7020871fb77835acfc71`。用户反馈部分视频第一次加载仍无法播放，换另一个视频可播放超过100秒；声音、暂停/继续、seek、Home均测试通过。分别记USER OBSERVATION：可播放样本连续>100秒声画及上述控制PASS；全部样本直接首播FAIL。Back同卡/再次播放未单独确认，保持UNVERIFIED。尚未取得0.0.17匹配报告或具体失败代码，不把0.0.16的playurl_invalid_response直接归到本次失败。

显示总时长8:56是源媒体时长；当前桥最长180秒是内部探针租期。用户只报告>100秒，未证实到达180秒限制，也未反馈完整播完，因此完整时长播放UNVERIFIED。该限制不改变完整F06要求。现有可播放工件保留，继续采集失败事实并检查公开接口形状，不以延长重试或放松权益/TLS/域名校验推定修复。


## 0.0.18 同轨道合规备用源候选（W01/W04/F06）

0.0.17手动报告已通过collector读取，source/signed匹配原已部署dab113be…/c37add0b…，HTTP GET后监听关闭。报告包含`ugc.playurl_invalid_response` FAIL、一次有界重取、manifest/video/audio范围传输进度、`avplay.tracks_video1_audio1`及`ugc.native_closed_confirmed` PASS。这定位到播放计划校验，仍未取到具体失败字段或用户所选内容；不把HOST样本直接当作同一TV内容。首次collector未收到，用户随后开启报告后收取成功，失败尝试不抹除。

HOST当前固定匿名游客接口读取两页共8样本：7条取得可解析详情/playurl；旧解析器5通过、2因首选CDN不在allowlist而拒绝，第8条未取得完整详情（旧归类为API不可用；0.0.19复核为128KiB抓取截断）。两条的首选轨道之一为未放行CDN，但同一轨道backupUrl中有符合现有bilivideo.com策略的签名URL。候选解析器对同一份缓存响应7/7通过，其中2条使用备用源；这两条的video/audio各GET bytes0–511共4次，curl exit0、HTTP206、精确Content-Range、512bytes与ftyp均通过。正文、内容标识/签名地址与headers仅保存在仓库外私密附件，不进入源码、IPC、公开诊断。HOST不是TV验收或接口稳定性承诺。

只从同一已通过游客权益/codec/时长/SegmentBase校验的轨道选择primary或最多4个backup；每条地址均按原HTTPS、bilivideo.com真实子域、无身份/非标准端口、m4s、唯一deadline/有效期规则验证，签名字节保持原样。未通过的地址不发请求，不扩大native目的地或WARP/CSP，不切换未知域名、不重写协议/签名、不增加重试次数。无可用地址固定`ugc.playurl_cdn_unavailable`，不自动重试；过期仍按既有一次重取规则。Worker仅发不含地址的`ugc.source_backup_selected`事实；summary不带候选表。两轨仍分别512bytes范围取证后才启动桥。0.0.18保持manual与180秒内部租期；未修复完整F06时长/画质等未实现范围。


0.0.18打包前验证：本轮实际执行strict/37模块边界PASS，59单元/合同PASS、27主包桌面UI PASS、2真实打包native桌面加载/取消PASS，共88项本地行为检查。新增行为覆盖同轨备用源双轨范围/bridge选择、全部不合规候选在任何CDN请求前失败、原重取上限/退避取消与Back/Home回归。匿名native shim/模拟AVPlay不等于TV。原生C六文件hash与已编译Samsung SDK manifest一致，本轮复用已验证产物，未声称重新编译或重跑原生HOST全部测试。三unsigned完整性通过，准确签名/部署记录随后追加。44个初始文件0缺失；main无HEAD/remote，未commit/push/发布。


## 0.0.18 已部署，备用源TV回归待反馈

manual；source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。安装与CLI启动均exit0且平台成功，原Author/Public Distributor未变，collector expected已切换真实部署清单。精确source ZIP/manifest/DELIVERY在仓库外deployed-source归档，0.0.16/0.0.17签名包、原始日志和匹配报告保留。未自动播放真实内容，未执行账号写入。

已请求优先重试原失败视频及另外两条、直接首播/90秒声画，之后开启诊断。反馈前0.0.18 firstPlaybackRecovery与mediaPlayback均UNVERIFIED，不能继承0.0.17通过样本或HOST7条计划/4次小范围结果。0.0.17部分首播失败仍为开放问题；本轮88项本地检查通过是对应层证据。完整时长、完整F06/W01及单一v1.0.0仍未完成。部署后文档补记与已安装源码快照区分；后续unsigned重建不伪装为已部署。


## 0.0.18 首播/177秒通过，另有详情传输失败（W01/W04/F06）

2026-10-15用户反馈首播正常、连续177秒声画（源总时长4:24），记本次样本USER OBSERVATION PASS。准确manual source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。当前180秒桥租期与177秒反馈接近，但没有用户说明实际停止原因，不将其推断为完整播完或具体停止原因。仅明确一个样本，不推定另外两条全部通过或特定失败内容已回归。

collector exit0且source匹配、GET后监听关闭true。报告包含manifest/video/audio首次范围正文传输、avplay.tracks_video1_audio1、两次ugc.native_closed_confirmed，同时保留独立的FAIL `ugc.view_transport_23`。此次报告未含source_backup_selected，不能声称该播放一定走过备用源，也不能把另一条详情读取失败标为已解决。详情阶段curl23是本地写回调/接收处理失败类别，尚未区分正文超限、header超限或其他情况；代码会主动中止超限响应。继续用固定非敏感原因码收窄，不打印body/headers/URL，不以无界扩容或盲目重试掩盖失败。W01/F06全量及完整4:24播放仍开放。


## 0.0.19 有界大详情与短视频完整播放候选（W01/W04/F06）

复核0.0.18 HOST第8条私密抓取：旧文件恰好131072bytes、JSON被截断；此前“详情API不可用”的归类不准确。固定原BV以最多1MiB观察预算重新GET，curl exit0/HTTP200/API0，完整169738bytes、一条page、包含合集metadata；新版parser可规范化为6字段详情。没有证据证明它就是TV失败的同一内容；0.0.18 `ugc.view_transport_23`的精确原因仍未回传。curl官方将23定义为接收数据写入/写回调错误；当前主动限额回调也会产生此码，不能当成解码/账号错误。参考[libcurl错误码](https://curl.se/libcurl/c/libcurl-errors.html)及[WRITEFUNCTION](https://curl.se/libcurl/c/CURLOPT_WRITEFUNCTION.html)，2026-10-15核查，未使用旧SDK不支持的新错误返回常量。

原生只将guest-view正文预算提升至512KiB；popular/playurl仍128KiB，两轨前置范围仍512bytes、headers仍16KiB。C固定最大静态缓冲512KiB，TS入口和Worker读取分别匹配路由预算，规范化后才进4KiB IPC，附加合集正文/内容ID/URL不进入诊断。C getter只返回固定拒绝原因1正文超限、2头超限、3范围头无效；curl63也明确归正文超限。Worker将其变为stage_response_too_large/headers_too_large/range_invalid，其他传输码保持；不解析部分正文，不重试超限或放宽TLS/目的地/权益。

内部桥租期从固定180秒改为min(max(180秒,本次媒体时长+60秒),900秒,两轨签名期限各减5秒)；用于把已知4:24/8:56短视频播完。父Worker deadline为17.5分钟，覆盖最长15分钟租期与有界源获取；Back/Home/完成/错误仍立刻关AVPlay并清理native后ACK。4客户端×64KiB、2MiB单Range、512连接、20秒客户端/15秒上游及32MiB WASM预算未变，无无限续期/后台播放。UI显示实际播放时间/源总时长和最长15分钟；暂停也计租期。不宣称完整F06、长片/URL更新/两小时耐久或全产品范围已完成。版本0.0.19仍manual，无真实内容自动播放、账号写入或新增权限。


0.0.19显示回归：桌面截图发现媒体HUD与主探针背景文字重叠。新增media-active显示状态，播放/准备时隐藏main；停止/失败/自然结束/Back/Home恢复main及已有FocusRouter调用点。不调整Samsung视频层合成/背景、不增加page key listener。截图和行为回归为桌面层，TV结果待部署反馈。


0.0.19打包前最终检查：104项实际本地行为检查PASS（60单元/合同、28主包桌面UI、HOST guest5/bridge9、2native桌面加载/取消），另有strict/37模块边界、C syntax、固定Samsung SDK实际重编译通过，新_guest_reject_reason导出确认，32MiB固定堆未放宽。新UI截图1920×1080已目检，主界面不再穿透播放HUD，控制/焦点未裁切；自然结束→原卡→重新播放→Home已在实际Worker/匿名native shim/模拟AVPlay路径通过。未把合成time/desktop插件占位当作TV媒体结果。原HTTP/media/stop及isolation行为本轮未重跑，历史结果按原工件保留。44初始文件0缺失；main无HEAD/remote，未commit/push/发布。最终三unsigned/hash/签名/设备结果另记。


## 0.0.19 已部署，完整短视频验收待用户（W01/W04/F06）

manual，source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`。首次CLI安装exit1，原始日志显示包传输失败，未进入证书验证；SDB设备列表无连接，get-state/capability exit1，但授权目标TCP可达。重新connect exit0，get-state=device/capability均exit0；未重启电视、改证书或重启本机SDB服务。重试同一签名包install/run均exit0且平台成功。第一次失败记录/两次日志、精确源码archive与签名包私密保留，只有成功后才更新deployed manifest供collector核对。

已请用户正常播放4–8分钟普通视频，核对超过180秒/自然结束返回原卡/重播，再开启诊断；尚未回传，不继承0.0.18首播/177秒为新工件完整时长结论。0.0.19 mediaPlayback/fullDurationPlayback/detailLimitRecovery保持UNVERIFIED。104项本地检查与SDK/包预检分开，W01完整门槛和单一v1.0.0仍未完成。测试期间保留该电视工件，不因后续文档补记重新侧载。


## 0.0.19 所测普通视频完整播放/回卡/重播通过

2026-10-15，用户明确反馈超过180秒正常声画、自然结束回原卡、重播全部通过。记所测普通游客视频USER OBSERVATION PASS；用户未另报本次确切总时长/BV/样本数，不自动记为4:24、8:56或全样本通过。准确source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`，manual。

collector exit0/source匹配，HTTP GET后listenerClosedAfterGet=true；包含ugc.source_backup_selected、游客热门HTTP200/API0/4条、manifest/video/audio范围传输、avplay.tracks_video1_audio1和ugc.native_closed_confirmed。本报告未含失败条目；八条报告不证明无限历史或所有视频。备用源选择这一固定事实已在本机证实，不将其与未导出的特定BV/每次播放强行对应。0.0.18的详情curl23仍保留历史；大详情目标样本回归、长片/URL续期/两小时混播、完整F06/W01/F20仍未关闭。


## 0.0.20 发现探针实现与本地验证（W01/W02/W06/F20）

2026-10-15：新增自身身份的五分钟前台发现窗口，界面/Worker/native分层，原InputRouter/DOM焦点统一归属，Back/Home停止并等原生关闭ACK。仅允许固定设备/服务XML和ConnectionManager固定MP4格式查询；拒绝NVA SETUP和实际媒体控制，不执行账号写入。候选NVA拆包/编码与CastSession防重放合同独立存在，未接上接收监听。网络、内存、请求/队列/回复和诊断预算见F20_PROTOCOL_EVIDENCE；无新依赖、权限、WARP/CSP例外或外部服务，未借用客户端身份/keys。三端App版本按用户原文记录，OS和实际兼容性仍待验证。

实际126项本地行为检查全部PASS：69单元/合同（含5项NVA wire和4项发现IPC/身份/清理）、31主包UI、HOST cast10/guest5/bridge9、2 native桌面加载/取消。strict/43模块边界、C语法和固定Samsung SDK重编译亦exit0，cast_stop已随native构建导出；32MiB固定堆不变。HTTP/media/stop和isolation原行为本轮未重跑，保留各旧工件结果，不计入126。测试没有真实账号写操作、发送端流量或TV媒体模拟冒充。

UI流程：主页面→发现窗口→实际Worker/匿名native shim进度→Back回入口→重入→Home关闭；另测地址缺失和取消地址读取后晚回调不启动Worker。Browser plugin not available，采用项目现有Playwright，本地http://127.0.0.1:4173、1920×1080。页面身份/非空/无框架遮罩/相关console健康/真实DOM焦点/交互均PASS；发现窗口与主页截图已目检，无新增裁切或重叠（/tmp/bilisofa-cast-020-desktop.png、/tmp/bilisofa-evidence/probe-desktop.png，合成设备状态）。未按手机viewport验收TV界面；桌面无Samsung sockets，native网络超时按FAIL事实保留，加载/清理检查通过不等于网络能力PASS。

44份初始文件0缺失；main无HEAD/remote，未commit/push/发布。0.0.19精确签名/部署和用户完整短片通过均保留；0.0.20构建、签名、安装、启动及官方三端结果随后按各自证据记录，当前不能宣称官方投屏发现/连接/播放通过或W01完成。


## 0.0.20 已签名安装/启动，Android发现待用户（W01/W06/F20）

2026-10-15，manual，source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，application BiliProbe1.Probe。沿用自有Author/Public Distributor，签名前后资源一致、证书日期/issuer预检PASS；三unsigned完整性及source配对PASS，安装/启动最终exit0且平台成功。第一次exit1发生在包传输阶段，未到证书验证；SDB列表无绑定、get-state/capability exit1，授权目标TCP可达。仅重新connect原目标后state=device/capability0，重试同一签名包install/run成功，未改证书、重启SDB服务/电视或固件。原失败日志和两次记录均私密保留。

成功后才更新deployed-native-manifest供collector匹配；精确部署source ZIP/manifest/DELIVERY及unsigned native归档在仓库外deployed-source/完整hash，签名包私密保存。0.0.19包/源码及用户完整短片通过证据仍保留，不被新包覆盖为失败或继承到未测投屏。之后文档更新重建的unsigned/source不重新侧载；精确已装身份仍以上述hash为准。

已请用户先在电视启动五分钟发现窗口，再用Android官方9.12.0-b28383822普通公开视频TV列表检查自身接收端名称，点击一次记录结果，返回开启诊断；尚未回传。iPhone6.6.0-91300300和iPad3.75.1-37501100资源已确认，OS未知，后续分别测。安装/启动PASS不等于发现/连接/声画/控制通过；三端F20以及W01整体仍UNVERIFIED，未发布v1.0.0。


## 0.0.20 发现启动失败与0.0.21兼容修正（W01/W06/F20）

2026-10-15，用户反馈电视显示cast.failed_13。对应已部署manual source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，记USER OBSERVATION：发现监听启动FAIL；未取得本次匹配报告，原stage13合并了接口选项/TTL/入组，不能从该code唯一断定某syscall或errno。手机发现未到达，不记Android协议失败，三端F20保持UNVERIFIED。

复查[Samsung官方Socket选项表](https://developer.samsung.com/smarttv/develop/api-references/webassembly-api-references/tizen-sockets-extension-api-references.html)（2026-10-15）：列出TTL、ADD/DROP_MEMBERSHIP，没有IP_MULTICAST_IF。本机固定Samsung1.39.4.7的library_tizen_sockfs.js同样没有该选项映射，getLevelAndOptionString对未知项抛ENOPROTOOPT；direct SocketsHostBindings路径委托TV实现，未取得其源码，不能把旧adapter报错当作本次TV已导出errno。原探针无条件设置IF是明确的兼容缺口，之前HOST fixture跳过整段组播配置，没有覆盖它。

0.0.21去掉不在支持列表内的IP_MULTICAST_IF调用，接收仍用经校验的本机RFC1918地址加入固定组，出站NOTIFY使用TV的IPv4路由；目标239.255.255.250、TTL1、私网peer校验/限流、监听范围和全部资源预算不变。多接口出站路由/真实跨设备发现仍待TV证据，不声称已固定出站接口。TTL失败改131，入组失败改132，清理未知17仍不能ACK/重用。没有忽略失败或改ANY入组，没有增加权限、放宽CSP/TLS/目的地、修改SDK或引入外部服务。

新增显式内部auto=6（cast-startup-report-once）：开始一次发现启动检查，收到native ready立即停止，等待原生关闭ACK后开放固定脱敏报告；15秒启动预算，用户操作/Home取消后不继续自动报告，旧自动回调不关闭新手动窗口。只证明bind/TTL/join和清理，不测试官方端可见/连接/实际播放；无视频自动播放/账号写入。默认npm run build仍manual，部署auto=6必须显式构建并写入包metadata；手动“五分钟发现”入口保留。


0.0.21打包前实际117项行为检查PASS：69单元/合同、35主包UI、HOST cast11、native桌面2；另有strict/43模块边界、C语法、固定Samsung SDK重编译PASS。新增HOST选项fixture模拟SDK支持集，验证1字节TTL=1、原选定入组接口、TTL失败不继续入组、入组失败阶段和成功状态；不发送LAN组播。四项新增UI验证ready→关闭ACK→报告、131/132不得伪造清理PASS、取消自动后新手动发现不被旧回调关闭。此前HOST fixture跳过组播配置的覆盖缺口现有明确回归。没有把fixture或源码缺口断言成TV修复通过。

Browser plugin not available，沿用项目Playwright，http://127.0.0.1:4173、1920×1080。完整35项回归含页面身份/非空/console/CSP/焦点、Back/Home及新自动余序；视觉布局未改变，原发现窗口截图仍为匿名native shim证据。native桌面实际WASM/CA加载与停止两项PASS，桌面网络timeout仍非TV支持证明。HOST guest/bridge/HTTP/media/stop和isolation本轮未重跑，不计入117；各历史证据保留。签名与本电视auto启动/清理结果另记，官方三端依然待验证。


## 0.0.21 已部署，发现启动/清理本机通过（W01/W06/F20）

2026-10-15，auto=6 cast-startup-report-once，source `7828bbd82c20a67cda472fa05c81c39f7ca59df16b58a553816d344832c8e7a1` / signed `fa3598d16bd1e25dbd2dbcfaea7deed07ef5fac7f650d81485e5d795ab011d71`。自有Author/Public Distributor；安装前显式目标get-state=device/capability0，无需重连，install/run首次均exit0且平台成功。未改SDK/证书或电视配置。原0.0.20失败、0.0.19可播放包及历史报告保留；已部署manifest只在成功后切到新工件。

collector exit0，source/signed匹配，TV报告cast.ready进度、cast.native_closed_confirmed PASS，HTTP报告GET后监听关闭true。该C ready只在TCP40325/UDP1900绑定、TTL1、指定接口入组和时钟成功后发出，随后ACK仅在native socket/drop membership清理成功后发出；因此记所测TV发现启动和清理DEVICE REPORT PASS，修正后未再见原stage13。原stage13精确syscall/errno未导出这一边界仍保留，不将候选定位伪装成旧包已取到独立errno。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0、marker1；Chrome主版本仍不可提取。启动报告已另存私密device-native021-startup-report.json，避免之后同source手机/手动报告覆盖它。

自动检查收到ready立即关闭，没有证明NOTIFY实际接收、手机可见、连接或媒体投送。已请用户手动开启五分钟窗口，用Android官方9.12.0-b28383822查找自身BiliSofa W01 Discovery并点击一次，最后开启报告；尚未反馈。iPhone/iPad同样保持未测，完整F20/W01/v1.0.0未完成。精确已装source ZIP/manifest/DELIVERY与unsigned native私密归档；之后文档重建的manual unsigned不重新签名/侧载，已装身份继续以上述hash/auto=6为准。


## 0.0.22 打包前状态（W01/W02/W06/F20）

0.0.21三端反馈及匹配累计报告已保存：Android/iPhone可见USER OBSERVATION PASS，Android点击明确拒绝媒体；iPad仅AirPlay、未见本探针，具体App/入口/本地网络权限待核查，不判定TV监听故障或要求升级。0.0.22新增有界SOAP解析/私有native getter RPC和真实无媒体读查询，控制/URI仍拒绝，不触发播放器或账号。详见F20_PROTOCOL_EVIDENCE。136项不同本地行为检查、strict/46模块、C syntax及固定Samsung SDK重编译通过；0.0.22尚未签名安装/设备取证，不关闭W01/F20。已有44初始文件保留，无HEAD/remote/commit/push。


## 0.0.22 已签名部署，监听启动/清理取证通过（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。source `a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6`；unsigned native `7a2d192bb9f09b484259b4cfacf0879a32a5898c1c7f7d12d53c70aa7f8c83f6`；signed `3a12818dcb16f2f4614ae88d9a267b9a9fb85ee84730dc3b74ed2cd500b3050c`。自有BiliSofa Author/Public Distributor有效性预检通过；SDB get-state=device/capability exit0，install/run首次均exit0且平台明确成功，没有重连/改证书/重置TV。已装source ZIP/manifest/DELIVERY/native unsigned在仓库外deployed-source按全source hash冻结，旧包/三端报告保留。

collector exit0、source/signed匹配，cast.ready及cast.native_closed_confirmed PASS，报告GET后监听关闭true，marker1。新Worker已走RPC enable后启动，所以新导出存在且未在初始化abort；未收到真实SOAP，不把它当作getter/响应/媒体执行通过。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0；引擎主版本仍未提取。启动报告另存device-native022-startup-report.json防后续同source覆盖。

已请用户仅用Android官方普通视频TV入口选择一次，再开报告，等待请求分类反馈；本包仍拒绝媒体，不要求播放。iPad应用/入口/本地网络权限问题另待补充。Android/iPhone发现用户PASS来自0.0.21，不继承为0.0.22连接/媒体/控制PASS；完整F20/W01/v1.0.0继续开放。本段文档补记之后的unsigned/source重建不再次侧载，电视身份仍以上述精确hash为准。


## 0.0.22 实际SOAP与0.0.23打包前状态（W01/W02/W06/F20）

Android操作后匹配报告证明transport_query、control_rejected、invalid与native关闭；invalid具体请求/阶段未导出，不能断言媒体URI到达或原因已修复。iPad已确认哔哩哔哩HD、视频TV、本地网络已允许，未见探针继续开放；精确工件、私密报告和一手路线见F20_PROTOCOL_EVIDENCE。

0.0.23新增七阶段固定错误分类、四种控制分类、四条持续可读结果和关闭摘要（33事实/41进度）；八条HTTP报告保留完整固定事实位图，不导出原文。修正XML standalone声明子集及自身SOAP1.0响应encodingStyle。仍拒绝媒体/控制，不执行任意URL/账号操作。141项不同本地行为检查、strict/46模块/C syntax/固定SDK重编译通过；真机新分类/兼容修复待部署后分别取证。F01–F20完整范围及无外部常开服务约束保持，W01/runtime尚未关闭。


## 0.0.23 已签名部署与启动取证（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。已装source `fc307c543cd0875fb39428fac0da7f2619974d5314f41e292e6d096d3ab7b0f2`；unsigned native `6474647172edf60bef6b8f5343813dc4b5bbf78266a0427195b31741550561f8`；signed `f623df00af754b161ed89101ec9ac15eeaa2a1ed384440e50e29aec44f1a26a7`。自有BiliSofa Author/Public Distributor预检通过；目标get-state=device/capability exit0，install/run首次均exit0且平台成功，无重连/证书改动/电视重置。源码ZIP/manifest/DELIVERY/native unsigned按全source hash在仓库外冻结，旧版本/报告均保留。

collector exit0、source/signed匹配，cast.ready/native_closed_confirmed，HTTP报告GET后关闭true、marker1；分别记本机监听启动与原生清理DEVICE REPORT PASS，不把它扩大为新SOAP分类/声明兼容/媒体执行通过。startup报告另存device-native023-startup-report.json。已请用户Android同一普通视频选择一次并开诊断，不需追读提示；iPad暂不重复，原因仍开放。

本轮141项不同本地检查与真机启动证据分开；W01/F20/完整v1.0.0未完成。文档补记后的manual unsigned/source重建不再次签名/侧载，已装身份始终以上述工件为准。main无HEAD/remote，未commit/push/公开发布。


## 0.0.24 打包前状态（W01/W02/W06/F20）

0.0.23真实报告与summary一致：SetAVTransportURI参数结构拒绝、状态查询、Stop拒绝、清理成功，精确工件见F20_PROTOCOL_EVIDENCE。不把泛化参数拒绝当作Android标准错误或已修复播放。0.0.24补齐参数结构/URI策略/metadata固定分类，共60事实/68去重进度，原接收门槛不变。148项本地行为检查、strict/46模块/C syntax/固定Samsung SDK重编译通过；新分类真机结果待部署。完整会话/播放/控制、HD发现及F20/W01/v1.0.0继续开放，无新权限、依赖、身份或常开服务。


0.0.24已签名安装/启动，匹配自动报告证明cast.ready/原生关闭ACK、报告GET后关闭及marker1。已装source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276` / signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`；详情与私密冻结工件见SIGNING_DEVICE_RECORD。新offer完整分类待Android再触发一次，不继承为媒体/完整F20通过。文档补记的manual重建包不重新侧载。


## 0.0.25 打包前状态（W01/W02/W06/F20）

0.0.24匹配报告/summary确认额外标量字段、HTTP地址与超过2048字符的metadata，逐请求关联未导出。0.0.25通过单独probe parser忽略有界扩展并丢弃未用metadata，一般parser不变；HTTPS候选范围测试在同一TV Worker/native内，严格TLS/目的地/期限/512bytes/一次预算，无HTTP或redirect回退。合同选择见ADR-005，详细证据见F20_PROTOCOL_EVIDENCE。165项不同本地行为检查、strict/46模块/C syntax/固定SDK重编译与新导出确认通过；真实新兼容/源传输仍待部署后的Android请求。SOAP媒体和控制依旧拒绝，W01/F20/完整v1.0.0未关闭，HD发现独立开放。无账号写操作、新依赖、权限或常开服务。


0.0.25已签名安装/启动并取得匹配的ready/原生关闭ACK、报告GET后关闭与marker1证据。已装source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8`；精确冻结工件见SIGNING_DEVICE_RECORD。auto6未创建source cURL，参数兼容、HTTPS/活跃句柄取消及媒体仍待Android真实触发；不扩大启动PASS。文档补记manual重建不重新侧载，HD和完整F20/W01/v1.0.0继续开放。


## 0.0.25 Android HTTPS 源范围实机通过（2026-10-15）

用户开启诊断后collector exit0；source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8` 精确匹配。报告有 `cast.source_policy_supported`、`cast.source_upgrade_planned`、`cast.source_started` 和 **PASS `cast.source_pass`**，随后 `cast.native_closed_confirmed`；GET后监听关闭true、marker1。摘要 `cast.soap_summary_v1_8000400408002010` 解码为transport_query、uri_offer_rejected、stop_rejected、offer_args_extra、offer_uri_http、offer_metadata_oversized。

记DEVICE REPORT PASS：参数兼容越过原arguments拒绝；同址HTTPS候选在本电视完成TLS校验、HTTP206/0–511范围、512bytes与ftyp头检查，source句柄完成清理，最终发现监听清理确认。未记声画、手机收到成功回复、连接、控制或活跃source中途取消通过；SOAP仍拒绝媒体，完整F20/W01开放。私密报告独立保存在device-native025-android-https-report.json与observation，startup原件保留；原始CDN URL已经擦除，下一包需要一次新投送。

0.0.26新增显式电视确认后的MP4候选播放，复用PlayerCoordinator/AVPlay和Worker内loopback桥；最长3分钟、60秒确认窗口、Back/Home/错误关闭，仍不是正式CastSession/手机控制。见ADR-006；iPad HD发现与账号/PGC/live/F19等工作继续开放。


## 0.0.26 实际签名安装与启动取证（2026-10-15）

已装auto=6（cast-startup-report-once）、BiliProbe1.Probe：source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56`，signed SHA-256 `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`，unsigned native `59f50ccde7ccb1410d83ab24f191b68e6fbd3f36ab6c208a8523ded66506b322`。全部191不同本地行为检查/strict/C/SDK、三个unsigned gate与source ZIP冻结通过。原Author/Public Distributor保持，仅用BiliSofa profile；未改电视固件、其他证书/账号。

SDB首次get-state exit1，原授权地址connect exit0，state复查/capability exit0；install第一次exit0且install completed，run exit0且successfully launched。保留首次连接失败私密日志，不记作安装失败或证书故障。collector exit0，精确source/signed匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1。设备仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0；engine major仍不可提取。

只登记DEVICE REPORT PASS监听启动/原生清理；auto6未创建source或媒体桥，不证明活跃桥/AVPlay清理或实际声画。已请求用户一次Android新投送→TV确认→90秒声画/暂停/seek/Back→诊断；未获反馈项保持UNVERIFIED，SOAP接收/手机控制/HD发现/完整F20/W01/v1.0.0继续开放。

精确已装source ZIP/manifest/DELIVERY/unsigned frozen于仓库外deployed-source/d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56，签名包/raw logs/private metadata在仓库外；startup原件另存device-native026-startup-report.json，后续手动报告不能覆盖它。文档补记后的默认manual重建工件不再次签名或侧载，不能替代上述已装身份。main无HEAD/remote，未commit/push/公开发布。


## 0.0.26 无法播放反馈与确认窗口证据（2026-10-15）

用户反馈“无法播放”，未说明按钮是否亮/是否进入播放器，也未提供cast错误码。两次collector均exit0，精确source `d0470390e70cb6b716f88794c56ac6c79aecc74b0029eb1ba3b4a2bd2f4b6a56` / signed `c98f72b382ee962d0df9a3267b0dce5251051e726eabf3512d8e119d61f3ac46`匹配；均含source_pass、source_policy_supported、media_expired、summary_v1_800044060a002010与native_closed_confirmed，GET后关闭true。第二份是同一页面累计记录，不能当作第二次独立播放尝试。startup原件保留，手动报告另存device-native026-no-play-report.json/observation。

登记USER OBSERVATION FAIL（无法播放、阶段未明），不记播放器解码失败。报告未见AVPlay started/prepare_failed或media_ready；native media_expired只在尚有ready候选、未移交桥时发出，因此本次未证明已接纳电视确认。不能据此责怪用户未操作、推断遥控故障或CDN失效；原根因仍开放。

代码审查发现后续手机轮询/发现事件会覆盖“检查通过，请电视确认”提示，过期后也可被覆盖。0.0.27修复保持就绪/过期提示、明确左右邻居，保留60秒/不自动播放；新增TV确认发送和Worker接纳固定回执、10秒未就绪关闭与明确故障。所有回执无外部payload，8项诊断保留两阶段回执；进度94（原93+approved），SOAP位序不变。只改善操作和定位，不声称已经修复媒体解码。C/SDK、源策略/媒体桥不变，0.0.27复用0.0.26已编译原生字节；新UI/Worker需重新验证/打包/签名/本机反馈。


## 0.0.27 安装超时后实际版本恢复取证（2026-10-15）

已签名auto=6/BiliProbe1.Probe：source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218`，signed SHA-256 `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`，native unsigned `948b43c7224f5d7fe79291e516e99e16e1b8bb5cfe4ace3e68718155da90f86f`。154不同本地检查、strict/46模块与三个unsigned gate/source ZIP冻结通过；C/CA/native三文件与0.0.26相同且hash核对通过，本轮没有宣称重新SDK编译或重跑HOST网络。

安装前get-state=device/capability exit0；唯一一次install在60秒被外层timeout终止（exit124），私密日志确认传输完成、停在安装阶段，无install completed/失败确认。后续get-state/capability均exit0；只读TV应用列表含目标条目但没有版本，通用pkgcmd查询虽exit0/空输出亦不算版本证据。无残留安装Java进程，未kill其他进程、重启SDB/电视、改证书或重试安装。

随后只启动当前BiliProbe1.Probe，CLI exit0且successfully launched。临时让collector按新signed manifest（未提前更换deployed）校验，exit0、实际报告build精确为新source；cast.ready/native_closed_confirmed、GET后关闭true、marker1，固件/model/platform不变。此后才更换deployed manifest。记DEVICE BUILD VERIFIED已更新/正常启动和监听/清理PASS，安装CLI成功回执仍UNVERIFIED（保留exit124），不是伪造install exit0。源码/unsigned/manifest/DELIVERY按全source冻结于仓库外，startup原件另存device-native027-startup-report.json。

新包只在TV确认后尝试媒体，没有自动播真实内容；新版固定提示/两阶段回执/播放/活跃桥清理仍待用户实际反馈，未把启动报告提升为这些PASS。已请求先验证按钮可选/能否进入播放页/起播并开启诊断，不再要求尚未起播时做90秒及控制。0.0.26“无法播放”USER FAIL与阶段未明、候选过期的事实保留。完整F20/W01/v1.0.0继续开放，无commit/push/发布。后续文档默认manual重建不再次侧载，电视维持上述auto6签名工件。


## 0.0.27 已确认进入播放器、AVPlay准备失败（2026-10-15）

用户明确反馈“进入播放页但无声画，诊断已开启”。collector exit0，source `6b6bc29b2627001e21b33167498f3c53befcfbd213945763597debe9c1021218` / signed `5096d4b43b2961adb7e261cf877cae37a57f6d31e1db7ff22622a9cb06f37dc4`匹配。报告source_pass、candidate_confirm_sent、media_approved、media_ready、**FAIL cast.avplay_prepare_failed**、summary_v1_8000400402002010及native_closed_confirmed，GET后关闭true、marker1。startup保留；手动原件另存device-native027-prepare-failure-report.json/observation。

本次TV确认/Worker接纳/桥监听启动分项DEVICE REPORT PASS，原生关闭通过（已批准的桥监听）；USER声画FAIL，AVPlay启动链路DEVICE REPORT FAIL（旧catch同时覆盖open/prepare/play，不能独立区分）。未见具体请求类型、AVPlay枚举/异常名或媒体轨道，不能推断必为codec、TLS、HTTP拒绝或活跃媒体transfer取消；不把0.0.26候选过期继续套用到此次失败。完整F20/W01保持开放。

源码复核发现原progressive桥不接受无Range GET/后缀Range，且开放范围只答2MiB；这些是可用HOST复现的兼容缺口，当前没有TV请求类型证据证明它们就是此次根因。0.0.28补齐HTTP响应和请求分类/AVPlay固定错误枚举，再以新包实测，不提前宣称修复声画。

0.0.27错误标签复核：startCastMedia旧catch同时覆盖await open和同步play，cast.avplay_prepare_failed仅证明启动链路失败，不足以区分prepare或play阶段；此前按标签解释为单独prepare失败的文字以此修正。0.0.28新增phase区分和独立play失败UI用例；不改写用户“进入播放页但无声画”及原始报告。

0.0.28阶段：进度预算99、HTTP请求5位摘要、prepare/play固定故障分层；完整GET/HEAD/单range经TV内有界续段，不引入外部服务。仍属于W01验证，未将此当作W06完整接收会话或固定运行时选择。


## 0.0.28 HTTP兼容候选实际部署与启动（2026-10-15）

auto=6/BiliProbe1.Probe，source `e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60`，signed SHA-256 `896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d`，native unsigned `c7e8b1bd872be4ec71def203fd9f9a230ce57c74dbe838e1753c3150e5a9272f`。208不同本地检查及strict/C syntax/实际Samsung重编译/三个unsigned gate/source ZIP冻结通过；相同Author/Public Distributor，无新权限、证书或固件变更。

get-state=device/capability exit0，无需重连；第一次install exit0且install completed，run exit0且successfully launched。collector exit0，TV build与新source匹配，签名工件配对；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup独立保留device-native028-startup-report.json。准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结在仓库外deployed-source，私密签名包/raw日志保留，不混入后续默认manual文档快照。

启动自动模式未创建源cURL/媒体桥或AVPlay；只通过新包监听/清理，不扩大为HTTP请求实际类型、分段续传、声画或活跃transfer取消的TV证明。已请求Android同一视频重新投送→TV确认候选，正常时可继续90秒/暂停/seek/Back，最终开诊断。真实请求类型/声画/手机控制、HD发现、完整F20/W01/v1.0.0继续开放。0.0.27无声画与旧catch混合prepare/play的边界已更正并保留，未提前记为HTTP根因或声画修复。

文档补记后默认manual重建不再签名/部署，电视维持上述精确auto6工件；无HEAD/remote、未commit/push/公开发布。

## 0.0.28 声画反馈及控制失败（2026-10-15）

W01/F06/F20：用户确认TV已检查候选声画正常；首次暂停/继续退出、第二次正常，首次跳5秒成功，进度超过5秒再次跳5秒卡住后返回投屏发现。独立记录声画USER PASS、控制FAIL；未明确连续90秒，不计90秒通过。部署源码e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60、签名896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d。实际读取报告HTTP PASS且GET后监听关闭，含cast.media_issue_206_28（上游206/cURL超时）、source_pass、avplay_started、media_requests_v1_02（开放Range）、native_closed_confirmed。原始脱敏报告及用户观察保存在仓库外device-native028-controls-report/observation.json；首个暂停独立失败未被8项摘要保留，不将其根因推断为已证实。

0.0.29候选按ADR-007修复渐进MP4背压总超时和seek期间控制叠加；真实TV回归尚未完成。未接通手机控制，完整F20/W01仍开放。

## 0.0.29 控制回归候选实现与HOST验证（2026-10-15）

W01/F06/F20：按ADR-007将progressive总transfer timeout改成非背压上游无数据deadline；保留connect/TLS/精确Range/固定堆及lease/字节/窗口预算。只改渐进MP4期限，不将旧游客DASH的整片验收外推。PlayerCoordinator在已排队/执行seek期间不发play/pause，UI重复seek忽略且显示跳转中，关闭代次不能释放新会话busy状态。首次pause独立根因尚未证实，保留原AVPlay合法状态检查。

实际static strict/46模块边界PASS、101单元合同PASS、58整组主UI PASS（31.8秒，含待完成seek期间重复遥控/暂停隔离）、26 HOST bridge PASS（62.9秒，含真实16秒背压+时钟跨旧20秒期限后全部字节恢复并重新取较早范围，真实上游停滞仍206/28，放弃连接再Range、背压时硬租期关闭），13 HOST source PASS、14 HOST cast PASS（20.0秒）。C syntax PASS，Samsung Emscripten1.39.4.7实际重新编译，固定32MiB堆。native桌面/最终打包/签名/安装/设备反馈随后独立补记；不提前算TV控制通过。UI使用项目Playwright（无可用Browser插件），anonymous native/AVPlay shims不是TV解码证据。

## 0.0.29 实际签名部署与控制待回归（2026-10-15）

W01/F06/F20内部auto6，BiliProbe1.Probe，source `ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b`，signed SHA-256 `e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3`，native unsigned `8d64a8eaeccd4175de038bdecf46db231e3ee016187ae00085d21ac4716d9a9b`，source ZIP `834bc897873860f71c3746ee63396e855f35d1b381ace59c7068317ae65c1dea`。214不同本地检查PASS、strict/46模块/C syntax/真实Samsung SDK编译及三个unsigned gate通过；相同自有Author/Public Distributor，无新增权限。

设备state/capability exit0，首次install exit0且install completed，run exit0且successfully launched。collector exit0，实际build与新source匹配；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。启动原件仓库外device-native029-startup-report.json，准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结于deployed-source，签名包和raw工具日志留私密目录。

仅证明部署/发现监听启动/清理；自动模式未播放真实内容，不证明新的暂停/回跳修复或手机控制。已请求同一视频起播20秒→暂停20秒→继续→两次回跳5秒→Back并开启报告，待用户反馈；0.0.28声画USER PASS与控制FAIL独立保留。W01/完整F20/v1.0.0仍开放，不将TV确认候选播放当官方连接控制验收。文档补记后默认manual重建不再次部署，电视维持上述精确auto6包。main无HEAD/remote，保留所有未提交文件，未commit/push/公开发布。

## 0.0.29 暂停通过、回跳仍间歇失败（2026-10-15）

W01/F06/F20：用户确认起播20秒后首次暂停20秒再继续正常，记录USER PASS；回跳5秒在两次播放中分别出现首跳失败、首跳成功/第二跳失败，卡住后返回发现页，记录USER FAIL。collector exit0，source ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b / signed e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3匹配，HTTP报告/GET后关闭true，avplay.seek_failed、source_pass、media_requests_v1_02和native_closed_confirmed。手动报告/观察另存仓库外device-native029-seek-report/observation.json，startup不覆盖。通用catch丢掉SDK/timeout原因，不能提前锁定根因；无206/28条目也不扩大为全程网络通过。90秒未明确反馈，完整F20/W01仍开放。

0.0.30候选按ADR-008拆分prepare15秒/seek30秒有界等待、仅渐进MP4 IDLE显式配置4秒起播/恢复和10秒缓冲、固定SDK原因/缓冲/目标tick分类；已结束且活动状态不变的seek失败保留播放页允许手动重试，未知/超时仍关闭，不自动重试。真实回跳修复仍待新包反馈。本轮C/native源未改，不声称SDK重编译；重用0.0.29已实际编译且C source hash匹配的固定32MiB WASM，需继续通过包hash门禁。

## 0.0.30 实际部署与seek待验收（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47`，signed SHA-256 `61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4`，native unsigned `1daefa1ae7b078e639127c834b19c45e1f19e5f3ee56a07f97af40b615a944f0`，source ZIP SHA-256 `c005cf2689246fd42b0e29572b00f3fe97dc3bea342c31a8be56aff30ef37465`。171不同本地检查通过（107+62不同UI+2native桌面，初始夹具问题和定向复核见TEST_REPORT），三类unsigned/source/许可门禁通过；C及native JS/WASM/data/manifest与冻结0.0.29逐字节一致，本轮无SDK重编译声明。

state/capability exit0，首次install exit0且install completed，run exit0且successfully launched；相同自有签名profile/Author/Public Distributor，无需重连或新权限。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup原件独立保存仓库外device-native030-startup-report.json；精确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结，签名包/raw日志仍私密。

自动启动未播放媒体或触发seek，不证明新缓冲/回跳修复。已请求同一内容两次进度过10秒回跳5秒，单次最多等30秒、首跳失败即可结束并开报告；无需重复0.0.29已通过的20秒暂停。新包声画/回跳仍待用户反馈；完整W01/F20/v1.0.0继续开放，手机控制仍拒绝。后续文档默认manual重建不重新部署，精确部署快照与本地文档包分开；main无HEAD/remote，无commit/push/发布。

## 0.0.30 最新seek报告与0.0.31候选（2026-10-15）

W01/F06/F20：collector exit0、精确匹配source d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47 / signed 61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4，HTTP/GET后关闭true，最新FAIL avplay.seek_callback_invalidvalueserror_b0_t0、source_pass、media_requests_v1_02、native_closed_confirmed。手动原件单存仓库外device-native030-seek-report/observation.json，startup不覆盖。SDK callback错误不等于应用30秒watchdog，且未证明URL失效或参数5秒本身非法。用户“两次恢复声画和进度，等待超过30秒后失败，失败时自动返回”的顺序已请求可选澄清；保留原话，自动返回USER FAIL，尚不将两次恢复都记PASS。

按ADR-008新增0.0.31：仅PLAYING的受控渐进MP4可用PREBUFFER_MODE目标起点重新准备/播放；同owned URL/Worker/3分钟租期不变，不叠加或自动重试原SDK seek，不新取源、不延租、不增加decoder。paused/缺接口仍走原SDK候选，未扩大这些验收。最近4次seek常量结果历史与详细故障/清理共同进入8项报告。C/WASM本轮未改，候选实际声画/两次回跳与后续播放仍待新包验证，完整W01/F20开放。

## 0.0.31 指定时间重新缓冲候选部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114`，signed SHA-256 `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，native unsigned `0ae308207ba0853f9aec4ff3cf55a9910d4a022124d12aeda9eb850a9d368983`，source ZIP SHA-256 `4f39bf53d6ecb03799a265b428e31dc338332842b5f6726065f83abd305232a7`。181不同本地检查PASS（113合同单元/66整组主UI/2native桌面；最后配置异常枚举补丁另重跑113及19媒体定向），strict/46模块/C syntax、三个unsigned/source/许可门禁通过。C和native JS/WASM/data/manifest与冻结0.0.30逐字节一致，没有新SDK编译声明。

state/capability exit0，首次install exit0且install completed、run exit0且successfully launched，无需重连/新权限/改证书。同自有profile/Author/Public Distributor。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后监听关闭true、marker1；model U800FD / firmware T-KSU2EFAKUC-0090-1300.9 / platform9.0，engine major未知。startup私密原件device-native031-startup-report.json；准确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结deployed-source，签名包/raw日志仍在仓库外。

仅自动发现启动/清理通过，没有自动播放或PREBUFFER_MODE设备证明。已请求同一视频两次过10秒跳到5秒，第二次后正常播放35秒以核查后续自动返回；单次最多等30秒，首跳失败可结束并开报告，不要求重复长暂停。0.0.30最新SDK InvalidValuesError与用户自动返回FAIL保留，两次恢复的具体顺序待可选澄清，未擅自记PASS。0.0.31实际起播/两次重定位/后续35秒声画仍待反馈，paused/全F06、官方手机控制/三端完整F20/W01/v1.0.0继续开放。后续文档默认manual包不重复部署，电视维持上述精确auto6。main无HEAD/remote，原有所有未提交文件保留，无commit/push/发布。


## 0.0.32 已部署，自动三跳实际结果待取证（2026-10-15）

250不同本地检查及实际Samsung重编译/三类unsigned/source/许可门禁通过。首次连接状态失败后仅重连已有授权TV成功；install/run exit0且平台成功。auto6 source `d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd` / signed `f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852`，source匹配报告为cast.ready/native_closed_confirmed，GET后关闭true，marker1。准确unsigned/源码ZIP/私密归档见[SIGNING_DEVICE_RECORD](SIGNING_DEVICE_RECORD.md)。仅启动/清理通过，新的回跳/声画未验收。已请求TV确认自动三跳+35秒观察，Back/Home可取消，清理确认后自动开报告。官方手机控制仍拒绝；完整W01/F06/F20/v1.0.0继续开放。


## 0.0.32 自动检查失败与0.0.33诊断修正（2026-10-15）

用户启动TV批准的自动流程后，collector实际读取精确匹配source d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd / signed f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852的报告：自动FAIL avplay.control_check_failed_network，SDK FAIL avplay.seek_callback_invalidvalueserror_b0_t0_sp，history_se。仅证明第一次seek成功回调、第二次明确可重试拒绝且SDK仍PLAYING，不等同用户确认声画；流程按故障结束并清理。错误快照flow_e_c2_p0_w4_m6_l5、停止flow_s_c0_p0_w4_m6_l5、source_pass、请求摘要02、native_closed_confirmed；HTTP/GET后关闭true。快照为2连接、0背压、4窗口、累计向上取整6MiB、剩余时间桶5；无字节/窗口/租期触顶证据，不能据此确定根因或证明网络全程正常。原件私密device-native032-auto-seek-report.json，startup独立保留。

源码复核定位诊断丢失：CastProbeView仅在UI代次有效时记录media_issue，关闭期间到达的底层固定错误被忽略；紧凑报告还可能让后来的media_stopped遮住较早issue。0.0.33候选把本次已验证issue与flow/limit一并保存到该run的局部集合，native ACK后才汇总；compact单独优先issue与limit，再考虑stopped，SDK/历史/清理仍保留。没有放宽late回调执行UI/播放的边界，没有改seek策略、网络预算、权限或C/WASM源。该修正只补证据完整性，不能宣称修复播放器。新包真实底层错误与回跳仍待取证，完整W01/F06/F20开放。


## 0.0.33 已部署并开始自动取证（2026-10-15）

197不同本地检查、strict/47模块和三类包/源码/许可门禁通过。首次install/run exit0且平台成功，source `83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354` / signed `4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82`，启动报告匹配、cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP见SIGNING_DEVICE_RECORD。C/WASM不变。用户已开始相同自动流程，真实结果等待collector；这是证据留存修正，不是回跳修复证明。


## 0.0.33 首次自动尝试停在prepare（2026-10-15）

collector实际匹配source 83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354 / signed 4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82。FAIL cast.avplay_prepare_timeout（15秒应用有界等待），source_pass/TV确认/批准/请求02、停止快照flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，HTTP GET后关闭true。没有进入自动seek；没有原生issue/错误快照e，不能作为上一轮第二跳的同一原因，也不能证明底层网络正常。原件单存私密device-native033-auto-attempt1-prepare-report.json，startup不覆盖。

保持同一0.0.33/相同策略，已请求再启动一次相同自动流程，无新安装或放宽超时/预算。此轮起播FAIL、回跳UNVERIFIED，完整W01/F06/F20仍开放。


## 0.0.33 同包复测仍prepare超时，0.0.34有界观察候选（2026-10-15）

用户确认重新启动后，第二份匹配同source/signed报告仍为cast.avplay_prepare_timeout、source_pass、请求02、flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，GET后关闭true；未进入seek。第二份原件单存私密device-native033-auto-attempt2-prepare-report.json，不覆盖首次/启动报告。这是本次两次prepare失败，未取得关闭期底层issue，不能改写0.0.32的第二跳SDK错误为同一根因。

0.0.34仅cast候选prepareAsync观察延至30秒（legacy合成/游客仍15秒，seek仍30秒），超时增加关闭前实际SDK状态和最后buffering标志。30秒是有界观察实验，不是“延长超时已修复”结论。三星文档中buffering timeout只定义onbufferingcomplete，4秒缓冲表示媒体累计量，不承诺prepareAsync在10或15秒内返回；本轮官方资料复核见ADR-008。原生上游无数据15秒、3分钟租期及资源/TLS范围保持，可先呈现真实网络错误；不自动重试。

另修正自动流程在prepare中被native issue关闭时的报告路径：即使mediaPlayer已被清空，只要仍同automation epoch且非用户Back/Home/新操作，仍等待清理ACK并自动报告。取消/新owner仍不能自动打开报告或复活player。新实际效果仍待测试/部署与真机报告，不先宣称修复。


## 0.0.34 已部署，准备等待与回跳实际结果待取证（2026-10-15）

200不同本地检查（124+74+2）、strict/47模块、三类包/source/许可门禁通过。C/native字节复用0.0.32已实际编译的四文件。首次install/run exit0且平台成功；source `3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94` / signed `af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731`，source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1；准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。只证明启动/清理，不证明延长cast prepare有界观察已修复。已请求相同自动流程，真实报告待读取；完整W01/F06/F20/v1.0.0仍开放。


## 0.0.34 实际起播、第二跳失败及原生超时证据（2026-10-15）

用户明确“开始播放了”，记所测实际起播USER OBSERVATION PASS；未明确确认本轮全部声画/三跳。自动报告与之后用户重新开启的手动报告均实际读取并匹配source 3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94 / signed af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731。history_se、SDK InvalidValuesError_b0_t0_sp、control_check_failed_network，整体FAIL；source_pass/请求02/native_closed_confirmed，HTTP GET后关闭true。

首次完整保留独立native FAIL cast.media_issue_0_28：上游尚无HTTP状态时超时，不是HTTP403或已证实的解码失败。flow_e_c2_p0_w5_m7_l5（2连接、0背压、5窗口、累计向上取整7MiB、剩余30秒桶5）。不能据此认定所有SDK回跳错误都由同一原因造成，亦非资源上限证据。起播观察30秒未构成三跳通过。auto/manual原件分存私密device-native034-auto-seek-report.json / device-native034-manual-seek-report.json，startup保留。

0.0.35候选只对已批准匿名progressive GET，在本次范围尚无HTTP头/状态/正文的curl28超时，排队250ms后新连接重发同一范围。每个下游连接最多一次、整租期最多三次；重复消耗原窗口预算，保持原URL/Range、TLS/CA/host、3分钟/签名租期、128MiB/256窗口/512连接/4×64KiB边界。不重试部分正文、HTTP/范围/格式/证书错误，不重试seek/prepare/写操作，不重取URL或延租。进度retry_1/2/3只是已排队而非恢复证明，最大105帧/8条报告。新包实际效果仍待设备证据。


## 0.0.35 已部署，有限重连与三跳待实际验收（2026-10-15）

262不同本地检查、strict/47模块/C syntax/真实Samsung SDK重编译及三类包/source/许可门禁通过。首次install/run exit0且平台成功，source `0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510` / signed `7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1`；source匹配启动报告cast.ready/native_closed_confirmed、GET后关闭true、marker1。准确unsigned/源码ZIP/私密归档见SIGNING_DEVICE_RECORD。仅启动/清理通过，已请求同一自动流程验证零HTTP响应超时的有限重连与三次seek；完整W01/F06/F20继续开放。


## 0.0.35 单样本三跳/35秒声画通过（2026-10-15）

source 0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510 / signed 7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1。实际匹配报告history_sss、avplay.control_check_complete_timeline_only、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。SDK三次回调和真实目标tick/后续35秒进度均按driver完成；原报告自动结论仍UNVERIFIED timeline_only，不改写为声画PASS。最后SDK成功摘要t0只表示回调操作窗口内未见目标±1500ms tick；driver在回调后继续观察目标区间，因此不矛盾。

用户对刚才自动三次回跳及后续播放明确反馈“声画正常，没有卡住”，本所测公开视频的三跳声画/后续无卡住记USER OBSERVATION PASS。流程结束主动回主页面为预期，不等同此前故障返回。flow_s_c1_p0_w10_m16_l4；没有media_retry进度或native错误，不能宣称重连支路被触发、恢复已证明或新代码为通过原因。重连真实分支/更多样本/长期稳定/完整F06、官方手机连接控制/三端F20与W01继续开放。auto报告/用户观察私密分存device-native035-auto-seek-report.json / device-native035-user-observation.json，startup不覆盖；历史失败完整保留。下一步推进真实官方手机会话/控制，不用这次TV确认候选结果冒充手机连接通过。
