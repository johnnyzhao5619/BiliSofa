# ADR-041：固定匿名番剧搜索与只读摘要

2026-10-18，W03/F03，内部0.11.0。沿ADR-039/040的公开WBI查询边界；完整UP主页/投稿仍属F04，番剧播放和选集仍属W04，不由搜索摘要代替。

## 事实与决定

0.10.1的UP预览音画/Back补验USER通过，本轮停止重复。下一项UP投稿的固定匿名`/x/space/wbi/arc/search`本机请求HTTP412，未取得JSON；仅记录此路径的当前外部阻塞，不推定账号权益/全部UP路由不可能，也不以伪装客户端、代理或连续请求处理。未装入新的投稿端点。

番剧使用同一[公开WBI搜索路由](https://api.bilibili.com/x/web-interface/wbi/search/type)，固定`search_type=media_bangumi`。本机匿名nav200、查询HTTP200/API0/88811bytes，实际一条凡人结果；生产解析为一条摘要、399bytes IPC。原响应含197条eps以及封面/地址/跟随等字段，全部丢弃；原JSON只留仓库外。body SHA256 `ada3c7195a2775302cf08d302b008bd94f5d353ecbc3b30e4060bdb385854d00`。这是独立HOST请求与生产解析证据，不是生产C真实外网/电视读取证据。

因此在现有search C/Worker中新增唯一固定操作`public-pgc-search`及`pgc-search-wbi`，不允许调用者传URL、类型或账号凭据。C只有video/bili_user/media_bangumi三种内部固定选择；公开nav、签名、材料/epoch验证、TLS/CA、无Cookie/redirect/代理、响应/读取/关闭期限、Home取消及未知关闭不复用均保持。只重建search模块，其他四类16条native不改。

## 合同与页面

- 四卡/十页，season_id为安全正整数并转字符串作为稳定卡片身份，重复ID拒绝，不按同名合并。
- 标题120、类型16、地区32、题材32、更新状态48字符；元数据缺失与评分缺失明确为未提供，评分有值时严格0–10。四卡与最大有效Scope满足原4KiB IPC，不扩大预算。
- 数据以textContent显示，只移除既有固定em高亮；不把外部HTML、链接、eps、封面、is_follow或其他接口状态当代码/导航/账号事实。
- 首页“搜索番剧”→既有首字母输入，确认才GET→两列卡片/前后页→只读摘要→Back回原season卡→Back回入口；更换词/历史选词保留番剧语境，沿当前身份历史开关，不迁移schema。当前不提供未装配的番剧播放按钮，完整播放/选集后续以真实媒体合同实现。
- 所有读取归现有owner和Scope，加载可Back，Home/身份变化取消并拒绝晚到结果。失败清除旧卡，区分HTTP/API/固定字段错误/空结果，只由用户明确重试。

## 验证退出

本地真实Worker与合成C、HOST本地TLS及Samsung链接分别记证据；只请求一组新增番剧查询/结果摘要/返回，结果多页时再一次前后页，失败即停止。不重复视频/UP预览/历史持久化/账号/投屏组。没有新权限、依赖/SDK安装、真实账号读写、外部常驻服务或公开发布。全F03、F04及W03–W07继续开放。
