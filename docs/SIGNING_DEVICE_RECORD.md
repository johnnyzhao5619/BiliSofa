# W01 签名恢复与首次真机部署

日期：2026-10-14，目标 UN58U8200FFXZC / SDB profile tv / Tizen 9.0。用户已授权内部探针签名、侧载、测试，以及协助更新 Distributor；真实账号写入和公开发布未授权。

## 已完成

- 用户自己的 BiliSofa Author 保留，更新前后文件 SHA-256 完全相同，profile 的 Author 属性保持不变。原第三方项目证书未使用或修改。
- 通过已安装官方 Tizen Local Engine 10.4.5 的 `generateSamsungCert` 接口，只生成 Public Distributor、绑定唯一已连接的授权电视。SDK 官方请求路线为 Samsung v1/v3 distributors，未自行复制其他客户端身份。
- 新 Distributor 叶证书有效期 2026-10-14 至 2027-10-14；Samsung CA 有效至 2029-06-16。仅更新 BiliSofa profile 的 Distributor 引用，其余 profile 保留。
- 新密码由本机安全随机源生成，通过官方 SDK 存入 macOS Keychain。SDK 返回的 `.pwd` 位置是 Keychain account 标识，不是必须存在的磁盘文件；未索取或输出用户密码。私密备份/manifest/签名包/原始设备输出均在仓库外。
- 基础和原生探针均通过签名前的日期/签发者/资源一致性检查，并被本电视实际接受安装；CLI 正常启动返回成功。用户确认基础探针页面已显示。

| 工件 | 版本 / app ID | 已安装签名包 SHA-256 | 对应源码快照 |
| --- | --- | --- | --- |
| basic | 0.0.1 / BiliProbe1.Probe | `632e427afe519bd71f709934ed7d4354dd2d3f9d862d8e646785890b2ad26183` | `e4913ac6e1e0efb5d0de3cea4535a63dad9f66fa6c4d0b1a78b1b21d3cc4560c` |
| native | 0.0.2 / BiliProbe1.Probe | `b909c03248a874de56ba947d8c20c29b4f3d6491a1f4441d6d3bcd9de1252e25` | 同上 |

两个 CLI install exit 0，平台返回 install completed；两个正常 run exit 0 / successfully launched。native 是同一 ID、同一 Author 的实际更新安装；尚未验证升级数据保持。更新本文后的最新源码/unsigned 包另见 dist/DELIVERY.json；不能把最新文档快照误称为上述已安装工件。

## 工具恢复依据

1. Certificate Manager Java 应用虽在运行，Cua 绑定仍返回 Invalid app。隔离 VS Code 实例也无法由该 UI 工具选中，随后将同一官方 Tizen 扩展 10.4.3 安装到当前可操作的 VS Code，SDK 路径指向项目 .local；其他扩展未移除。
2. 官方 Local Engine server/dist/index.js 是 CommonJS，位于本项目内时继承根 package.json 的 type:module，实际报 require is not defined。仅在 ignored SDK 的 server/package.json 增加 type:commonjs 模块边界；厂商 JS、run.sh 未修改。SDK engine health 实际 HTTP 200。
3. 检查官方 SDK 源码发现 certificate request 默认关闭 TLS peer 验证。本次独立 engine 进程以本机私密 preload 强制 tls.connect 的 peer/host 校验，并使用 Node --use-system-ca。合成 localhost 自签证书测试：即使调用传入 rejectUnauthorized:false，也被实际拒绝，exit 0 / guard PASS；未采用关闭校验的修复。
4. certificate-only 操作期间关闭该 engine 的原始 stdout/stderr；连接 token、DUID、新密码不进入公开记录。SDK/engine/Keychain 均为开发签名工具，不是电视日常运行依赖。
5. SDK init API HTTP 200；getDuidList 在重新连接 v2 SDB 后确认唯一授权目标；generateSamsungCert HTTP 200 / success。没有创建或重新签发 Author。

## 仍开放

- 目标探针的 SDB debug 命令一次 20 秒超时；无自动 Web Inspector/DOM/console/screenshot 结果。此失败不证明所有 Tizen 调试路线都不可用。
- 用户随后反馈 Worker/WASM 与原生网络两项最终都显示 PASS（USER OBSERVATION，native 0.0.2）。根据已部署 Worker 判定逻辑，原生 PASS 要求 TCP loopback、UDP loopback、组播自收、游客 HTTPS（CA/peer/host 校验）和合成独立 cookie engine 五项均返回 0。用户未提供最终代码或导出 JSON，尚无自动分项附件；真实 Set-Cookie/登录、跨设备组播和官方发送端不由此证明。
- 本机固件/Web 引擎、实际遥控/中文 IME/Voice Guide、Home/休眠、持久化、冷启动/开发电脑关机、手机直连/MPD/media/真实会话和官方 Android/iPhone/iPad 投屏仍未验收。
- 完整 W01 未通过，W03–W07/F01–F20 继续开放。上述是内部探针部署证据，不是 v1.0.0 产品交付。

## 0.0.3 LAN 诊断候选实际部署

0.0.3 `BiliProbe1.Probe` 已签名并更新安装/CLI 启动，两个命令 exit 0，平台分别返回 install completed / successfully launched。签名包 SHA-256 `3b6b3774f0bf09122855c67e1e0a1abbaa745c633fea815ccae4cb47a178a9cf`，对应源码快照 `b25768baec55af5322e84db992d84fe4938b795c746e376afbed86f7767ce080`。准确部署 manifest 在 ignored `dist/DEVICE_DEPLOYMENT.json`，该快照源码 ZIP 在仓库外私密 deployed-source 目录保留。

尚未收到 0.0.3 的手机 GET/导出 JSON 或 Home 清理反馈；旧版 0.0.2 的用户 PASS 不自动成为新包的设备 PASS。本文之后的文档/代码更新另生成新 source hash，不能归到此部署。

## 0.0.4 非阻塞 socket 修复实际部署

修复包已签名/更新安装/正常 CLI 启动，两个命令 exit 0、平台成功。签名包 SHA-256 `51c0e19b52295c7fb02af8edfed78699af89af3abe974e55713d1e9781d83720`，源码快照 `5ba58eb616de389efede5cb2bb338dd9d7198eb757da2edff5a708e272766ee3`，`BiliProbe1.Probe` 0.0.4。仓库外保存该准确源码 ZIP、签名包及 raw logs；ignored dist/DEVICE_DEPLOYMENT.json 为脱敏部署清单。

0.0.3 手机入口失败已登记，0.0.4 用户重新验证/手机 JSON 待反馈；不能仅凭修改或安装成功将其改为 PASS。开发环境 23 项单元/合同、6 项 HTTP host/兼容合同、6 项基础 UI、2 项 native UI 检查通过；native 桌面网络仍 timeout，分层不变。后续文档/媒体准备产生的新源码快照不冒充此部署。

## 0.0.5 自动网络取证

内部自动模式已实际签名、安装、CLI 启动，exit 0 / 平台成功。signed SHA-256 `8b8c1ab9e170ee65915d9308bc8209835a2df48d2fd114a11a34d22bdd07b60d`，source `b6f5f8b0cb1077e0957f6ac8d9a475b8b3d171922ecd787c7a3d340ab63f29fb`。collector exit 0，报告 source match、真实 WASM PASS / `native.tcp0_udp0_multicast0_tls0_cookies0` PASS，前台开发电脑 GET 后监听关闭。脱敏原始报告在 dist/DEVICE_REPORT.json 及仓库外；准确源码 ZIP 留 deployed-source。固件/model 读数和客户端层级见 DEVICE_CAPABILITIES。0.0.6 候选恢复默认手动模式，新增合成媒体；旧版网络结果与新包媒体项分开。

## 0.0.6 本地 MPD/AVPlay 场景实际部署

manual 模式 0.0.6 已实际签名、更新安装、正常 CLI 启动，两个命令 exit 0 / 平台成功。signed SHA-256 `94663bce969bdd80faaafb1f71e30cba13a6e78f02651b74cee7a708427aedb9`，source `855c1ec074b71ce43d508f6f7e1b3132a813cfe79f8ff8cbb2a01fd957737503`。原 Author 保留，准确签名包/原始日志/源码 ZIP 仓库外，脱敏部署清单在 ignored dist/DEVICE_DEPLOYMENT.json。

初次新版 verify 正确阻止了 CA data 布局不符工件；按实查连续布局逐段检验后 unsigned verify/delivery/sign 全通过再部署，无跳过校验。用户声画/controls/Home 反馈待取得，不能把安装成功或模拟 AVPlay 等同设备播放。本文之后文档快照另生成 source hash，与已安装工件分开。

