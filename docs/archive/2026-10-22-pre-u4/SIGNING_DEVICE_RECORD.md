# 签名与部署记录

更新：2026-10-21。仅开发侧载，不代表Samsung认证或产品发布。profile使用用户自有 **BiliSofa**，Author保持，Public Distributor包含授权电视；不复用其他开源项目身份。

## 当前0.35.0连续浏览与投屏体验

应用ID/Author保持；自有BiliSofa profile签名，未卸载或清数据。首次能力查询关闭，原地址有界重连一次后state/capability/install/launch均exit0且明确成功；USER体验待验。

| 字段 | SHA-256 |
| --- | --- |
| unsigned | `d53b319898e6e85d49b833e56cf0b6c4d829b20d20da052190b27d50b7ad0c95` |
| signed | `4f0a39295ce2fd52fae1f7fab6bcd8e42906424649e7110bf8f2a949cf1b767a` |
| UI sourceHash | `5c64d698b9c39983d95341e0e4972b8d5cd6b91d82b066916fbcdc4987c5aaf0` |

独立`*-product-browse-manifest.json`、源码快照和原始设备日志在仓库外保护目录；[脱敏回执](../../design/evidence/2026-10-22-browse/receipt.json)配对版本/hash。0.28–0.34工件保持，189文件未变；17原生模块/68项资源含CA沿用，不扩大权限或设备能力结论。

## 历史0.34.0产品界面/共享播放器

0.34.0「BiliSofa」，Application ID `BiliSofa01.TV`及自有Author保持。用户授权U3完成后升级；连接检查失败后有界重连一次恢复，最终state/capability/install/launch全部exit0且平台明确成功。没有卸载/清除用户数据；实际数据保持及声画/朗读仍待[集中验收](../../CURRENT_DEVICE_TEST.md)。

| 字段 | SHA-256 |
| --- | --- |
| unsigned | `bc7b121fc280bae8d6492b0ec0589a99fa3b4dcaed14ba7a55467c642b364df3` |
| signed | `a7144081e934c83c44a642d9b1f5deb9014e522e57e49a9b7752e3899a9a084c` |
| UI sourceHash | `69d71c964eb569041c67c2a324fc670e73cd80c364e5665dd79dc4f0863b656d` |
| UI manifest | `fdf96ba5d64f55ef864e099c99b620fc646183e1cc780344072e4fd97513c533` |

独立`signed-product-player-manifest.json`与`deployed-product-player-manifest.json`在仓库外保护目录，原始平台日志与源码快照亦保留于该目录；[脱敏配对](../../design/evidence/2026-10-21-u3/receipt.json)。0.28–0.33冻结工件保持，旧0.28签名指针不覆盖。17原生模块/68项资源沿用；仅精准扩展既有公开图片域的connect-src及本地blob图像CSP，不新增任意网络域/远程脚本。证书issuer/日期检查不是Samsung认证，安装启动不是USER声画验收。以下为历史版本记录。

## 历史0.28.0本机记录与列表缓存管理

0.28.0「BiliSofa W03」，Application ID `BiliSofa01.TV`、自有Author与权限保持。首次state成功但capability关闭，未安装；原授权地址有界断开/重连一次后，state/capability/install/launch均exit0且明确成功。所请求A–D获USER PASS，续播只显示BV的名称体验问题保持OPEN；不把安装或用户通过外推完整矩阵。未执行真实账号POST。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `b5c3511e41608a27c3b2e92000690272d135a965f18385892df09f1d2f2a3200` |
| signed SHA-256 | `449933f07a2ebcfe799a893bc38ac8fa0f2337be80027db40c6c3027598eb45e` |
| UI sourceHash | `580a87361f75e09c4092f1827ab48c175da45a7df422c742c43373a12f98774d` |

当前配方/输出仍使用`--recommend`，仓库外`signed-recommend-manifest.json`、`deployed-recommend-manifest.json`定位当前包；独立`w05-source-280-latest-archive.json`配对源码/包/日志。`.local/local-data-{sign,deploy}.log`记录最终平台结果，`local-data-deploy-initial.log`和`local-data-reconnect.json`保留首次阻塞与重连事实。17模块/68文件含CA与0.27.0相同，无SDK/HOST重跑；旧0.27.0及之前冻结工件保持。

