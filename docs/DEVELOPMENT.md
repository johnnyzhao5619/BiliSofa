# 开发与部署

安装当前公开的 0.66.0 预览版请先读[安装指南](INSTALLATION.md)；下文保留维护者构建 / 私密签名布局，不是可直接照搬的陌生电脑安装器。0.66.0 软件提交及工件身份见[版本说明](releases/0.66.0-service-configuration.md)，没有已证明的干净环境一步全量构建。

> 下文构建/签名/安装命令仅作开发参考；签名/部署须按版本取得用户授权。冻结的dist/build目录与已签名工件不重建覆盖；R07候选未接生产/打包/部署，不能借用已安装包的设备结果。

更新：2026-10-24。当前为WGT/Web＋电视内Worker/WASM/AVPlay路线；开发机仅用于构建、签名和安装。build/package不隐式连接设备或发布。

## 当前源码候选：0.66.0服务配置

本轮源码按[ADR-119](adr/119-user-selected-local-service-configuration.md)实现网址选择与本地 profile。历史已安装基线为0.65.1，当前仅公开0.66.0预览版；下文早期构建目录说明用于背景，当前 Web 输出为 `dist/bilisofa-configured-app`，新原生目录为 `build/service-config/<模块>`，不覆盖旧工件。`npm run build:app` / `package:app` 生成0.66.0候选；不自动签名、部署或发布。

修改地址或目录时编辑 `apps/tv/service-providers/*.json`；原生槽位 ID 改变须先 `python3 tools/service-config.py`，再按现有对应 link 脚本重新链接。当前叠加 / 追番输出分别显式指定 `--out build/service-config/overlay-read-subtitle`、`--out build/service-config/pgc-follow-status`。单纯更改地址值不能绕过 profile 校验和 CSP/WARP 的重新构建 / 签名。

该预览包已有静态检查、构建 / 链接与包检查记录；未取得应用测试或电视运行验收。签名 / 部署须符合具体版本授权。

## 单一产品构建背景

版本链（`--product-*`、`--w0x`、`--recommend`等变体参数）已收敛为一个构建，行为等同0.51.3（ADR-103–106），版本号在`apps/tv/foundation-config.xml`。构建输出`dist/bilisofa-app`与`dist/BiliSofa-<版本>-unsigned.wgt`；更早的冻结目录/工件不重建。`config.xml`、`index.html`与基础样式是静态源文件（`apps/tv/foundation-config.xml`、`apps/tv/public/app.html`、`apps/tv/public/app-base.css`），`style.css`由基础样式与`product-ui.css`拼接。

```sh
npm run check        # tsc、依赖边界、文档门禁（tools/check-docs.mjs）
npm test
npm run build:app    # dist/bilisofa-app
npm run test:ui:app  # 保留的产品合成UI套件（tests/config/playwright.app.config.ts）
npm run package:app  # 校验UI/native来源、CSP/权限、固定路由后生成未签名WGT
npm run test:package:app
```

签名与部署须用户逐版本授权（升级安装，不清数据）：`npm run sign:app`、`npm run deploy:app`。私密签名/部署记录按版本命名（`signed-app-<版本>-manifest.json`等），不改写更早版本的记录。新一轮修正提升`foundation-config.xml`中的版本号即可，不再新增变体参数。SDB连不上而电视可达时，先`sdb kill-server`/`start-server`再`connect`，只重连一次，不循环重试；若后台服务无法写`/tmp/sdb.log`而退出，可前台运行`sdb fork-server server`。Playwright与会修改stage的打包负例都使用同一stage/4173端口，须串行运行。

提交前自检：`npm run check`、`npm test`，均在本地运行。GitHub Actions（`.github/workflows/ci.yml`）只保留手动触发，推送和PR不会启动它；文档门禁限制状态页的体积与形状（单一已安装行、无前一安装版历史行、开头段落≤400字、不写带日期的“用户要求先不…”边界、仓库内相对链接可达），**本条由机器门禁强制**：状态页每次只多写一点历史，单次看不出问题，纯文档约定没有任何东西会因此变红；历史记入[签名与部署记录](SIGNING_DEVICE_RECORD.md)、证据README或`docs/archive`。