## 0.0.7 合成声画与资源重用实测

manual 0.0.7 已签名、更新安装、CLI 启动（exit 0 / 平台成功）。signed SHA-256 `801c39daaf6dfd41c31f0e375b93f8d0c62c27db77f6e12c63b14882e3202627`，source `5613ce6aa32a89c67e0c0d3557b20910534ab0f5b8ac4bc3680e87430962116f`。准确包、部署日志、源码 ZIP 均留仓库外，未公开签名身份。

用户先确认画面和声音，第二次测试暂停/继续、跳到5秒、Back后重新进入均通过，未再出现 `mpd.listener_failed_stage_12`。记 USER OBSERVATION PASS（W01-P12 / 合成 H.264/AAC 样本），保留0.0.6无声/重入失败历史。没有自动TV截图/音频采集；不推广到真实UGC/PGC/live、多轨/倍速/4K/HDR、Home/休眠或F20。

用户读数 `avplay.tv_mute_false_volume_16` 表示电视未静音、音量16，正常只读元数据。0.0.8 将进度、读数和能力待验收分开显示，导出保留原始verdict与kind，不把读数或初始化改成能力PASS。

## 0.0.8 结果分类与标记保持

manual 0.0.8 签名/更新安装/CLI启动均exit0 / 平台成功。signed SHA-256 `600bebcd2758df786432e03195277b61461afc4d1d4da4a4a0a24d3da8fb18fd`，source `17bea58b0e445335e0aeb63c3b2ad0fd75f51b58f8a9ea38adffe65103acd1e8`。准确源码ZIP和签名包保留仓库外。用户报告流程初始marker0，完成保存/Home/退出重开后marker1；登记非敏感标记在退出重开后保持USER OBSERVATION PASS。Home期间停声、恢复后媒体重用未单独描述，不按标记推断通过；断电、电脑关机、升级/回退数据保持、私密存储继续开放。

## 0.0.9 自动真机 KeyManager/网络报告

实际部署：内部`guest-synthetic-report-once`模式，signed SHA-256 `e6fe5133fa9c19d0019c49c3ae0a75e04d9e66fbeeef465bb8a1d6ca7e103a27`，source `8042ae3f5934300494c05784dd7908871aa36436a3f4c16aafa92231be8e62a8`。首轮install exit1，SDB设备列表为空；重连报告connected后再次install/run均exit0 / 平台成功。失败/重连/成功的原始日志及精确签名包/源码ZIP在仓库外保留，不把最初失败隐藏或归因证书。

collector exit0，source匹配，来自授权开发电脑固定`/report`（无代理/重定向，非手机身份）；GET后复查监听关闭。报告固件仍`T-KSU2EFAKUC-0090-1300.9`、model读数`U800FD`、平台9.0、Chrome major unavailable。WASM PASS、`native.tcp0_udp0_multicast0_tls0_cookies0` PASS、`keymanager.synthetic_roundtrip_cleanup_only` PASS。KeyManager PASS要求同调用写入的随机合成非秘密值读回相等，删除后getData明确NotFound；未枚举别名、读取真实会话或调用setPermission。

report.marker=1，结合0.0.8用户保存/退出重开marker1，证明这一次相同ID/Author CLI 0.0.8→0.0.9更新保留非敏感标记；不推广至卸载/回退/断电/私密会话。报告`kind`将进度/读数与能力分开，原始verdict未机械提升。`keymanager.isolation_persistence_protection_not_proven`继续待验收。

完整脱敏报告在ignored `dist/DEVICE_REPORT.json`，私密副本按source命名。后续文档/默认manual unsigned重建产生新源码hash，与此次已安装的auto工件分开；原生C/媒体编译产物未改动。

## 0.0.10 手动首字母输入探针实际部署

signed SHA-256 `3d1d20fed6c8b03089ea7e2a4b9d6f86cff6d3b65d362487a5f8fc06d0ffad1d`，source `0ec50e9da11a244111db59c2ca00d08c99cc59b0b267528c486ade7d18720326`，manual模式。原Author/Public Distributor保持，签名资源/派生词库/原始许可/build元数据校验通过；install/run均exit0 / 平台成功。准确已安装源码ZIP/私密签名包/原始日志保留仓库外，dist/DEVICE_DEPLOYMENT.json为脱敏部署清单。

新版输入显示/选词/Back焦点与Voice Guide尚待用户实际反馈，不从桌面或安装成功计为TV PASS。历史0.0.9合成网络/KeyManager报告、0.0.7声画及0.0.9 Home用户通过记录保留各自工件配对。后续文档重建的unsigned/source与本次已安装快照分开。

## 0.0.11 候选网格焦点修复包实际部署

manual 0.0.11 signed SHA-256 `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe`，source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。原Author/Public Distributor保持，签名预检/unsigned完整性通过；install/run均exit0 / 平台成功。准确源码ZIP/签名包/原始日志仓库外归档，脱敏部署清单在dist/DEVICE_DEPLOYMENT.json。

49项本地检查PASS：33单元/合同、14桌面UI、2native桌面加载/停止；第一列修复的TV交互待用户回传，不由安装成功或桌面检查推断PASS。用户反馈0.0.10输入/你好显示/其他操作通过、第一列不可达FAIL的证据保留；后续文档重建unsigned/source另有hash，不归到这次已安装工件。


## 0.0.11 真机候选导航回归通过（F03/W01/W02）

用户对本轮步骤明确回复“已修复，全部验收通过”：NH后从键盘上移进入首候选你好、向下进入第二行第一项男孩、两行第2项向左返回第1项、选中你好，均记USER OBSERVATION PASS。工件为signed `aea8b7b6a67d2432c43acb1a59af3e8ab6894a1a45bda634b2669fedc115f0fe` / source `c251d093cdff9ef69abcc42e7b7e9cafe292438ac7da324e7e06b655a1b25ba4`。已更新该部署清单并仓库外保存脱敏用户观察；保留0.0.10第一列FAIL历史。当前输入回归关闭，真实内容搜索/热搜/历史、Voice Guide和其余W01门槛仍开放。


## 0.0.12 合成持久性真机双阶段通过

已实际签名/安装/CLI启动synthetic-persistence-report-once 0.0.12：signed SHA-256 `952e914ee70edb16212f37e8857f4f4f0ae6958f55017e8faefd952a5290aa63` / source `57c584c953ba5a2dcbdd138a0ca8a0520674e79524a48306ca287ef3e6346687`。install/run均exit0/平台成功；同Author/Public Distributor。第一份source匹配TV报告为`keymanager.persistence_prepared_exit_reopen_required`，GET后探针调用自身exit；随后CLI重开相同签名包成功，第二份source匹配报告为PASS `keymanager.synthetic_document_restart_read_cleanup_only`。值一致、remove后get明确NotFound、合成journal清除全部核查。两次GET后40322均关闭；客户端均授权开发电脑，未冒充手机。原始日志/签名包/准确源码和两份脱敏报告在仓库外归档。设备固件/平台读数未变化，marker1保持。

本次合计57项本地检查PASS（39单元/合同、16桌面UI、2native桌面加载/停止），1920×1080十二按钮截图已目检，无裁切/overlay，DOM焦点/正常console/交互通过。C/媒体未改且包完整性通过，13项HOST socket历史检查未重跑。读取/清理是本次合成退出重开证据，不证明进程PID更换、断电、升级/回退、加密或跨App隔离，不据此开始保存真实cookies或关闭W01。下一步恢复默认manual工件供人工Voice Guide/独立运行核查，mode/hash另记。


## 0.0.12 manual 人工验收工件

