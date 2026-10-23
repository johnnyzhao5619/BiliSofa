# 开发与部署

> 下文构建/签名/安装命令仅作开发参考；签名/部署须按版本取得用户授权。冻结的0.28–0.47.1目录/工件不重建覆盖，新变体使用新输出目录；R07候选未接生产/打包/部署，不能借用已安装包的设备结果。

更新：2026-10-23。当前为WGT/Web＋电视内Worker/WASM/AVPlay路线；开发机仅用于构建、签名和安装。build/package不隐式连接设备或发布。

## 当前候选0.47.2（已安装）

前端第一至三批累积在`--product-reading-fix2`变体；更早的变体参数仍保留在工具里，但其冻结输出不重建覆盖。

```sh
npm run check        # tsc、依赖边界、文档门禁（tools/check-docs.mjs）
npm test
python3 tests/native/overlay-read.test.py
python3 tools/link-overlay-read.py --out build/overlay-read-subtitle   # 仅在overlay-read.c改动时
node tools/build-foundation-app.mjs --product-reading-fix2
BILISOFA_PROBE_ROOT=dist/product-reading-fix2-app npx playwright test --config playwright.product-reading.config.ts
BILISOFA_PROBE_ROOT=dist/product-reading-fix2-app npx playwright test --config playwright.product-polish.config.ts
python3 tests/native/product-reading-fix2-packaging.test.py
python3 tools/package-foundation-app.py --product-reading-fix2
```

签名与部署须用户逐版本授权（升级安装，不清数据）：`python3 tools/sign-foundation-app.py --product-reading-fix2`、`python3 tools/deploy-foundation-app.py --product-reading-fix2`。SDB连不上而电视可达时，先`sdb kill-server`/`start-server`再`connect`，只重连一次，不循环重试。新一轮修正使用新的变体参数、输出目录和包名，避免覆盖已签名包对应的冻结目录。

提交前自检：`npm run check`、`npm test`。文档门禁限制状态页的体积与形状（单一已安装行、无前一安装版历史行、开头段落≤400字、不写带日期的“用户要求先不…”边界、仓库内相对链接可达），**本条由机器门禁强制**：状态页每次只多写一点历史，单次看不出问题，纯文档约定没有任何东西会因此变红；历史记入[签名与部署记录](SIGNING_DEVICE_RECORD.md)、证据README或`docs/archive`。

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

## 当前应用构建

