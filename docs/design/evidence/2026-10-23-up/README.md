# 0.51.0 UP主页·投稿、共用视频详情页与关注页直达卡（本地证据）

2026-10-23；[ADR-103](../../../adr/103-up-page-shared-detail-and-following-shortcut.md)。

- 原生链接：`python3 tools/link-catalog-up.py`，输出到 `build/catalog-up`。
- 构建：`node tools/build-foundation-app.mjs --product-up`，输出到 `dist/product-up-app`。
- 打包：`python3 tools/package-foundation-app.py --product-up`。

**已签名并升级安装/启动（平台确认，不清数据）；未经真机验收。**

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 730/730（新增`tests/unit/up-archives.test.ts`） |
| 原生主机测试 | `catalog-up` 15/15（含继承的13条）；原`catalog`通过 |
| Samsung SDK链接 | `build/catalog-up`；其他`build/`目录不变 |
| `tests/product-up-ui`（0.51.0） | 4/4 |
| 同四条对冻结0.50.4 | 4/4失败 |
| 允许嵌套UP动作的变异版本 | 第1条失败；恢复源码后重建，产物与变异前一致 |
| 回归（0.51.0） | 来源检查切换3/3、备用切换1/1、重连2/2、选择与筛选9/9、番剧6/6、详情3/3、阅读17/17、0.46.0全套18/18、投屏只唤回1/1、投屏时钟配置30/30 |
| 包负例 | 10/10，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.51.0-unsigned.wgt` `ac93ec44ecf2efeeb550817d1b18e65ec5bb325ea3dabef2f7885d50af25730c` |
| 与0.50.4包对比 | 原生仅`catalog/`三件变化；UI脚本与`style.css`变化；其他原生模块逐字节一致；权限不变 |
| 冻结工件 | dist与`build/`原有文件不变（签名部署前后快照一致） |
| 签名/部署 | `python3 tools/sign-foundation-app.py --product-up`、`python3 tools/deploy-foundation-app.py --product-up`；签名`c04139b4…d817`（证书预检PASS，权限不变）；重启本机SDB服务后连接，升级安装/启动platformSuccess（一次，不清数据）；源码归档`f42b8e5e…cdb9`；[回执](receipt.json)（仅`catalog/`三件与0.50.4不同） |
| 归档 | `product-collections-ui`移入`tests/archive/`（K4）；只改导入路径与配置`cwd` |

## 真机复验（按收口计划V1/V2）

| 组 | 步骤 | 期望 |
| --- | --- | --- |
| V1 | 首页 → 分区，14个逐个打开 | 各分区有内容；个别失败只记该分区 |
| V2 | 搜索UP → UP主页（翻页）→ 播放 → 返回；视频详情 → UP主页 | 最新在前、每页30条；返回落回原卡；被限频时显示原因，不自动重试 |
| K3 | 关注 → “我的追番 · 我的追剧 → 番剧影视” | 打开番剧影视的我的追番 |

结果（2026-10-23）：**V1 FAIL**（分区-352、导航失焦）；V2① PASS、② 仅首页/搜索为完整详情、③ PASS；关注页直达卡未报告。处理见[ADR-104](../../../adr/104-runtime-user-agent-shared-detail-everywhere.md)。
