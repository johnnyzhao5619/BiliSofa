# 互动协议复核

2026-10-22；仅静态官方来源、匿名GET，无代理账号POST。

官方视频脚本：[原始资源](https://s1.hdslb.com/bfs/static/jinkela/video/video.f3c638cfcd3c13717cc5595a65e400dee88fb2f9.js)，本次HTTP200，SHA256 `090cd2bd27906e2df872155014217f226a8801d03a35ec8393eaa1bf6e9788f9`。原文/短片段保存在仓库外，不随应用执行或复制。官方消费者读取`data.attribute`判定关注；点赞使用`/x/web-interface/archive/like`、aid/like，当前固定表单路线一致。匿名`/x/relation`HTTP200/API-101只证明需登录，不能证明用户响应字段或写权限。

因此移除对关注响应中mid必填的错误假设，但保留返回值匹配校验。官方脚本有可选播放器/统计字段，本项目不伪造这些上下文，也没有足够证据认定缺它们导致-403。用户已报告-403且回查false，点赞根因/真实通过仍OPEN。

交互借鉴[YouTube官方倍速操作说明](https://support.google.com/youtube/answer/7509567?hl=en-PG)的设置内选择即时生效，本项目落实为遥控单列菜单/当前值聚焦；不是当前YouTube TV逐像素复刻。Samsung能力与小数倍速边界沿用[ADR-079](../adr/079-player-actions-and-rate-menu.md)。