## 0.27.0分P队列整合冻结包

0.27.0「BiliSofa W03」，Application ID `BiliSofa01.TV`、自有Author与权限保持；state/capability/install/launch均exit0且明确成功，无重连。平台安装不等于队列声画验收，所请求A–D USER PASS。未执行真实账号POST，未改保护会话或未知写日志。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `9b4c8b7f7db11f51ffdce5cf6187f95223975dd2042d94ff3094c5060ce9bdc8` |
| signed SHA-256 | `1d97f26c475a9d84212ddd3c64ba9b8887bad2a50734e1e046102790041d433b` |
| UI sourceHash | `f177cef7e68416804c77231c74bcb3fe30af07f0fe83db36f3c99e1e5ee56ac8` |

构建复用`--recommend`全模块配方，该版签名/部署副本和工件由0.27.0独立源码/日志/包指针`w03-source-270-latest-archive.json`。`.local/queue-parts-{sign,deploy}.log`记录平台结果。17个原生模块68文件（含CA）与冻结0.26.1一致，无SDK重链；0.26.0/0.26.1及原W06/W05冻结包保持。

## 0.26.1首读超时恢复冻结包

0.26.1「BiliSofa W03」，Application ID `BiliSofa01.TV`、自有Author与权限保持。state/capability/install/launch均exit0且明确成功，无重连。仅确认关闭后的cURL28安全GET有一次重试；首读补验USER PASS；未取证电视是否触发重试，不宣称网络根因已解决。未执行真实账号POST。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `75176f5d7714cee381c242012bd102c79d6876fd121477b28d8e4fe3b85cf696` |
| signed SHA-256 | `5b1832af309fdf2f7b142d4789ddddc45b30f61f8ea2b413cb7734fba7f712c6` |
| UI sourceHash | `5889e2574506178eebd056a16de8b3c804a799fb0e87512cf686fd284aecb447` |

该版签名/部署副本和包/源码位于独立`w03-source-261-latest-archive.json`指向的冻结目录；`.local/recommend-261-{sign,deploy}.log`为平台回执。17个打包原生模块51项文件与冻结0.26.0字节一致，无C重编译。旧0.26.0源码/包和首次失败/其他项目通过记录独立保留。用户“首读成功”由仓库外`w03-recommend-261-user-acceptance.json`另行配对，不改写冻结源码/包。

## 0.26.0账号视频推荐冻结候选

0.26.0「BiliSofa W03」，Application ID `BiliSofa01.TV`、自有BiliSofa Author与原权限保持。签名/证书预检及state/capability/install/launch全部成功，无本轮重连；不代表本人推荐或声画验收通过。未执行真实账号POST。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `ffbf9b2f410497548c4ff5537b95c67dbe4c3fd63428215de15007c68f59fc8c` |
| signed SHA-256 | `e90ed9fa87a8d1af0a3582b453964f7714a1eb0abcc5bc23c238bfc6daaf9bfe` |
| UI sourceHash | `7e39999f52469bc46ee328b74e2288518403db227f660026dca6c577c326b611` |

该版签名/部署副本和包/源码位于独立`w03-source-260-latest-archive.json`指向的冻结目录；`.local/recommend-{sign,deploy}.log`为平台回执。仅新链recommend模块，原10模块与旧0.25.0工件保持。用户报告首读cURL28失败，手动刷新后其余所请求组通过；W06 0.25.0 iPhone所请求A–D USER PASS由`w06-250-user-acceptance.json`单独配对，不改写旧冻结源码/签名包。

## 0.25.0官方投屏冻结候选

0.25.0「BiliSofa W06」，Application ID `BiliSofa01.TV`，自有BiliSofa Author与原权限保持。签名/证书与内容预检通过；首次capability未确认，原地址有界重连一次后state/capability/install/launch均exit0且明确成功。平台回执不代表本包声画/交互通过。未执行真实账号POST，W05互动读取失败按ADR-063暂缓。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `e9e6a6742a916dd748653e6bb799941f2bd2ff801677da2838d340139ec32584` |
| signed SHA-256 | `cae09312a6814e6c9316db57e58d730254221d334f9baa3e5ccbae9d26a87524` |
| UI sourceHash | `2403e6f2e3a2950a65508d7afb4eff3ed6f8f89306a5b77febee634f8a2cf6d4` |