2026-10-26起文档门禁另外检查四件事，**本条由机器门禁强制**：状态页、README、收口台账、签名记录页脚与当前验收写的已安装版本必须一致；测试报告只留已安装节与“候选（未签名/未部署）”节，已关闭的旧候选不算候选；README“当前状态”一节≤1200字、ADR链接≤3个，不写逐版本日志；`docs/plans`下不留状态写着“已实现/已安装”的方案（移出当前目录并按需链接固定 Git 提交）。这几类漂移每次只多一点、各页单独看都对，纯文档约定没有任何东西会因此变红，所以交给`npm run check`。

## 已配置工具

| 工具 | 项目记录 |
| --- | --- |
| Node / npm | v24.21.0 / 11.19.0（环境初次记录，本轮未重查） |
| TypeScript / esbuild / Playwright | 5.9.3 / 0.28.2 / 1.64.1，依赖以lockfile为准 |
| runtime npm依赖 | qrcode-generator 2.0.4；其他第三方代码/数据见THIRD_PARTY_NOTICES |
| Samsung Emscripten | 1.39.4.7 fastcomp，隔离`.local/sdk/emscripten-release-bundle/emsdk`；x86_64工具通过已授权Rosetta运行 |
| Tizen CLI / SDB | CLI 2.5.25，SDB更新后4.2.36；隔离`.local/tizen-studio` |
| 网络依赖 | 固定curl 8.23.0 / OpenSSL 3.5.9；来源/补丁/许可证及hash由candidate manifest/lock校验 |
| CA | 项目`.local/cacert.pem`；公开根证书随包，TLS peer/host验证保持开启 |

## 原生构建

仅在对应源码/配方改变时重建，原产物不得仅改manifest来绕过来源门禁：

```sh
npm run probe:deps:check
npm run probe:deps:link
npm run native:identity
npm run native:catalog
npm run native:search
npm run native:hot-search
npm run native:library
npm run native:vod-api
npm run native:vod-bridge
npm run native:pgc-read
npm run native:pgc-follow
npm run native:live-read
npm run native:live-product
```

`probe:deps:link`依赖已准备的CA/原创媒体与固定工具；各`native:*`链接相应独立Worker/C模块。源变化后运行对应`test:native:*`与打包负例。获取/构建依赖的`probe:deps:fetch/build`是显式开发操作，不在电视或普通build中自动执行。不得以无TLS验证、全局配置覆盖或旧WASM伪装新源解决失败。

## 私密签名与设备

签名使用自有BiliSofa profile；部署从仓库外manifest取同一授权目标与确切签名包，检查hash/身份后state→capability→install→run。Application ID必须是完整`BiliSofa01.TV`。未知结果不自动重复安装，不卸载/清数据或改Author。回退仅使用已冻结原包，不重建旧版本冒充回退；不降级未知存储schema。

私密文件默认在`~/.local/share/BiliSofa/`；SDK、缓存、构建和诊断生成物在ignored目录。私密证书、会话和个人设备地址不进入源码、CI、公开日志或包；公开服务域名配置属于随包提供的运行数据。当前包身份/hash见[签名部署](SIGNING_DEVICE_RECORD.md)，证书建立见[指南](SAMSUNG_CERTIFICATE_GUIDE.md)。

旧W01探针的打包命令已删除；仅复现历史证据时查[探针指南](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/archive/2026-10-24-phase-records/W01_PROBE_GUIDE.md)、[环境归档](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/archive/2026-10-19-process-records/DEVELOPMENT.md)与git历史，它们不是当前产品包入口。产品 CI 只配置手动触发；是否运行以相应提交的 Actions 记录为准。公开发布结果见[发布记录](releases/2026-10-26-publication.md)。


