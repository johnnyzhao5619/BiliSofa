# ADR-012：电视内合成HTTP会话线缆探针

日期2026-10-16。W01/W02/F01/F13，内部0.0.51候选，不固定最终产品网络栈。0.0.50三端普通视频已有分项反馈，不因此跳过真实响应头/cookie隔离门槛。

新增单独Worker/native任务session-wire。固定IPv4 loopback40326，随机32hex路径，只接受本次固定路由；不接受外部地址、代理、用户cookie或账号。两个独立cURL easy内存cookie容器，共享一个multi调度器（不共享cookie），一个监听socket和最多一个服务客户端；20秒总限、3秒阶段、2秒客户端、cURL2.5秒请求；请求2048字节、响应静态1024、回调header8192/body128。按tick非阻塞推进，取消先原生清理再ACK；父层25秒、关闭ACK5秒，未知清理poison禁止复用。

九轮实际HTTP：A接受合成Set-Cookie A；B仍空；A回传A；B独立接受B；B回传B；A仍A；A取得302但不跟随固定loopback目标；清空A后A无cookie；B仍B。服务器核对实际Cookie字段及随机路由，客户端核对实际回调头、响应状态/正文长度；禁止把直接COOKIELIST注入代替wire证明。故意开启follow会访问未批准路由并失败，未发送任何外部请求。关闭时清空两jar并销毁easy/multi/global，关闭client/listener，清除自有token/URL/request/response后才发终态；任一关闭不确定为failed17，Worker报错而不是closed ACK。

结果只输出ready/响应头Set-Cookie/两jar隔离/redirect未跟随/清空隔离五个固定进度及最终关闭结论，不传原始Cookie、URL或头。UI入口“测试HTTP会话隔离”；内部auto7运行一次后开启原诊断报告；默认manual，不自动签名/安装/发布。native源hash纳入第九文件probe-session.h，旧binary拒绝打包。

证据界限：这是HTTP真实wire与合成cookie隔离，不是HTTPS Set-Cookie、真实Bili账号/会话、Secure属性、跨站凭据redirect或受保护持久会话证明。TLS/CA沿用原独立游客HTTPS验证，产品依赖升级/安全、真实账号路径仍OPEN。无新运行时依赖/权限/CSP/WARP、外部网关、客户端身份或账号写入。HOST/桌面只能证明对应层，实际TV结果单独记录。
