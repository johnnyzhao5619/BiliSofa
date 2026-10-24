# W01 内部探针指南

日期：2026-10-14。F01–F20 仍是完整 v1.0.0 范围；此包只用于运行时取证，不是产品发布。

## 当前交付

最新电视为内部0.0.50：Android与iPhone普通视频/双端时间/手机定位暂停继续停止及本轮清理均有分项真机证据，iPad通用版/HD用户均确认普通视频所述步骤通过（此前HD权限未启用已更正），最后匿名报告定位窗口仍未命中，三端完整F20保持开放；当前矩阵见IMPLEMENTATION_STATUS.md。以下基础交付说明保留初期探针边界，不能用于推翻后续分项结果。当前入口为“允许一次官方投屏并播放”，合规首源检查通过后自动起播，探针媒体最多5分钟（含准备/暂停），Back取消并读取固定脱敏诊断。

- 基础 Web/WGT：真实 Worker 内实例化原创 WASM 并计算 19+23；只证明 Worker、资源加载和该 WASM 调用。
- 设备适配器：读型号/固件/平台；不读 DUID、账户身份；手机诊断临时读取连接 IP，只显示在电视、不导出。API 存在仅标 UNVERIFIED。
- 遥控焦点/Back/模态、中文输入、非敏感 localStorage 标记、Home 资源清理、脱敏结果查看。
- 原生 C/cURL 候选包：官方 Samsung SDK 已编译 JS/WASM/CA data；TCP listen/accept loopback 收发、UDP loopback、指定组播自收、游客 HTTPS、有界正文/头、独立 synthetic cookie engine。用户反馈 native 0.0.2 最终 PASS，按代码要求五项全成功；完整导出/实际会话仍待取证，见 TEST_REPORT。

初期0.0.7及以前原生探针没有官方投屏接收协议；0.0.4 手机直连已获用户成功反馈，0.0.5 网络报告已自动读取，0.0.7 loopback 合成 MPD 声画/控制已获用户通过反馈。仍未测试真实 Set-Cookie、账号身份或持久私密 session。W01 这些项继续开放。所有 read-only/合成测试均不复制其他客户端 appkey/身份。

## 本地复现

```sh
cd /Users/weijiazhao/Dev/BiliSofa
npm ci --ignore-scripts
npm run check
npm test
npm run probe:native:check
npm run build
npm run package
npx playwright install chromium
npm run test:ui
npm run dev
```

`dev` 只提供桌面测试页 http://127.0.0.1:4173。包内无开发服务器依赖。Ctrl+C 关闭桌面服务。

## 设备准备与授权

已获用户明确探针侧载授权；Developer Mode 已开启，目标 SDB 连接和 tv/9.0 已确认。用户说明先前证书属于其他开源项目，因此保留但排除使用；用户自己的 BiliSofa profile/Author 已创建。第一次默认 Distributor（2022 年过期）导致电视安装 118/-12；后续用户授权更新后，自己的新 Public Distributor 已成功安装/启动。未来续期/恢复步骤见 [签名证书指南](SAMSUNG_CERTIFICATE_GUIDE.md)。以后升级保持这个新 Author 身份，不覆盖其他 profile。Samsung 登录/验证码及密码由用户在官方界面完成，密码、DUID、证书绝不贴入项目/聊天日志。

需要：本电视保持开启并允许开发电脑；同网段普通网络；适用本电视且属于用户的 author/distributor profile。Tizen CLI 2.5.25/SDB 4.2.36 已在 `.local/tizen-studio` 配好，实际 `version` / `package -h` / `install -h` 均通过。SDK 路径、签名命令与私密配置见 DEVELOPMENT。profile 未就绪不签名/安装。

### 分离签名与安装（资源到位后执行）

将 CLI 路径替换为实际路径、profile 名替换为用户新建的 BiliSofa 名称。设备名称/IP、profile 配置只保存在仓库外，命令输出脱敏。

