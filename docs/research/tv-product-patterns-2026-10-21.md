# 大屏产品模式来源登记

核查日期：2026-10-21。仅采用厂商/平台和官方发布者资料；这是公开资料研究，不是对YouTube/Netflix/Bilibili当前电视客户端的实际遥控操作或性能测量。转译为BiliSofa的具体布局、按键、密度和预算属于项目设计，需要本机验证。

| ID | 一手来源 | 能支持的事实 / 采用的设计 |
| --- | --- | --- |
| P01 | [Samsung UX Checklist](https://developer.samsung.com/smarttv/design/ux-checklist.html) | 网格对齐、四向可达、单一清楚且一致的焦点、操作进度和错误恢复。用于所有页面出口，不把“合成可点”当TV认证 |
| P02 | [Samsung Media Player](https://developer.samsung.com/smarttv/design/media-player.html) | TV媒体控制和屏幕交互设计指导；常用控制可通过方向/确认完成。具体自动隐藏时间沿用项目已验收合同，不宣称它是三星强制值 |
| P03 | [Android TV Focus system](https://developer.android.com/design/ui/tv/guides/styles/focus-system) | 焦点/按下/选中/禁用分态、焦点区域与轮廓/缩放等提示。仅借设计原则，Web继续用DOM焦点，不引入Android控件/runtime |
| P04 | [Android TV Navigation drawer](https://developer.android.com/design/ui/tv/guides/components/navigation-drawer) | 收起/展开导航、少量主要目的地、当前页面指示与底部辅助入口；不同抽屉模式的激活行为可不同。采用六个目的地、确认切页，避免移动焦点就联网 |
| P05 | [YouTube TV端使用说明](https://support.google.com/youtube/answer/7583931?hl=en-GB) | 搜索、首页、订阅、片库及播放时的描述/评论、保存和关注操作。用于“发现—观看—片库”组织；这里是YouTube应用，不是YouTube TV付费直播服务 |
| P06 | [YouTube：Designing a richer YouTube experience for your TVs](https://blog.youtube/news-and-events/designing-a-richer-youtube-experience-for-your-tvs/)（2024-03-13） | 官方讨论观看与阅读的平衡、主控制保持简单、评论/描述与缩小视频并排。借鉴阅读区；本项目AVPlay矩形与字幕坐标仍需实现/实测 |
| P07 | [Netflix新TV布局](https://www.netflix.com/tudum/articles/netflix-new-tv-layout)（2025-05-07） | 公开改版将主要导航放顶部，强化浏览时的信息和My Netflix中的继续观看/片单。借鉴个人片库与选择信息，BiliSofa侧栏是项目取舍，非照搬Netflix现状 |
| P08 | [Bilibili官方发布者App Store页面](https://apps.apple.com/cn/app/id736536022)、[官方下载中心](https://app.bilibili.com/) | 官方内容介绍覆盖UGC、番剧/影视和弹幕等语义，下载中心区分移动/TV/iPad HD。只用于内容语义与客户端区别，不支持推断TV布局或任意画质/投屏权限 |
| P09 | [Bilibili帮助中心](https://www.bilibili.com/blackboard/help.html)、[官网](https://www.bilibili.com/) | 本次文本抓取：帮助中心为JS壳，官网转浏览器建议页；一次公开视频页请求HTTP412。没有据此取得完整官方TV界面或新API合同，不能宣称已审计该客户端 |

## 采用与不采用

采用：内容优先、可预测导航、可见焦点、少数常用播放控制、片库与继续观看、阅读区、清楚的当前状态/返回。B站特有的UP、分P、队列、收藏/稍后再看语义以本项目合同和已有真实验证为依据，在电视上重新组织。

不采用：移动端密集信息直接放大、悬停/触控才能完成的动作、自动有声预览、满屏宣传hero、所有功能并排按钮、重复实现多套键盘/播放器、后台唤醒承诺、官方接收器身份或付费权益冒用。也不因同行有直播、多账号或评论编辑就恢复用户已排除的范围。

## 证据区分

- P01–P04是平台/设计指导，不是本型号能力证明；官方数值与项目目标要分开。
- P05–P08是产品公开描述/设计研究，不是当前本地TV的完整观察；不同版本、地区和权益会不同。
- 本次现有产品的直接截图证据只覆盖[四个本地页面](https://github.com/johnnyzhao5619/BiliSofa/blob/940d96985671da169406fb88e1f9818291681aca/docs/design/CURRENT_UI_AUDIT_2026-10-21.md)。未访问用户已登录的私人B站页面；未获取第三方视频/封面来伪造新UI运行证据。
- 本方案不复制第三方品牌、截图或设计资源进运行包；后续素材/图标/字体许可分别核对，研究链接不等于再分发授权。
