# 发布准备

目标是完整 v1.0.0；当前仅 W01 候选，不可发布为已完成产品。

- [ ] F01–F20 和所有零售设备门槛通过。
- [ ] W01 运行时 ADR 落定。
- [ ] 可复现最终 WGT/TPK、SHA-256、源码快照。
- [ ] 私密签名包独立保存，author 身份保留，无 DUID/私钥泄漏。
- [ ] 第三方固定版本、许可证、NOTICE、来源完整。
- [ ] 冷启动、电脑关机、升级/回退与数据保持。
- [ ] 官方 Android/iPhone/iPad 发送端完整控制与实播。
- [ ] GitHub owner/remote/发布明确授权；本次未 commit/push/发布。

构建探针、unsigned 包或桌面测试通过不关闭上述产品项。

## 已准备的内部材料

- [x] 真正可构建基础探针、固定 npm lockfile、strict/行为/UI gate。
- [x] 可复现 unsigned 基础 WGT；实际 SHA-256/源码快照由 delivery 工具记录。
- [x] 开发说明、SDK/host 阻塞、分离签名/安装模板、遥控操作、Case 与验收模板。
- [x] 自有 MIT 与开发依赖来源/固定版本/许可证登记。
- [x] 有意义的 CI workflow 源码；未执行 hosted CI。
- [x] 发布材料草稿（RELEASE_DRAFT），明确不可发布状态。
- [x] W01 原生 generated runtime / cURL/OpenSSL/zlib/CA 许可登记与原文保留、Samsung 编译、unsigned native 包。
- [ ] 最终产品网络依赖安全评估/升级及真实 TLS/账号验证；旧 SDK probe 依赖不是最终安全选型。
- [x] Developer Mode/目标连接元数据（tv/9.0）；不代表 App 设备验收。
- [x] 用户自己的 Author/Public Distributor，实际可安装的私密探针及部署记录；原第三方身份排除使用。

只有上述内部准备完成；完整产品发布项继续开放。

内部 0.0.5 源码匹配的真实 TV 网络报告与 0.0.4 手机成功反馈已取得；0.0.7 固定 loopback MPD 合成声画/暂停/继续/seek/Back重入已获用户通过反馈；真实内容和其他设备门槛未验收。签名工件都在仓库外，最新公开 unsigned/source 工件不自动继承已部署包的验收。

0.0.9内部auto探针已签名、安装并读取source匹配报告；KeyManager合成往返清理/当前CLI更新marker保持已取得设备证据。精确signed hash `e6fe5133fa9c19d0019c49c3ae0a75e04d9e66fbeeef465bb8a1d6ca7e103a27` / source `8042ae3f5934300494c05784dd7908871aa36436a3f4c16aafa92231be8e62a8`，归档见SIGNING_DEVICE_RECORD。完整v1.0.0与真实会话安全/F20继续未完成，无commit/push/远程CI/公开发布。

当前发布范围依据[ADR-003](../../adr/003-read-only-comments-danmaku.md)：评论/回复与点播/直播弹幕只读，F15/F16保留追踪并与F10/F08/F18合并验收；不要求编辑/发送/评论删除。须验证没有对应入口/写请求。F03首字母输入/联想及其他保留功能仍需通过，不因本次范围调整自动标记完成。

0.0.10候选新增AOSP固定来源首字母词语数据，原始Apache-2.0版权/许可随basic/native两包分发；源码数据/变换/原始与派生hash已记录。输入候选能力不等同真实搜索完成，完整v1.0.0继续未就绪。


0.0.11首字母两行第一列导航/选词用户回归通过；0.0.12合成KeyManager退出/CLI重开读回/清理真机报告通过。57项本地检查通过。精确自动/manual工件分别见SIGNING_DEVICE_RECORD；保护存储/加密/跨包隔离/断电与真实账号、官方三端投屏继续开放。完整v1.0.0未就绪。


0.0.12主页面/NH候选Voice Guide/Back用户通过；0.0.13主包→不同包只读→主包三阶段合成数据隔离实际报告通过，临时观察包清理另记。64项本地检查通过。仅新增W01开发证据，不关闭产品安全/真实会话/独立冷启动/F20/全量v1.0.0。


0.0.13电脑关机/电视正常重启后的探针启动、合成KeyManager读回清理、合成MPD声画用户通过；0.0.14电视内guest热门HTTPS HTTP200/API0/4条实际读取并规范化通过。88项本地检查通过。准确hash与模式见SIGNING_DEVICE_RECORD；本轮并未关闭整个F02/真实账号/UGC/PGC/live/F20或v1.0.0。


