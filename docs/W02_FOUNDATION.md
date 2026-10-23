# W02首批：导航与资源所有权

日期：2026-10-17。路线见[ADR-027](adr/027-w02-runtime-and-deferred-evidence.md)。本批是可复用基础模块与独立合成预览；尚未装配正式内容/真实扫码/播放器入口，不是完整W02或产品验收。

## 实现与合同

- `packages/contracts/src/navigation.ts`：有界页面ID和返回锚点，拒绝任意URL、未知页与额外字段。
- `apps/tv/src/app/navigation.ts`：最多32页/6层不同模态（ADR-087由4层调整）；Back一次只消费一层，保留稳定控件ID与滚动位置。换账号清空私人页面/模态返回历史，旧页面generation失效；不将导航状态写入普通存储。
- `apps/tv/src/app/resource-owner.ts`：注册资源后再发起异步工作，close立即abort，按LIFO清理并等待确认；并发/重复close共享结果。任意未知或超时保持未确认，不因晚回包转成已关闭。错误只保留固定资源ID，不暴露原异常。等待预算不能抢占一个同步阻塞的SDK调用；接入原生适配器时需对齐其真实关闭上限。
- `apps/tv/src/app/tv-shell.ts`：单一InputRouter/FocusRouter，真实DOM焦点；页面只在旧owner确认关闭后装配。嵌套模态在独立overlay容器，前一层inert，关闭恢复原控件。账号切换先清理旧视图和请求，再回首页；Home立即取消，前台重校验有独立AbortSignal，二次Home或dispose可取消。重校验/关闭失败提供重新打开反馈，阻止不安全复用。恢复只重建界面，不自动调用播放或账号写入。

页面factory同步创建受owner管理的视图。异步读取在发起前注册取消/关闭，结果应用前检查signal；不能在已取消的owner上新建资源。正式composition root还需将SessionManager账号代次、AVPlay实际NONE检查和Worker原生关闭ACK接入，不能把一个JS disposer返回等同于硬件关闭。

## 本地预览与命令

`tests/foundation-ui/preview.ts`只包含合成页面、内存账号及关闭/迟回包夹具；不读取真实账号、不请求B站、不包含native/WASM或签名。预览CSP的connect-src为none。目录为`dist/foundation-preview`，与现有W01 probe目录隔离。

```sh
npm run check
npm test
npm run build:foundation
npm run test:ui:foundation
npm run package:foundation-preview
BILISOFA_PROBE_ROOT=dist/foundation-preview npm run dev
```

最后一条只用于电脑本地预览，浏览器打开本地4173端口；不是电视日常运行依赖。测试会启动自己的服务器，运行预览服务与同端口UI测试时应串行，不启用reuseExistingServer掩盖错误目录。

当前第二批合成预览ZIP：`dist/BiliSofa-W02-foundation-preview.zip`，SHA256 `30c7913b046c8e8040c69a0408cf29a143dff576f3e61ef47e5d2559abd4256d`。包含HTML/JS/CSS、MIT LICENSE和输入/输出SHA256清单；没有WGT配置、证书、真实账号平台模块或部署动作。该ZIP不能安装到电视，也不是v1.0.0或完整可运行业务App。

## 验证与后续

- 261项全量单元/合同通过（包含本批12项导航/owner检查）；11项真实浏览器合成流程通过；strict与89模块依赖/平台全局边界、实际ZIP来源/完整性/私密模式检查通过。
- 浏览器覆盖嵌套模态Back、焦点/滚动恢复、等待旧owner清理、快速导航、迟数据隔离、安全文本、关闭失败锁定、Home取消恢复校验、账号切换清空历史、重复Back/卸载和前台失败反馈。它们不是本电视的Voice Guide/媒体关闭/休眠或性能验收。
- 全量测试发现旧账号测试仍把现已支持的现代只读op5视为越界。按已有account-readback实现/合同补合法op5、改为拒绝op6；没有改生产解析器或放宽凭据边界。初始浏览器两个失败来自status定位匹配两项，已限定页面区域；原失败夹具记录私密保留，不伪称初跑全通过。
- CI配置已加preview build/browser/package三步；没有push、GitHub运行或发布，不宣称远程CI通过。未安装/启动新电视包。
- W02下一批：正式账号/会话存储与隔离、Worker/媒体适配装配、启动/可操作/焦点/首帧/内存基线及实际应用包。F01–F20业务界面、W03/W04/W06和W07完整验收仍开放；当前云进度与高画质跳过不变成产品通过。

复核补充：同步abort监听器可重入close；已把共享关闭Promise的发布移到abort之前，避免重复drain或未知关闭被空清理覆盖。新增回归先复现失败、修复后通过；最终261单元/合同、11浏览器及预览包重新校验通过。

后续第二批已接入合成多账号/身份切换及Home恢复，新增24单元/合同和7浏览器检查，当前285/18通过；上文261/11保留为首批记录。正式平台适配器及保护槽不进入本预览包，详见[W02_ACCOUNTS](W02_ACCOUNTS.md)。

第三批新增真实账号代码的未签名WGT与验证见[W02_IDENTITY_APP](W02_IDENTITY_APP.md)。本合成预览ZIP只更新构建来源与shell边界，不包含账号平台模块或native网络。