```sh
python3 /Users/weijiazhao/Dev/BiliSofa/tools/sign-probe.py basic
"<SDB>" connect "<TV_ADDRESS>"
"<SDB>" devices
"<TIZEN_CLI>" install -n "<SIGNED_WGT_NAME>" -t "<TV_TARGET_NAME>" -- "<PRIVATE_OUTPUT_DIR>"
"<TIZEN_CLI>" run -p BiliProbe1.Probe -t "<TV_TARGET_NAME>"
```

模板中的 CLI/SDB 可使用 `.local/tizen-studio/tools/ide/bin/tizen` / `.local/tizen-studio/tools/sdb` 的绝对路径；native 包使用 sign-probe.py native。package/install 参数已对照本机 CLI help；basic/native 0.0.2 均已实际签名/安装/启动，精确工件配对见 SIGNING_DEVICE_RECORD。签名工具在仓库外复制 unsigned 内容后调用 vendor signer，避免其将设备签名 XML 回写 dist 输入目录；资源/证书有效期预检后记录私密 manifest。unsigned ZIP 或签名命令 exit 0 不等于可安装成功。

### 人工核查表

| Case | 操作 | 预期与记录 |
| --- | --- | --- |
| W01-P01 | 签名、安装、启动 | 记录实际 profile 级别、固件、包 hash、工作区快照；入口可用 |
| W01-P02 | 能力读取 | 型号/固件/平台可读；API 存在不是能力验收 |
| W01-P03 | 运行 Worker/WASM | 实际计算 PASS；Home/停止时 Worker 清理，回来可重跑 |
| W01-P04 | 原生探针（编译包后） | TCP/UDP/组播/TLS/合成 cookie 分项结果；失败保留代码，不禁用 TLS/CSP |
| W01-P05 | 保存标记、Home/恢复、重启/断电 | 标记保持、初始真实焦点、监听不重复；电脑关机也可打开基础探针 |
| W01-P06 | F03搜索首字母输入/候选与 Back | 当前系统输入探针未证明中文可用；后续实现应用内首字母搜索候选，验证选择/清空/Back/焦点，不再要求评论/弹幕编辑 |
| W01-P07 | Voice Guide | 按钮名称/状态正确、与真实焦点一致，结果不洪流朗读 |
| W01-P08 | 官方 Android/iPhone/iPad | 0.0.50三端普通视频所述步骤USER PASS（iPad两版均用户确认），各自报告/精确定位/内容范围及恢复单独记录；完整F20 OPEN，不用generic DLNA/名称发现替代 |
| W01-P09 | 媒体、MPD、4K/HDR/速率/音轨 | 0.0.7 合成 MPD 声画/基础控制通过用户实测；其他能力 UNVERIFIED，须合法样本和实际声画 |
| W01-P10 | 私密存储、双账号 cookie/进度 | 当前无真实会话，UNVERIFIED；localStorage 标记不是保护存储证明 |

取证：本地日期、F/W、步骤、预期/实际、PASS/FAIL/BLOCKED/UNVERIFIED、固件、包 SHA-256、源码快照、CLI/SDK 版本、发送端版本及权益/地区。原始附件放仓库外；导出不含中文输入、cookie、token、DUID、地址或源 URL。

## 原生网络构建边界

`npm run probe:native:build` 要求显式 `BILISOFA_SAMSUNG_EMCC`、`BILISOFA_CA_BUNDLE`；macOS 无 `python` 别名时指定 `BILISOFA_SDK_PYTHON=/usr/bin/python3`。缺资源会非零退出，不用 upstream emcc 冒充 Samsung。CA 来源/hash/MPL-2.0 已登记，运行时始终 verify peer/host。

`npm run package:native` 从 basic build、native manifest 和严格 hash 校验的第三方许可证生成 `dist/BiliSofa-W01-native-unsigned.wgt` 与 `dist/probe-native/`。原生包当前内部版本 0.0.11，basic 0.0.1，均为 BiliProbe1.Probe；保持同一 author 用于升级，0.0.2 曾签名/更新安装成功；新构建须单独取证。两个内部工件不改变完整单一产品 v1.0.0。

