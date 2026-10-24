# 0.18.0 全部联网失败核查（F01/F02/F05，W03）

用户反馈：本机队列为空、持续显示网络失败；进一步确认登录账号和读取游客热门也失败。原0.18.0队列USER组FAIL，保存重开/手动换项/Back没有证据；不得把安装启动PASS或旧最小组套到这次反馈。原signed/source及反馈私密配对归档，源ZIP不改。

## 已确定与未确定

- LocalQueues只操作当前身份固定普通KV键，没有网络调用；未确认用户曾看到入队保存成功，也未证明保存后丢失。
- 热门Worker能返回经过合同校验的guest.transport_N、guest.http_N、guest.invalid_response；PublicContentRuntime却将其降为DomainError，页面丢失具体分类。这是源码确定的诊断缺陷，不是已确认的TV网络原因。
- 0.18.0与0.17.0的24项native/全部9个Worker逐字节相同。不能仅凭此排除运行环境问题，或断言旧版本现在仍可联网。
- 同机HOST使用现有包内CA，匿名热门一次返回HTTP200/API0/4项。Python默认CA先报证书验证20，已另记为开发Python信任链差异；没有关闭TLS、换UA/账号/代理，不能把HOST差异当电视根因。
- SDB旧state显示device但capability关闭；原地址一次重连后capability成功。依[Samsung/Wits源码](https://github.com/Samsung/Wits/blob/master/lib/appLaunchHelper.js)尝试当前App调试命令：未取得端口（原形式超时，带300参数形式closed）。没有shell/root/重置、扫描其它设备、读取凭据或卸载App；调试未连上不等于电视互联网失败。

## 0.18.1 诊断补丁

PopularReadError重新校验终态合同，只保留固定guest代码；API整数仍走原ContentApiError。页面显示该代码与“本机队列可单独查看”，不把网络错误描述为队列读取失败；诊断报告build从误留的0.15.0改为本版。没有更改网络请求、重试/超时/TLS/目的地/权限/原生库、登录流程或存储格式，不自动清空数据，不宣称网络已修好。

本地：430单元/合同、174 strict模块、13队列界面流程通过（原10项及新增真实生产Worker的curl6/28/60失败分类/保留两项队列/不开解码器）；25包负例通过。新增断言也核查生产adapter保留guest.invalid_response。最终文字/断言微调后的实际日志与产物在交付记录中列明；SDK/HOST原生组不重复计入本版。

下一次只缺两条可区分证据：电视系统网络/其它联网App是否正常；本版“读取游客热门”一次失败的完整guest代码。无需重新登录、换视频、连续重试或重做队列组合。若系统网络失败，先处理该外部阻塞；若其它App正常，依实际终态查本App的DNS/连接/TLS/HTTP/资源加载，未取到终态前不改超时或放宽验证。恢复后再继续原队列最小组，真机自然连播仍OPEN。


0.18.1实际诊断交付：state/capability/install/launch均exit0且平台明确成功；本次部署无需重连（此前调查一次有界重连及未成功调试独立保留）。553文件源ZIP SHA256 `312e10288e3717b26a90b5979a452c65cc6cd0baced6bcbecdc36539d20d308c`；signed SHA256 `23f8613f6cd1e00e0c5b95419d07c64e5cca07f76294ef45f613650b79b2df0f`；UI sourceHash `0fecf30aa0c670624c7c3e4b76f355663f220f6f248d7a2188e7a652d5e4c2fd`。24项native/全部9个Worker与0.18.0逐字节相同，无新权限/网络策略/存储迁移。最终13界面流程及3项adapter定向断言已重跑；430单元、174模块、25包负例通过。源ZIP在部署前冻结，当前文档/部署另存delivery-records。0.18.0全局联网FAIL保持；本版仅补取证，不宣称实际联网或队列USER已通过。


0.18.1 USER恢复反馈：用户两项均回复“目前全部恢复正常，全部验证项目也都成功且通过”。记当前联网恢复及原队列保存重开/一次手动下一项声画/Back最小组USER PASS，停止重复；旧0.18.0失败保持，未取得失败guest码/系统网络对照，不宣称诊断补丁修复根因。未要求自然结束，不推定真机自然连播、真实双账号或完整F05/W03/v1通过。下一批补私人列表普通UGC的显式本地入队，不执行云端写入。
