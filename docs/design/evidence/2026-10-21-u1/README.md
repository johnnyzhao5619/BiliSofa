# U1 0.30.0 桌面运行截图

2026-10-21，1920×1080 Chromium运行截图；真实生产UI/Worker/解析器，合成C、AVPlay及生成的栅格封面。不是B站真实内容、电视截图或已完成的产品界面。

- [首页](home-synthetic.png)：四列卡片、实际首卡焦点、主导航。标题中`<img src=x>`是故意验证文本隔离的合成样本，没有创建对应HTML图片。
- [详情](detail-synthetic.png)：完整标题/UP、播放/本机入队/返回；打开播放前先完整关闭详情。
- [工件与证据配对](evidence.json)：0.30.0构建sourceHash、截图SHA、实际检查层级及保留的0.28.0/0.29.0工件；详细回执与最终复跑日志在`.local/u1-product/`。

界面基准见[U1布局](https://github.com/johnnyzhao5619/BiliSofa/blob/940d96985671da169406fb88e1f9818291681aca/docs/design/U1_SHELL_LAYOUT.md)，行为/图片边界见[ADR-072](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/072-product-shell-and-public-artwork.md)。本轮未安装新包；其余面板视觉、继续观看货架、真实图床CORS和TV可读性/朗读/性能仍未验收。
