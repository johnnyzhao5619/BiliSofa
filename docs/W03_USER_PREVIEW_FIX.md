# W03 UP 预览画面遮挡修复

2026-10-18，W03/F03/F06，内部0.10.1/BiliSofa01.TV，承接[UP搜索交付](W03_USER_SEARCH_APP.md)和[ADR-040](adr/040-public-user-search.md)。

## 用户结果与已确认缺陷

0.10.0用户确认UP搜索、信息、前后页、音频超过10秒、跳转、返回后续播正常；附带预览全程没有画面，声画验收FAIL。该结果按原signed/source独立保存，没有原生新报告，不由音频或进度推进推断视频解码成功。

本地对原0.10.0生成页新增有意义的可见性回归，先运行得到预期失败：播放时UP搜索/摘要均已inert，但CSS visibility仍visible。两层固定不透明背景和100vmax阴影覆盖视频区域，截图保留。既有body.playing-media只隐藏首页和header，没有隐藏嵌套弹窗；从首页直接播放的旧路径没有这两层背景。这是已确认的DOM遮挡缺陷，与用户症状相符；尚不能替代电视声画验证或排除另有媒体问题。

## 修复与边界

只在body.playing-media期间隐藏`#overlays > section[inert]`的绘制。保留原节点、布局、资源owner、焦点键和返回栈；当前媒体控制弹窗仍可见。Back在既有媒体关闭时撤销playing-media，摘要/搜索自动恢复；Home沿既有关闭流程清除。使用现有shell的inert所有权，不新增按键、焦点或AVPlay调用，也不为UP路径另写一套播放器。

搜索数据、源解析/网络、MPD/编解码、AVPlay调用及20条原生产物不修改；不新增权限、依赖、SDK、账号动作或外部服务。此修复不改变完整F03/F04/W03及v1未完成状态。

## 验证

新增一项真实Worker/模拟SDK浏览器回归，覆盖播放时两层背景隐藏、当前控制层/播放器对象可见、暂停/seek保持、Back恢复摘要焦点、重开续播及Home清理。局部渐变色只用于显现DOM遮挡，绝不是视频解码或真实电视画面证据。先旧版失败再修复通过的输出分别保留；完整相关结果和工件配对后记。

唯一人工补验：同一UP预览短播约10秒，看画面/声音是否都正常，再Back检查摘要恢复。只核对画面修复与隐藏恢复，不重测搜索/翻页、跳转/续播、历史、账号或投屏；任何失败即停止并保留实际结果。安装启动不等于该项USER通过。


0.10.1本地最终门禁：388单元/合同、140模块strict/边界、26搜索＋16媒体＋6投屏浏览器流程（共48项）及12包负例通过，重复执行不重复计数。新增遮挡场景对原0.10.0失败、修复后通过，暂停/seek/Back/续播/Home覆盖保持；本版未重跑原生HOST TLS或SDK链接，全部五类20条native与0.10.0逐字节一致。没有原始TV帧或解码报告，新版电视画面修复仍UNVERIFIED。


0.10.1工件：unsigned `dist/BiliSofa-W03-user-preview-fix-unsigned.wgt` SHA256 `d77a8e0ffc75bb388bb9a531fc3397ca04e4c3b2e8eb607bbb58b41a0112e177`；signed SHA256 `b30cba1d854721814dd889466d6f507a29f3c026304ccb391068900e3352d2ef`；UI sourceHash `ff72582724811ce1056f294409f85064774e0c1d865d1ea42c460a73d9bd028f`。沿用自有Author/Public Distributor，证书日期/issuer及签名前后payload一致检查通过；未增加权限。部署及USER结果另记，旧0.10.0画面FAIL和source配对保持。


0.10.1实际部署：UTC2026-10-19T00:54:31.288236+00:00开始，state/capability/install/launch四项均exit0且平台明确成功；本轮无需重连/重复安装。470文件源ZIP SHA256 `b2d0eb27acecf2fa5e2953d2bfab0b55d19d447e5951f0ddd601ee1fc141a61c`，signed SHA256 `b30cba1d854721814dd889466d6f507a29f3c026304ccb391068900e3352d2ef`，UI sourceHash `ff72582724811ce1056f294409f85064774e0c1d865d1ea42c460a73d9bd028f`。源ZIP在部署前冻结，后续部署/文档单存delivery-records，旧0.10.0 USER画面FAIL不覆盖。USER修复结果待一次同预览约10秒声画与Back摘要恢复；仅安装启动PASS，不推定真实画面已恢复。


0.10.1最终USER：用户确认音画正常，Back后UP摘要恢复显示，唯一画面修复补验USER PASS，停止重复。结合0.10.0已有搜索/信息/翻页/音频控制结果，本轮UP搜索＋附带预览最小组合收束；0.10.0无画面失败原件保留，不重写为通过。没有新增原生设备报告，不扩展到完整UP主页/投稿、全部F03/F04/W03或v1验收。