自动双阶段取证后，已恢复默认manual模式并实际同版本更新安装/CLI启动（均exit0/平台成功）：signed SHA-256 `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。manual没有自动写/报告/退出；运行界面保留首字母导航修复及独立存储重开按钮。准确源码归档与私密包保留，新的部署清单为device-native012-manual-deployment.json，自动测试原清单/两报告均另存不覆盖。自动模式的持久性PASS属于前一配对；手动工件的Voice Guide/电脑关机冷启动仍UNVERIFIED，已请求实际Voice Guide反馈。后续文档重建的unsigned/source与此已安装快照区别记录。


## 0.0.12 Voice Guide / Back 真机反馈

用户对主页面和NH候选间方向移动的Voice Guide检查明确反馈“朗读与焦点一致，Back 正常”，记USER OBSERVATION PASS；对应manual signed `5e2457ad6dceb967647601200d2eae31f5ab50e9afcbb54ec77ef189a8f0d8e2` / source `ecef2df1955bbd6770f5bc8d157b08d55113eb7d9177891b41be65845ec526f7`。已更新部署与仓库外脱敏观察。关闭该探针主界面/首字母候选的朗读与Back项，不扩展为尚未实现产品页面的全量无障碍验收。冷启动/电脑关机、保护存储隔离、真实内容与官方三端投屏仍开放。


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


## 0.0.14 游客热门真实TV读取通过

显式guest-popular-report-once实际签名/安装/CLI启动，均exit0/平台成功；原Author/Public Distributor，signed SHA-256 `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`。collector exit0，TV报告source匹配，`guest.popular_http200_api0_items4` PASS；即电视内原生HTTPS实际取得HTTP200/API0并成功规范化4条游客热门。固件/平台读数同前、marker1保持；授权开发电脑读取固定/report，GET后端口关闭，客户端非手机。精确源码/签名包/原始日志与脱敏报告在仓库外归档。没有把title/UP主/BV/原始正文/headers送入诊断。

本轮88项本地检查PASS：47单元/合同、20主包UI、4观察UI、2native桌面加载/停止、HOST HTTP6/media3/stop4/guest原生参数及内存2。strict/30模块边界与C syntax另外通过，Samsung重编译成功，basic/native/isolation三unsigned完整性通过。桌面native网络超时仍是既有桌面限制，不改变TV实读结论。44基线0缺失，无HEAD/remote、未commit/push/发布。新包的合成声画/Voice Guide/冷启动未从0.0.13直接继承为新实测；其原工件用户通过记录保留。

当前电视停在0.0.14真实游客热门页，已准备人工检查4卡可见/方向选摘要/下一页/Back重入；未回传前popularUiDeviceAcceptance保持UNVERIFIED。该自动工件首开只读一次guest并短时报告，不自动写账号；默认build仍manual。后续仅因文档更新重建的unsigned/source另有hash，不伪装为当前已安装工件。F02仅游客热门读取部分有TV证据，个性化/排行榜/分区与内容播放、F03真实检索、账号/媒体权益/官方三端投屏及完整W01/v1.0.0继续开放。


## 0.0.14 游客热门TV交互通过

用户对四张真实卡片标题/UP主、方向确认选卡摘要、下一页更新内容、Back回主页面再进入明确反馈“全部验证通过，请继续”，记USER OBSERVATION PASS。准确工件为signed `0e5573af9d0cb03c3b6f2d07c430a3589c6aa076dbc76385b8e91ffb98518aa2` / source `d9f3ba4e89eb6793ebed29ee503c3a45d9973108e34b05fabf66731c32eb08c2`，guest-popular-report-once模式。脱敏观察/部署清单已更新。F02热门读取/摘要/分页有TV交互证据；其他推荐/排行/分区及实际内容播放不由本次反馈宣称完成。


## 0.0.15 真实TV游客源检查通过

source `e76620edb780788e52c31310906d695dc413238c30afbdb628350e3b513d3e24` / signed `54522f6e0614c4492328ff1f58e87cb27b5a713da4b76a3da3d84ffbefd982ae`，guest-video-source-report-once。首次安装60秒、重试40秒均超时；SDB devices曾保留device行，但capability查询超时，原地址connect失败。用户确认电视开机/IP未变；TCP26101可达且路由en0，CLI version正常。确认无其他已列设备后只重启本机SDB服务，重连成功；未改证书/卸载App/重启电视。随后同包install/run exit0且平台成功。准确源码快照/签名包/失败与恢复日志私密归档，不抹除失败历史。

collector exit0，source匹配，U800FD / T-KSU2EFAKUC-0090-1300.9 / Tizen9.0 / marker1；guest热门HTTP200/API0/4条及 `ugc.source_ranges_ok` 均DEVICE REPORT PASS：同一公开首P的详情/播放计划符合约束，视频与音频各512bytes、206/精确Content-Range/ftyp通过。开发电脑读取报告后listenerClosedAfterGet=true；不是手机或真实AVPlay声画验收。未请求账号写入。新的播放源动作TV方向/Voice Guide尚未反馈，F04/F06全量与媒体桥继续UNVERIFIED。


## 0.0.16目标TV部分真实播放证据与首播问题

实际installed/run均exit0/平台成功，guest-video-source-report-once；source `8ee04fda0300e20e098f2cbf60107e3fb8171342c9048223c63f1a9e6371919a` / signed `e237999b2da18c8568f31b169e2f961bd921bad8ce7ee8db65eeefae26c23e09`。精确源码/签名包/部署日志在仓库外保留。自动/report两次未取得，不标report PASS；SDB能力查询仍响应，debug尝试未取得调试入口；不凭空断言启动失败或源hash缓存错误。

用户反馈游客热门可见、点击真实视频可播放；首次播放失败，手动检查游客播放源后可播。只记画面USER OBSERVATION PASS与首播USER OBSERVED FAILURE，声音、暂停/seek/Back/Home、跨2MiB窗口连续播放尚未确认。用户关于地址动态刷新的推测保留为推测；实现每次播放本就重取详情/playurl并校验两轨，不据此断言根因。当前可播放工件保留，不伪装为完整F06通过。已请求主页面开启短时诊断以提取失败代码。

后续0.0.17候选增加有界原生事实进度：manifest/video/audio首次完整传输与首个HTTP/cURL问题代码，不含URL/headers；ready后父Worker最多接8条进度，关闭仍需独立ACK。另收紧两轨无Range GET为400、Range unit按大小写不敏感处理，避免主动发送未请求的206。新工件另配hash，不覆盖0.0.16观察。修改是协议/诊断改进，尚未宣称修复首播。


## 0.0.16手动报告已读取；0.0.17有界重新获取

用户开启诊断后collector exit0，source/signed准确匹配0.0.16：`ugc.playurl_invalid_response`（首次未通过播放数据解析/校验）、后续`ugc.source_ranges_ok`、两次`avplay.tracks_video1_audio1`及两次`ugc.native_closed_confirmed`。USER OBSERVATION画面可播放，与DEVICE REPORT轨道读数/原生清理分开成立；音频轨存在不等于用户听到声音。报告经开发电脑读取、监听关闭true；先前自动报告未取得的历史保留。现有证据定位到playurl数据校验，未定位具体字段，不能归因为签名过期、CDN或电视启动失败。

0.0.17针对已证实失败点：只在真实播放的playurl校验失败（或源过期/时长不一致）且原生读取已经关闭后，750ms退避，最多一次重新读取view→playurl→两轨范围，仍按原权益/TLS/域名/codec/范围规则校验。API业务拒绝/付费/互动/未知协议不以自动重试绕过；第二次失败显示FAIL与具体阶段，Back可取消退避，不自动重播已开始的内容。每次播放使用新状态，不要求用户先点检查。过期来源与时长不一致单列code，但不把此次根因猜作其中一种。桥Ready前仍预留签名有效期；真实媒体最长3分钟仅为探针限制。诊断八条保留最近失败（或一次重新获取）与最近清理事实，避免后续进度挤掉根因。

桌面实际Worker+匿名native shim已验证“首个playurl异常→一次重新读取→直接播放”，重复异常只重新获取一次后失败，以及退避时取消，未以宽松解析伪造成功。0.0.17设备结果待实际部署/反馈，不继承0.0.16画面。无账号写入，未更换Author/profile或引入外部服务。


## 0.0.17已签名安装，直接首播验收待用户

manual，source `dab113be9bbeb2a8fb0f1eed6f31a8a9e243b9334e3e52ef47b9274be2aeffe1` / signed `c37add0baf461495dc006ae9e1d7b253b2337a163acc7020871fb77835acfc71`，install/run exit0且平台成功；未自动播放真实内容。原Author/Public Distributor，准确source ZIP/manifest/DELIVERY与signed WGT均私密保存；部署清单已更新，collector expected优先绑定该真实部署而非下一份待部署签名。0.0.16可播放工件及报告完整保留。

当前本地累计113项PASS：57单元/合同、25主包UI、2native桌面加载/停止、4观察UI、HOST HTTP6/media3/stop4/guest4/bridge8；strict/37模块边界、C syntax、Samsung SDK实际编译、三unsigned完整性与签名预检另外通过。没有远程CI结果或commit。已请用户不点预检直接播放、连续90秒声画、pause/seek/Back同卡与重播/Home，并在失败时回传ugc代码。未反馈前firstPlaybackRecovery/mediaPlayback均UNVERIFIED，不继承0.0.16画面或0.0.13合成声画结论。


## 0.0.18 已部署，备用源TV回归待反馈

manual；source `e2469d21bdbffb08ca3dc957f2bd362f1c831a9f025f372e8262ea00f95a960f` / signed `56dd4da19ddd904d9eaa9f3b2174fa922662684432b6d7ec6a2161a2e997adea`。安装与CLI启动均exit0且平台成功，原Author/Public Distributor未变，collector expected已切换真实部署清单。精确source ZIP/manifest/DELIVERY在仓库外deployed-source归档，0.0.16/0.0.17签名包、原始日志和匹配报告保留。未自动播放真实内容，未执行账号写入。

已请求优先重试原失败视频及另外两条、直接首播/90秒声画，之后开启诊断。反馈前0.0.18 firstPlaybackRecovery与mediaPlayback均UNVERIFIED，不能继承0.0.17通过样本或HOST7条计划/4次小范围结果。0.0.17部分首播失败仍为开放问题；本轮88项本地检查通过是对应层证据。完整时长、完整F06/W01及单一v1.0.0仍未完成。部署后文档补记与已安装源码快照区分；后续unsigned重建不伪装为已部署。


## 0.0.19 已部署，完整短视频验收待用户（W01/W04/F06）

manual，source `26ab0636fbab24c7cc7b2d2d01af1509054ec67f5b062487b59da77fae5d8097` / signed `b42bd0a28f6df36ad165ae98f7465bf1d828e559b08eadd951a518f3be0cf43f`。首次CLI安装exit1，原始日志显示包传输失败，未进入证书验证；SDB设备列表无连接，get-state/capability exit1，但授权目标TCP可达。重新connect exit0，get-state=device/capability均exit0；未重启电视、改证书或重启本机SDB服务。重试同一签名包install/run均exit0且平台成功。第一次失败记录/两次日志、精确源码archive与签名包私密保留，只有成功后才更新deployed manifest供collector核对。

已请用户正常播放4–8分钟普通视频，核对超过180秒/自然结束返回原卡/重播，再开启诊断；尚未回传，不继承0.0.18首播/177秒为新工件完整时长结论。0.0.19 mediaPlayback/fullDurationPlayback/detailLimitRecovery保持UNVERIFIED。104项本地检查与SDK/包预检分开，W01完整门槛和单一v1.0.0仍未完成。测试期间保留该电视工件，不因后续文档补记重新侧载。


## 0.0.20 已签名安装/启动，Android发现待用户（W01/W06/F20）

2026-10-15，manual，source `0de4add496ae5722762a07dbff4ef168a0fc3ffee56695a68f523c5f0a04649a` / signed `f6b21b2cbbe742fe58f9be5c17d2586930103f98335cddc5d6900ffd418897a6`，application BiliProbe1.Probe。沿用自有Author/Public Distributor，签名前后资源一致、证书日期/issuer预检PASS；三unsigned完整性及source配对PASS，安装/启动最终exit0且平台成功。第一次exit1发生在包传输阶段，未到证书验证；SDB列表无绑定、get-state/capability exit1，授权目标TCP可达。仅重新connect原目标后state=device/capability0，重试同一签名包install/run成功，未改证书、重启SDB服务/电视或固件。原失败日志和两次记录均私密保留。

成功后才更新deployed-native-manifest供collector匹配；精确部署source ZIP/manifest/DELIVERY及unsigned native归档在仓库外deployed-source/完整hash，签名包私密保存。0.0.19包/源码及用户完整短片通过证据仍保留，不被新包覆盖为失败或继承到未测投屏。之后文档更新重建的unsigned/source不重新侧载；精确已装身份仍以上述hash为准。

已请用户先在电视启动五分钟发现窗口，再用Android官方9.12.0-b28383822普通公开视频TV列表检查自身接收端名称，点击一次记录结果，返回开启诊断；尚未回传。iPhone6.6.0-91300300和iPad3.75.1-37501100资源已确认，OS未知，后续分别测。安装/启动PASS不等于发现/连接/声画/控制通过；三端F20以及W01整体仍UNVERIFIED，未发布v1.0.0。


## 0.0.21 已部署，发现启动/清理本机通过（W01/W06/F20）

2026-10-15，auto=6 cast-startup-report-once，source `7828bbd82c20a67cda472fa05c81c39f7ca59df16b58a553816d344832c8e7a1` / signed `fa3598d16bd1e25dbd2dbcfaea7deed07ef5fac7f650d81485e5d795ab011d71`。自有Author/Public Distributor；安装前显式目标get-state=device/capability0，无需重连，install/run首次均exit0且平台成功。未改SDK/证书或电视配置。原0.0.20失败、0.0.19可播放包及历史报告保留；已部署manifest只在成功后切到新工件。

collector exit0，source/signed匹配，TV报告cast.ready进度、cast.native_closed_confirmed PASS，HTTP报告GET后监听关闭true。该C ready只在TCP40325/UDP1900绑定、TTL1、指定接口入组和时钟成功后发出，随后ACK仅在native socket/drop membership清理成功后发出；因此记所测TV发现启动和清理DEVICE REPORT PASS，修正后未再见原stage13。原stage13精确syscall/errno未导出这一边界仍保留，不将候选定位伪装成旧包已取到独立errno。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0、marker1；Chrome主版本仍不可提取。启动报告已另存私密device-native021-startup-report.json，避免之后同source手机/手动报告覆盖它。

自动检查收到ready立即关闭，没有证明NOTIFY实际接收、手机可见、连接或媒体投送。已请用户手动开启五分钟窗口，用Android官方9.12.0-b28383822查找自身BiliSofa W01 Discovery并点击一次，最后开启报告；尚未反馈。iPhone/iPad同样保持未测，完整F20/W01/v1.0.0未完成。精确已装source ZIP/manifest/DELIVERY与unsigned native私密归档；之后文档重建的manual unsigned不重新签名/侧载，已装身份继续以上述hash/auto=6为准。


## 0.0.22 已签名部署，监听启动/清理取证通过（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。source `a755bc38e2ce8f6e2ca520f7df99ee6a8ff41fec55d0a94c5883d5bfe64b09c6`；unsigned native `7a2d192bb9f09b484259b4cfacf0879a32a5898c1c7f7d12d53c70aa7f8c83f6`；signed `3a12818dcb16f2f4614ae88d9a267b9a9fb85ee84730dc3b74ed2cd500b3050c`。自有BiliSofa Author/Public Distributor有效性预检通过；SDB get-state=device/capability exit0，install/run首次均exit0且平台明确成功，没有重连/改证书/重置TV。已装source ZIP/manifest/DELIVERY/native unsigned在仓库外deployed-source按全source hash冻结，旧包/三端报告保留。

collector exit0、source/signed匹配，cast.ready及cast.native_closed_confirmed PASS，报告GET后监听关闭true，marker1。新Worker已走RPC enable后启动，所以新导出存在且未在初始化abort；未收到真实SOAP，不把它当作getter/响应/媒体执行通过。固件T-KSU2EFAKUC-0090-1300.9、model U800FD、平台9.0；引擎主版本仍未提取。启动报告另存device-native022-startup-report.json防后续同source覆盖。

已请用户仅用Android官方普通视频TV入口选择一次，再开报告，等待请求分类反馈；本包仍拒绝媒体，不要求播放。iPad应用/入口/本地网络权限问题另待补充。Android/iPhone发现用户PASS来自0.0.21，不继承为0.0.22连接/媒体/控制PASS；完整F20/W01/v1.0.0继续开放。本段文档补记之后的unsigned/source重建不再次侧载，电视身份仍以上述精确hash为准。


## 0.0.23 已签名部署与启动取证（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。已装source `fc307c543cd0875fb39428fac0da7f2619974d5314f41e292e6d096d3ab7b0f2`；unsigned native `6474647172edf60bef6b8f5343813dc4b5bbf78266a0427195b31741550561f8`；signed `f623df00af754b161ed89101ec9ac15eeaa2a1ed384440e50e29aec44f1a26a7`。自有BiliSofa Author/Public Distributor预检通过；目标get-state=device/capability exit0，install/run首次均exit0且平台成功，无重连/证书改动/电视重置。源码ZIP/manifest/DELIVERY/native unsigned按全source hash在仓库外冻结，旧版本/报告均保留。

collector exit0、source/signed匹配，cast.ready/native_closed_confirmed，HTTP报告GET后关闭true、marker1；分别记本机监听启动与原生清理DEVICE REPORT PASS，不把它扩大为新SOAP分类/声明兼容/媒体执行通过。startup报告另存device-native023-startup-report.json。已请用户Android同一普通视频选择一次并开诊断，不需追读提示；iPad暂不重复，原因仍开放。

本轮141项不同本地检查与真机启动证据分开；W01/F20/完整v1.0.0未完成。文档补记后的manual unsigned/source重建不再次签名/侧载，已装身份始终以上述工件为准。main无HEAD/remote，未commit/push/公开发布。


## 0.0.24 已签名安装/启动与自动取证（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。source `13cb57f8fca32f33c7e1453c3797992d41d2d1b2d4b1e3a60d9d6358a1fa6276`；unsigned native `479383fc64b39718e1951e59ac5e723eefb91c8578f0f4d43c6e2934541465f7`；signed `bac8ee4f76416c563a517f9901a43c6eaf87b02049266dbd6139e09f59baf09e`。自有Author/Public Distributor预检通过，目标get-state=device/capability exit0；install/run首次均exit0且平台成功，无重连、证书/TV配置改动。精确源码ZIP/manifest/DELIVERY/native unsigned已按source全hash在仓库外deployed-source冻结，旧包与启动/手动报告保留。

collector exit0，source/signed匹配，cast.ready与native_closed_confirmed，报告GET后关闭true、marker1；startup报告另存device-native024-startup-report.json。记监听启动/原生清理DEVICE REPORT PASS；没有真实新offer，不把60类新诊断、URI接收或媒体播放记PASS。已请求Android原视频选择一次再开诊断，iPhone/iPad暂不重复；缺少本轮真实字段结构仍是下一步兼容修复的外部证据依赖。

148项本地行为检查与本机启动分层记录；完整W01/F20/v1.0.0未关闭。之后文档重建manual unsigned不再次签名/侧载；电视身份始终以上述auto6/hash为准。main无HEAD/remote，未commit/push/公开发布。


## 0.0.25 已签名部署与启动取证（2026-10-15）

W01/W02/W06/F20；auto=6 cast-startup-report-once。已装source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532`；unsigned native `0c3532601752444bf08d45bc66742e34ce72ae8f91dd4c56907ab88f1f7b95ad`；signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8`。自有BiliSofa Author/Public Distributor预检通过；get-state=device/capability exit0，install/run首次均exit0且平台成功，无重连/改证书/电视配置。源码ZIP/manifest/DELIVERY/native unsigned按全source hash在仓库外deployed-source冻结；历史包、startup与Android报告分开保留。

collector exit0，source/signed匹配，cast.ready、native_closed_confirmed、GET后监听关闭true，marker1。启动报告另存device-native025-startup-report.json。此自动模式未收到媒体offer、未创建source easy/multi；只记监听启动和无活跃source时的原生清理DEVICE REPORT PASS，不证明真实参数兼容、HTTPS检查、活跃cURL取消、手机连接/媒体或完整F20通过。

已请用户开启窗口、Android原视频选一次、等待约15秒，再Back开诊断。这样可在4秒connect/8秒transfer预算后收最终policy/source结果；不需反复点或抄URL/metadata。本包仍拒绝SOAP媒体/控制，手机连接失败预期。iPhone/iPad暂不重复，HD发现仍开放。165项本地证据与本机启动分层保留；W01/runtime/F20/完整v1.0.0未关闭。文档补记后的manual重建不再签名/侧载，已装身份以上述auto6/hash为准。main无HEAD/remote，未commit/push/公开发布。


## 0.0.25 Android HTTPS 源范围实机通过（2026-10-15）

用户开启诊断后collector exit0；source `862c2f3eaa3feaceb02d90ace163f9b8cfdf0dce79d165bbeaa52cac3078a532` / signed `30f5423e0f87db2a55a87645ab76643f091f2bc144300a7d79c2a6a4b659cdf8` 精确匹配。报告有 `cast.source_policy_supported`、`cast.source_upgrade_planned`、`cast.source_started` 和 **PASS `cast.source_pass`**，随后 `cast.native_closed_confirmed`；GET后监听关闭true、marker1。摘要 `cast.soap_summary_v1_8000400408002010` 解码为transport_query、uri_offer_rejected、stop_rejected、offer_args_extra、offer_uri_http、offer_metadata_oversized。

记DEVICE REPORT PASS：参数兼容越过原arguments拒绝；同址HTTPS候选在本电视完成TLS校验、HTTP206/0–511范围、512bytes与ftyp头检查，source句柄完成清理，最终发现监听清理确认。未记声画、手机收到成功回复、连接、控制或活跃source中途取消通过；SOAP仍拒绝媒体，完整F20/W01开放。私密报告独立保存在device-native025-android-https-report.json与observation，startup原件保留；原始CDN URL已经擦除，下一包需要一次新投送。


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


## 0.0.28 HTTP兼容候选实际部署与启动（2026-10-15）

auto=6/BiliProbe1.Probe，source `e8d98833cfdc2f9664bf9b0420a1cd8c8075bc0b65c209e88cbcbb1221612e60`，signed SHA-256 `896e64a71879085874b9b3c040bc2b745bac6b3cfa4478816f12e7fa51b7288d`，native unsigned `c7e8b1bd872be4ec71def203fd9f9a230ce57c74dbe838e1753c3150e5a9272f`。208不同本地检查及strict/C syntax/实际Samsung重编译/三个unsigned gate/source ZIP冻结通过；相同Author/Public Distributor，无新权限、证书或固件变更。

get-state=device/capability exit0，无需重连；第一次install exit0且install completed，run exit0且successfully launched。collector exit0，TV build与新source匹配，签名工件配对；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup独立保留device-native028-startup-report.json。准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结在仓库外deployed-source，私密签名包/raw日志保留，不混入后续默认manual文档快照。

启动自动模式未创建源cURL/媒体桥或AVPlay；只通过新包监听/清理，不扩大为HTTP请求实际类型、分段续传、声画或活跃transfer取消的TV证明。已请求Android同一视频重新投送→TV确认候选，正常时可继续90秒/暂停/seek/Back，最终开诊断。真实请求类型/声画/手机控制、HD发现、完整F20/W01/v1.0.0继续开放。0.0.27无声画与旧catch混合prepare/play的边界已更正并保留，未提前记为HTTP根因或声画修复。

文档补记后默认manual重建不再签名/部署，电视维持上述精确auto6工件；无HEAD/remote、未commit/push/公开发布。

## 0.0.29 实际签名部署与控制待回归（2026-10-15）

W01/F06/F20内部auto6，BiliProbe1.Probe，source `ada8ef7c1c8d844470da9588e27fb984b91001f6dee281d6337407b9add28a1b`，signed SHA-256 `e4ec2ae13260b909c2a2c96939cbdf7540e18a69ad04529e18b9784d5ee17aa3`，native unsigned `8d64a8eaeccd4175de038bdecf46db231e3ee016187ae00085d21ac4716d9a9b`，source ZIP `834bc897873860f71c3746ee63396e855f35d1b381ace59c7068317ae65c1dea`。214不同本地检查PASS、strict/46模块/C syntax/真实Samsung SDK编译及三个unsigned gate通过；相同自有Author/Public Distributor，无新增权限。

设备state/capability exit0，首次install exit0且install completed，run exit0且successfully launched。collector exit0，实际build与新source匹配；cast.ready/native_closed_confirmed、报告GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。启动原件仓库外device-native029-startup-report.json，准确源码ZIP/manifest/DELIVERY/native unsigned按全source冻结于deployed-source，签名包和raw工具日志留私密目录。

仅证明部署/发现监听启动/清理；自动模式未播放真实内容，不证明新的暂停/回跳修复或手机控制。已请求同一视频起播20秒→暂停20秒→继续→两次回跳5秒→Back并开启报告，待用户反馈；0.0.28声画USER PASS与控制FAIL独立保留。W01/完整F20/v1.0.0仍开放，不将TV确认候选播放当官方连接控制验收。文档补记后默认manual重建不再次部署，电视维持上述精确auto6包。main无HEAD/remote，保留所有未提交文件，未commit/push/公开发布。

## 0.0.30 实际部署与seek待验收（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `d6d800e22c292dc751fc105c772ff725e011014c04133b0003401415ed5daa47`，signed SHA-256 `61956b2673b5ce5697a014d0af62b4a4f9f1b7f4dbe647aa852d81c62eafa7d4`，native unsigned `1daefa1ae7b078e639127c834b19c45e1f19e5f3ee56a07f97af40b615a944f0`，source ZIP SHA-256 `c005cf2689246fd42b0e29572b00f3fe97dc3bea342c31a8be56aff30ef37465`。171不同本地检查通过（107+62不同UI+2native桌面，初始夹具问题和定向复核见TEST_REPORT），三类unsigned/source/许可门禁通过；C及native JS/WASM/data/manifest与冻结0.0.29逐字节一致，本轮无SDK重编译声明。

state/capability exit0，首次install exit0且install completed，run exit0且successfully launched；相同自有签名profile/Author/Public Distributor，无需重连或新权限。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major仍未知。startup原件独立保存仓库外device-native030-startup-report.json；精确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结，签名包/raw日志仍私密。

自动启动未播放媒体或触发seek，不证明新缓冲/回跳修复。已请求同一内容两次进度过10秒回跳5秒，单次最多等30秒、首跳失败即可结束并开报告；无需重复0.0.29已通过的20秒暂停。新包声画/回跳仍待用户反馈；完整W01/F20/v1.0.0继续开放，手机控制仍拒绝。后续文档默认manual重建不重新部署，精确部署快照与本地文档包分开；main无HEAD/remote，无commit/push/发布。

## 0.0.31 指定时间重新缓冲候选部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe，source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114`，signed SHA-256 `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，native unsigned `0ae308207ba0853f9aec4ff3cf55a9910d4a022124d12aeda9eb850a9d368983`，source ZIP SHA-256 `4f39bf53d6ecb03799a265b428e31dc338332842b5f6726065f83abd305232a7`。181不同本地检查PASS（113合同单元/66整组主UI/2native桌面；最后配置异常枚举补丁另重跑113及19媒体定向），strict/46模块/C syntax、三个unsigned/source/许可门禁通过。C和native JS/WASM/data/manifest与冻结0.0.30逐字节一致，没有新SDK编译声明。

state/capability exit0，首次install exit0且install completed、run exit0且successfully launched，无需重连/新权限/改证书。同自有profile/Author/Public Distributor。collector exit0，实际build精确匹配，cast.ready/native_closed_confirmed、GET后监听关闭true、marker1；model U800FD / firmware T-KSU2EFAKUC-0090-1300.9 / platform9.0，engine major未知。startup私密原件device-native031-startup-report.json；准确源码ZIP/manifest/DELIVERY/native unsigned按完整source冻结deployed-source，签名包/raw日志仍在仓库外。

仅自动发现启动/清理通过，没有自动播放或PREBUFFER_MODE设备证明。已请求同一视频两次过10秒跳到5秒，第二次后正常播放35秒以核查后续自动返回；单次最多等30秒，首跳失败可结束并开报告，不要求重复长暂停。0.0.30最新SDK InvalidValuesError与用户自动返回FAIL保留，两次恢复的具体顺序待可选澄清，未擅自记PASS。0.0.31实际起播/两次重定位/后续35秒声画仍待反馈，paused/全F06、官方手机控制/三端完整F20/W01/v1.0.0继续开放。后续文档默认manual包不重复部署，电视维持上述精确auto6。main无HEAD/remote，原有所有未提交文件保留，无commit/push/发布。


## 0.0.30澄清与0.0.31回跳失败（2026-10-15）

用户确认0.0.30前两次回跳恢复声画/进度，第三次失败并自动返回；前两次USER PASS、第三次USER FAIL，整体未通过。0.0.31两次独立尝试均首跳失败回零售探针主页面，USER FAIL。collector实际匹配source `8b6df55b68fd35724bdfc6bb00c8512c8da221b71e2482a351658e042d351114` / signed `fbd3fdd8856b23fcf09cdd9e006de79422943c05d82402682c6b14eac9346132`，HTTP读取/GET后关闭通过，FAIL `avplay.seek_restart_callback_pending`、history_f、source_pass、media_requests_v1_02、native_closed_confirmed。stage pending不能区分同步prepare拒绝/非READY回调等，未定位SDK或网络根因；无native错误条目不证明网络始终通过。手动报告另存私密device-native031-seek-report.json，0.0.30/31观察另存，startup不覆盖。

按ADR-008准备0.0.32：恢复原生seek默认策略，PREBUFFER仅保留显式HOST实验，增加固定SDK阶段/状态与原生桥有界flow/limit分类；TV确认后自动三次回跳及后续35秒时间轴检查，再等清理ACK开启报告。Back/Home可取消；自动时间轴只记UNVERIFIED，不替代声画。无新增权限、URL重获/延租、账号写入或手机控制接通。实际新包部署/验收另记，完整W01/F06/F20开放。


## 0.0.32 自动控制取证候选实际部署（2026-10-15）

W01/W02/F06/F20，auto6（cast-startup-report-once）/BiliProbe1.Probe。source `d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd`，signed SHA-256 `f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852`，native unsigned `519c04f4706d3d8906ad99b33048d017af463aa157367abf68b8a8081ad348c6`，源码ZIP `7545fa70f9785b7a6cc8993d1a8d6333de5a42a1d6a4585dcdbf0347a78178e4`。250不同本地检查PASS、strict/47模块/C syntax、真实Samsung SDK重新编译、三个unsigned/source/CA/许可门禁通过。同自有BiliSofa profile/Author/Public Distributor；无新增权限、证书或固件修改。

首次get-state exit1，重连唯一已有授权地址成功exit0，state复查/capability exit0；首次install exit0且install completed、run exit0且successfully launched。collector exit0，实际build精确匹配source，cast.ready/native_closed_confirmed、HTTP GET后监听关闭true、marker1。U800FD / T-KSU2EFAKUC-0090-1300.9 / platform9.0，engine major未知。startup原件device-native032-startup-report.json与准确部署ZIP/manifest/DELIVERY/unsigned按完整source冻结于仓库外私密目录；原始工具日志、签名包不入源码。

只证明部署/启动/发现监听与清理，未自动播放或验证新seek声画。用户需TV批准自动三次回跳+后续35秒检查；自动结果仅时间轴/SDK事实，不记声画PASS。0.0.30前两跳USER PASS/第三跳FAIL、0.0.31两次首跳FAIL保留。手机控制仍拒绝，三端完整F20/完整W01/v1.0.0未完成。后续默认manual本地工件与已安装auto6快照分开记录，文档补记不重复部署。无HEAD/remote/commit/push/公开发布。


## 0.0.32 自动检查失败与0.0.33诊断修正（2026-10-15）

用户启动TV批准的自动流程后，collector实际读取精确匹配source d64acd720cf93386bb2dfe9dab8b50d52e09678665b301cdcf0d44320333e1bd / signed f6de8263b7449793cecfc82a2e0537647d0b3a9eff04598650502f970de45852的报告：自动FAIL avplay.control_check_failed_network，SDK FAIL avplay.seek_callback_invalidvalueserror_b0_t0_sp，history_se。仅证明第一次seek成功回调、第二次明确可重试拒绝且SDK仍PLAYING，不等同用户确认声画；流程按故障结束并清理。错误快照flow_e_c2_p0_w4_m6_l5、停止flow_s_c0_p0_w4_m6_l5、source_pass、请求摘要02、native_closed_confirmed；HTTP/GET后关闭true。快照为2连接、0背压、4窗口、累计向上取整6MiB、剩余时间桶5；无字节/窗口/租期触顶证据，不能据此确定根因或证明网络全程正常。原件私密device-native032-auto-seek-report.json，startup独立保留。

源码复核定位诊断丢失：CastProbeView仅在UI代次有效时记录media_issue，关闭期间到达的底层固定错误被忽略；紧凑报告还可能让后来的media_stopped遮住较早issue。0.0.33候选把本次已验证issue与flow/limit一并保存到该run的局部集合，native ACK后才汇总；compact单独优先issue与limit，再考虑stopped，SDK/历史/清理仍保留。没有放宽late回调执行UI/播放的边界，没有改seek策略、网络预算、权限或C/WASM源。该修正只补证据完整性，不能宣称修复播放器。新包真实底层错误与回跳仍待取证，完整W01/F06/F20开放。


## 0.0.33 关闭期间错误留存候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354`，signed SHA-256 `4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82`，native unsigned `1e292a84af116f0d13aa1412af5254789af2325a01d48e40595e67b810c868d7`，源码ZIP `fd4ef338d72c7ad712596a50496dfa2c26a5f9c9eea07b35fb6b998fd55dfc99`。197不同本地检查PASS（122单元合同/73主UI/2native桌面）、strict/47模块及三类unsigned/source/许可门禁通过。原生四文件与0.0.32实际SDK编译逐字节相同，C源未改；本次未重复HOST桥或SDK编译声明。

