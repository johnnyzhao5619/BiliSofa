# U2 统一搜索：桌面合成证据

2026-10-21；[ADR-074](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/074-unified-product-search.md)、[布局](https://github.com/johnnyzhao5619/BiliSofa/blob/940d96985671da169406fb88e1f9818291681aca/docs/design/U2_SEARCH_LAYOUT.md)。0.32.0仅为独立源码构建；电视仍0.28.0。下列使用生产UI/Worker/合同与合成C/媒体/响应，不是三星电视、真实搜索可用率、本人账号或Voice Guide证明。图片为空是合成源未提供封面；标题中的`<img…>`为安全文本用例，不执行外部内容。

- [视频结果与实际焦点](search-video.png)：四列、同关键词、分页/卡片边界。
- [番剧类型](search-pgc.png)：共用关键词、更新信息及类型焦点。
- [首字母输入](search-keyword.png)：候选/键盘/确认统一配色，弹窗正确覆盖导航。
- [当前身份搜索历史](search-history.png)：选词回同一结果工作区。

已人工查看以上画面：1920×1080无控件溢出，候选第一列和文字未被导航遮挡，焦点轮廓可辨识；仍需真机远距、文字密度/滚动、图床CORS/解码和朗读验收。搜索页保留四卡上限，不以桌面表现推断TV性能。

274模块strict/边界、631单元/合同；本轮23项合成UI通过（搜索8、片库9、壳层6）。首次失败是Home用例预期/历史选择器；原日志`.local/u2-search/ui-first.log`保留。截图发现的导航层级问题已修复，输入第一列补了真实命中位置检查；最终日志、receipt及逐文件核查保存在`.local/u2-search/`。

`dist/product-discovery-app`含27个manifest文件、232项输入，版本0.32.0；[evidence.json](evidence.json)记录sourceHash、manifest SHA、截图SHA、Git基线和脏工作区事实。0.28/0.29/0.30/0.31的108个manifest文件与原manifest SHA核查一致。未生成新WGT、签名、安装或真实账号POST；U2其他页面和U3–U5/最终集中验收仍OPEN。