在`/Users/weijiazhao/Dev/BiliSofa`运行：

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build:app
npm run package:app
python3 tests/native/foundation-packaging.test.py
```

`build:app`生成`dist/foundation-app/`，`package:app`校验UI/native来源和资源后生成当前内部WGT。默认配置/打包/签名工具仍绑定0.20.0，不能把含新F06开发源码的重建物冒充已冻结0.20.0；新交付需明确更新版本、门禁和源码/包记录。

W04冻结版本0.21.4使用独立目录；当前源码继续开发W06，不能重写或冒充旧冻结包：

```sh
npm run build:app:w04
npm run test:ui:w04-media
npm run package:app:w04
npm run test:package:w04
```

新原生模块先按下一节链接；打包核对所有当前源码/运行产物hash、CA、固定路由、CSP/权限、写操作隔离及许可证。不以修改manifest代替重建。W04输出`dist/BiliSofa-W04-media-unsigned.wgt`；整体状态/阻塞见[W04门槛](W04_MEDIA_DELIVERY.md)。Playwright为Chromium合成流程，SDK链接不证明真机；所有使用4173端口的UI套件，以及会修改stage/manifest的打包负例应串行运行。原生共享同一loopback端口的套件也须串行。

W05旧账号互动候选0.24.1单独生成`dist/w05-app`与`dist/BiliSofa-W05-interactions-unsigned.wgt`，不覆盖W04冻结目录/签名指针：

```sh
npm run native:overlay-read
npm run native:comments-read
npm run native:video-interactions
npm run build:app:w05
npm run test:ui:w05-product
npm run test:native:overlay-read
npm run test:native:comments-read
npm run test:native:video-interactions
npm run package:app:w05
python3 tests/native/w05-packaging.test.py
npm run sign:app:w05
npm run deploy:app:w05
```

共享`vod-api.c`改变时须重链依赖的vod-api/pgc-read/pgc-follow/live-read/live-product及overlay-read/comments-read/video-interactions；仅编译保留直播模块不代表重启直播验收。`BILISOFA_W05_LEGACY=1 npx playwright test --config playwright.w05-product.config.ts`在当前W05构建上运行原媒体合成流程。W05签名/部署元数据使用独立`*-w05-manifest.json`，版本/身份/hash仍逐层核对。

W06当前候选0.25.0使用独立产品接收模块；旧W05签名指针/冻结包保持。互动入口按用户要求暂缓，原实现与未知日志保留。

```sh
npm run native:cast-product
npm run build:app:w06
npm run test:ui:w06-cast
npm run test:native:cast-product
npm run package:app:w06
npm run test:package:w06
npm run sign:app:w06
npm run deploy:app:w06
```

`cast-product-source.py`先校验原三头文件hash，精确生成产品配方，不覆盖原探针。输出`dist/w06-app`、`dist/BiliSofa-W06-cast-unsigned.wgt`与独立`*-w06-manifest.json`。`playwright.w06-regression.config.ts`默认验证14项保留评论/叠加；设`BILISOFA_W06_LEGACY=1`验证33项保留媒体合成流程。UI与包负例串行；HOST仅本机TLS，无真实账号写入。整组真机见[W06交付](W06_CAST_DELIVERY.md)。

W03当前0.27.0分P队列整合沿用原推荐整包配方，保留F02模块；使用`dist/recommend-app`和`dist/BiliSofa-W03-recommend-unsigned.wgt`；独立recommend-native及签名/部署指针保留旧W06工件：

```sh
npm run native:recommend
npm run build:app:recommend
npm run test:ui:recommend
npm run test:native:recommend
npm run package:app:recommend
npm run test:package:recommend
npm run sign:app:recommend
npm run deploy:app:recommend
```

`playwright.recommend-cast.config.ts`验证保留投屏；`playwright.recommend-regression.config.ts`默认保留评论/叠加，`BILISOFA_RECOMMEND_LEGACY=1`验证保留媒体。套件/整包负例串行。新C复用未改动的library.c引擎；源变化须重链recommend模块，不修改旧模块manifest逃避来源门禁。

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

```sh
npm run sign:app:w04
npm run deploy:app:w04
```

上述W04命令仅使用`--w04`的独立私密manifest，不改写旧0.20.0签名/部署指针。回退仅使用已冻结原包，不重建旧版本冒充回退；保留新增分P数据且不降级未知存储schema。签名使用自有BiliSofa profile；部署从仓库外manifest取同一授权目标与确切签名包，检查hash/身份后state→capability→install→run。Application ID必须是完整`BiliSofa01.TV`。未知结果不自动重复安装，不卸载/清数据或改Author。

私密文件默认在`~/.local/share/BiliSofa/`；SDK、缓存、构建和诊断生成物在ignored目录。证书/会话/地址不进入源码、CI、公开日志或包。当前包身份/hash见[签名部署](SIGNING_DEVICE_RECORD.md)，证书建立见[指南](SAMSUNG_CERTIFICATE_GUIDE.md)。

旧W01探针使用`build/package/package:native`等独立命令；仅复现历史证据时查[探针指南](W01_PROBE_GUIDE.md)和[环境归档](archive/2026-10-19-process-records/DEVELOPMENT.md)，不把它们当作当前产品包入口。CI仅有workflow配置，未运行hosted CI或发布。

F05队列整合的明确命令为`npm run build:app:queue-parts`、`test:ui:queue-parts`、`package:app:queue-parts`、`sign:app:queue-parts`、`deploy:app:queue-parts`。它们复用`--recommend`全模块装配与私密签名指针，包版本必须为0.27.0，不代表重建旧0.26.1。`playwright.queue-parts-retained.config.ts`在同一新包上验证私人列表/媒体组合；当前仅TS/UI/普通KV变化，原生模块按冻结字节核对后复用，无需SDK重链。

F12当前0.28.0使用`build:app:local-data`、`test:ui:local-data`、`package:app:local-data`、`sign:app:local-data`、`deploy:app:local-data`；复用`--recommend`完整配方/输出名。版本与诊断标记绑定0.28.0，不能用当前构建重写旧0.27.0验收工件。仅TS/普通KV管理变化，现有17个原生模块及CA逐字节复用；无SDK/HOST重跑。旧模块检查与当前实跑计数见TEST_REPORT，完整模块/验收见F12_LOCAL_DATA。