0.0.20候选发现包：69单元/合同、31主包UI、HOST cast10/guest5/bridge9、native桌面2共126项PASS，strict/43模块、C语法与固定SDK重编译通过。原始研究代码/客户端身份/keys未复用，新增原创协议探针出处已登记。三端官方发现/连接/媒体控制/恢复尚未验收，完整W01/F20/v1.0.0保持开放。签名侧载和私密证据按独立记录；无commit/push/公开发布。


0.0.20 TV发现启动cast.failed_13已记USER OBSERVATION FAIL；0.0.21修正未支持选项并分TTL/入组阶段，新增启动→清理ACK→报告内部模式。117项本地行为检查、strict/C syntax/固定SDK重编译通过；三端官方完整投屏未通过，安装/自动取证仍须按精确工件记录，不能关闭F20/W01或发布v1.0.0。


0.0.22预打包：有界SOAP解析/私有RPC/无媒体查询候选，无新依赖或客户端身份。136项不同本地检查及strict/C/SDK通过；Android/iPhone发现用户PASS来自0.0.21，iPad未见仅AirPlay仍开放。真实连接/媒体/控制/三端兼容和完整W01/v1.0.0未完成，不发布。最终包/hash/部署结果以随后精确工件记录为准。


0.0.23预部署：141不同本地检查及strict/C/SDK通过；无新依赖/权限/身份。SOAP分类/摘要和声明兼容属于内部探针，实际媒体、HD发现、完整W01/F20未完成。0.0.22状态查询/控制拒绝的TV事实已保存，原startup报告保留；不能把未定位invalid写成媒体问题已修复。


0.0.24预部署：148不同本地行为检查、strict/C/SDK通过；完整参数/URI/metadata分类仍为内部探针，没有放宽接收/网络或引入新依赖。0.0.23实机已定位offer参数拒绝，不记媒体修复；HD发现与完整F20/W01/v1.0.0继续开放。


0.0.25预部署：165不同本地检查及strict/C/SDK通过，修复内部extra/较长metadata窄化兼容并准备HTTPS-only单次范围候选，ADR-005记录。产品接收/状态/声画/F20和HD发现仍未完成；旧SDK依赖仍probe-only，不将legacy TLS栈批准为真实账号产品网络栈，无发布。


0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。

0.0.26内部包已实际签名安装/启动且监听/原生清理匹配报告通过，精确hash见SIGNING_DEVICE_RECORD。191本地检查不替代TV声画/官方完整接收与三端控制；仍不可发布完整v1.0.0。后续文档manual unsigned/source只作最新可审阅交付，电视保留上述auto6签名工件等待反馈。

0.0.27预部署：152本地检查/strict通过，修复确认提示被手机轮询覆盖并记录两阶段回执/超时；不把0.0.26候选过期推断为解码失败，不扩大为F20修复。沿用未改动且hash匹配的0.0.26 native编译产物，三包重新gate/签名安装另记。

0.0.27仅一次install超时124，未重复安装；随后run0与新source匹配报告确认实际更新，CLI安装成功回执仍未知。154本地检查/监听与清理通过；新版确认操作/实际声画和完整F20继续待验收，见SIGNING_DEVICE_RECORD。


0.0.28 W01/F20内部候选：progressive HTTP与有界续段见docs/adr/007-progressive-mp4-http-probe.md（docs内为adr/...）。八个C文件修改后已实际Samsung SDK重编译；仍为probe-only旧网络依赖，不批准真实账号产品栈。无新依赖/权限/外部服务/复制客户端身份或实现；新增HTTP/API事实仅按官方RFC/Samsung枚举，保留原第三方许可。TV新包声画仍需用户反馈，不能把prepare失败或HOST通过更改为实际播放PASS。

0.0.28第一次install/run均exit0且平台成功，匹配启动/清理报告通过；208本地检查和HTTP候选实现不证明TV声画。实际签名hash/精确源快照见SIGNING_DEVICE_RECORD，新媒体与完整F20仍未验收，无发布。

0.0.29内部控制回归候选：214本地检查、SDK真实重编译、三类unsigned门禁及自有profile签名/目标TV安装启动与自动报告已通过（详见SIGNING_DEVICE_RECORD）。暂停/回跳等待新包用户回归；完整F20/生产网络栈/全量v1.0.0未完成。精确部署快照私密冻结，后续默认manual包与部署工件分开记录；未授权公开发布。

