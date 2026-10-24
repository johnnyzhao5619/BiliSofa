# W03 匿名WBI搜索交付

2026-10-18，W03/F03，内部0.9.2/BiliSofa01.TV，见[ADR-039](adr/039-anonymous-wbi-search.md)。用户0.9.1第5次才加载的结果已独立归档，不记首搜稳定通过。0.9.1已确认的m:s格式修复保持，不重复历史/热搜UI。

## 改动

原来每次发未签名GET，改为固定公开nav读取当前公开材料，再执行一次WBI签名视频查询。全程匿名，不要求扫码，不读取当前账号Cookie，不执行任何账号写操作；材料不持久化或进入普通IPC/诊断。签名协议补齐不等于账号授权，也不把HTTP412解释为会员或地区限制。其他网络目标、TLS、UI、存储、媒体不变。

第一步16KiB、第二步512KiB、各16KiB头与4/8秒连接/总期限，严格固定端点和有限参数；材料URL只解析为公开hex、不访问。原生每步关闭后才启动下一步，queued stop/Home可阻止下一GET。Worker noExitRuntime沿现有媒体阶段模式，不能在第一次main返回时销毁运行时。失败只返回固定阶段码，无自动重发/无未签名fallback；页面原重试入口仍由用户明确操作。

## 证据

- 官方浏览器与服务端搜索路径不同的原始脚本只读留在仓库外，未执行/复制到应用。哈希、规则与[公开nav来源](https://api.bilibili.com/x/web-interface/nav)见ADR-039。
- 本机独立签名计算：nav HTTP200/259bytes、签名搜索HTTP200/6494bytes/API0/生产解析四卡。
- 本版生产C的真实外网读取：HOST仅将固定CA文件位置映射到本地，nav HTTP200/curl0/259bytes、查询HTTP200/curl0/6493bytes，生产public-key与视频解析均通过，四卡/noMore=false；无原JSON/材料/签名URL进输出。此为HOST证据，非TV。
- 原生HOST11项：保留原8项有意义边界，固定查询改验WBI排序/编码/五字符过滤/MD5及原CA/不跟随redirect/响应预算；新增固定匿名nav、nav16KiB、错误hex/过期epoch/空过滤词/非法页不发请求。测试专用CONNECT_TO/CA替换未进包。
- 新4项单元/合同：公开材料提取/忽略身份字段、拒绝登录与错误URL/超大、关键词协议过滤、nav失败固定IPC。新增1项真实Worker/合成C流程验证nav HTTP/TLS/材料/身份失败即停且无fallback，恢复仍须用户点击。全部既有搜索场景改走双阶段夹具，要求noExitRuntime、固定参数、延迟heap读取，原Back/Home取消覆盖第一步结束不进入第二步。

构建/打包/签名/安装和最终数量、hash配对另附。没有新账号写入/工具安装/远程CI/提交/推送/公开发布。完整F03其余搜索类型、其他W03个人内容/会话与云端、W04–W07仍开放。

## 唯一新协议人工组

搜索“你好”一次；若成功显示列表，再下一页、上一页各一次，核对列表页码。任一步出错，只反馈完整search.…/API码并停止；不连续重试，不播放，不重复首字母候选、历史、热搜翻组、Home或投屏。未回报前新协议TV结果UNVERIFIED，成功不推断长期稳定性。


最终本地门禁：382单元/合同、136模块strict/边界、33相关浏览器流程（19搜索含历史/热搜、10本地/诊断、4目录）、11 HOST原生TLS检查与11包负例通过。重复运行不重复计数；未改媒体/投屏/身份流程的旧通过不冒充本版重跑。新search经实际Samsung链接/CA/私密模式/来源扫描；与0.9.1比较identity/native/catalog/hot-search四类16项逐字节保持。unsigned `dist/BiliSofa-W03-search-wbi-unsigned.wgt` SHA256 `4b0ed333224ea73101be11648a551d638f0db9f1052d0c25166fca6a3d76ac44`，UI sourceHash `67701212bad2de7bbfa602020a221a1ff3b2b868d79325e66ec090f951ad69ce`。签名/部署与USER另附，HOST成功不等于电视稳定通过。


0.9.2实际部署：UTC2026-10-18T21:06:57.038990+00:00开始，state/capability/install/launch均exit0且平台明确成功。signed SHA256 `82669819d54dc324873e8af20cfe14f1ba0c215cc970e7ef7842aee6711d457c`，461文件源ZIP SHA256 `0bada7b2669a1c0c39a0f597c5fcdd04de2afdb496d54ee63bdd51c777e24856`。自有Author/Public Distributor沿用，无新权限/SDK/存储或账号变更；原其他16项native保持，旧search及失败工件保留。仅安装启动PASS，新协议USER首搜/前后页待一次固定组；不能记HTTP412稳定性或完整F03通过。

最终0.9.2 USER：首搜/下一页/上一页均成功，本次新协议最小组USER PASS，停止重复。旧版本HTTP412与第5次才恢复记录保持；不由三次成功推断长期稳定性或全部服务端规则已知。继续W03其余功能。
