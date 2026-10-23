# ADR-018：官方投屏专用Akamai节点的精确目的地候选

日期：2026-10-16。W01/F06/F20。状态：0.0.58已实现，381项本地检查/实际Samsung两路线编译和包门禁通过；已安装/启动并取得匹配监听清理报告，058用户P1→P2后约3秒停播，匹配206/28但仅g1/无节点命中；实际媒体兼容仍FAIL/未闭环。完整W01/F20仍OPEN。

## 证据和边界

057 Android同一短UGC两次切P单样本USER PASS，UTC21:36:39固定trace记录两次换源接受，且随后g3/playing发生policy_destination_akamaized。随后连续三次复测USER FAIL，UTC21:38:46 trace仅首源接受与g1/playing的policy_destination_akamaized，没有接受换源或任何新代次阶段。后一次被观测请求确实在目的地验证被拒绝，不能用SDK等待、四源额度或索引预算解释。原056间歇失败和057成功/失败分轮保留，不能追认所有失败均同根因。

诊断只提供域家族文字分类，没有精确主机。2026-10-16核查Bilibili自有[官方视频测速页面](https://www.bilibili.com/blackboard/video-diagnostics.html?bvid=BV1KS4y197BN&cid=455022263)：搜索引擎当日抓取的官方页面表格列出upos-hz-mirrorakam.akamaized.net，直接页面为动态测速表，静态抓取时可能只有表头。这是该专用节点用于Bilibili视频服务的一手页面证据，不是手机失败源完整URL或实际电视播放证明。用户专栏/其他客户端或社区项目不作为允许整个CDN的依据。

## 决定

在原bilivideo.com子域策略之外，只增加精确主机upos-hz-mirrorakam.akamaized.net。其他akamaized.net客户主机、其子域、相似后缀、根域、IP、userinfo和非默认端口仍拒绝；不将整个共享CDN加入后缀白名单。SOAP验证/分类和C的cast_source_valid独立执行同一精确主机判定。游客内容接口/其他账号目标白名单不变。

只允许原有/upgcxcode/下.mp4和唯一10位deadline（60秒至24小时），原HTTP投送只生成同字节authority/path/query的HTTPS候选，不进行HTTP请求或回退。原生仍复核目的地，CA/peer/host校验、禁止redirect/代理/凭据，512字节/206范围与MP4检查、桥/decoder关闭ACK、owner/媒体代次、4源/原5分钟期限与累计预算保持。没有自动改写目的地主机、修改签名、提升内容权益或下载整段媒体到电脑。

固定offer原因枚举使用最后空槽31：accepted_bili_akam，仅在原SOAP策略接受该精确节点的首源/同源/新源意图后记录；同源/换源由媒体代次、状态与transition摘要共同核对。它不代表TLS、prepare或声画成功，不输出URL/签名/metadata/地址。原32次观测、最近4项/8条4096字节报告和IPC总额916保持。

## 验证与回退

单元覆盖精确节点及相似/共享/子域拒绝、格式/路径/期限、HTTP只升级、owner/busy/过期及固定分类；真实Worker夹具覆盖该节点首源、连续三次更换至g4及其他共享节点拒绝。HOST C覆盖同样目的地负例、节点源检查、跨域换源的先关闭/旧token404/期限/预算保留。重新执行实际Samsung legacy和modern完整WASM链接，固定库/CA/许可证不变，精确记录输出hash/symbol map配对，再通过包门禁和签名安装。

真机先核对启动/清理，再同一短视频P1→P2→P1→P2。若新trace含accepted_bili_akam且实际对应内容/声画恢复，才记该节点在此样本被实际接受/兼容；若仍是family拒绝，精确节点假说未命中，继续保持其他目标拒绝并补最小固定分类，不能进一步扩大后缀放行。若进入prepare后失败，按独立阶段修复，不能把源政策改变称为整条链路已修复。旧057签名/source/失败原件留存，回退须明确记录，不覆盖历史。


058 UTC2026-10-17T01:40:36（多伦多10-16）失败报告没有accepted_bili_akam或新代次，仅g1及206/28。不能把该次早停认定为已接受新节点后的失败；用户观察P2与媒体记录尚未对应。当前先查读取终止与会话顺序，不追加域名、超时或重试。后续W01按用户要求的W01_EXIT_CHECKLIST有限功能门槛推进，连续三次等完整矩阵回到W06，既有缺陷不因此关闭。