state/capability exit0，首次install/run均exit0且平台成功，无重连/新增权限/证书/固件修改；同自有Author/Public Distributor。collector读取source匹配启动报告，cast.ready/native_closed_confirmed、GET后关闭true、marker1。设备元数据仍U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密原件device-native033-startup-report.json；准确部署源码/manifest/DELIVERY/native unsigned按完整source冻结，签名包及原始工具日志留仓库外。

只证明安装/启动/发现清理，0.0.32自动第二跳FAIL保留；0.0.33不改seek策略，待同一自动流程取回关闭期间的原生错误。完整W01/F06/F20/v1.0.0未完成，手机控制仍拒绝。用户已回复“开始”，正在取证；尚未将此次回跳或声画记PASS。默认manual本地重建不再次部署，部署与后续文档包配对分别保存。


## 0.0.33 首次自动尝试停在prepare（2026-10-15）

collector实际匹配source 83efe5007fa1d4eaadd16292d2ab5951d41f61005c5c322af0669762ed11a354 / signed 4f9cf2869cf43c62efb00ea1e1495bf2c5ae3d7cdffb1dd9b3768e50411b5b82。FAIL cast.avplay_prepare_timeout（15秒应用有界等待），source_pass/TV确认/批准/请求02、停止快照flow_s_c1_p0_w3_m5_l6、native_closed_confirmed，HTTP GET后关闭true。没有进入自动seek；没有原生issue/错误快照e，不能作为上一轮第二跳的同一原因，也不能证明底层网络正常。原件单存私密device-native033-auto-attempt1-prepare-report.json，startup不覆盖。