0.0.30：171不同本地检查/包门禁、自有profile签名/设备安装启动/匹配报告与监听清理PASS。native复用0.0.29已验证字节，无SDK重编译声明。0.0.29长暂停USER PASS、回跳FAIL保持，新包回跳待反馈；完整F20与v1.0.0仍开放，未commit/push/公开发布。首页状态矩阵已同步0.0.30，初始核查和历史工件结果保留。

0.0.31内部候选：181不同本地检查/包门禁、自有profile签名/目标TV安装启动/source匹配/监听清理PASS；原生SDK字节复用并比对0.0.30，不声明新编译。新PREBUFFER_MODE设备支持、两次回跳+后续35秒待用户反馈；0.0.30 SDK错误/自动返回FAIL、顺序歧义保留，完整F20/v1.0.0继续开放。准确部署快照私密冻结；文档默认manual包另配源码/hash，无commit/push/发布。


0.0.36内部探针已完成233本轮检查、实际SDK编译/包校验/自有签名与TV启动清理取证。新手机控制候选依ADR-009等待官方端真实验收；不是产品release或完整F20/W01通过。已装auto6与本地默认manual源码/unsigned配对记录分开，精确身份见SIGNING_DEVICE_RECORD。发布/commit/push仍未授权。

0.0.37内部探针：287本轮不同检查/真实SDK重编译/三类包门禁/签名安装与TV启动清理完成；暂停组合与206续读真实效果待用户，未继承0.0.36连接/控制为新路径通过。精确工件见SIGNING_DEVICE_RECORD。完整产品与公开发布未完成，既有工作/无HEAD状态保留。

0.0.38内部探针：228本轮不同检查/三类包门禁/签名安装与TV启动清理通过；原生四文件复用0.0.37实际SDK产物，未声称重新编译/重跑HOST。实际起播/手机连接待用户，新自动报告与默认manual源码/包配对分开。完整产品及公开发布仍未完成。

2026-10-18 W02第七批当前交付见[W02_NETWORK_APP](../../W02_NETWORK_APP.md)：0.5.0新ID已签名并获平台安装/启动成功，347单元/合同、32浏览器合成、3打包负例通过；真实新ID功能及性能仍待验收。签名包/证书XML/源码及原始日志私密保留，公开源码/Release未创建、未commit/push。匿名热门之外的内容接口、具体互动业务写操作、F07云端/F19及W03–W07未完成，不能发布为完整v1.0.0。

0.5.0用户首组后保留首次获取源失败与其余分项通过；当前0.5.1取源脱敏补丁已签名安装/启动，353单元/合同、34浏览器合成和3打包负例通过，实际错误原因待一次有界观察。工件/源码/SDK与用户证据分层见[W02_SOURCE_DIAGNOSTICS](../../W02_SOURCE_DIAGNOSTICS.md)，不作为故障已修复或完整产品发布证明。


2026-10-18追加：W03 0.6.0排行榜内部候选已构建/扫描/签名/私密归档，新增目录WASM与原8项identity/native保持分离，公开unsigned包存在；连接预检失败故未安装。HOST接口200/API-352及真实TV排行榜/量化性能未确认，W03–W07完整功能继续开放，不是发布就绪或v1.0.0。无新账号写入/证书变更/公开发布/commit/push。


2026-10-18更新：0.6.0连接恢复后已成功侧载启动，签名/源码配对见W03_RANKING_APP；USER排行榜验收仍待反馈，未达到完整W03/v1.0.0发布门槛。


2026-10-18追加：W03 0.7.0匿名视频搜索内部候选已构建/包扫描，AOSP字典和NOTICE固定hash且保留Apache许可。未通过TV前不记完整搜索通过，F03其他类型/热搜/历史和W03–W07开放；未进行发布、账号写入或Git提交推送。


2026-10-18追加：0.7.0内部包已签名并成功侧载启动，源/包配对保存在私密目录；视频搜索USER验收待回传。F03其他类型/热搜/历史及完整W03–W07保持开放，不标发布就绪。


2026-10-18 0.8.0内部候选：本地搜索历史/显式重试/有界范围超时恢复已实现，本地56界面/371单元/7包负例通过，旧16条native不变，工件/限制见W03_HISTORY_RECOVERY_APP；未获USER结果前不记TV新功能通过。0.7.0首搜索412/首音轨28与恢复分别保留。完整F03/W03–W07及发布门槛仍开放，无Git提交推送或云端写入。


