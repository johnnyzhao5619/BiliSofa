# ADR-039：匿名搜索使用当前公开WBI查询协议

2026-10-18，W03/F03，内部0.9.2；替代ADR-036的未签名视频搜索地址，不扩大账号权限或产品范围。

## 事实与决定

0.9.1用户仍多次HTTP412，第5次才显示列表，不能记稳定通过。[官方搜索客户端脚本](https://s1.hdslb.com/bfs/static/shanks/laputa-search/assets/index-9c8665e7.js)实读SHA256 `9b073aa0c98008bfd93b675f14cf6b47149b11234211d1f31c1a1429fa70502f`：环境判断区分window是否存在，浏览器请求 `/x/web-interface/wbi/search/type`，服务端分支可使用未签名地址。前端包含公开WBI变换。本项目旧实现使用服务端分支的未签名地址，存在已确认的协议差异；这不证明412的所有服务端原因。

[匿名nav](https://api.bilibili.com/x/web-interface/nav)实际返回HTTP200、code -101/isLogin false，并带公开wbi_img材料；未登录状态不妨碍获取该公开材料。保留原项目UA、TLS和匿名身份的HOST签名请求取得HTTP200/API0/四卡，生产解析通过。另一次直接使用本版生产C、只在HOST替换CA文件位置的请求同样nav200/查询200/API0/四卡通过。资料动态获取，不嵌入他人客户端私密身份/密钥，不导入Cookie或调用ticket/账号接口。

因此每次搜索改为两步：固定匿名nav GET→有界解析/校验公开材料→固定WBI视频搜索GET。第一步真实GUEST:closed后才读heap，下一事件边界检查取消再开始第二步；不是收到412才尝试另一路。无旧地址fallback、自动连发、UA/代理轮换或账号权限回退。

## 合同与资源边界

- nav体16KiB/头16KiB；只接受code 0或-101且isLogin严格false，图片URL为HTTPS、i0/i1/i2.hdslb.com、固定bfs/wbi路径与32位小写hex PNG，无用户信息/非标准端口/query/hash。不下载图片、不接受其作为网络目标，仅取两段公开hex，留在当前Worker内存。
- 原关键词32码点/128bytes与页1–10保持。WBI按公开规则去掉五个协议字符`!'()*`，其余UTF8用curl编码；过滤为空在进入C前拒绝。UI/本地历史仍保留用户原输入。本版不添加官方网页跟踪参数或借用客户端身份字段。
- Native对关键词/页码/两个hex/10位epoch再校验；epoch距本机时钟±30秒。以排序固定参数keyword/page/page_size=4/search_type=video/wts构造校验和，仅固定WBI端点可用。响应512KiB、CA/主机校验、4秒连接/8秒总期限、无Cookie引擎/重定向/代理保持。
- Worker设置noExitRuntime，沿已证明的匿名媒体多阶段callMain方式顺序执行两个C操作，每一步各自关闭cURL。父端20秒读取/12秒关闭门槛保持；中止后不开始下一步，未知闭合仍阻止复用。无任何原生中间结果发给页面。
- 原search请求/成功结果不变；增加固定nav_http_N/nav_transport_N与public_keys/signing_keyword格式分类，原始响应、公开材料、请求参数/签名不进报告。nav错误不改账号登录状态；不把-101作为要求用户登录的反馈。
- 仅重建search模块。identity/native/catalog/hot-search四类16项、CA、权限和本地存储不变；包门禁要求固定nav、WBI路由/参数，拒绝未签名回退及无关账号/媒体端点。无新依赖/SDK或外部常驻服务。

## 退出与不确定性

HOST正确响应和本地签名/TLS/取消检查不等于零售电视稳定通过。只请求一次新协议首搜，成功时再前后翻页各一次；任一步失败就停止，不重试、不播放、不重测历史或热搜UI。若仍HTTP412，保留具体阶段和外部拒绝，停止该人工调查组，继续其他开发；不得用多次恢复冒充首搜成功。长期可用性、频率/风控的全部服务端规则仍未知，完整F03/W03保持开放。