保持同一0.0.33/相同策略，已请求再启动一次相同自动流程，无新安装或放宽超时/预算。此轮起播FAIL、回跳UNVERIFIED，完整W01/F06/F20仍开放。


## 0.0.34 cast prepare有界观察候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94`，signed SHA-256 `af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731`，native unsigned `4176300df85f3805f8d753899912b6fd36d12e50271a92a2e46a13824621d056`，源码ZIP `59d41304016795ac2d02f2fdd20885bba62548a29666bc3639b645960b5015e8`。200不同本地检查PASS（124合同单元/74主UI/2native桌面）、strict/47模块及三类包/source/许可门禁通过；C源和native四文件与0.0.32实际SDK编译逐字节一致，无本次SDK重编译或HOST桥重新执行声明。

state/capability exit0；首次install/run均exit0且平台成功，无需重连/新增权限/改证书/固件；同自有BiliSofa Author/Public Distributor。启动collector精确source匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密原件device-native034-startup-report.json，准确部署源码/manifest/DELIVERY/native unsigned按完整source冻结；签名包/原始工具日志仓库外保留。

仅证明部署/启动/清理。0.0.33两次prepare15秒超时（未进入seek）与0.0.32第二跳FAIL均保留。新cast prepare30秒为有界观察实验，超时状态/原生错误回报待实际取证，不宣称修复声画或回跳。用户已收到相同自动流程步骤；手机控制仍拒绝，完整W01/F06/F20/v1.0.0未完成。后续manual默认本地重建与此精确auto6部署快照分开记录；无HEAD/remote/commit/push/公开发布。