2026-10-18追加：0.8.0已自有profile签名并安装启动，source/signed配对见W03_HISTORY_RECOVERY_APP；历史USER验收、实际媒体超时恢复及完整W03–W07仍未确认，不标发布就绪。


2026-10-18：内部0.9.0热搜unsigned工件与来源/门禁见W03_HOT_SEARCH_APP。新增固定匿名域名不是任意目标能力；运行时/热词数据不从外部脚本加载。旧16项原生保持，原AOSP通知保持，无新第三方依赖。signed WGT/证书/设备输出仅私密存放，公开release与完整F01–F20验收未完成。


0.9.0实际部署：UTC2026-10-18T20:37:43.314407+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `ec2911a90ec65380db16f95ea9ddc7ae6b8d2ab2a769c98973cd453ad2bc0cd2`，455文件源ZIP SHA256 `7cefe4099c26dcc2ba8dfc2d43fec8a32dc0112e3e5c746ab38a7a35aa7ab837`。沿用自有Author/Public Distributor，无新权限/证书/SDK变更；旧0.8.0工件及最终USER记录保持。9项包负例最终全部通过。仅安装/启动证据，新热搜功能USER仍UNVERIFIED，只安排一次显示/方向翻组/Back/选词组，不重测历史或媒体。


2026-10-18追加：0.9.1搜索格式修复未引入依赖/权限或复制官方网页JS到包，观察材料与实际卡片私密留存；源码只实现通用数字格式和固定错误类别。旧20项原生保持，工件hash/来源见W03_SEARCH_FORMAT_FIX；TV搜索恢复与412仍未验收，不是完整F03/W03或公开Release。


0.9.1实际部署：UTC2026-10-18T20:51:40.216791+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `42c35d1e4f24b2d07eef5f92fcafbb6bc0d804e8d2f85827eea0fc68a1eb1c89`，457文件源ZIP SHA256 `71c922e79cac113a4f3996f3ddf59c8bfd72835621c5b61cc2732388359ef384`。原20项native保持，自有Author/Public Distributor沿用，无新权限/SDK/凭据/存储变更。仅安装启动PASS，USER修复观察仍待一次搜索，不重试/不播放。HTTP412继续OPEN，旧0.9.0失败与材料保留。


2026-10-18追加：内部0.9.2只重建search模块；公开动态WBI材料非用户秘密、不持久化，包无官方网页脚本或新依赖。固定nav/WBI参数、无未签名fallback门禁与来源/CA校验必须通过。原16条native保持，自有签名/私密输出保持。不是完整F03/W03或v1.0验收。


0.9.2实际部署：UTC2026-10-18T21:06:57.038990+00:00开始，state/capability/install/launch均exit0且平台明确成功。signed SHA256 `82669819d54dc324873e8af20cfe14f1ba0c215cc970e7ef7842aee6711d457c`，461文件源ZIP SHA256 `0bada7b2669a1c0c39a0f597c5fcdd04de2afdb496d54ee63bdd51c777e24856`。自有Author/Public Distributor沿用，无新权限/SDK/存储或账号变更；原其他16项native保持，旧search及失败工件保留。仅安装启动PASS，新协议USER首搜/前后页待一次固定组；不能记HTTP412稳定性或完整F03通过。


2026-10-18追加：内部0.10.0 UP搜索不是完整F03/F04/W03或v1发布。只新增固定匿名查询/UID摘要/搜索附带预览，无账号写入、新权限/SDK/外部服务；待本版包/签名/部署及唯一UP人工组。旧已通过组和HTTP412等失败原件保持，见W03_USER_SEARCH_APP。


最终包门禁：12项负例通过（保留11项，新增篡改bili_user固定类型后拒绝）；首轮新增断言误写route而工具实际返回query，修正断言后通过，未降低门禁。与0.9.2相比identity/native/catalog/hot-search共16条逐字节保持。unsigned `dist/BiliSofa-W03-user-search-unsigned.wgt` SHA256 `3ded7a58e8cbc6e8af1022c3fd4e50337f74a8e0cb03046273bff6ac73eb8adc`；signed SHA256 `6e0470f773e81fd853da6d2204be695ae782665c7dced34547ad9c2d8d907e9d`；UI sourceHash `88b17bb9926f452e73bd55a0c4a0f9b6a5aa10350da61740431156fff6f5faf5`。沿用自有Author/Public Distributor，签名日期/issuer及原包逐文件一致检查通过。签名不是TV安装或新UP功能验收；部署与USER另记。


