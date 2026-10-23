# ADR-028：W02多账号保护存储与身份切换基础

日期：2026-10-17；范围：W02/F01/F12/F13实现合同，本地合成验证；新存储布局及正式账号Worker组合尚无目标机验收。

采用ADR-027路线，复用W01已分别证明的KeyManager、真实身份核对、Worker关闭模式，但不读取/迁移任何W01凭据、未知写入意图或探针身份。三星[KeyManager API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html)的RawData为字符串，提供saveData/getData/removeData与默认应用所有权；本实现只注入这三项，不枚举别名、不授予其他应用权限、不加普通存储回退。文档不能证明这个新布局已经在本电视成功运行。

## 存储

账号凭据和摘要一并放入8个固定、当前应用拥有的`bilisofa.session.v1.slot0`至`slot7`。每槽最多4096字符，cookie记录最多3500字符；只接收限定Bilibili主机、根路径、Secure标记及会话白名单字段，已提供的DedeUserID必须匹配UID。ID由已验证格式的UID生成；账号列表只暴露id/uid/name/expiresAt，不向UI状态传完整cookie。

不假定saveData支持覆盖/原子替换：仅向确认空槽新增；相同账号或满槽显式拒绝，不删除其他账号腾位置。W03续期/重扫码应实现用户可见替换流程，不能以本批拒绝重复新增宣称续期已完成。启动最多读取8个固定槽，无普通存储索引；任一槽损坏或重复身份时失败，不悄悄忽略。删除后必须读取到NotFound才算成功。

相同API实例跨store对象共享保存锁。保存取消/超时不等于未落盘，锁保持到真实回调确认仅清理本次完全一致的值；不同内容不删，清理/删除未确认保持阻塞。新进程读到保存项仍必须重新核对身份，不根据存在的cookie直接展示已登录。没有新增凭据日志或默认自动选择账号。

## 权限与生命周期

AccountCoordinator先撤销请求代次并取消旧请求、同步隐藏私有视图，再等待页面/媒体资源和旧网络runtime的真实关闭确认；任何关闭未知均禁止建立下一个账号runtime。账号选择只在受保护记录未过期、网络核对UID相同后转为active。网络失败、过期、不同身份分别留下未启用状态，不自动改选其他账号。异常只暴露固定错误码。

所有账号读取经SessionManager；请求scope绑定账号、代次、媒体、请求ID。请求结束/切换/卸载后不再接受旧回包；同步abort监听不能创建新的请求。Home取消当前验证与请求并关闭资源；恢复创建新runtime重新核对原账号，不自动播放或提交写操作。显式账号切换/删除清除私有页面和模态历史；同账号后台恢复保留原返回位置。

AccountWorkspace将以上流程接到TvShell；必须先完成模态关闭再清空返回栈。TvShell.suspendConfirmed保留页面owner实际关闭失败，不能以suspend Promise完成冒充成功。当前浏览器使用内存合成repository/runtime；尚未将真实扫码Worker改装成正式多账号runtime，也未将这些合成夹具打为TV应用。

## 交付边界

本批不新增SDK、依赖、特权、证书、部署或真实账号动作；旧W01云写入授权已经用完，本批没有调用云写入。F07仍未验证；F01/F13只有基础代码，不等于多账号真机业务通过。W02后续接正式Worker与媒体适配器、设置/本地续播隔离、性能基线和应用包；W03完成扫码/续期/内容业务，再以最小必要用例验证目标机。
