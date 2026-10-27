# 0.44.0 第三方验收修正候选：工件证据

2026-10-22；[ADR-087](https://github.com/johnnyzhao5619/BiliSofa/blob/a709767e0fd4b6eef741bd3193bafa6348ca0ff8/docs/adr/087-third-party-acceptance-fixes.md) · [回执](receipt.json) · [第三方验收](../../../acceptance/third-party/2026-10-22T213335-0400/REPORT.md)。**已构建、签名，并经用户授权升级安装到电视（不清数据）；平台确认安装/启动成功；用户所请求M1回复全文/M2默认画质USER PASS（[用户结果](USER_ACCEPTANCE.md)）。** 构建授权：输出到新目录、不覆盖冻结工件；部署授权：升级安装、不清数据。

## 工件

| 项 | 值 |
| --- | --- |
| UI stage | `dist/product-acceptance-fix-app`（新目录，28个文件含清单） |
| 未签名 | `dist/BiliSofa-0.44.0-unsigned.wgt`，SHA-256 `89fb445d944a74b0357a1b1006e008b460e23353001f3d9eddb7324f0b7a3a35` |
| 签名 | 仓库外私有目录`productacceptancefix-20261023T024046924953Z`，SHA-256 `8ba0f6707f90bebaf0c86fd6de2cbc43e794009a92ae3d603400cf9a9c67f0ca`；证书日期/签发方预检PASS（不等于设备信任） |
| UI sourceHash | `0b944be2d166e9cb96c3de8f2f949f4c3030b8bc7f6df2a72648424eb0cfde1f` |
| 源码归档 | 签名目录内`source-inputs.tar.gz`，SHA-256 `81336bbac992f5b8cafb77123203ee1bcb16a95bde1179705e2c43a00db44a25`，314个源文件 |
| 相对0.43.0 | 249个UI输入中仅6个变化：`navigation.ts`、`vod-comments.ts`、`interaction-writes.ts`、`vod-track-preference.ts`及构建/打包脚本；17原生模块/68资源与0.43.0签名包逐字节一致；R07 `ElementVideoBackend`不在包内 |

## 本地验证

| 层次 | 结果 |
| --- | --- |
| strict/边界 | 293模块，退出0 |
| 单元/合同 | 692/692，退出0 |
| 0.44.0合成UI | 回复全文逐层打开/返回、无偏好默认480P AVC＋AAC192（夹具最高AVC≤1080P）2/2通过 |
| 负对照 | 同两条规格对冻结0.43.0：2/2失败（回复全文未获焦点；默认仍为360P），证明规格能检出原缺陷，并在桌面合成层复现P2-01/P2-02 |
| 保留投屏定位/同秒幂等 | 0.43.0 cast-clock/cast-seek共10条在0.44.0上10/10通过 |
| 包负例 | 6/6（CSP通配、远程脚本、图片源、版本、凭据样式载荷、文件hash），stage逐文件还原 |
| 冻结工件 | 构建/打包/签名前后，dist中其余802个文件、build中176个文件hash不变；私有目录只新增本次签名目录与指针；`.local/u4-cast-clock`证据未改 |
| 签名包扫描 | 无凭据/私钥/局域网地址；权限仍仅internet＋productinfo |

未运行：0.43.0冻结规格中会写入`.local/u4-cast-clock`的recovery/retained-cast/settings三组（共20项）；F11日志淘汰仅单元层（未做256条UI合成）。没有设备、扫码、真实账号写入或部署；F11旧unknown不重放。

## 部署

| 尝试 | 结果 |
| --- | --- |
| 1 | state通过；capability查询12秒超时 → 脚本按设计BLOCKED，未安装（与0.43.0回执记录的旧超时症状一致） |
| 恢复 | 对同一授权目标执行一次SDB disconnect/connect；随后state与capability（含platform_version）恢复 |
| 2 | state/capability/install/launch全部platformSuccess；`tizen install`覆盖安装同一应用ID，未卸载、未清数据 |

平台成功只表示安装和启动命令被确认，不代表界面、账号、媒体或性能通过。没有扫码、真实账号写入或旧unknown重放。

## 待用户观察

建议的最小组为第三方[DEVICE_PLAN](../../../acceptance/third-party/2026-10-22T213335-0400/DEVICE_PLAN.md) M1（回复全文/番剧楼中楼）、M2（首播默认画质）在已安装的0.44.0上执行；其他0.43.0 USER PASS组因相关源码未变而继承，不重测。
