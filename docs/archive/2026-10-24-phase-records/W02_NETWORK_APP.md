# W02第七批：内容读取与持久化写意图

日期：2026-10-18。范围W02/F02/F11/F13/F14，见[ADR-033](adr/033-content-and-durable-write-boundary.md)。内部0.5.0；完整W02及单一v1.0.0仍未验收。

首次用户取源失败后的0.5.1脱敏取证补丁及当前包见[W02_SOURCE_DIAGNOSTICS](W02_SOURCE_DIAGNOSTICS.md)；本页0.5.0工件/数字和用户结果保留原时点。

## 行为与边界

- 游客热门页面改经`ContentRuntime`。入口只接受popular/page1–10，不接受URL、Cookie、header、私有route或POST。现有匿名Worker负责实际HTTPS，所选账号不改变匿名请求身份。翻页/取消/关闭有独立scope，旧回包不得回填新页；关闭需原生ACK。HTTP/API失败、无效数据、原生不可用与取消分开映射。
- `RetainedWrites`已注入`AccountWorkspace`，借用已有核对身份后的账号请求租约。明确确认、合法保留action/规范目标、未取消租约和持久化pending逐字回读之后，才允许单次dispatch；不自动重试。Home/切号取消后按未知结果保留，迟到结果不解锁。超时15秒只是观察上限，不宣称远端撤销或原生已关闭。
- 固定`bilisofa.retained-writes.v1` journal有schema/revision、最多256条/64KiB、预期原文比较和写后回读。pending/checking重开视为unknown；损坏/future/不可读/写不确认锁定提交，不覆盖、不淘汰旧意图。同账号同目标有未决项时也阻止其他保留action，避免coin/triple等并发重叠。
- unknown只允许只读查询；失败、取消或超时不证明未应用。明确not-applied也不自动发送，下次仍需新的用户确认。已确认的同一项不自动重发；本批没有释放记录入口。W05还须定义完整操作参数、状态变更/重复意图及状态回查合同。
- 设置页按当前身份只显示写操作记录/未确认数量；访客不展示账号统计。清除偏好、清除诊断、移除账号都不删除journal，移除确认明确提示保留防重复记录。journal仅普通非秘密操作元数据，无Cookie、昵称、URL或响应原文；不宣称加密或跨进程数据库事务。

当前实际内容route只有匿名热门；带身份内容接口留给W03逐条接入。没有新增互动提交按钮、业务POST后端或真实账号写入测试，不表示F11/F14完成。W01两份云进度未知意图保持原位，不导入为可重发项，不回查解锁或重发旧授权。

## 工件与真实部署

| 项目 | 证据 |
| --- | --- |
| 应用/包/版本 | `BiliSofa01.TV` / `BiliSofa01` / `0.5.0` |
| 未签名工件 | `dist/BiliSofa-W02-network-unsigned.wgt` |
| 未签名SHA256 | `2cdb116c70dd45557c6146a0549e9885de28327ee444c62097e9a4d15dcb446a` |
| 签名SHA256 | `6f451c084947ccfe7dc8481866b821b69e347658e20eec3cf92a6e5447bc0b8c` |
| UI输入汇总SHA256 | `7a33a49a74791df088ebb5b420d7675bab11dc0f843b26a379e53d4227d07037` |
| 首份源码ZIP SHA256 | `cb6e3cab6d9acc57dd4b8573af64daf11c44dbbf6000ffb520719495f1051f7e` |
| 签名预检 | 沿用自有profile；内容逐字一致，仅增加两个签名XML；证书日期/发行方预检通过，不等于独立链信任验收 |
| 安装/启动 | UTC2026-10-18T12:57:45.594352起本次部署，state/capability/install/launch均exit0且平台明确成功 |

签名包、签名XML、证书原文、私密目标/日志与完整源码在仓库外0700目录/0600文件保留。0.1–0.4未签名包以及W01主060/独立018已装包保持；新ID不覆盖W01，不新增权限、SDK、原生库或真实账号写操作。

首次设备列表为空，仅重连原授权目标后state/capability恢复。首装CLI exit1、无平台错误码；厂商输出名`BiliSofa W02.wgt`含空格。随后只复制为无空格文件名，SHA保持不变，第二次安装及启动明确成功。首轮失败日志保留；这是定向排除后的成功，不足以独立证明失败根因。新sign/deploy工具固定校验本应用身份，不修改旧W01签名工具或绕过其白名单；构建/打包本身仍不部署。

## 本地验证

- strict/116模块依赖边界通过；347项全量单元/合同通过，本批新增15项。覆盖确认/身份租约、落盘先于dispatch、quota/静默丢写、结果保存失败、重建unknown、只读回查/新确认、Home取消/迟回调、同目标竞争、容量/不淘汰、原文比较和内容route/关闭。
- 10项本地设置/账号分区浏览器流程（新增2项）＋6媒体＋6投屏＋10身份回归，共32项通过。实际应用JS/Worker/平台适配器运行，C/SDK/KeyManager/发送端为合成边界。新增流程确认统计随身份变化，清除/移除/reload保留journal，future写记录保持原文且不影响普通偏好。
- 未签名包来源/静态库/CA/载荷/许可证/ZIP字节门禁和3项打包拒绝负例通过。原生源未改、未重编译；并非新的原生C/电视服务写入证据。远端CI未运行。
- 正常路径和新增路径首轮均通过；审查时额外修正同步dispatch中abort再throw的Promise观察、先发布关闭Promise再取消scope，相关检查通过。没有降低失败门禁或新增网络重试。

```sh
npm run check
npm test
npm run build:app
npm run test:ui:local-app
npm run test:ui:media
npm run test:ui:cast-app
npm run test:ui:app
npm run package:app
python3 tests/native/foundation-packaging.test.py
# 以下是沿用设备/签名授权的显式操作，默认构建不调用
python3 tools/sign-foundation-app.py
python3 tools/deploy-foundation-app.py
```

4173浏览器套件串行执行。默认sign/deploy只支持本批0.5.0，输出与日志保存在仓库外；部署失败立即退出，不自动重试、扫描或删除应用。

## 新ID有界验收（0.5.0用户结果已收到）

这组检查验证新应用装配，不扩展W01可行性测试，也不取代W03–W07功能矩阵。任一步失败就停，先定位，不反复请求整组。

1. 用户确认0.5.0焦点、成功视频的播放/续播、Home停声及设置10秒重开均通过；但首张视频在“获取播放源”阶段失败，换另一张卡才成功。游客播放整体保留部分通过，不能称为同视频重试恢复或首播已修复。原包配对hash如上，首次失败视频BV/具体底层码未知。代码核查发现GuestPlayback/MediaSession丢弃了既有Worker闭合结果的精确原因，先补脱敏取证，不扩大重试/白名单或要求重测已通过项目。
2. 第一组通过后：仅一次新ID扫码/核对本人、选择账号并返回访客，检查对应本地分区和保护保存/重开/删除；不写云端、不要求第二个真实账号。双真实账号完整隔离归W03/F13。
3. 再做一次已验证发送端的新ID投屏组合，检查短时声画、暂停继续、Home关闭与重开接收。无需重跑三端、长P、长播或高画质矩阵。
4. 冷启动至可操作、实际按键至焦点、首帧/seek、掉帧/内存等量化性能基线仍未测量；合成耗时/平台run返回不作为真实基线。后续只补缺少的测量方法与数据。

仅SDK安装/启动成功不能记上述组通过。F07云端与F19高画质继续未验证；互动业务端点和其他内容页继续按W03/W05开发，不因协调器存在而完成。