0.10.0实际部署：UTC2026-10-19T00:45:07.465611+00:00开始，state/capability/install/launch均exit0且平台明确成功。此前同包第一次state成功、capability返回连接关闭，未安装；按原地址一次有界重连确认成功后，本次四步通过，失败原件保留。469文件源ZIP SHA256 `aa48a1ea3d64ea82216f83c5f3bb1f69a4b525a28ce40f0a2df100d3097dcbf5`，signed SHA256 `6e0470f773e81fd853da6d2204be695ae782665c7dced34547ad9c2d8d907e9d`，UI sourceHash `88b17bb9926f452e73bd55a0c4a0f9b6a5aa10350da61740431156fff6f5faf5`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；未改旧0.9.2及其USER结果。新UP真实功能USER UNVERIFIED，只请求交付页所列一组，不由平台启动推定搜索/声画通过。


0.10.1本地最终门禁：388单元/合同、140模块strict/边界、26搜索＋16媒体＋6投屏浏览器流程（共48项）及12包负例通过，重复执行不重复计数。新增遮挡场景对原0.10.0失败、修复后通过，暂停/seek/Back/续播/Home覆盖保持；本版未重跑原生HOST TLS或SDK链接，全部五类20条native与0.10.0逐字节一致。没有原始TV帧或解码报告，新版电视画面修复仍UNVERIFIED。


0.10.1工件：unsigned `dist/BiliSofa-W03-user-preview-fix-unsigned.wgt` SHA256 `d77a8e0ffc75bb388bb9a531fc3397ca04e4c3b2e8eb607bbb58b41a0112e177`；signed SHA256 `b30cba1d854721814dd889466d6f507a29f3c026304ccb391068900e3352d2ef`；UI sourceHash `ff72582724811ce1056f294409f85064774e0c1d865d1ea42c460a73d9bd028f`。沿用自有Author/Public Distributor，证书日期/issuer及签名前后payload一致检查通过；未增加权限。部署及USER结果另记，旧0.10.0画面FAIL和source配对保持。


0.10.1实际部署：UTC2026-10-19T00:54:31.288236+00:00开始，state/capability/install/launch四项均exit0且平台明确成功；本轮无需重连/重复安装。470文件源ZIP SHA256 `b2d0eb27acecf2fa5e2953d2bfab0b55d19d447e5951f0ddd601ee1fc141a61c`，signed SHA256 `b30cba1d854721814dd889466d6f507a29f3c026304ccb391068900e3352d2ef`，UI sourceHash `ff72582724811ce1056f294409f85064774e0c1d865d1ea42c460a73d9bd028f`。源ZIP在部署前冻结，后续部署/文档单存delivery-records，旧0.10.0 USER画面FAIL不覆盖。USER修复结果待一次同预览约10秒声画与Back摘要恢复；仅安装启动PASS，不推定真实画面已恢复。


0.11.0本地最终验证：394单元/合同、144模块strict/边界、31搜索（含5新PGC及UP画面回归）＋10本地＋4目录共45项相关浏览器流程和13 HOST TLS通过。搜索SDK实际链接/CA/私密模式与来源扫描通过。1920×1080番剧结果/摘要截图检查完成，仅桌面布局证据；原身份/投屏全组未本版重跑，不算新通过。完整PGC播放/选集未实现，新番剧TV查询仍待。


0.11.0包/签名：13项包负例通过（新增篡改media_bangumi固定类型后的拒绝检查）；identity/native/catalog/hot-search四类16项与0.10.1逐字节保持。unsigned `dist/BiliSofa-W03-pgc-search-unsigned.wgt` SHA256 `74f27184061749b17d305bb55b9d633573acb40248b3eade9e199c0df3462aea`，signed SHA256 `cb85dd37abc01ca036b7ba8f9a614c1a9f42a2c8c8756013aa30e0023dd0d55a`，UI sourceHash `302ba333087c6bc839477195a0462421550b541e103741a63b6b16044e311385`。自有Author/Public Distributor、签名日期/issuer和payload一致检查通过，无新权限；部署及USER另记。


