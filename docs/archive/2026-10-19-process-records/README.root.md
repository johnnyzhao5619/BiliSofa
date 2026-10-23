# BiliSofa

坐在沙发上，用三星电视看 B 站。

BiliSofa 是计划中的独立三星 Tizen TV 客户端，功能覆盖平板端常用观看与互动能力，界面以遥控器操作为中心。项目自有代码采用 MIT，目标为一个完整 v1.0.0。

## 当前状态

已有W01内部探针及部分可移植基础合同。0.0.9已在目标电视签名安装，取得合成网络/KeyManager报告及部分媒体、Home和标记保持证据；完整客户端与W01全部门槛尚未通过。不得将探针描述为客户端已经实现。

执行记录：[实施状态](IMPLEMENTATION_STATUS.md)、[开发命令](DEVELOPMENT.md)、[测试报告](TEST_REPORT.md)、[探针与真机步骤](../../W01_PROBE_GUIDE.md)。本地 `npm ci --ignore-scripts` → `npm run check` → `npm test` → `npm run build` → `npm run package`。桌面交互测试用 `npm run test:ui`，首次需 `npx playwright install chromium`。包只在 `dist/` 生成，不隐式签名/安装/发布。

## 运行目标

- 在 Samsung UN58U8200FFXZC 上安装一个 App，直接访问 Bilibili 与其 CDN。
- 日常使用不依赖常开的电脑、NAS、局域网代理或自建云端服务。
- 多账号、个人功能、字幕/弹幕查看、保留的互动、番剧、直播、4K/HDR和官方Bilibili App投屏纳入同一完整发布目标。评论、回复与点播/直播弹幕只读，不提供编辑/发送或评论删除；搜索规划应用内拼音首字母联想，见[范围调整ADR-003](../../adr/003-read-only-comments-danmaku.md)。
- 电脑用于开发、签名、侧载、升级和调试；完成这些工作后可以关机。官方投屏发送端仍需与电视处于可发现的网络。

## 技术路线

优先验证 Web UI＋电视内 WebAssembly 网络模块，候选备选为 Tizen .NET。三星官方扩展文档提供 TCP/UDP、监听、组播与 cURL 能力，已取得的本机证据与未验证项分别记入设备能力表，完整运行时决策尚未落定。架构可行性确认后才固定发布包形态。

## 文档

- [产品需求](../../PRD.md)
- [独立运行架构](ARCHITECTURE.md)
- [全功能单次发布计划](IMPLEMENTATION_PLAN.md)
- [验收清单](../../ACCEPTANCE.md)
- [最新研究与来源](../../RESEARCH.md)
- [架构决定 ADR-001](../../adr/001-standalone-tv-runtime.md)
- [开源与发布](../../OPEN_SOURCE.md)
- [历史调研](../../research/history/README.md)

## 许可与关系

自有代码采用 [MIT](../../../LICENSE)。复用代码和依赖保留其自身许可与版权，见 [第三方说明](../../../THIRD_PARTY_NOTICES.md)。本项目与 Bilibili、Samsung 无隶属或官方认证关系；协议兼容不代表平台授权，实际内容遵守账号、地区与设备能力。

## 开发约束 / Development guidance

- [AGENTS 入口](../../../AGENTS.md)
- [电视 UI、遥控焦点与输入](../../TV_UI.md)
- [编码、异步、安全与性能](../../ENGINEERING.md)
- [目录与依赖方向](PROJECT_STRUCTURE.md)
- [Tizen 平台、媒体、生命周期与签名](../../TIZEN_PRACTICES.md)
- [官方最佳实践研究与来源](../../research/tizen-best-practices-2026-10-14.md)
