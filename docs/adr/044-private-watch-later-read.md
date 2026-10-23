# ADR-044：F05 按已核对账号读取稍后再看

状态：实现候选，真实私人列表/TV仍待。范围W03/F05，只有只读列表/摘要/分页刷新，不关闭队列或完整F05。

## 当前协议来源

官方`https://www.bilibili.com/list/watchlater`所引用的playlist脚本，HTTP200、978106字节，SHA256 `e8d2fc8a28d5ef194e357608744db66ee76f0b76dd43c86830224fdddfc89ec0`。人工读取其固定GET `/x/v2/medialist/toview/web`及`mobi_app/ps/use_pn/pn/desc/otype/with_current/direction/preview`参数；UGC类型常量2。其规范化读取`data.list/has_more/count`与`is_pgc/arc_info.title/state/pages`，不是旧`toview/web`数据结构。外部脚本仅作来源，不执行或随应用分发。

同一固定查询单次匿名HOST HTTP200/API -101，49字节，SHA256 `260455a4294a3d2a27d6f676a5de0a6e8c8d4867e5ee74c5b0c7cf9e107760be`，证明未登录门槛，不算私人内容实读通过。HTML首轮落盘后本地UTF-8解码因gzip失败；随后仅解压原文件，无重发，HTTP状态当时未保存，不补记。原始HTML/JS/响应均私密归档。

## 权限和资源边界

`AccountRuntime.readWatchLater`是可选的类型化只读能力，旧身份和合成mock不因此获得通用网络。`platform/account-runtime`持有保护存储所得会话，装配现有身份适配器和独立library Worker；UI只通过AccountWorkspace已核对身份的读取租约传入页码，不消费PrivateAccount、Cookie、URL或原始JSON。

独立`library.c`仅允许同一`api.bilibili.com` HTTPS cookie jar中的nav GET→核对UID→稍后再看GET。数字页码1–25、每页4项，Referer固定；无QR、CSRF提交、增删、进度/播放器路由、POST、重定向跟随或代理。TLS验证沿用已验证CA，connect4秒/请求8秒/原生会话20秒；响应512KiB、头8KiB、账号输入4KiB，完成/取消/失败擦除input/body/cookie jar并发真实关闭ACK。原identity/native/catalog/search/hot-search的20个条目不修改。

Worker再核对账号/过期/UID，将原始内容规范化为最多4KiB的四卡DTO；只含标题、UGC/PGC/未知类型、源端正常/已失效/未知状态、分P数量。丢弃资源/账号ID、媒体URL、封面等，私人列表不进普通KV或诊断。源端正常不等于权限/本电视播放通过，本批无播放按钮。缺少arc_info不伪记“已失效”；类型/状态未知明确展示。

父端严格核对scope/操作/页码，取消后等待原生ACK才结束读取；未知关闭会毒化租约并阻止复用。UI owner只等待底层读取关闭，不等待AccountWorkspace整个失效转换；否则登录失效引起shell drain时会互等。身份变化立即隐藏私人DOM，Home重新核对身份后重建入口。无自动重试或缓存回退。

## 产品边界

入口放在账号管理，游客禁用；保持首页八项工具布局。四卡/最多25页，源端仍有后续时第25页显示内部100项边界，不冒充完整列表。摘要Back回原卡，列表Back回账号入口；刷新明确请求源端第一页。历史/收藏夹、队列播放、更多分页、真实双账号验收及F01续期仍开放，旧进度写授权/防重放记录不变。

F02分区翻页交互未见异常，但动画/舞蹈实际API -352，停止重复该组。不能把本批私人通道当成绕过匿名分类拒绝的授权，也不把已有14项UI/请求重新实施。