## 0.0.34 实际起播、第二跳失败及原生超时证据（2026-10-15）

用户明确“开始播放了”，记所测实际起播USER OBSERVATION PASS；未明确确认本轮全部声画/三跳。自动报告与之后用户重新开启的手动报告均实际读取并匹配source 3815c593e7f1771acd9ee50122857dee8ba3785e07302dbc141e2d3cf27d7e94 / signed af0127c10c98c4828b27e12d000e4b5df980cf01f8bf25c51c4a205512511731。history_se、SDK InvalidValuesError_b0_t0_sp、control_check_failed_network，整体FAIL；source_pass/请求02/native_closed_confirmed，HTTP GET后关闭true。

首次完整保留独立native FAIL cast.media_issue_0_28：上游尚无HTTP状态时超时，不是HTTP403或已证实的解码失败。flow_e_c2_p0_w5_m7_l5（2连接、0背压、5窗口、累计向上取整7MiB、剩余30秒桶5）。不能据此认定所有SDK回跳错误都由同一原因造成，亦非资源上限证据。起播观察30秒未构成三跳通过。auto/manual原件分存私密device-native034-auto-seek-report.json / device-native034-manual-seek-report.json，startup保留。

0.0.35候选只对已批准匿名progressive GET，在本次范围尚无HTTP头/状态/正文的curl28超时，排队250ms后新连接重发同一范围。每个下游连接最多一次、整租期最多三次；重复消耗原窗口预算，保持原URL/Range、TLS/CA/host、3分钟/签名租期、128MiB/256窗口/512连接/4×64KiB边界。不重试部分正文、HTTP/范围/格式/证书错误，不重试seek/prepare/写操作，不重取URL或延租。进度retry_1/2/3只是已排队而非恢复证明，最大105帧/8条报告。新包实际效果仍待设备证据。


