# 0.52.0 单一产品构建（本地证据）

2026-10-24；[ADR-107](../../../adr/107-single-product-build.md)。

- 构建：`npm run build:app`，输出到 `dist/bilisofa-app`。
- 合成UI：`npm run test:ui:app`。
- 打包：`npm run package:app`；负例`npm run test:package:app`。

**本地检查与合成验证完成；未签名、未安装，未经真机验收。**

## 本地结果

| 项 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 通过 / 737/737 |
| 原生主机测试 | catalog-visitor 20、public-read 10、vod-api 10、pgc-read 12、source-failover 37、candidate-packaging 6，均通过 |
| 合成UI（`playwright.app.config.ts`） | 100/100（26个规格文件） |
| 分类（每个套件/规格对冻结0.51.3与0.52.0各跑一次） | 13个套件（79条）与投屏/遥控投屏/封面规格（21条）对两版结果相同；其余规格对0.51.3即失败（等待旧首页网格、旧面板或旧设置页），移入`tests/archive` |
| 包负例 | 11/11，暂存目录复原 |
| 未签名WGT | `BiliSofa-0.52.0-unsigned.wgt` `f37077d011772bf5851a4abdf027f0891f261d17b20b6140fc7438792d24c73e`；清理本地旧工件后重建，hash不变 |
| 与0.51.3包对比 | 文件清单相同；全部原生模块逐字节一致；变化：`app.js`与各Worker脚本（删掉的旧分支）、`config.xml`（仅版本号）、`build.json`；`index.html`、`style.css`逐字节一致；权限不变 |
| 本地旧工件 | 删除`dist/`中158项（约974 MB）与`build/`中6个已不被当前包使用的目录（约21 MB）；保留0.51.2、0.51.3、0.52.0及W01/W02探针工具仍在引用的输出 |

## 更正

“投屏时钟配置30/30”在0.50.x–0.51.3各版证据中都被当作该版回归，实际因配置把构建目录写死而跑在冻结的0.43.0上。详见ADR-107“更正”。
