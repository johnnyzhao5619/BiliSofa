# 当前测试报告

2026-10-26；只保留已安装包与未部署候选的结果。历史版本的分层结果在各自证据README，逐版本结论见[签名与部署记录](SIGNING_DEVICE_RECORD.md)。

## 已安装0.63.0（ADR-115）

| 层次 | 实际结果 |
| --- | --- |
| 单元/合同 | 778/778（新增`media-limits.test.ts`；ADR-111边界改为7天；删除`source-pair.test.ts`） |
| 原生主机 | overlay-read、vod-bridge、vod-bridge-failover、vod-api、source-failover、pgc-read通过（新增7天与段号1680边界） |
| 合成UI | 112/112（新增`long-video.spec.ts`：30小时视频播放、`h:mm:ss`、26小时处保存并从“继续观看”继续） |
| 包 | 负例11/11；未签名WGT `7c65c013…63b4`；`vod-api/`、`pgc-read/`与0.58.0逐字节相同，相对0.62.0只有4个原生目录变化 |
| 签名/部署 | 签名`34a18c82…769f`（证书预检PASS，权限不变）；升级安装/启动platformSuccess（一次，不清数据） |
| 设备 | 起播（Inspector，“为你推荐”前4个，卡片直接播放）：卡片到首帧0.62.0为8.1–11.1 s；0.63.0第一轮8.4–9.6 s，另有一次17.4 s（来源检查段9.7 s，未查），第二轮7.4–8.0 s。**超过24小时的视频未验证**：用户没有找到，先跳过 |

[设备证据](design/evidence/2026-10-26-p1-1c/README.md)。0.62.0的结果见[其证据](design/evidence/2026-10-26-p1-2b/README.md)。