原生包带 32 MiB 固定 WASM heap。初始化进度明确 UNVERIFIED，只有完整分项结果才结束；20 秒无结果时停止 Worker 并显示 timeout。桌面只能证明本地加载、初始化、UI 不冻结与停止路径，不能证明 TV sockets/TLS。

当前 macOS SDK 是 x86_64；arm64 主机执行 clang/Node 均 `bad CPU type in executable`。原命令 `python3 emsdk.py activate --embedded latest-fastcomp` 无 arm64 匹配 SDK，exit 1。SDK 文件完整下载，但不叫配置成功。

2026-10-14 后续：用户明确授权 Rosetta 2，已安装成功；x86_64 Python 嵌入式激活、Samsung native 编译及重复构建通过。上述 bad CPU type 是已解除的历史 host 阻塞。电视连接和新 Author 已确认，Public Distributor 已更新，basic/native 0.0.2 已安装/启动。开发机只负责编译，绝不成为电视日常网关。最终 AVPlay/MSE/socket/官方发送端和保护存储仍须零售电视证明。

## 手机直接读取脱敏记录（0.0.3，W01-P11）

1. 在电视先运行 Worker/WASM、原生网络和“读取设备能力”，使型号/固件及分项结果进入当前记录。
2. 点击“手机读取记录”，等待显示“同一网络手机浏览器打开”及电视上的 URL。地址仅供本次屏幕使用，不要发送 IP/DUID。
3. 手机与电视接入同一普通网络，在浏览器打开电视显示的 `http://<TV_ADDRESS>:40322/report`，应显示 JSON，电视应出现 `http.report_served_client_identity_unverified` 的 PASS。可以复制 JSON 回传，内容受固定字段限制；不要附个人地址/账号信息。
4. 一次成功 GET 后监听立即关闭；无人访问 120 秒后记 UNVERIFIED 并关闭。重试需再次点击。停止 Worker/Home/新探针会结束监听；在 Home 后确认手机旧 URL 不再可用，回来重新运行。

该入口仅测试 TV-contained socket 入站并读取非秘密诊断，无官方发送端协议/账号写入/URL 代理；即使成功也不关闭 F20。HEAD 不计正文传输，客户端身份由实际测试反馈记录。

0.0.3 手机入口 FAIL 后，0.0.4 调整 Samsung 非阻塞 socket API 并将完整错误码显示在顶部。按 W01-P11 重试；若 FAIL，回传末尾 http/worker/native 代码即可，无需 IP。没有实测的项目仍显示 UNVERIFIED，补齐对应步骤/证据后再变更状态。

## W01-P12 loopback MPD / AVPlay 合成声画

0.0.6 点击“测试 MPD / AVPlay 声画”，预计播放 12 秒：深色背景和绿色矩形渐入/渐出、低音量 440Hz 音频（1280×720/24fps/H.264 Main、AAC48k/2ch，非 HDR/非 Bili 内容）。暂停/继续、跳到 5 秒、停止/Back 后初始调用点焦点；Home 时服务器/播放都关闭，恢复不自动续播。MPD/segments 均预置在 TV Worker 内，只绑定 loopback，无 PC 或外部服务器。

UI 的 prepare/play/时间/stream_completed 是 callback/进度证据，声画需真实观看/听取，不能因回调或 MPD 请求计 PASS。发生 FAIL 请回传完整 avplay/mpd code。大于该样本能力的分离流/多轨/UGC/PGC/live/倍速/4K/HDR保持开放。

0.0.6 视频正常、无声及第二次 bind失败已记录。0.0.7 提高合成音频增益并让服务先关闭原生fd/确认后退出Worker；等待资源确认再启动下一次。重试W01-P12时请反馈画面/声音及顶部tracks和mpd分项代码；没有音频时audio asset/轨存在也不算解码成功。

