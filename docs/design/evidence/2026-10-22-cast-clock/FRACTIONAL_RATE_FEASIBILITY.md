# R07小数倍速：后端前置证据

这是当时的属性级记录；后续未部署候选及部分桌面实验见[当前候选证据](../2026-10-22-element-candidate/README.md)。不能将后续结果回填成本次TV实播。

2026-10-22；0.43.0原包调试环境。未装入新后端、未打开媒体、未挂载video元素、未修改生产菜单。结果见[固定字段摘要](html-video-api-presence.json)。

当前电视存在MediaSource，AVC/AAC/HEVC所查询MIME返回支持；独立未挂载video的playbackRate属性对0.25至2的所列档位写入/读回相符；DASH canPlayType返回maybe。这仅证明API存在和属性赋值，不能证明可解码、实际倍速、声音、同步、HDR/4K或生命周期行为。

下一步后端实现仍需有界真实媒体可行性：复用电视内源桥，检验本地MPD路径、跨域/CSP、真实时间斜率与声音，再决定原生video或MSE路线。必须保留现有AVPlay设备通过证据、单一解码器所有权、取消/关闭和叠加时间合同；不能将排队切换当作setRate成功。尚未实播，R07小数倍速仍NOT_IMPLEMENTED，不据此开放按钮或关闭需求。