## 0.0.35 零响应GET有界重连候选实际部署（2026-10-15）

W01/F06/F20，auto6/BiliProbe1.Probe。source `0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510`，signed SHA-256 `7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1`，native unsigned `3718f6b55ac409a43a742e9edb32f667e7c8c36a84b0e68a9f898023c2d3ce36`，源码ZIP `57ed5e0c457883784cca67dcc6c3596f1dc7fb859b65dd40c143739962249cd1`。262不同本地检查PASS（126单元合同/75主UI/32桥/13source/14cast/2native桌面）、strict/47模块/C syntax、Samsung SDK实际重新编译（固定32MiB堆）及三类包/source/CA/媒体/许可门禁通过。

state/capability exit0，首次install/run exit0且平台成功，无需重连/改证书/固件/权限，同自有BiliSofa Author/Public Distributor。collector精确source匹配，cast.ready/native_closed_confirmed、GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup私密原件device-native035-startup-report.json，准确部署源码/manifest/DELIVERY/native unsigned按全source冻结；签名包与原始工具日志仓库外保留。

仅部署/启动/清理通过。新零响应GET重连能否恢复及三次seek/声画仍待相同自动流程取证；retry进度不等于恢复。0.0.34用户起播PASS/自动第二跳与native0_28 FAIL保留，未更改完整W01/F06/F20/v1.0.0未完成状态，官方手机控制仍拒绝。后续默认manual本地重建不重复部署，与上述精确auto6源码快照分别配对。无HEAD/remote/commit/push/公开发布。


## 0.0.35 单样本三跳/35秒声画通过（2026-10-15）

source 0d9cf2da0dc7f8091cd08de4fcdf0f731937376e4b907fa284352fb9cb557510 / signed 7c1739d9ff0765fe1e6ec0573afa8bc7595c85dfaa0ee9c630cc3b2202ad4ba1。实际匹配报告history_sss、avplay.control_check_complete_timeline_only、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。SDK三次回调和真实目标tick/后续35秒进度均按driver完成；原报告自动结论仍UNVERIFIED timeline_only，不改写为声画PASS。最后SDK成功摘要t0只表示回调操作窗口内未见目标±1500ms tick；driver在回调后继续观察目标区间，因此不矛盾。

用户对刚才自动三次回跳及后续播放明确反馈“声画正常，没有卡住”，本所测公开视频的三跳声画/后续无卡住记USER OBSERVATION PASS。流程结束主动回主页面为预期，不等同此前故障返回。flow_s_c1_p0_w10_m16_l4；没有media_retry进度或native错误，不能宣称重连支路被触发、恢复已证明或新代码为通过原因。重连真实分支/更多样本/长期稳定/完整F06、官方手机连接控制/三端F20与W01继续开放。auto报告/用户观察私密分存device-native035-auto-seek-report.json / device-native035-user-observation.json，startup不覆盖；历史失败完整保留。下一步推进真实官方手机会话/控制，不用这次TV确认候选结果冒充手机连接通过。


## 0.0.36 已确认 SOAP 手机控制候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2`，signed SHA-256 `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`，native unsigned `918d9e8f0614d7425b1aa8d22f3b9e486cc85e82799ad05343c9749c67bb9917`，源码ZIP `58d883bfbce9493b745e8096bda8a91d3eb606018fbaf9c4e0ad00b0f6e4e4ce`。本轮233不同实际检查PASS（137单元合同/80主UI/14 HOST cast/2 native桌面），strict/50模块/C syntax/真实Samsung SDK重编译及三类包/source/CA/媒体/许可门禁通过。HOST与桌面假后端不作官方手机或解码证明。

state/capability exit0，首次install/run均exit0且平台成功；沿用自有BiliSofa Author/Public Distributor，无重连/证书/权限/固件变更。collector UTC23:31:59精确source/signed匹配，cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。原startup另存仓库外device-native036-startup-report.json，部署源码/manifest/DELIVERY/native unsigned按全source冻结，签名包和原始日志私密保留。