0.0.7 用户实际复测通过：合成声画、暂停/继续、seek5秒、Back后重新进入，未再出现stage12。0.0.8将正常静音/音量读数和初始化进度独立显示，保留能力待验收及原始verdict；Home/冷启动、真实内容/账号和官方三端投屏继续开放。准确工件见SIGNING_DEVICE_RECORD。

## W01-P13 KeyManager 合成往返

0.0.9点击“测试 KeyManager 存储”（显式内部自动模式也可单次执行）：仅把随机合成非秘密值写入本次专用alias，读回比较后删除并确认NotFound，成功代码`keymanager.synthetic_roundtrip_cleanup_only`。没有读取/枚举其他账号或权限授权。取消/超时后的晚成功回调仍清理自己的alias；未确认清理前阻止再次写入。该PASS不证明跨包隔离、加密、重建/升级持久性，后续私密会话项仍待验收。API缺失记BLOCKED，不退回普通localStorage保存会话。

W01-P05：0.0.8用户已报告保存后退出重开marker0→1。后续Home监听验证应先开启手机入口但先不访问，按Home后再用手机打开旧URL；应无法连接，恢复再开启入口可成功。服务有no-store，首次成功GET会关闭服务，所以不要先GET再用关闭结果冒充Home清理。该测试与播放中Home停声、冷启动/电脑关机分别记录。

0.0.9用户已确认播放中Home停声、返回再次播放通过。当前“测试中文输入”只是原系统键盘探针，不是已实现的首字母搜索。按[ADR-003](adr/003-read-only-comments-danmaku.md)保留F03输入验收，移除评论/回复/弹幕编辑测试；无需为这些已移出范围的写功能继续尝试系统中文输入。

## W01-P14 遥控首字母关键词输入（0.0.10候选）

点击“首字母搜索输入”，只用方向/确认在本地键盘选择N、H，再从候选选“你好”。选词后仍在输入页，不执行内容搜索；点“确认关键词”返回主页面，保留调用按钮焦点，关键词只显示在系统输入探针框内，不导出/保存/发送。可另测ZG→中国、翻页、退格、清空、英数字。

有未确认字母时Back先清空首字母，再按Back取消输入并回到调用按钮；Home关闭输入/Worker，回来可重新进入。失败可“重试候选”或取消，未加载词库时不能把空候选当成无搜索结果。

词库仅给本地词语候选（最多64词），不是B站内容目录/热搜或真实搜索接口。F03整体与本机输入/Voice Guide仍须分别取证，不要求评论/弹幕中文编辑。

0.0.10已确认输入/候选显示可用，但两行第一列不可达。0.0.11重测重点：NH完成后从H向上到工具栏，再向上到第一候选“你好”；第一行第2项Left回第1项，Down进入第二行第1项；第二行第2项Left也应回该行第1项。两行Left/Right边界停留，翻页后聚焦第一个候选。已有数据/声画/Home记录不归属新包的新路径。


## 合成 KeyManager 持久性（0.0.12）

点击“测试存储退出重开”，看到`keymanager.persistence_prepared_exit_reopen_required`后，Back打开退出确认并退出，再打开相同探针，点击同一按钮。通过代码为`keymanager.synthetic_document_restart_read_cleanup_only`；只返回Home不算退出重开。超时、记录/数据不一致或清理不明时保留具体失败代码，不清其他App或个人数据。值与普通存储期望均由本探针生成，非账号秘密，导出不包含nonce/值/别名。

开发专用`BILISOFA_PROBE_AUTORUN=2`可自动完成每阶段和报告，并在首阶段报告GET成功后退出，由CLI重开；安装/自动退出不等于持久性通过，需第二阶段匹配报告。保护/加密/跨包隔离和电脑关机冷启动仍有独立验收。


## 跨包合成观察（0.0.13开发实验）

