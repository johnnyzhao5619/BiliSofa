# ADR-083：投屏首次近起点定位合并

2026-10-22；F20、W06、U4/R11。0.41.0候选，主动定位/停止等所请求项USER PASS，但进程首次投屏仍FAIL（见[验收](../design/evidence/2026-10-22-cast-start/USER_ACCEPTANCE.md)）。0.40.0账号更新A/B/C已获USER PASS，不重复该组。

## 证据与问题边界

用户报告Android每次起播约两秒后回到开头一次，iPhone此前也有类似现象。已核对正式包输入图及app.js：未包含“自动投屏回跳检查／自动检查三次回跳”入口，CastWorkspace仅在授权源就绪或收到控制时执行播放，未发现定时seek测试流程。

正式控制链上的确定行为是：收到合法Seek后，CastReceiverPlayer无论目标距离多近都先pause；本设备progressive AVPlay的PAUSED seek走重新prepare/PREBUFFER路径。这条链在合成生产Worker/播放器中可复现“首次近起点定位重开解码器”。历史官方Android9.15.0静态研究存在首次位置回报后的恢复定位分支，但版本不同；**尚未取得本次真实SOAP，不能据此断言用户这次必由初始Seek引起，也不把它归因为测试脚本**。

## 决定

- 产品模式中，新源首次播放4秒墙钟内、当前真实媒体位置不超过2500ms，第一条Seek目标为0～1000ms且偏差不超过2500ms时，将其视为已对齐。只应答一次完成，不pause、不seek、不重开、不改写实际时间，也不制造目标命中或SDK完成事实。
- 这些数值是本项目的有限起播容差，不是Bilibili协议标准或硬件能力限制。它同样会合并在该狭窄窗口内用户主动发出的第一次近起点Seek；后续回到0、明显非零续播、远距离定位均正常执行。不能通过不断Play重新打开容差。
- 任意Pause、Stop、已有Seek或遥控接管结束这次机会；新源代次或明确Stop后Play的新回放重新计算一次。保留同一发送端、原批准URI、命令递增ID、有效会话、忙态/过期和双关闭边界。旧探针默认不启用本合并。
- 加入固定枚举的产品诊断：autoplay_started、seek_zero/seek_nonzero、startup_aligned、seek_completed、source_changed。仅有界进程内事实，不收集目标时间、视频/账号/对端标识、地址或URL；seek_completed包含合并完成，不宣称SDK调用。旧W01 32位事实集不扩展。
- 不延迟起播、不忽略所有零秒请求、不自动重试控制，不修改原生网络/协议/源权限、直播或双账号范围。

## 验证与出口

[回执](../design/evidence/2026-10-22-cast-start/receipt.json)区分合成及设备平台/USER证据。合成覆盖一次合并且真实时间不回写、后续非零/回0、暂停、Stop/Play、换源、旧回调与所有权/Home/关闭失败。实际只补Android约20秒起播＋主动定位/停止；成功后iPhone只观察起播，失败即停，不重复账号或长播。若仍复现，用上述产品诊断区分收到Seek、换源与其他重开，不能无新证据继续调容差。

最新证据：Android/iPhone均仅在应用进程首次投屏约1秒回0；同进程后续正常。用户读取autoplay_started → seek_nonzero → seek_completed → closed；尚无具体目标/SDK调用证据。不得据此扩大容差或将手机初始化请求视为已证根因。

后续同包取证取得目标4000ms/实际1545ms及重建后SDK从16ms播放的事实；0.42.0按[ADR-084](084-playing-cast-seek-without-reopen.md)停用本候选的近零合并，修正播放态非零Seek路径。旧工件/失败保留，新效果待验。
