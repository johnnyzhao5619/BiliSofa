# 开发与部署

> 用户当前要求先不部署，见[第三方验收任务](THIRD_PARTY_ACCEPTANCE_PROMPT.md)。下文构建/签名/安装命令仅作开发参考，不是当前授权。0.28–0.43目录/工件冻结，不直接重建覆盖；R07候选未接生产/打包/部署，不能借用0.43.0的设备结果。

更新：2026-10-21。当前为WGT/Web＋电视内Worker/WASM/AVPlay路线；开发机仅用于构建、签名和安装。build/package不隐式连接设备或发布。

## 产品界面独立开发构建

`npm run build:app:u1`生成`dist/u1-app`（0.29.0开发构建），不覆盖已冻结的`dist/recommend-app`/0.28.0，不生成WGT、不签名/安装。该冻结候选仅含名称/范围与呈现合同，见[ADR-071](adr/071-content-display-foundation.md)。不能用旧`package:app:local-data`命令把此目录说成新包。

`npm run build:app:product-ui`生成独立`dist/product-ui-app`（0.30.0开发候选），新增大屏壳层、首页/视频搜索卡片、详情播放返回及受限公开封面，见[ADR-072](adr/072-product-shell-and-public-artwork.md)。无原生依赖变更、WGT、签名或部署；不能用旧打包命令为此目录套用历史设备通过。`BILISOFA_TEST_ROOT=dist/product-ui-app npm run test:ui:product`只作合成UI证据。`node tools/build-foundation-app.mjs --u1 --verification`输出`dist/u1-regression-app`供共享逻辑回归，不覆盖0.29.0冻结工件。

前一候选使用`npm run build:app:product-library`输出独立`dist/product-library-app`（0.31.0），见[ADR-073](adr/073-continuation-and-product-library.md)。`npm run test:ui:product-library`仅运行合成检查。旧0.28/0.29/0.30目录是冻结工件，不以重建旧命令覆盖；共享逻辑回归用`--u1 --verification`的独立输出，UI配置可由`BILISOFA_PROBE_ROOT`选择。当前无新WGT/签名/安装。

0.32.0源码使用`npm run build:app:product-discovery`输出独立`dist/product-discovery-app`（0.32.0统一搜索），见[ADR-074](adr/074-unified-product-search.md)。`npm run test:ui:product-discovery`检查新模块；`BILISOFA_PROBE_ROOT=dist/product-discovery-app npm run test:ui:product-library`复用片库回归。0.28–0.31工件冻结，后续修改需选择新的独立输出；未集成全部产品页面前不为此构建单独部署。

前一冻结候选使用`npm run build:app:product-collections`输出独立`dist/product-collections-app`（0.33.0），见[ADR-075](adr/075-following-and-pgc-product-browse.md)。`npm run test:ui:product-collections`检查关注/已追番剧；统一搜索与片库配置均可用`BILISOFA_PROBE_ROOT=dist/product-collections-app`选择本轮目录。0.28–0.32工件冻结，不重建覆盖；未生成新WGT，不单独部署此内部候选。

本轮必要检查：`npm run check`、`npm test`；相关UI使用`BILISOFA_PROBE_ROOT=dist/u1-regression-app`运行`playwright.local-data.config.ts`、`playwright.queue-parts.config.ts`；媒体UI另加`BILISOFA_TEST_ROOT=dist/u1-regression-app`，运行`playwright.w04-media.config.ts`中的`playback.spec.ts pgc.spec.ts`。仅为合成检查，完整模块就绪后集中给设备清单。

## 当前稳定浏览/目标控制候选0.39.0

```sh
npm run check
npm test
npm run build:app:product-stream
npm run test:ui:product-stream
python3 tests/native/product-stream-packaging.test.py
python3 tools/sign-foundation-app.py --product-stream
python3 tools/deploy-foundation-app.py --product-stream
```

独立dist/product-stream-app/0.39.0及product-stream私有指针；新UI套件包含适配遥控退出的保留播放器/设置/浏览回归，旧冻结套件不改。UI与会修改stage的包负例串行。封存后不重建旧目录；自动检查无真实账号POST。浏览/资源合同见ADR-081。