临时观察App名BiliSofa W01 Isolation、ID BiliIsola1.Probe，仅尝试读取BiliSofa主探针生成的固定非秘密项；不会读取其他项目/个人会话、枚举或授予访问权限。主探针先留存、观察包只读、主探针再核对并清理三份实际报告共同判定；单独NotFound并非PASS。观察包报告后退出，实验结束可由开发工具卸载本次新装helper，保留主探针与全部签名/源码/证据。最终产品没有此第二App依赖。


## 下一项：开发电脑关机后的电视重启（W01独立运行/合成持久性）

待本轮manual包安装/启动记录确认后执行，使用签名部署记录所列的当前manual工件。先点“测试存储退出重开”，看到`keymanager.persistence_prepared_exit_reopen_required`（待验收）后正常退出探针。关闭开发电脑，再按电视正常重启方式重启电视（确认出现开机标志；不更新固件或恢复出厂）。

电脑保持关机时：打开BiliSofa W01 Probe；点“测试存储退出重开”，应显示PASS `keymanager.synthetic_document_restart_read_cleanup_only`；再点“测试MPD / AVPlay声画”，核对绿色渐变与声音都正常。该MPD/资源从电视内提供；不用打开手机报告URL或依赖开发服务。反馈“电脑关机后启动/存储/声画：通过或失败”，失败附末尾代码。若只进入待机、没有重启证据，则只记录待机恢复，冷启动继续UNVERIFIED。

此测试仍只使用非秘密合成值，成功也不代表真实账号或全部冷启动/升级/回退路径通过。复测失败不清其他数据或盲目重试未知写入，保留状态与代码。


## 0.0.14 游客热门读取

主页面右侧“读取游客热门”进入只读模态，显示真实游客热门摘要；可选卡片查看BV/UP主/时长/播放数，下一页/上一页/重新读取与Back可用。仅读取，不提供内容播放、登录或个性化入口。明确HTTP/API/传输/格式失败与空结果，失败附guest.…代码；原始响应、标题/BV/UP主不进入导出/手机诊断。默认manual；显式auto=4首开一次真实guest读取并启动报告，取证后停在热门页供人工方向/分页/Back回归。


## 内部0.0.16真实游客视频检查

当前候选新增“播放游客360P · 首P”：进入游客热门，确认选一张卡，方向移到下方播放动作，再确认才开始真实内容。若首行卡，先下到第二行再下到动作；动作间左右移动。无账号/保留写操作；有权普通游客内容只取当前最低AVC/AAC。明确拒绝的内容可返回选别卡，不改cookie或客户端身份。

先观看约30秒核对真实画面和声音；再暂停/继续、跳5秒、Back应回原卡且停声，重新进入播放；播放中Home应停声，再开App可重进热门。每次桥租期最长3分钟为内部探针限制。失败时热门页显示固定ugc.…末尾代码，保留选择/返回；unknown清理会阻止重开本次桥，需退出App再开，不以重试宣称清理成功。不要把原0.0.13合成声画通过外推到真实视频。签名/source/部署/报告的准确配对另见SIGNING_DEVICE_RECORD，未收到反馈前声画保持UNVERIFIED。


0.0.17为manual，须从主页面进入游客热门。首次直接播放无需先检查源；播放数据校验异常最多自动重新读取一次（750ms退避、完整重新校验），业务拒绝/不支持不绕过，第二次失败保留具体ugc代码。请选长于2分钟的普通视频，核对至少90秒声画与暂停/seek/Back/Home；此时尚待用户反馈。诊断八条优先保留最新失败/一次刷新，并保留近期清理事实；collector取当前已部署source核对，签名新候选本身不会更新已部署身份。


### 0.0.18 合规备用源回归

manual版本：在热门选择之前无法播放的普通视频，直接点“播放游客360P · 首P”，不先检查源。检查首次声画与90秒连续观看；失败回主页面开启“手机读取记录”供精确source匹配。`ugc.source_backup_selected`只表示选择到了同一轨道的合规备用源；`ugc.playurl_cdn_unavailable`表示本响应无符合当前目的地规则的源，不等同账号权益或电视解码失败。仍有3分钟内部探针租期，完整播放长度不在本包验收范围。


