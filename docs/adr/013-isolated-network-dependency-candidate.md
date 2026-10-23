# ADR-013：独立构建现代网络依赖候选

日期：2026-10-16。W01/W02/F01/F13。状态：HOST 编译实验，尚未批准运行时替换或真实凭据。

现有已装0.0.51保留Samsung SDK默认cURL7.68.0/OpenSSL1.1.1d/zlib1.2.8，仅用于无账号探针。合成HTTP的Set-Cookie/隔离通过不能解除依赖安全门槛。Samsung官方当前下载仍列1.39.4.7；换为任意upstream Emscripten不能推断Socket Extension兼容。

选择同一Samsung编译器，独立静态编译cURL8.23.0（2026-10-14发布）及OpenSSL3.5.9（2026-09-29发布，3.5 LTS公开支持至2030-04-08）。准确来源和公开摘要固定在platform/wasm-network/dependencies/network-candidate.lock.json，分别与OpenSSL官方SHA256文件、curl官方GitHub发布asset digest核对。此核对为TLS下载/发布摘要一致性，不冒充独立PGP签名验证或完整供应链审计。

`tools/build-network-candidate.py fetch/build/check`分离下载、编译和检查，默认不打包/签名/安装。工作区为ignored .local/network-upgrade，使用独立cache/ports/prefix和自己的compiler wrappers，不编辑SDK vendor ports、全局工具、证书或已部署清单。OpenSSL使用32位无汇编静态库、无模块/DSO/线程/引擎/自动配置加载；只采用/dev/urandom的系统种子入口，Samsung MEMFS实际映射crypto.getRandomValues且缺失时中止，不能加入Math.random替代。固定SOURCE_DATE_EPOCH，虚拟运行时目录/bilisofa，编译器名不带本机绝对路径。

cURL候选仅HTTP/HTTPS、无额外压缩/SSH/HTTP2/HTTP3/IDN/PSL/异步DNS/线程/Unix socket；这是隔离兼容实验配置，不改变F01–F20。保留PROXY选项实现以兼容当前每次显式设置空代理字符串，禁止从环境继承代理的请求策略保持。所有账号请求仍须在适配器验证精确目的地、Cookie Domain/Path/Session owner及redirect边界；不把新版本或无PSL的cookie引擎直接当完整凭据策略。后续如需要其他能力，增加依赖与相应门禁，而非静默删需求。

交叉编译的feature detection只证明编译/链接：SDK存在fcntl或ioctl符号不证明TV支持F_SETFL/FIONBIO。现代cURL使用SOCK_NONBLOCK创建socket的路径须在本电视复验。错误不得通过禁用TLS、隐藏原生失败或对非阻塞调用伪造成功消除。

退出条件：静态库与真实最终WASM链接、精确依赖/许可证清单、本机路径/密钥模式扫描、浏览器加载与加密随机数失败闭合、目标TV的TLS证书正/负例、HTTP双jar、取消清理、游客读取/播放及官方发送端回归。完成前不允许候选处理真实账号会话。受保护存储、真实扫码/两账号/保留写操作授权和完整W01继续单列。

一手来源：

- [Samsung SDK下载](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/download.html)
- [curl发布](https://curl.se/download.html)、[curl7.68.0安全记录](https://curl.se/docs/vuln-7.68.0.html)、[发布验证说明](https://curl.se/docs/verify.html)
- [OpenSSL发布与维护日期](https://openssl-library.org/source/)、[3.5 LTS声明](https://openssl-corporation.org/blog/2025-04-08-openssl-35-final-release.html)

依赖安全记录不是当前打包配置的逐项可利用性判断；不以某个不启用的协议CVE认定已触发，也不以该协议禁用认定其他问题已消失。


## 独立电视验证包（2026-10-16，候选）

在已通过的主探针0.0.54之外增加BiliNet001.Probe/0.0.1，名称BiliSofa W01 Network，不修改主探针身份、签名包或部署清单。复用同一作者/Public Distributor，所有原始设备/签名记录仍仓库外。运行时依赖固定不变，新增验证程序和现有完整probe分别链接到build/network-candidate，不覆盖build/native。

独立Worker只接受guest scope的固定操作，无URL/header/cookie输入。先读真实cURL/OpenSSL版本及Worker随机数，再对四个固定HTTPS目标做一次匿名GET：Bili公开nav须HTTP200/有效证书/非空正文；badssl官方过期/错主机名/自签名站点须具体证书校验失败，网络超时不计通过。不跟随redirect/不代理/不载入账号，header8192/body65536、单请求4秒连接/8秒总限、全局36秒、父层45秒/取消ACK5秒；cURL multi每50ms让出。终态仅在easy/multi/global/OpenSSL清理后发送，未知关闭poison禁止复用。固定7条进度＋1终态最多8条报告，错误只输出CURLcode/verify整数分类，不输出正文、headers、错误字符串或地址。

错主机名不能强制假定SSL_VERIFYRESULT=62：固定cURL8.23.0的openssl.c先自有ossl_verifyhost，失败会在写入SSL_get_verify_result前退出。验证程序用有界CURL_ERROR_SIZE内部缓冲匹配该源码固定主机名不匹配分类，随后擦除，不将原文输出。过期需rc60/verify10，自签名需rc60/verify18或19；所有负例须HTTP0/正文0，且与网络超时分开。

工具分离：probe:deps:link → npm run build → probe:network:ui → package:network → verify:network → sign-probe.py network → 授权设备安装/collect-probe.py --variant network。签名仍独立动作，正常build不隐式安装。独立包只提供网络检查/停止/读取脱敏报告/退出，单一DOM焦点与Home取消，未增加账户入口/替换生产依赖。真实HTTPS会话、媒体/官方发送端现代依赖回归与完整W01继续独立门槛。

固定负例站点来自[badssl官方目录](https://badssl.com/)，其证书/服务可能随时间或网络变化，必须实际读取结果，不能从域名本身记通过。当前本地/设备执行结果另见TEST_REPORT。


独立0.0.1已在本电视取得全部TLS正负例/实际版本/随机数/清理PASS，精确配对见TEST_REPORT，不能升级为真实账号或完整网络栈投产批准。独立0.0.2的package-network-probe.py --session选择session自动入口，仍BiliNet001.Probe，保留TLS按钮并新增HTTP会话按钮；复用相同现代full probe与session-worker，未改库/C源或主探针。TLS与会话分轮报告分别归档，不让8条窗口丢掉前一轮四个TLS证据。


独立002会话未取得清理ACK，仅ready/cleanup_unknown，保留DEVICE FAIL；003只补固定SDK原因（F_SETFL/F_GETFL/FIONBIO/assertion/runtime_abort/unclosed/worker_exception）与父层超时/非法/worker错误分类。固定致命progress不能当closed ACK：父层先保存原因，再立即poison禁止复用；正常五条会话进度＋一条固定原因的配额6同步。未改变网络/关闭策略，不宣称修复。源码还发现cURL8关闭连接的可选drain会调用curlx_nonblock，而Samsung socket F_SETFL明确abort；需003实际原因核对后才调整候选依赖。packaging/sign前额外核查编译recipe/lock和链接库元数据一致，防止旧WASM混用新recipe。


003实际报告为runtime_abort/父层unsupported，没有F_SETFL原因，因此关闭drain仅保持源码假说，不应用临时补丁。004启用Samsung --emit-symbol-map并仅在报告保留最多两组函数号/偏移及固定syscall/内存/C_abort分类，不输出原始栈/异常；离线符号表绑定精确WASM摘要且不打入电视包。库和cURL行为不变。
