# 0.47.2 搜索课程行、选词焦点与AI字幕地址（本地证据）

2026-10-23；[ADR-094](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/094-search-course-rows-and-ai-subtitle-files.md)。构建`node tools/build-foundation-app.mjs --product-reading-fix2` → `dist/product-reading-fix2-app`；原生`python3 tools/link-overlay-read.py --out build/overlay-read-subtitle`；打包`python3 tools/package-foundation-app.py --product-reading-fix2`。**已签名（`c602062dde8d9b7e0475bd705a613c284e5db71cd647c8bc910d7bf4c5c21efc`，证书预检PASS，权限不变）并升级安装/启动（平台确认，一次，不清数据），未经真机复验。** 源码归档`2199303c8c9c955d06279018b6240a0454aaca51d1beaf5f8cfec461b5c7fbae`，见[receipt.json](receipt.json)。

## 起因（用户0.47.1真机结果）

- S5 USER PASS。
- S1：输入后总提示搜不到（两个字时总是，四个字时通常能搜到）；选词后的焦点落点需要优化。
- S3：字幕无法读取，显示`overlay.permission`（该视频有多条字幕轨）。

## API核对（本机，匿名，非电视证据）

- 用与电视相同的签名、UA和Referer，无Cookie，查询2字与4字关键词各一组。
- 服务对每个关键词都返回`code 0`、`pagesize 4`、4行。
- “美食”“游戏”“我的世界”页含一行`type: "ketang"`（无BV号、时长为空）。旧解析器在`type`处拒绝；新解析器各得3条视频。
- 原始响应只保存在会话临时目录，不入库。
- 匿名的播放器元数据不返回字幕列表（需要登录），所以本机拿不到该视频的真实字幕地址。
- AI字幕地址形态来自公开资料：[defuddle#407](https://github.com/kepano/defuddle/issues/407)、[bilibili-ai-subtitle-forcer](https://github.com/1494948/bilibili-ai-subtitle-forcer)，均为`aisubtitle.hdslb.com/bfs/ai_subtitle/prod/<id>?auth_key=…`，没有`.json`。

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` | 301模块，退出0 |
| `npm test` | 703/703 |
| 原生`tests/native/overlay-read.test.py` | 8/8（新增AI地址接受/拒绝例） |
| `tests/product-reading-ui`（0.47.2） | 17/17（新`fixes2.spec.ts` 5条） |
| 同5条对冻结0.47.1 | 5/5失败 |
| 0.46.0全套 / 投屏只唤回 / 投屏定位与同秒幂等 | 18/18 / 1/1 / 10/10 |
| 旧搜索套件`playwright.search.config.ts`（冻结`dist/foundation-app`） | 30/31；失败的是账号移除确认文案（“搜索历史和本机队列也会清除”与旧期望不符），与本次改动无关，该构建未改动，已有问题 |
| 包负例`tests/native/product-reading-fix2-packaging.test.py` | 8/8，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.47.2-unsigned.wgt` `5487c146dad89d4c60d487e6bc9defd02fb03b87364fbdddffb05cfdf76dd4d6` |
| 与0.47.1包对比 | 条目相同；变化：`app.js`、`search-worker.js`、`overlay-worker.js`、`overlay-read/probe.wasm`、`overlay-read/manifest.json`、`config.xml`（版本）、`build.json`；其余原生模块逐字节一致；权限不变 |
| 冻结工件 | dist 952个文件（不含新输出）与`build/`（不含新`overlay-read-subtitle`）不变 |

日志在`.local/u5-reading-fix2/`（不入库）。

## 真机复验（待授权部署后）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| S1 | 用两个字的常见词（如“美食”“游戏”）选候选词搜索；再试一个搜不到的组合 | 出结果，焦点到第一条；无结果或失败时焦点停在“搜索”键 |
| S3 | 打开上次那个多轨字幕视频，按主行“字幕” | 字幕轨道出现并显示字幕；若仍失败，请记下状态文字（`permission`或`unsupported`） |
