# BiliSofa

坐在沙发上，用三星电视看B站。目标是在Samsung UN58U8200FFXZC上以一个独立App观看B站，自有代码MIT。保留F01–F20跟踪；当前交付按用户决定排除直播及真实双账号，其他必需功能保持（[ADR-068](docs/adr/068-current-scope-and-reversible-interactions.md)、[ADR-069](docs/adr/069-single-account-current-delivery.md)）。

## 当前状态

**用户当前要求先不部署，先更新文档并交第三方验收。** 已安装工件为0.43.0：所请求Android/iPhone投屏组与F11关注/收藏组USER PASS，既有点赞/稍后再看和其他已通过组保持；不等于完整产品通过。旧进程结束已确认，后续重新启动超时，当前前台未知。

当前工作区另有R07小数倍速HTML video候选，尚未集成生产、打包、签名或部署。桌面MP4只有前四档通过，1.25×窗口不足中止，其余档位/DASH/电视未验；不能借用0.43.0的设备结果。大屏UI已有实现与分组USER证据，最终整合/性能/恢复及内容来源缺口仍开放。

[当前状态](docs/IMPLEMENTATION_STATUS.md) · [第三方验收提示词](docs/THIRD_PARTY_ACCEPTANCE_PROMPT.md) · [验收安排](docs/CURRENT_DEVICE_TEST.md) · [分层测试](docs/TEST_REPORT.md) · [签名工件](docs/SIGNING_DEVICE_RECORD.md)

[唯一收口台账](docs/PRODUCT_CLOSURE.md) · [大屏产品设计](docs/TV_PRODUCT_DESIGN.md)。直播及真实双账号排除；F14暂停，云进度用户跳过且旧unknown不重发；完整v1.0.0尚未完成，不提交/推送/发布。

## 运行与范围

- 单WGT、Web UI＋电视内Worker/WASM/cURL＋AVPlay，见[架构](docs/ARCHITECTURE.md)与ADR-027。
- 日常不依赖常开电脑、NAS、局域网网关或项目云服务；电脑仅用于开发、签名、安装和升级。
- 未修改的官方Android/iPhone/iPad App作为投屏发送端，接收器在电视App前台启用；不宣称官方认证、AirPlay或后台唤醒。
- 评论/回复及点播/直播弹幕只读，搜索保留本地拼音首字母候选；其他保留功能不缩减，见[ADR-003](docs/adr/003-read-only-comments-danmaku.md)。

## 开发

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build:app
npm run package:app
```

当前构建配置绑定内部版本，重建开发中源码不等于冻结包；签名/安装是独立步骤，按[开发说明](docs/DEVELOPMENT.md)操作。W04按[固定收尾表](docs/W04_DEVICE_ACCEPTANCE.md)核对，不再追加直播测试；其他批次至少以完整F模块为单位集中实现和验证。

## 文档与许可

[PRD](docs/PRD.md) · [实施计划](docs/IMPLEMENTATION_PLAN.md) · [验收](docs/ACCEPTANCE.md) · [工程规则](docs/ENGINEERING.md) · [结构](docs/PROJECT_STRUCTURE.md) · [TV交互](docs/TV_UI.md) · [Tizen约束](docs/TIZEN_PRACTICES.md) · [AGENTS](AGENTS.md)

自有代码采用[MIT](LICENSE)，上游来源/许可见[第三方声明](THIRD_PARTY_NOTICES.md)。本项目与Bilibili、Samsung无隶属或官方认证关系，内容以真实账号权益、地区与设备能力为准。公开发布尚未执行，完整条件见[发布清单](docs/RELEASE_CHECKLIST.md)。旧过程见[归档](docs/archive/2026-10-19-process-records/README.md)。
