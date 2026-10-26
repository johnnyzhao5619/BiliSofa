# ADR-107：版本链收敛为单一产品构建

2026-10-24；R14、R15、工程整理。用户要求清理历史分支/worktree、陈旧代码和陈旧文档，并选择“移除旧版本链”。状态：**0.52.0本地构建与合成验证完成；未签名、未安装**（[证据](../design/evidence/2026-10-24-single-build/README.md)）。

## 背景

- 每次交付都新增一个构建变体参数（`--w04`…`--product-up-fix3`，共37个`BILISOFA_*`开关），由`build/package/sign/deploy`四个脚本逐级串联；源码里约300处按开关分支，旧变体的代码路径一直留在产品源码里。
- 单元测试在“开关全关”的Node环境下运行，实际测的是旧路径；合成UI按构建目录名切换断言；还有一部分配置把构建目录写死，忽略`BILISOFA_PROBE_ROOT`。

## 决定

- **源码**：所有变体开关按当前值折叠（全部开启，U1关闭），删除随之失效的分支、空的policy文件和未用导入。`cast-worker.ts`仍构建两份（产品接收与原探针），用`BILISOFA_CAST_PRODUCT`区分，这不是版本链。
  - 以“旧行为”为默认值的参数一并收敛：CDN/来源主备切换始终开启（`parseVodPlayback`、`VodSourceOwner`、`vodCdnPair`不再接受关闭参数）；详情始终保留UP编号；诊断构建标签为单一值。
- **构建**：`tools/build-foundation-app.mjs`只有一个输出`dist/bilisofa-app`。`config.xml`、`index.html`与基础样式改为静态源文件（`apps/tv/foundation-config.xml`、`apps/tv/public/app.html`、`apps/tv/public/app-base.css`），取自0.51.3构建输出，逐字节一致（`config.xml`仅版本号不同）。
- **打包/签名/部署**：去掉全部变体参数；版本取自配置文件。私密签名/部署记录按版本命名（`signed-app-<版本>-manifest.json`等），不改写更早版本的记录。
- **测试**：合成UI收敛为`playwright.app.config.ts`（`npm run test:ui:app`）。按“对冻结0.51.3是否通过”逐个规格文件分类：通过的保留，失败的（等待已被取代的旧网格、旧面板或旧设置页）移入`tests/archive`（2026-10-26清理时删除，见git历史）；打包负例收敛为`tests/native/app-packaging.test.py`。
- **原生**：已不被当前包使用的链接脚本（catalog、catalog-up、catalog-ua、pgc-read、vod-api、vod-bridge）删除；冻结的C源码保留，较新的入口仍原样包含它们。
- **版本**：收敛后的构建编为0.52.0，行为等同0.51.3，原生模块逐字节一致。签名、部署与真机验收另需授权。
- **CI**：GitHub Actions只保留手动触发；检查在本地运行。

## 不做

- 不重建、不改写已签名的旧包与证据；ADR与证据中的旧命令按历史记录保留。
- W01/W02探针工具链（`build.mjs`、`package.py`、网络/隔离探针及其配置）不属于版本链，本次不动。
- 不改变产品行为。

## 证据

- 单元737/737；`npm run check`通过；原生主机catalog-visitor 20、public-read 10、vod-api 10、pgc-read 12、source-failover 37、candidate-packaging 6。
- 合成UI：保留的100条对0.52.0全部通过；分类时这些套件/规格对冻结0.51.3与0.52.0结果相同。
- 打包负例11/11；0.52.0与0.51.3包文件清单相同，全部原生模块逐字节一致，只有UI/Worker脚本、`config.xml`与`build.json`变化；清理本地旧工件后重建，包hash不变。

## 更正

- 此前各版本证据中的“投屏时钟配置30/30”：`playwright.product-cast-clock.config.ts`把构建目录写死为`dist/product-cast-clock-app`，没有使用传入的构建目录，那30条实际跑在冻结的0.43.0上。
  - 0.51.3回归“102条”中真正跑在0.51.3上的是72条。
  - 本次分类在0.51.3与0.52.0上重跑投屏规格：时钟、定位与保留投屏17条通过；`recovery`/`settings`规格按旧设置页编写，失败并归档。
  - 同样写死目录的还有actions、cast-seek、cast-start、instant、recovery、stream几个配置，它们不在0.51.x的回归清单里。