仓库外`signed-w06-manifest.json`、`deployed-w06-manifest.json`与独立`w06-source-250-latest-archive.json`定位包/源码/日志；`.local/w06-sign.log`、`w06-deploy.log`记录结果，首次阻塞日志保留。仅新链cast-product；原9模块/旧探针及旧W05冻结工件保持。接收器名称BiliSofa，集中真机清单见[当前验收](../../CURRENT_DEVICE_TEST.md)。

## 0.24.1账号互动冻结候选

0.24.1「BiliSofa W05」，Application ID `BiliSofa01.TV`，Author/权限保持。自有profile签名/证书与内容预检通过；state/capability/install/launch均exit0且明确成功，无重连。没有执行真实账号POST；本人状态读取失败、用户要求暂缓；F11/F14真实写入未验收。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `0c70a7b381d73628d8f007e2fb6615ad5ca302eb832e38f7a86614b844d133ff` |
| signed SHA-256 | `7a91b4b30b325f4176a50a00a95ed9ce8a794ab135c6cbb57e631253b47db377` |
| UI sourceHash | `08c2cd035cd09244e870555608530458ab3e1d4f099fd523900e26e47b1d07aa` |

独立冻结指针`w05-source-241-latest-archive.json`；当前签名/部署由仓库外`signed-w05-manifest.json`、`deployed-w05-manifest.json`定位，日志`.local/w05-interactions-{sign,deploy}.log`。仅新链video-interactions模块，原8模块字节/manifest保持；原0.23.0源码/包及用户通过记录不改写；0.24.0及其最终静态类型FAIL归档于`w05-source-240-latest-archive.json`。

## 0.23.0评论/回复冻结包

0.23.0「BiliSofa W05」，`BiliSofa01.TV`身份/Author/权限保持。自有profile签名/证书与内容预检通过；state/capability/install/launch均exit0且明确成功，无重连；所请求列表排序分页/全文回复Back/播放与Home集中组USER PASS，仓库外`w05-230-user-acceptance.json`与冻结源码/包配对。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `e595ff2f1eecca6c06d528b805c5380042cbd410dc61e0d0d48b8678d35dd5a8` |
| signed SHA-256 | `0222b7ac171a9cc7717eaf0064dc93a8275eac01763207aea4e1ff5a8494895f` |
| UI sourceHash | `31bed5239f8d894904b59e220b19739d8095de23a35a3a867eb744edc9588ad4` |

独立源码冻结指针`w05-source-230-latest-archive.json`，该版签名/部署副本在同一冻结目录；`.local/w05-comments-{sign,deploy}.log`记录平台回执。仅新增comments-read原生模块，其他7模块字节/manifest保持，未执行真实账号写操作。

## 0.22.1定向修复冻结包

0.22.1「BiliSofa W05」，`BiliSofa01.TV`身份/Author/权限保持。自有profile签名/证书预检通过；state/capability/install/launch均exit0且明确成功，无重连。用户实际滚动/控制层/字幕空间及返回补验USER PASS，见仓库外`w05-221-user-acceptance.json`。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `187296d9fc40f9ec21590379b9d46fb2c9b192de9212889af89a1b3da8b0e29a` |
| signed SHA-256 | `a334622a5c2af30efdba46e8672adca9c2da7e94aaf844d107449818fd25aa29` |
| UI sourceHash | `d12ec546964668b0d86b4d6c9aa3f842acdee6b0c1d1dd4c355f0b15b3a024ee` |

原冻结包/源码由`w05-source-221-latest-archive.json`定位，日志`.local/w05-221-sign.log`、`w05-221-deploy.log`。源码/签名包冻结由`w05-source-221-latest-archive.json`定位；7个原生manifest/字节与0.22.0一致，无C重编译或HOST重跑。

