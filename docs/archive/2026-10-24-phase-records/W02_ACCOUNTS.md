# W02第二批：受保护多账号与生命周期装配

日期：2026-10-17。对应W02/F01/F12/F13；设计与权限边界见[ADR-028](adr/028-protected-multi-account-foundation.md)。本批实现会话存储/身份代次和导航装配；真实扫码、正式网络Worker、会话续期和多账号真机业务尚未装配验收。

## 实现行为

| 模块 | 责任 |
| --- | --- |
| `packages/contracts/src/private-account.ts` | 账号摘要、私密会话、repository/runtime合同；ID/UID绑定、Secure cookie白名单、外部字段运行时验证 |
| `apps/tv/src/platform/private-account-store.ts` | KeyManager固定8槽、不覆盖新增、摘要列表、删除后NotFound核查；取消/超时共享锁、迟回调仅清理本次一致值，无普通存储回退 |
| `packages/bili-client/src/accounts.ts` | guest/switching/active/error/suspended/blocked；验证身份后启用，切换先取消旧请求并等待真实关闭，Home重校验、删除/卸载 |
| `packages/bili-client/src/session.ts` | 完整scope校验；结束/切换/卸载拒绝迟回包，同步abort期间禁止新建请求，解析过程中身份改变也丢弃结果 |
| `apps/tv/src/app/account-workspace.ts` | 账号状态接TvShell：立即隐藏私有视图，模态关闭后重置账号返回栈，同账号前台恢复保留位置与焦点 |
| `apps/tv/src/platform/keymanager-data-api.ts` | 可复用最小平台数据接口；旧W01类型保持兼容，无别名枚举或权限授予 |

私密会话不进入公开状态/导航/偏好存储；列表只返回摘要。runtime工厂是正式WASM网络适配器的注入边界，必须让close等待原生ACK；返回JS Promise或terminate Worker不能冒充关闭证据。本批浏览器仅注入内存账号/可控身份与关闭夹具，没有B站请求、真实扫码、受保护存储写入或云写入。

保存未知时，同一个API实例的其他store也不能复用槽。旧15/20秒云写入意图和W01账号别名均未读取或更改；两个单次授权不再可用。账号到期、身份不匹配、清理未知均不给假登录状态，不自动选择其他账号。

## 验证记录

- 285项全量单元/合同通过；新增24项覆盖多账号存储隔离、敏感字段校验、满槽/重复、取消/未知保存、迟清理、删除确认、真实身份匹配、过期/超时、关闭未知、快速切换、后台恢复、scope伪造和同步abort重入。
- 18项Chromium合成流程通过（原11项＋7项账号装配）：包括关闭私有弹窗后切账号、迟到身份隔离、等待旧native关闭、页面清理失败阻止新runtime、Home恢复原页面焦点和删账号返回游客。
- strict和94模块依赖/平台全局边界通过。共享SessionManager的旧探针浏览器回归另在TEST_REPORT记录；没有把本批本地检查记为TV/Voice Guide/真实账号通过。
- 首轮浏览器15/17：一项夹具强制点击实际被弹窗覆盖，改由composition API触发并保留正常焦点边界；另一项发现前台恢复误走账号重置，已修复。复核另发现返回栈必须等待模态关闭，已修复。后续夹具账号按钮移入唯一focus root时，默认入口顺序改变导致17项beforeEach失败，已恢复“设置”初焦点。失败原件仓库外保留，该轮最终17项通过，补充失效读取处理后的最终18项通过，不伪称初跑全绿。
- 没有新增依赖、SDK、权限、签名、电视安装或真实账号操作；GitHub CI仍未运行。

预览沿用[W02基础交付](W02_FOUNDATION.md)的命令与ZIP；只含合成账号，不是WGT或业务应用。打包器新增平台模块输入拒绝门禁，防止connect-src none被误当成KeyManager/原生网络隔离。

## 下一步与未验收边界

继续W02正式Worker/媒体适配器装配、设置和本地续播分账号隔离、性能基线和实际应用包。W03再完成真实扫码、多账号列表/续期/移除的完整业务流程。新8槽布局、同账号重开恢复及正式Worker组合需后续目标机验证；W01旧单槽保护证明不外推为新布局通过。F07云进度与F19高画质维持原未验证状态。

当前预览ZIP SHA256：`c5c80978614fe2fe16300a7e9951e90233e8bbe5665af7f2e8ce6b42c58fc8e5`。首批预览原件已按原SHA在仓库外保留；本包是更新后的本地合成夹具，不能安装电视。

复核补充：服务端读取判定当前会话失效时撤销authority并清空私有页；旧账号迟到的失败同成功回包一样按scope丢弃，不能把新账号退出。普通读取异常也只保留固定DomainError代码。对应两项单元和一项浏览器检查已加入最终285/18结果。

最终源码补跑的`tests/ui/probe.spec.ts`＋`tests/ui/session-probe.spec.ts`共51项通过；前一构建的115项全量旧探针浏览器记录单独保留。