此报告仅证明部署/前台发现启动/原生清理，未发送媒体，也未测试新peer getter的真实发送端语义或官方手机控制。已请求Android一次新入口投送：TV确认起播后，手机如未连接仅重选同一接收器一次，测手机暂停/继续，然后Back开诊断。SetURI/命令接受/声画/连接是不同证据；URI变化、额外协议或手机超时均可能阻塞，尚不记通过。iPhone/iPad HD/完整F20及W01仍开放。0.0.35所测三跳声画USER PASS及未触发重连边界保留。无HEAD/remote/commit/push/公开发布；后续默认manual本地包与本精确auto6部署分别配对。


## 0.0.36 官方Android连接/暂停继续通过，暂停态遥控跳转失败（2026-10-15）

匹配source `9224410c31b8030e2abdaffbdc681e59824bf48f97005fbbc644458de9f02ba2` / signed `9823f30ed1c4eb106b6defe111eb6f8c2021abe91df1891f295e08d1ac441922`。用户明确“手机已连接＋暂停继续有效”，记本轮未修改官方Android、普通UGC单样本连接及手机暂停/继续USER OBSERVATION PASS。用户同时反馈手机暂停后，遥控器“跳到5秒”导致退出：该组合USER FAIL。不是完整手机seek/Stop/状态显示、恢复、更多内容或三端F20通过。

实际报告UTC23:34:39：avplay.seek_callback_invalidvalueserror_b0_t0_sh（错误回调时SDK仍PAUSED，e为可手动重试拒绝）、history_e、独立native cast.media_issue_206_28、flow_e_c2_p0_w7_m12_l4、media_retry_1、source_pass、请求02、native_closed_confirmed；HTTP GET后关闭true。原生错误是收到206后的上游超时；旧重连只覆盖尚无HTTP头/正文，不覆盖本次状态。首次观测retry_1仅证明排队，未导出每连接关联，不能判定该重试恢复到了206或证明所有SDK错误根因。原件/用户观察另存私密device-native036-phone-paused-seek-report.json / device-native036-phone-user-observation.json，startup保持。

发现0.0.36手机快照每200ms在seek期间读getDuration，违反Samsung seekTo异步期间不得调用其他API的规则；这是SOURCE缺口，不能直接断言本次全部错误都由它造成。0.0.37在coordinator正在prepare/seek时使用缓存时长，adapter也拒绝pending期间读duration。native新有限续读只对完全校验的206+curl28，从start+received继续原窗口，保留已收到但未送出的缓冲与原下游响应头；2次/客户端、3次/原租期共享，250ms退避和原固定URL/TLS/CA/期限/窗口/字节限额不变。不重试SDK或写操作。细节见ADR-008追加。

旧8条报告在history路径会漏receiver_summary，0.0.37已修正优先级，仍最多8条。历史报告不补造已丢失会话事实；本轮手机连接控制通过依据是用户实测。新包效果须新设备结果，不提前记修复PASS。


## 0.0.37 暂停组合修正候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12`，signed SHA-256 `e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc`，native unsigned `963f3a8de43d48ff2865615a14ba4a0c0075fd8ec2fde000e42f26df24f6134f`，源码ZIP `ff99417214cac205fbaff11b992f6fae4b7b51c2522092d9949f72c07318b399`。287不同本地检查PASS（140单元合同/81主UI/37 HOST桥/14 HOST cast/13 HOST source/2 native桌面）；strict/50模块/C syntax、真实Samsung SDK重编译/固定32MiB堆及三类包/source/CA/媒体/许可门禁通过。默认manual重建与本精确已装auto6冻结源码分开配对。

state/capability首次exit0，首次install/run exit0且平台成功；同自有Author/Public Distributor，无重连/权限/证书/固件变更。UTC23:42:46匹配source/signed报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1；U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，引擎主版本未知。startup原件单存私密device-native037-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结。

该自动检查没有媒体/真实手机命令，仅启动/清理DEVICE REPORT PASS。0.0.36手机连接/暂停继续USER PASS和暂停遥控seek USER FAIL独立保留；已请求0.0.37只测手机暂停→遥控seek保持暂停→恢复5秒附近声画→交还手机控制，最后开诊断。修正调用互斥和有限续读仍须本机新结果；全F06/F20/W01、iPhone控制/iPad HD路线与账号/PGC/live/F19等开放。未commit/push/发布或执行账号写入。


## 0.0.37 手机连接/电视声画未通过，0.0.38起播握手候选（2026-10-15）

用户先反馈“手机无法投屏播放”，随后明确“电视也没有声画”。0.0.37本轮官方Android连接/起播USER FAIL；暂停/遥控seek/交还控制未到达，不记为其新修正通过。匹配source ea3c206d239af2de74d05c81fb459a96b947864a59230c174d98111c8b8e9d12 / signed e62917423fb58ee547707bf23381569763cc53e3597953e56f2f73c0d91977dc，UTC23:49:01报告receiver_summary_v1_04201仅approved/control_denied/denied_stale，SOAP摘要为transport_query/uri_offer_rejected/stop_rejected/extra scalar/HTTP URI/oversized metadata，source_pass、avplay_started API调用、请求02、native_closed_confirmed，HTTP GET后关闭true。没有实际时间tick/声画证明；没有独立decoder/native错误保留也不能证明它们正常。原件/用户观察私密另存device-native037-phone-start-report.json / device-native037-phone-user-observation.json，startup与0.0.36局部USER PASS独立保留。

源码发现确定的时序缺口：首次UI准备帧后，200ms状态心跳原在prepare完成/播放后才启动，prepare可等待30秒，接收器却在3秒后拒绝“旧快照”。原始stale码未细分，不能断言本次必为该唯一支路。0.0.38在prepare等待期间也发送协调器真实状态、缓存时长和递增帧号，不读busy SDK。已批准的同一URI幂等确认无需查询解码器；首次TV自动播放意图在原30秒准备窗口内可幂等接受Play而不再次分派SDK，查询只报TRANSITIONING。Pause/Seek/Stop在准备中仍拒绝；真正开始播放后继续3秒快照门禁，不延长180秒/签名租期、不接受新URI或不同peer。

新增固定快照发送/Worker接收/应用/拒绝、具体stale原因（missing/old/expired/clock）、本地inactive及实际时间tick/变化事实。只有实际backend时间事件能产生tick事实，它不等于声画PASS。29事实用receiver_summary_v2_8hex汇总，v1报告仍可读取；IPC上限161/报告最多8条。无history时也固定保留media flow/清理，避免被早期批准提示挤掉。C/WASM网络策略/SDK字节保持0.0.37，不从本次失败推翻或宣称206续读已证实。


## 0.0.38 起播状态/握手候选实际部署（2026-10-15）

W01/W02/W06/F06/F20，auto6/BiliProbe1.Probe。source `4ce22544ca976c6d1d2ef564643d7b2752acd67d5021dcde76be69a8e63f7b28`，signed SHA-256 `aac28c1e7ce688c78105ac2cce4fccf55ef56399fb24b7649fd897db138502af`，native unsigned `7ee6bf1ab3118c01bd51d3fc7ebae8f289d269f0c024dad778ae1807a0bea8a5`，源码ZIP `ecc3ff868625b1a8ea8dad4c138cfa264a0a10b90f94ba57487fb450044b9ff6`。228本轮不同实际检查PASS（143单元合同/83主UI/2 native桌面），strict/50模块及三类包/source/CA/媒体/许可门禁通过。C与JS/WASM/data/manifest四个原生工件已对已装0.0.37签名ZIP逐字节核对相同；本轮没有SDK重编译或HOST网络重跑声明。

初次SDB get-state exit1后，只重连同一个已授权目标，重查state/capability均exit0；首次install/run exit0且平台成功。沿用自有BiliSofa Author/Public Distributor，未改权限/证书/固件。UTC23:58:31精确匹配source/signed的报告cast.ready/native_closed_confirmed、HTTP GET后关闭true、marker1，U800FD/T-KSU2EFAKUC-0090-1300.9/platform9.0，engine major未知。startup原件私密device-native038-startup-report.json，源码/manifest/DELIVERY/native unsigned按全source冻结，工具原始日志与签名包保密。

此为启动/清理分项DEVICE REPORT PASS，没有实际投送或解码。已请求0.0.38只验证官方Android连接、电视画面与声音，准备最多30秒，起播后观察约20秒再开诊断；暂停组合暂不重复。0.0.37手机/电视均未成功起播USER FAIL、0.0.36手机连接/暂停继续USER PASS分别保留。新时序修正仍待实测，完整W01/F06/F20及三端/账号/PGC/live/F19保持开放；无HEAD/remote/commit/push/公开发布。后续默认manual文档重建不重复侧载，运行时五文件与本精确auto6配对。
