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

当前发布范围依据[ADR-003](adr/003-read-only-comments-danmaku.md)：评论/回复与点播/直播弹幕只读，F15/F16保留追踪并与F10/F08/F18合并验收；不要求编辑/发送/评论删除。须验证没有对应入口/写请求。F03首字母输入/联想及其他保留功能仍需通过，不因本次范围调整自动标记完成。

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
