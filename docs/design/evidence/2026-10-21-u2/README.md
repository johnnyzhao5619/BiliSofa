# U2 0.31.0 桌面运行截图

2026-10-21，1920×1080 Chromium。真实生产UI/Worker/解析器；账号、私人内容、C、AVPlay及图片均为合成边界。不是本人数据、真实B站接口或电视验收。

- [首页：公共列表失败，本机P2仍可用](home-local-offline-synthetic.png)。公共失败为有意注入的HTTP412，不代表本轮真实服务故障。
- [我的：本机名称、P号、进度与登录入口](library-local-synthetic.png)。
- [我的：账号收藏夹](library-folders-synthetic.png)。`<img src=x>`是文本隔离样本，没有执行或创建该HTML图片。
- [工件/截图/检查配对](evidence.json)。详细回执、最终日志、初次合成时序失败日志及其回归构建manifest位于`.local/u2-library/`。

[U2布局](https://github.com/johnnyzhao5619/BiliSofa/blob/940d96985671da169406fb88e1f9818291681aca/docs/design/U2_LIBRARY_LAYOUT.md) · [ADR-073](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/073-continuation-and-product-library.md)。当前电视保持0.28.0；新UI图床CORS、朗读/远距/性能及U2其余页面仍未验收。