## 冻结单击互动/缓存0.38.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-instant
npm run test:ui:product-instant
BILISOFA_PROBE_ROOT=dist/product-instant-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-instant-app npm run test:ui:product-browse
python3 tests/native/product-instant-packaging.test.py
python3 tools/sign-foundation-app.py --product-instant
python3 tools/deploy-foundation-app.py --product-instant
```

独立dist/product-instant-app/0.38.0及product-instant私有指针。UI与修改stage的包负例串行；自动检查无真实账号POST。封存后下轮新目录，不覆盖0.28–0.38。界面单击授权合同见ADR-080，小数后端待实施。

## 冻结控制栏0.37.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-actions
npm run test:ui:product-actions
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-interactions
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-actions-app npm run test:ui:product-browse
python3 tests/native/product-actions-packaging.test.py
python3 tools/sign-foundation-app.py --product-actions
python3 tools/deploy-foundation-app.py --product-actions
```

输出独立`dist/product-actions-app`/0.37.0及product-actions私有指针。UI与会修改stage的包负例串行；不执行真实账号POST。配对工件冻结后，下轮使用新版本/目录，不覆盖0.28–0.37。小数倍速后端未实现，见ADR-079。

## 冻结U4互动0.36.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-interactions
npm run test:ui:product-interactions
BILISOFA_PROBE_ROOT=dist/product-interactions-app npm run test:ui:product-player
BILISOFA_PROBE_ROOT=dist/product-interactions-app npm run test:ui:product-browse
python3 tests/native/product-interactions-packaging.test.py
python3 tools/sign-foundation-app.py --product-interactions
python3 tools/deploy-foundation-app.py --product-interactions
```

4173 UI套件与会修改stage的包负例串行运行。0.36.0使用独立`dist/product-interactions-app`、unsigned WGT及`*-product-interactions-manifest.json`指针；真实写入不作为自动检查。原生固定GET/POST/CA未重建，F14默认暂停。已配对工件冻结后，下一轮另选版本/目录，不能用旧构建命令覆盖0.28–0.36的工件。实际部署结论以[签名记录](SIGNING_DEVICE_RECORD.md)为准。

## 冻结体验组合0.35.0（历史命令仅供参考）

```sh
npm run check
npm test
npm run build:app:product-browse
npm run test:ui:product-browse
BILISOFA_PROBE_ROOT=dist/product-browse-app npm run test:ui:product-player
python3 tests/native/product-browse-packaging.test.py
python3 tools/sign-foundation-app.py --product-browse
python3 tools/deploy-foundation-app.py --product-browse
```

所有4173 UI服务及修改stage的包负例串行；输出独立`dist/product-browse-app`与`dist/BiliSofa-0.35.0-unsigned.wgt`，使用独立product-browse签名/部署指针。0.28–0.34冻结工件不重建覆盖。原生依赖/权限不变，关注视频目标只改变生产Worker/DTO解析。新签名工件与源码快照在仓库外保护目录，升级不卸载/清数据。[ADR-077](adr/077-continuous-browse-and-cast-refinement.md)及[验收](CURRENT_DEVICE_TEST.md)记录边界。

## 历史U3组合候选0.34.0

本轮用户授权U3完成后部署。使用独立目录，保留0.28–0.33冻结工件：

```sh
npm run check
npm test
npm run build:app:product-player
npm run test:ui:product-player
python3 tests/native/product-player-packaging.test.py
python3 tools/sign-foundation-app.py --product-player
python3 tools/deploy-foundation-app.py --product-player
```

负例会短暂修改并恢复新stage，必须与UI/签名串行。签名工具重验来源后生成`dist/BiliSofa-U3-0.34.0-unsigned.wgt`，自有BiliSofa profile的签名工件和设备记录在仓库外保护目录，独立`*-product-player-manifest.json`指针；不暴露证书/地址。应用ID/Author保持，不卸载、不清数据。当前包配对见[签名记录](SIGNING_DEVICE_RECORD.md)，state/capability/install/launch成功仍不代表用户声画验收。回退先按旧签名包及其源码hash核对身份，平台可能拒绝低版本升级；不要为回退擅自卸载或清数据，需保留失败并另行确定数据安全方案。无自动回退操作。

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
