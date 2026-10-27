# U4 可逆互动候选证据

2026-10-22；0.36.0已升级启动 / F11 / W05 / R03，见[ADR-078](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/078-independent-reversible-interactions.md)。独立读取能力、局部未确认、预览取消、一次提交/回查和运行时F14暂停已实施；用户已确认真实读取、预览取消、Back/Home通过；点赞/关注提交USER FAIL、代码记不清，原因未确定，真实写入未验收。R06应用重登、R09和U5继续OPEN。

本地285模块、641单元合同、8项互动UI、13项保留播放器/设置UI、8项连续浏览UI及6项包负例通过。只使用合成账号/响应/媒体；原始检查日志在ignored `.local/u4-interactions/`。全部相关UI在最终候选上运行；不将旧包测试结果直接移记本包。

[工件回执](receipt.json)保留源码/包hash及失败/成功平台结论；两次连接检查未确认后，用户确认电视开机，再连接升级，state/capability/install/launch均明确成功。这不等于界面/账号验收。243源码输入/27界面文件配对，0.28–0.35的216个冻结文件不变；17个原生模块/68项资源含CA沿用。不卸载、不清账号/本机数据/unknown日志，不发布Git。

- [互动面板](actions.png)
- [局部不可用](partial.png)

截图来自桌面合成场景；浏览器缺少AVPlay插件，不能据此证明真机视频可见或声画通过。0.34.0已请求A–F USER PASS保留；其承载的0.35.0五项体验在0.36.0获USER PASS，旧清单归档见[旧清单](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/archive/2026-10-22-product-browse-035/ACCEPTANCE.md)。当前集中操作见[当前电视验收](../../../CURRENT_DEVICE_TEST.md)。