### 0.0.19 短视频播完与详情失败分类

manual新包只针对有界大详情和播放窗口。直接播放普通4–8分钟首P并看到自然结束/返回原卡，检查180秒以后声画和结束后的重播；不暂停太久（租期为媒体时长+60秒，最高15分钟且受URL期限限制）。失败回主页面开启“手机读取记录”；新code可区分view_response_too_large、view_headers_too_large与其他view_transport_N。未取得匹配工件和用户反馈前不标完整时长通过。


## 0.0.20 官方App发现窗口

仅在本次签名/安装/启动已确认的工件上测试。主页面右侧点“投屏发现探针”，看到五分钟查找提示后，从同网Android官方Bilibili普通公开视频播放器的TV投屏列表查找 **BiliSofa W01 Discovery**；如可见，选一次并记录官方端结果。该包只验证发现和描述请求，连接/播放/控制尚未接通，拒绝控制或501不算完整F20通过。若电视先显示cast.failed_N或worker代码，记录代码，先不重复手机操作。

每一端单独开窗口；Back返回后打开“手机读取记录”供匹配工件取证。分别记录“可见/不可见、点击后结果、电视末尾代码”，不需要提供IP、账号、源URL或抓包。Android确认低层路径后再逐一检查iPhone/iPad（本地网络权限由用户核对）；OS未知时保留未知，不由App版本猜测。Back/Home应关闭监听；五分钟到期或连接预算耗尽也会清理。清理unknown保留错误并退出重开，不盲重试。原0.0.19普通游客完整短视频通过不因此推广为投屏播放。


0.0.21先使用内部启动取证包：启动后自动测试监听/TTL/入组，立即关闭并开启报告，由开发电脑收取，期间无需用户重复手机动作。此项通过后再按0.0.20步骤显式开启五分钟窗口测试Android；出错只反馈131（TTL）、132（入组）或其他完整code。自动取证不替代手机列表可见/连接/播放，用户在检查中Back/Home/开始其他操作会取消余序。


## 0.0.22 SOAP分类检查

本包仍为发现探针，未接受媒体。用Android官方普通视频TV入口点BiliSofa W01 Discovery一次，记录电视固定cast.soap_…结果，然后Back回主页面，开启手机读取记录。查询可回复NO_MEDIA_PRESENT；URI/播放控制拒绝属于本包预期。不要把拒绝写成播放失败修复或完整F20通过。iPad当前仅AirPlay结果另查App名称/视频TV入口/本地网络权限，不以系统镜像替代官方投屏验收。


0.0.23保留最近四项SOAP中文结果与固定code，后续发现/描述请求不会清掉它们。只需官方Android选择一次设备，随后Back并开报告；collector可通过固定summary恢复本租期全部分类，无需用户追读闪烁文字/复制原始正文或地址。七阶段只定位当前解析子集的拒绝点，不能证明已兼容媒体。iPad HD入口/本地网络权限已确认，暂不要求重复相同步骤。


0.0.24：Android再投原普通视频一次，Back开“手机读取记录”；无需抄code。报告现在可区分缺metadata/其他字段、额外/重复/typed或nested参数及URI策略。这里只采固定分类，仍拒绝投屏媒体，不测试声画/控制。0.0.23已确认offer参数拒绝，不需重复排查XML声明。


0.0.25：开“投屏发现探针”，Android原视频TV列表选择一次，保持约15秒再Back开“手机读取记录”。SOAP连接失败仍预期；此包只检查兼容与HTTPS候选，不要求声画。若符合目的地/格式/期限，至多一次512byte范围测试；否则固定policy说明原因。source_pass仅表示HTTPS/206范围/ftyp检查，不能记投屏播放通过；失败不自动HTTP回退。无需抄地址/metadata或反复点击，iPhone/iPad暂不重复。