## 0.22.0首模块冻结包

0.22.0「BiliSofa W05」，Application ID仍为`BiliSofa01.TV`。自有profile签名、证书日期/签发者及内容完整性预检通过。

| 字段 | 值 |
| --- | --- |
| unsigned SHA-256 | `31b263199e3a5e4d77324573e225ffd0c76cc160e48bab5e74e4eb68bec72118` |
| signed SHA-256 | `30a80badaf0e97eef852633e6fdacec54445ce581d25623b6f07a3d02a92fa9b` |
| UI sourceHash | `173caf0298093d8829ec217dab5158f0681de421427b71d9e426685ade38385c` |
| 当前平台结果 | 首次state未确认后原地址一次重连成功；后续state/capability/install/launch均exit0且明确成功；0.22.0所请求组USER PASS，两处缺陷由0.22.1修复且补验通过 |

原源码/包由`w05-source-220-latest-archive.json`定位；`w05-220-user-acceptance.json`记录A–D USER PASS及弹幕跳动/控制栏缺陷；日志`.local/w05-220-sign.log`、`w05-220-deploy.log`、`w05-220-deploy-after-reconnect.log`。W05签名/原始设备日志均仓库外；未变更Author/权限/外部服务，无账号写入。旧W04包及其结论不被覆盖。

## 当前W04冻结内部包

| 字段 | 值 |
| --- | --- |
| 显示名称 / 版本 | BiliSofa W04 / `0.21.4` |
| Application ID / Package ID | `BiliSofa01.TV` / `BiliSofa01`（升级身份保持） |
| unsigned | `dist/BiliSofa-W04-media-unsigned.wgt` |
| unsigned SHA-256 | `b4f8c7a64fac09aa4fadfee2b47583301bb8908dac2048bf6aba8010b1b448f4` |
| signed SHA-256 | `62d01f24214310da4cf101969eddf0048843c01619f54659de3343be46ad39cc` |
| UI sourceHash | `bd68baeff7694844cbe8c2aa7e8af6bc79c2d8c1934d85924026250257be3f6c` |
| 权限 | internet＋Public ProductInfo（诊断），两项固定loopback；无新增权限 |
| 结果 | 自有profile签名/证书预检通过；state/capability/install/launch均exit0且明确成功；用户直播仍清单HTTP超时，按ADR-057延期；不是媒体PASS |

私密签名/部署/源码由`~/.local/share/BiliSofa/signed-w04-manifest.json`、`deployed-w04-manifest.json`、`w04-source-214-latest-archive.json`定位；部署开始UTC18:21:25，无需重连；ignored日志`.local/w04-214-sign.log`、`w04-214-deploy*.log`。目标/证书/原始输出仅仓库外；6原生模块与0.21.3字节一致，新增HOST重启检查不冒充重新编译SDK。升级不卸载、清数据或改变Author。

## 0.21.3保留工件与用户结果

signed SHA `9446fd4f660fd4bada5d7f91419a1ca819e88909e90ae9d0025709b62145e00a`，unsigned SHA `26835e25817ca902f4d909500b65caffe0ba66c6e3f8d1aa700c1465d5de7275`，UI sourceHash `9814aa11093af97e4239049d2979679a8203db70b6cfe2885271908fce1b10c3`。原工件由`w04-source-213-latest-archive.json`定位；`w04-213-user-observation.json`记录点播标称4K/跨内容降至1080P高码率USER PASS、直播`live.network.source`USER FAIL。原源码/签名包和结果保持，不扩展为独立decoder/HDR通过。

## 0.21.2保留工件

signed SHA `df279899f524e0f56e04465aae49d84c3d049581e2069ee6cf47baca62a1715c`，unsigned SHA `33b12c165449023b4147928f3cd407731969f5b0f81a2935b5926250467abfae`，UI sourceHash `8aad9d66c6f7bc152b44c4e2da6d0834d676fd494f22b6af521ee3e854cf7bc5`。由`w04-source-212-latest-archive.json`定位，保留原试播门禁、检查/部署记录及`w04-212-user-observation.json`中的1920×1080提示处失败反馈；没有实际prepare码，不推断1080P硬件不支持。