0.11.0实际部署：UTC2026-10-19T01:10:24.084562+00:00开始，state/capability/install/launch均exit0且平台明确成功；本轮无需重连或重复安装。478文件源ZIP SHA256 `3a0db599d413c6364533a84db928dc215988564c5015b08907cc2d5c20ac72a6`，signed SHA256 `cb85dd37abc01ca036b7ba8f9a614c1a9f42a2c8c8756013aa30e0023dd0d55a`，UI sourceHash `302ba333087c6bc839477195a0462421550b541e103741a63b6b16044e311385`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；0.10.1 USER音画/Back通过及0.10.0原画面失败均保留。新番剧USER读取/摘要/Back待一次固定组；本次仅安装启动PASS，完整PGC播放/选集、F03/F04/W03及v1未通过。


0.12.0最终本地验证：400单元/合同、148模块strict/边界、36搜索＋16媒体＋6投屏＋10本地＋4目录＋10身份共82项不同浏览器流程通过；同项定向复验/重跑不重复计数。直播结果/摘要和紧凑首页1920×1080截图已检查，原UP合成视频平面回归通过。14 HOST原生TLS及实际Samsung链接/CA/来源扫描通过。初始两种UI失败、类型字段修正与旧stage中止记录保持，最终不放宽断言/超时。未执行新的真实账号动作或TV声画组；新直播搜索USER仍待。


0.12.0包/签名：14项包负例通过，新增固定live_room类型篡改拒绝；identity/native/catalog/hot-search四类16项与0.11.0逐字节保持。unsigned `dist/BiliSofa-W03-live-search-unsigned.wgt` SHA256 `6b53cd58266ee1ed32828b12b38a1c45f3db4017e4d0e78d2921eebdb27eefe7`，signed SHA256 `a083dee9daa7aac2bfef3f318050f49126077c2af7dc09fe6c5359cb7ca78516`，UI sourceHash `5258badfb329ef890eaf78abb64e336412abb7d21e77fcf9e009c99dc9c2229a`。自有Author/Public Distributor和签名日期/issuer、payload一致校验通过，无新权限；侧载/USER另记。


0.12.0实际部署：UTC2026-10-19T01:27:35.436992+00:00开始，state/capability/install/launch均exit0且平台明确成功，本轮无需重连或重复安装。486文件源ZIP SHA256 `822f2b05263f904094eb8c43e33e5a61c3a0b5bbd0e2ca4b11a07b931f73fa14`，signed SHA256 `a083dee9daa7aac2bfef3f318050f49126077c2af7dc09fe6c5359cb7ca78516`，UI sourceHash `5258badfb329ef890eaf78abb64e336412abb7d21e77fcf9e009c99dc9c2229a`。源ZIP在部署前冻结，后续部署/文档另存delivery-records；0.11.0番剧最小组USER PASS及既有失败记录保持。新直播查询/分页/摘要/Back USER待一次固定组；本次仅安装启动PASS。未执行新的TV声画/账号组，完整直播播放、F03/F04/W03及v1仍未通过。


0.13.0内部固定分区榜不等于F02或完整W03验收。记录官方14项来源/生成一致性、榜单键隔离/关闭门槛、HOST API-352及唯一TV功能组；保留其余分区/个性化和私人内容缺口。签名包/源ZIP/hash/部署证据须配对，原0.12.0及USER通过不覆盖。


0.14.0只读稍后再看：保留0.13.0动画/舞蹈API-352失败，新增私人读取不能作为匿名接口绕行。需配对新源ZIP/签名hash/实际部署及同账号列表一次USER核对；不把合成A/B或空列表当完整F05/真实双账号通过。W01未知写记录与授权不复用。


0.15.0内部历史只读不能关闭F05或F07双向接续。要求签名/源/hash/实际部署配对，USER同账号历史一次核对；空列表不要求开启历史或生成新观看。保留0.14.0 USER通过、0.13.0 API-352和两次未知写记录，无新云写操作。


0.16.0收藏只读内部交付见W03_FAVORITES_APP/ADR-046；导航窗口未必完整，夹内容限25页。公开前不得把本批候选或平台启动当作完整F05/v1通过；自有证书和私人历史/收藏数据均留仓库外。


0.17.0关注更新内部候选的来源/范围/闭合与包证据见W03_FOLLOW_UPDATES_APP及ADR-047。导航摘要不算完整图文动态或F04；主动态页面412、UP投稿和F05队列继续跟踪，私有数据/游标/签名资源不公开。


0.18.0内部本机队列边界见W03_LOCAL_QUEUE_APP/ADR-048。仅匿名360P首P，原15分钟内部lease未解除，完整云端列表入队/会员/PGC及长连播未验；不得把本机队列最小组写成完整F05/W03/v1。保护会话/未知写意图不迁移或清空。