0.0.26 W01/F20内部候选：增加电视确认后独立MP4声画样本，仍未接受官方手机媒体/控制会话；详见docs/adr/006-cast-approved-candidate-playback-probe.md（docs内路径为adr/...）。只复用原有桥/cURL/AVPlay与自有MIT代码，未增加依赖/权限/外部服务、未复制协议实现或官方客户端身份。新增_cast_media_begin导出必须实际SDK重编译并通过package gate；已验证源仅native临时保留60秒，确认后最长3分钟。

手动待验：电视打开“投屏发现探针”→Android官方App普通公开视频TV列表选择BiliSofa W01 Discovery→电视source_pass后60秒内用左/确认选择“播放已检查候选”→连续90秒核对声画→暂停/继续、跳5秒、Back→回主页面开启“手机读取记录”。如未起播提供cast.…完整码并开诊断；手机提示连接失败为本轮仍拒绝SOAP的预期，不把它当作完整F20通过。第二次新投送可测Home停声，当前不要求重复iPhone/iPad。


0.0.27简化首轮：开启投屏发现→Android普通视频TV选择BiliSofa→电视“源已就绪”后60秒内按左/确认“播放已检查候选”。先只反馈能否进入播放页、是否有声画，不必未起播便做90秒和控制。停止回主页面后开启手机读取记录；不需要抄短暂消息，报告将保留TV确认发送/Worker接纳/实际播放阶段。手机仍可能收到拒绝，此为未建立正式SOAP会话。


0.0.28 W01/F20内部候选：progressive HTTP与有界续段见docs/adr/007-progressive-mp4-http-probe.md（docs内为adr/...）。八个C文件修改后已实际Samsung SDK重编译；仍为probe-only旧网络依赖，不批准真实账号产品栈。无新依赖/权限/外部服务/复制客户端身份或实现；新增HTTP/API事实仅按官方RFC/Samsung枚举，保留原第三方许可。TV新包声画仍需用户反馈，不能把prepare失败或HOST通过更改为实际播放PASS。

内部0.0.29的投屏候选播放：跳转期间显示“跳转中，请稍候”，重复跳转、暂停/继续不会叠加调用AVPlay，待跳转结束后再操作。Back/Home仍可退出。手动候选的3分钟租期包含暂停时间，手机控制尚未接通；这不代表完整F20已验收。

内部0.0.30回跳检查：同一视频进度过10秒后跳5秒，待进度重新过10秒再跳一次；一次跳转最多等待30秒，期间不要连按。若明确拒绝但仍在播放页，保留提示并可手动再试；若超时自动返回，Back回主页面开启诊断即可。报告将区分seek_callback/throw/event/timeout及buffer/目标tick读数；只有真实声画/进度恢复才算跳转通过。暂停20秒已在0.0.29通过，无需每轮重复。

内部0.0.31回跳候选：PLAYING时点“跳到5秒”会重新缓冲，画面可短暂中断；等待声画和真实进度恢复后再操作。测试两次，每次从进度过10秒回跳5秒，第二次后再正常播放至少35秒，最后开诊断。一次最多等待30秒，首跳失败可直接停止本轮。paused回跳尚未采用新策略，本轮不要求重测长暂停。history的r/s只代表后端API完成，不是实际声画验收。


## 0.0.32 自动投屏回跳检查（内部候选已部署，回跳待验收）

W01/F06/F20。主页面选择“自动投屏回跳检查”，Android官方App投送两分钟以上普通公开视频；电视出现源已就绪后选择“播放并自动检查三次回跳”并确认。没有此TV确认不播放。随后不操作遥控器，0.0.34起播准备最多30秒、起播后检查最多150秒（受原3分钟租期约束），自动执行三次过10.5秒回到5秒并观察35秒；记录仅为真实时间轴/SDK事实，不判断画面声音。可随时Back/Home取消；取消不自动启用报告。

