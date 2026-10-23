# ADR-046：收藏夹只读与私有选择引用

2026-10-19。W03/F05，内部0.16.0，沿用BiliSofa01.TV；接受为候选实现，真实数据待验。0.15.0历史只读USER最小组已通过，停止重复。

## 当前一手依据与边界

已归档当前官方header源码固定GET `/x/v3/fav/folder/list4navigate`，消费`data[0].mediaListResponse.list/count`，每夹`id/title/media_count`；`data[1]`是稍后再看，不能混作收藏夹数。该接口用于导航，不假设必定返回全部收藏夹：源端count超过返回列表时显示“当前导航未返回全部收藏夹”，完整收藏夹覆盖仍开放，不将预览当完整F05。拒绝超过100夹/非法ID/重复ID/不足的计数。

官方playlist源码定义COLLECTION=3、FAV排序=3，GET `/x/v2/medialist/resource/list`支持`biz_id/ps/use_pn/pn`及排序等固定参数，消费`media_list/has_more/total_count`。本实现固定收藏类型、每页4项/最多25页，显示标题/已提供分P信息数/类型；不解释未确认的attr位为失效状态，不把pages长度声称完整分P总数，不交给页面资源ID、URL或封面。源端完整账户响应仍需TV核对；无凭据HOST匿名导航检查未取得可用响应，不据此推断TV读取失败或可用，不重试绕行。

## 决策

复用ADR-045共享私有native owner；每个实际读取先核对当前账号nav，再执行固定GET，关闭确认后返回。library新增operation3导航、4收藏内容；不新增权限、SDK或保护存储格式。父层返回的夹ID只在account-runtime内存持有，页面只拿临时`f<revision>_<index>`引用。内容读取必须命中当前账号代次/当前导航快照；刷新/关闭清空快照并使旧引用失效。旧请求/关闭未确认仍受现有generation与poison门槛约束，不能复用未知关闭的通道。

UI沿TvShell已有模态owner：账号→收藏夹→内容→摘要，Back逐层恢复原卡；加载可取消，失败清空旧卡，登录失效清理私有DOM。列表只读，无播放、收藏增删、建夹或云端历史提交；这些未实现功能仍按原产品清单跟踪，未删除范围。

## 验证门槛

解析/IPC/旧引用、同账号固定GET/取消擦除/TLS、嵌套焦点Back/空态/失败/Home/合成账号替换及共享通道回归；实际SDK链接、包固定路由与禁止写路由门禁。电视仅新增同账号收藏列表/条件翻页/摘要Back一组，不重跑历史/稍后再看/投屏。真实两账号与完整F05/W03保持开放。

0.16.1补充：USER发现3项收藏仍可翻下一页并invalid。本地确认只依has_more的不足，按[分页修复](../W03_FAVORITES_PAGINATION_FIX.md)加入已校验总数/页偏移终点及有证据的空终页表达；不以短页长度单独截断，不更换固定路由或松开非终页校验。旧包USER缺陷保留，实际TV修复待补验。