## 0.21.1保留工件与验收

原signed SHA `0de25efbbcb448abaae985e246aebd05008f03c22b2103db1e7b07764a72cdb9`，unsigned SHA `21a5bf4913c8abd16017ff469b17782448f8678944ebe38c8d9c49d48e03b470`，UI sourceHash `cc80665c2e79555e4059a97c3e0dbddfcabd6be799a053bd88a7f5640d28fbfe`。原工件由`w04-source-211-latest-archive.json`定位，保持冻结。

该版补齐[ProductInfo权限](../../W04_PRODUCTINFO_FIX.md)，用户起播/声画通过；随后A–C、D关注/分区所请求项目通过，D直播FAIL并报跨内容轨道回退问题。新包不改写旧结果。E、无样本、真实追番写入不推断通过；具体边界见[当前测试](../../CURRENT_DEVICE_TEST.md)。

## 0.21.0已知失败工件

原包漏ProductInfo权限，用户全部起播被门禁阻断，A–E全部未执行。平台安装成功不等于产品通过。原signed SHA为`7f24e8b63ebb5b27df7ac9ce28e2b875736833aad1f3ff4e3a0ddc5870ad35a5`，unsigned SHA为`0759a8c0b8a54935c916b2fc2163093c7ffdc99ca75faf7bdfd2629671c9a821`，UI sourceHash为`0c3a31c9a2d131f6d5b1194ef38239fa4a21e3f265b3f882342b61d0b45e7266`。由`w04-source-210-latest-archive.json`定位的源码/签名包与失败证据保持，不以新包覆盖旧结果。

## 原0.20.0冻结工件（保留回退）

| 字段 | 值 |
| --- | --- |
| 显示名称 | BiliSofa W03 |
| Application ID / Package ID | `BiliSofa01.TV` / `BiliSofa01` |
| 版本 | `0.20.0` |
| unsigned | `dist/BiliSofa-W03-account-details-unsigned.wgt` |
| unsigned SHA-256 | `25443a351dc1a5d51ed33ece553bb5a6a54eff9a2cbe26c5e76a8057b4d3075d` |
| signed SHA-256 | `80373568b36331992c78aca1ec31736a7b4a3b16a3ecaee4fc579afe2f718d81` |
| UI sourceHash | `5c9e0b8f906e0c8195f13d5605e6dfaf0025c04dc3371c825417da5ff8cff227` |
| 冻结源码ZIP SHA-256 | `ad5fc5c8067e20b4f90d700174244d43e6abdd4445c0c1034cc2b9e98d33b539`，564文件 |

私密签名包/证据由`~/.local/share/BiliSofa/signed-foundation-manifest.json`、`w03-source-200-latest-archive.json`定位。源码ZIP、旧签名包和原失败记录保持原样；当前开发中的F06不在此包内。

## 0.20.0既有重新部署

2026-10-19 13:43（America/Toronto；启动记录UTC 17:43:47）：已核对签名包SHA与嵌入的build版本/身份，使用同一授权目标执行`python3 tools/deploy-foundation-app.py`。state、capability、install、launch均exit0且有明确成功回执，无需重连或重复安装。

这是原0.20.0重新安装/启动，不是新F06交付；本轮启动/焦点、播放暂停继续/Back、Home停声已获用户确认通过，见[集中步骤](../../CURRENT_DEVICE_TEST.md)。日志`.local/docs-cleanup-redeploy-200.log`；完整平台记录和设备输出保留在仓库外。没有卸载、清数据或更换Author。

## 操作边界

build、package、sign、install/run为独立步骤；[开发命令](../../DEVELOPMENT.md)与[证书指南](../../SAMSUNG_CERTIFICATE_GUIDE.md)提供入口。签名资源、密码、DUID和目标地址不进入仓库/公开日志。连接失败时先核查同一目标的state和capability，最多按已有授权做一次有界重连，不自动重复未知安装。

精确历史签名与失败过程见[归档](../2026-10-19-process-records/SIGNING_DEVICE_RECORD.md)；W01关键工件见[证据索引](../../W01_EVIDENCE_INDEX.md)。
