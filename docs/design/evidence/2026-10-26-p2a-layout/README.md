# ADR-114 截图对比：P2a界面与布局（0.61.0）

2026-10-26。合成UI，1920×1080，Chromium；合成数据没有封面，显示的是占位图。脚本与[基线](../2026-10-26-ui-baseline/)相同（`shots.spec.ts`），实现后在同样九个界面截图。

| 界面 | 基线 | 0.61.0 | 变化 |
| --- | --- | --- | --- |
| 首页 | [1-home](../2026-10-26-ui-baseline/1-home.png) | [1-home](1-home.png) | 标语与大标题换成一行身份小字；卡片340px、标题两行、元信息紧贴；聚焦卡片有“小电视”天线；失败的“排行榜”只占一行 |
| 卡片菜单 | [2-menu](../2026-10-26-ui-baseline/2-menu.png) | [2-menu](2-menu.png) | 菜单本身不变，背后首页随上一项变化 |
| 详情 | [3-detail](../2026-10-26-ui-baseline/3-detail.png) | [3-detail](3-detail.png) | 两栏：右栏标题、数据、操作；分P一行在下 |
| 播放器 | [4-player](../2026-10-26-ui-baseline/4-player.png) | [4-player](4-player.png) | 进度条加粗，时间在进度条右端，少占一行 |
| 快捷设置条 | [5-quick](../2026-10-26-ui-baseline/5-quick.png) | [5-quick](5-quick.png) | 五项带图标，与主行同样式 |
| 我的 | [6-library](../2026-10-26-ui-baseline/6-library.png) | [6-library](6-library.png) | 逐像素相同 |
| 搜索 | [7-search](../2026-10-26-ui-baseline/7-search.png) | [7-search](7-search.png) | 空候选为一行提示；“更多”不折行 |
| 关注 | [8-following](../2026-10-26-ui-baseline/8-following.png) | [8-following](8-following.png) | 逐像素相同 |
| 设置 | [9-settings](../2026-10-26-ui-baseline/9-settings.png) | [9-settings](9-settings.png) | 逐像素相同 |

另有[10-backdrop](10-backdrop.png)：测试里给第二张卡放入一张页面内生成的渐变图（blob地址，模拟已加载的封面），焦点停留后右侧出现模糊暗化背景。真实封面下的观感与按键响应要在电视上看。

逐像素比较（差值大于24的像素数）：首页455,972、菜单250,850、详情156,918、播放器37,256、快捷设置条64,633、搜索20,714；我的、关注、设置为0。
