# 项目结构与依赖方向

实施目标映射。已有 W01 可执行候选探针与可移植基础源码/临时工具链（ADR-002），最终 runtime 仍未固定。保留骨架，按实际工作创建文件；若 W01 选 .NET，另记 ADR 修改 UI/平台结构，领域合同/产品要求保持。

```text
apps/tv/                  应用装配与 UI
  src/app/                启动、路由、生命周期、依赖注入
  src/features/           account/home/search/library/watch/live/settings
  src/ui/                 TV 控件、FocusRouter、InputRouter、token
  src/platform/           Samsung/Tizen globals、能力查询与适配器
  public/                 本地资源，无证书/会话/私密截图
  config.xml              Web 候选源配置，W01 后创建
packages/contracts/       DTO、Worker 消息、Player/Network/Store/Cast 接口
packages/bili-client/     会话、端点映射、验证、WriteCoordinator
packages/media/           时间轴、字幕/弹幕、媒体选择、播放器协调
packages/cast/            接收协议、会话/控制权，不直接写账号/操作UI
platform/wasm-network/    TV Worker/cURL/socket 源与构建说明
platform/dotnet-probe/    备选实机探针，不假定能混入 WGT
tools/                   构建、打包、签名/安装包装、脱敏诊断
tests/unit/              纯状态/时间轴/解析，按后续授权增加
tests/contracts/         匿名接口/Worker/协议 fixtures
tests/device/            真机矩阵/匿名记录；原始私密资料在仓库外
docs/                    PRD、架构、规范、验收、来源、ADR
```

## 依赖规则

1. contracts 不依赖 UI、客户端或平台 globals。
2. bili-client/media/cast 可依赖 contracts，通过接口使用 Network/Store/Player；无循环 import、不导入 apps/tv。
3. apps/tv 是 composition root，装配领域/平台；页面经用例/状态访问，不能绕过会话/写入/播放器协调器。
4. WASM 网络实现受限消息合同；投屏命令经 CastSession→领域验证→PlayerCoordinator，不直接执行任意 URL/账号写命令。
5. tools 仅开发阶段运行，发布包无外部 Node/dev server/远程 JS；按需模块也来自本地包。

## 产物与配置

- 源 config.xml 随 app 维护，最终 WGT 根目录必须含配置/可定位入口；仓库根不等于包根。部署后 app/package ID 作为升级身份维护。
- 依赖锁文件、build target、SDK/TV Extension/Samsung Emscripten 版本/命令随可复现工程配置维护；不提前生成未经运行的 lockfile/工具链或宣称可构建。
- 生成物归 ignored dist/build 等。证书/密码/DUID/session 在仓库外私密位置，以本地参数注入；不进命令日志。
- fixtures 合成/匿名，复用文件保留通知并登记 THIRD_PARTY_NOTICES.md。新增依赖/权限记录职责/证据。
- 命令区分 dev/build/package/sign/install/device capture，默认 build 不暗中部署/发布。

结构为项目设计；包配置/签名见 [研究 S06、S17](research/tizen-best-practices-2026-10-14.md)。