流程结束或失败会关闭播放，确认native清理后自动开启120秒短时报告。若清理不明则停止并显示cleanup_unknown_restart_required，不自动开新网络Worker。开发端可运行 `python3 tools/collect-probe.py collect --wait-seconds 180`，只访问已有授权TV固定报告路径；无需反复人工点手机读取记录。声画是否恢复/无意返回仍需用户观察，结果未反馈不记USER PASS。手机控制尚未接通，探针不代表完整官方投屏兼容。

0.0.33沿用上述TV确认后的自动流程，只修正清理期间固定原生错误的留存/紧凑报告优先级，不改变回跳策略、租期、缓冲或权限。0.0.32第二跳自动检查已FAIL，0.0.33也须取得新报告后判断，不能把报告完整性修正当播放器修复。

0.0.35在同一自动检查流程中增加仅零HTTP响应的媒体GET超时重连：每个下游连接一次、整轮最多三次、250ms backoff；固定进度media_retry_1/2/3表示排队次数，不是播放成功。原SDK seek不自动重试。0.0.34起播用户确认，但自动第二跳及上游0_28均FAIL；需以新source匹配报告/真实声画分别判断。


## 0.0.51 HTTP会话隔离（自动取证已完成）

入口“测试HTTP会话隔离”只在电视loopback40326运行两个合成cookie jar九轮HTTP，不使用账号或外部服务。auto7启动运行一次并自动开启原诊断；本电视已取得session.pass_all_closed及诊断GET关闭，准确source/signed见SIGNING_DEVICE_RECORD。无须用户重复投屏。取消/未知清理按ADR-012处理，HOST取消通过不能冒充TV Home取消验证；HTTPS真实账号/CSRF/进度/保护存储仍开放，旧SDK依赖未批准处理真实凭据。


## 0.0.53 大索引P2复测准备

使用同一Android官方App/同一P2，电视仍先选“允许一次官方投屏并播放”。若本次检测为较大索引，播放页显示约索引MiB与累计接收，可等待最多3分钟；20秒无新4MiB接收进度会提前失败，Back/Home仍可随时取消。本轮只核对起播声画、双端总时长及约20秒连续播放，不要求9小时完整播放或seek。然后Back主页面开诊断。未收到用户和匹配报告前不记修复。见ADR-014的来源/预算/证据边界。


## 0.0.54 大索引起播后的自动手机Seek

沿用同一Android/同一第2P，电视选择“允许一次官方投屏并播放”。起播前若有较大索引最多等待3分钟；起播后若手机自行发出Seek，显示“正在重新读取较大索引/本轮累计已接收”，保持不操作等待恢复（本次重新准备也最多3分钟，20秒无新接收进展提前结束）。原探针媒体总租期5分钟含准备/暂停及签名更早截止继续有效，报告会区分该限制；本轮不承诺长片完整播放。

只核对自动跳转能否完成、完成后约20秒声画与双端总时长，不再手动增加Seek或切视频；若手机本次不自动跳转，直接核对20秒播放并如实反馈。任何时候可Back/Home取消。最后Back主页面开启“手机读取记录”，失败也开启；无需抄闪过的代码。0.0.53短暂起播和随后Seek失败分别保留，0.0.54未测试前不记修复。


## 0.0.56内部换源探针

在“允许本次投屏会话（可换集/切P）”入口用官方App先投手机可播放的一集/一P，声画正常后通过手机选集/分P控件换到另一个有权限的内容；核对真实内容改变、声画恢复与双端新时长/进度，最后手机停止，电视Back并开“手机读取记录”。本轮不提供TV端选集目录，不把手机标签改变当作电视内容改变。普通单源原入口仍保留；发现不到/手机没有选集控件/准备失败直接如实反馈并开诊断。

同会话最多4源和原5分钟租期/累计128MiB限制，含准备与暂停；大索引反复初始化可能先耗尽预算，不能把这个内部限制当作完成了任意长片。Back/Home总能取消；若显示decoder_close_unconfirmed_restart_required，请退出并重新打开探针，不能在未知关闭时继续创建播放器。新源失败终止本次会话，不自动退回旧集；新授权后可重新测试。
