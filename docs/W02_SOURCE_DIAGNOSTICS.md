# W02 0.5.1：首次取源失败的脱敏取证

日期：2026-10-18。W02/F02/F06，见[ADR-034](adr/034-owned-media-failure-evidence.md)。只补失败保留和反馈，未声称修复实际内容/网络根因。

后续0.5.1用户已反馈`ugc.view_unsupported`，新ID账号组也已通过；当前组合门槛见[W02_DEVICE_ACCEPTANCE](W02_DEVICE_ACCEPTANCE.md)。下面构建/部署和首次请求记录保留原阶段。

## 已有用户结果与本次变更

0.5.0的焦点、成功视频声画/续播、Home停声及10秒设置重开已获用户通过；首张卡在“获取播放源”阶段失败，换另一张卡才成功。该结果与0.5.0 source/signed配对归档，不记为同卡重试恢复。具体视频/原生错误未知，游客播放整体仍部分通过。

代码核查发现：原GuestPlayback丢弃Worker闭合结果的`ugc.…`码，MediaSession又将所有终止合并为failed，页面仅显示“播放失败”。0.5.1保留首个严格校验的MediaFailure（固定phase/reason和可选既有ugc源错误），在清理前缓存、decoder/native关闭后交给应用。页面区分当前游客路径不支持与读取失败，并保留末尾码；本次进程诊断同步保留。普通成功、Back/Home与迟到回包不会制造失败。

只允许规范化HTTP/API/cURL/源结构分类，无视频/账号标识、标题、CID、URL、token、请求头或SDK原文。错误合同有字节/字段/原始类型及代码白名单；diagnostic getter异常或坏数据不会阻止清理。诊断仍仅内存最多32条、每页8条，清除只清诊断，不触碰写意图。其他媒体阶段目前仅有固定错误原因，不冒充精确SDK故障取证。

未改取源刷新次数、播放器策略/时限、范围/目标/CA/TLS、内部媒体租期、KeyManager键或账号写操作；未增加自动重播/重试或外部服务。评论/回复/弹幕仍只读。

## 工件与部署

| 项目 | 证据 |
| --- | --- |
| 应用/包/版本 | `BiliSofa01.TV` / `BiliSofa01` / `0.5.1` |
| 未签名包 | `dist/BiliSofa-W02-source-diagnostics-unsigned.wgt` |
| unsigned SHA256 | `cc5a04e59c7ff4991ba47a5f6eac59e13493799ebb3988e2959e27a12010aec3` |
| signed SHA256 | `6375d741a5040b1e18c65c530adda14741c6c191150640da5f05098abe1c849a` |
| UI输入汇总SHA256 | `e249701a23cb6ea1d350c015d2295f6bb7124f15c099cf53ff1f339b7394d41a` |
| 首份源码ZIP SHA256 | `1cdefb830dd332eaadb430a91b84018cd61e6e999f92ff10bd1fcdfdf4de389e` |
| 真实部署 | UTC2026-10-18T13:21:11.179569起，state/capability/install/launch均exit0且平台明确成功 |

沿用自有Samsung profile，签名前后内容一致、证书日期/发行方预检通过，签名包及原始材料仍私密。首次部署前state成功但capability exit1，未进入install；仅disconnect/connect原授权目标一次后，第二次预检及首次实际安装/启动成功。记录分别保留，不改证书、权限、固件或扫描其他设备。

原0.5.0工件/源码/用户结果、W01两个探针均保留；同ID升级，不清本地设置/续播或写journal。identity/native共8原生文件与0.5.0逐字一致，未重新编译C或更换库。安装/启动返回不是新包声画/存储或故障修复证据。

## 本地证据

- strict/118模块依赖边界通过；353项全量单元/合同通过，本次新增6项。覆盖严格失败DTO/无原文、清理前缓存及ACK后通知、诊断异常不阻断清理、取消后晚到错误不入报告、prepare/source区分，以及有界/复制/清除。
- 8媒体（新增2个取源故障注入）、10本地设置、6投屏、10身份浏览器流程，共34项不同流程通过。实际JS Worker/合同/平台适配器运行；C/SDK/KeyManager/发送端仍合成。
- 两个新增场景用不支持的内容及playurl HTTP403，经实际Worker→GuestPlayback→MediaSession→页面/诊断；断言失败不打开AVPlay、清理后另一张卡可播放、无敏感原文。后续给同两项补加完整可见性断言及截图核对通过，不另外计为两项新流程。
- 正常来源/CA/载荷/许可证/ZIP门禁和3项打包拒绝负例通过。353/34数字不含修复后重复执行次数；远端CI、新的原生HOST/SDK编译未执行。
- 审查时补了同步坏DomainError/诊断getter的兜底和phase/reason原始类型/字节验证，未放宽错误校验。import位置整理前后runtime字节一致；最终类型强化后重新构建及相关回归，工件以上表最终hash为准。中间签名候选未装电视，原件保留。

命令沿用`npm run check`、`npm test`、`build:app`、`test:ui:media`、`test:ui:local-app`、`test:ui:cast-app`、`test:ui:app`、`package:app`、`python3 tests/native/foundation-packaging.test.py`；4173套件串行。显式sign/deploy工具已固定当前0.5.1，默认build/package不部署。

## 有界下一步

已请求一次当前卡取源：能选到上次失败卡则优先，否则当前一张；失败只反馈末尾码，正常则记“未复现”，30秒无结果可Back取消。不要求连续换卡寻找失败，也不重测0.5.0已通过的设置/Home/续播。

准确原因仍待新报告，不能据另卡成功或本地HTTP403注入断言原失败也是403/权益/过期。无法重现时保留首次失败和新的可观测性，继续不受影响的新ID账号保护存储、前台投屏与性能基线；W03–W07、F07云端、F19继续开放，两个旧云进度未知授权不重发。

## 后续用户反馈：详情白名单拒绝，会员原因尚未确认

本次0.5.1显示`ugc.view_unsupported`，用户怀疑会员视频。代码来源是`parseGuestVideoDetail`的两处分支：详情状态/rights/专属标记/跳转条件未满足，或首P来源/编号/CID条件未满足；必要标记缺失也会因未匹配0而拒绝。它不是HTTP403、传输超时或AVPlay prepare错误，不能把该码直接翻译成“已证实会员权限拒绝”。当前“此视频当前无法使用游客播放”的提示保持准确。

本轮样本在详情阶段被拒绝，按代码路径发生在playurl/范围检查/AVPlay准备之前；这是USER可见码与SOURCE映射，不冒称另收原生清理/SDK状态报告。未取得公开BV或具体拒绝字段，是否同0.5.0首张样本也未独立确认；原首次失败记录保留，不记已修复或完整F02通过。

一次取源观察已经取得明确层级分类，本轮停止换卡排查，不再为具体会员子原因增加探针。未改白名单、权益判断、请求重试或播放策略，没有新构建/侧载。W03/F06/F19后续完善内容可用性与合法账号播放；当前即便选中账号，游客入口仍保持匿名，不把登录验证当作会员播放已接通。新ID账号只读验证继续推进。
