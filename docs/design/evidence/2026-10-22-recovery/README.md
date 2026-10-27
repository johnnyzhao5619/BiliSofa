# 单账号恢复模块

2026-10-22；0.40.0、F01/F12、W02、U4/R06。[合同/边界](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/082-single-account-session-recovery.md) · [精确工件与平台回执](receipt.json)。

明确失效会撤销私人请求/播放器及返回的能力；原账号重新扫码更新受保护会话，返回原栏目，私人数据/游标重新读取。Back/Home取消扫码，迟到回包无效；不自动播放、不重发POST，不删除已有队列、续播、设置或未知日志。保护存储v1保留、v2双bank更新；旧包回退可能需要重新扫码。

291模块静态边界、666单元/合同、26合成UI（恢复7、播放器/设置13、控制6）及6包负例通过。249输入/27输出与签名包配对；0.28–0.39的324个冻结界面文件、17原生模块/68资源不变。签名/源码快照及原始日志保持在仓库外；state/capability/install/launch明确成功，无卸载/清数据、代理真实账号POST或Git发布。

**所请求A/B/C USER PASS**：[用户记录](USER_ACCEPTANCE.md)确认取消、原账号更新及记录/重开；自然服务端失效未获本轮实机证据，不要求注销手机或人工制造失效。[当前整组清单](../../../CURRENT_DEVICE_TEST.md)。0.39.0所请求三组及随后一次点赞USER PASS继承，旧-403失败和未诊断根因保持。

合成图：[重新登录入口](login-required-synthetic.png)、[原栏目恢复](restored-synthetic.png)；只含合成身份，不代表真实电视、账号或性能证明。
