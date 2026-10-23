# ADR-020：电视内合成 HTTPS 会话及保护存储链

日期：2026-10-16（America/Toronto）。W01/G2、F01/F13。状态：候选实现、本地验证及007三阶段合成技术链设备PASS；真实Bili会话仍归G3。G1最小门槛已有059用户及配对报告证据；不重新执行切P。

## 范围与依据

原HTTP双jar、公共CA TLS正/负例及KeyManager保存/重开/删除/同Author另一包读取隔离已分别通过，不能将它们拼成已经验证的HTTPS凭据链。G2先用合成值，不请求或保存真实账号凭据，不做任何Bilibili账号写入。

依据（2026-10-16复查一手文档）：[curl CAINFO_BLOB](https://curl.se/libcurl/c/CURLOPT_CAINFO_BLOB.html)允许请求级内存CA且不必关闭TLS校验；[COOKIELIST](https://curl.se/libcurl/c/CURLOPT_COOKIELIST.html)警告导入cookie需独立域策略；[OpenSSL非阻塞SSL_accept](https://docs.openssl.org/3.5/man3/SSL_accept/)要求处理WANT_READ/WANT_WRITE；[Samsung KeyManager](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html)定义默认owner读取权限及显式授权边界。API说明不代替零售TV实测，也不证明硬件密钥或应用内存不可读。

## 技术选择

独立BiliNet001诊断WGT新增HTTPS合成模式，保留059主探针。服务器与两个cURL jar全部在电视Worker内：只监听127.0.0.1固定端口40327/40328，固定account.bilisofa.invalid / cdn.bilisofa.invalid通过CURLOPT_RESOLVE指向loopback，不访问外部服务器。每轮CSPRNG生成临时EC密钥、自签名证书及随机合成cookie；私钥只在内存，不写文件或打包。公钥证书仅本轮easy通过CAINFO_BLOB精确受信，校验证书/SAN和时间不关闭，不进入生产CA。测试域、证书及HTTP明文对照仅本诊断程序存在，不能成为产品目标/信任回退。

一次自动流程验证真实HTTPS Set-Cookie（Secure/HttpOnly及路径）、A/B回传隔离、302不跟随、Secure值不去HTTP、账号值不去CDN或非授权路径、清空A而B保持。服务器核对实际收到字段，客户端核对TLS验证、响应头/正文及cookie容器属性；仅注入COOKIELIST不算wire证明。无任意目标/外部请求/账号值入口。请求/头/正文/连接/阶段/总时长有界，非阻塞tick；Stop/Home先关闭native，再终态ACK，未知关闭禁止复用。报告只保留固定事实和错误编号，不出cookie、证书、请求或地址。

私密持久化采用KeyManager owner数据，不把cookie值/恢复预期值写localStorage。G2存储候选ProtectedSessionProbe使用固定自有alias bilisofa.w01.https-vault.v1，普通journal只有schema/随机boot/秘密摘要，不能由journal重建秘密。HTTPS结束后保存一条256位随机合成秘密，报告取走后自动退出；同Author的BiliIsola1只尝试读取BiliNet001这一固定alias，不导出返回值，再重开owner核对原秘密摘要并删除/确认缺失。复用已证明的owner隔离API/原生HTTP报告机制，不重复冷启动/合成声画；本轮跨包前后存在证据单独配对。未知save结果先核对/清理自有alias，不盲目覆盖或宣称原子替换；不声称硬件加密、额外密码加密或JS内存保密。真实账号只在这组技术链明确后接入。

## 结束条件

HOST真实TLS/socket/cURL及相关Worker/UI/合同、本工具链链接和包门禁先通过；再安装独立模式在TV自动取证。持久化只做一次必要重开链，可自动退出重开；另一包访问采用既有证据并明确alias/owner范围。TLS负例与原HTTP九轮不重复作为新的用户任务。G2两部分有对应证据才关闭；安装/启动或静态检查不算通过。G3所需扫码及一次云进度写回授权单独办理。

## 本地验证（设备前）

206项单元/合同（含HTTPS消息操作隔离、保护journal无秘密/重开摘要删除/取消与未知保存/损坏与冲突、固定跨包读取目标），12项真实HOST HTTPS/socket/cURL，13项网络Worker/UI与保存重开编排，6项实际候选输入注入门禁通过；共237不同检查，不加重复运行次数。strict/61模块、四类Samsung WASM链接和包完整性门禁通过。HOST使用本机已有OpenSSL3.6.3及从固定curl8.23.0源编译的隔离静态库；仅HOST测试编译标记允许3.x，Emscripten同时定义会编译报错，TV依旧固定OpenSSL3.5.9。没有系统安装或关闭TLS校验。

初始HOST链接遗漏LDAP链接参数、cookie属性夹具未按curl的尾斜杠规范化比较，均在本地修正；没有降低Secure/HttpOnly/domain/path核对。首次UI新HTTPS5项通过，旧TLS/HTTP8项因fixture只改tls/session启动标记、未匹配新https-session而未进入预期模式；保留失败记录，修正显式模式后13项通过，不把初跑计为通过。后续通道操作严格匹配与未知close编码约束已完善，最终包/UI再核对。

设备证据：007 source4ea66cdcc60db901b9f5769bf2ae6cd41d82ceed118de9da38aa51683438ccdf，HTTPS/保存UTC02:24:06、另一包固定目标NotFound02:24:59、owner重开摘要核对/删除02:25:14，三份source/signed/identity分别精确配对、GET后关闭true，详见IMPLEMENTATION_STATUS本轮记录。HTTPS cookie与持久化探针用不同合成值，不声称真实cookie导入恢复。
