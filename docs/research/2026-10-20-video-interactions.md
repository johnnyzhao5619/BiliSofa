# 官方视频互动协议核查（2026-10-20）

来源为[哔哩哔哩官方网页视频脚本](https://s1.hdslb.com/bfs/static/jinkela/video/video.f3c638cfcd3c13717cc5595a65e400dee88fb2f9.js)，从真实官方视频页发现并保存哈希；只静态读取，未执行/复制脚本。原文与来源元数据位于仓库外，由`w05-comments-primary-latest.json`定位。没有使用第三方客户端身份、App key或签名秘密。

| 项目 | 官方网页当前路由/必要字段 | 本项目约束 |
| --- | --- | --- |
| 本人稿件状态 | GET `/x/web-interface/archive/relation`，aid；data.like/coin | coin是本人累计数，不使用视频全站投币统计 |
| 收藏夹状态 | GET `/x/v3/fav/folder/created/list-all`，type=2/rid=aid/up_mid=本人UID；list.fav_state | 指定现有夹，完整有界集合才可提交 |
| 点赞 | POST `/x/web-interface/archive/like`，aid/like=1或2 | 明确方向，单次确认、回读 |
| 收藏 | POST `/x/v3/fav/resource/deal`，rid/type=2/add_media_ids或del_media_ids | 仅一个明确选定夹；不使用0默认夹替代用户选择 |
| 稍后再看 | POST `/x/v2/history/toview/add`或`del`，aid | GET `/x/v2/history/toview`完整成员核对；匿名真实GET HTTP200/API-101只证明需登录，不证明本人列表字段/TV成功 |
| UP状态/关注 | GET `/x/relation?fid=UP`；POST `/x/relation/modify`，fid/act/re_src=14 | 官方attribute=1为悄悄关注，取消用act4；普通/互关取消act2；关注act1，不做拉黑/分组等操作 |
| 投币 | POST `/x/web-interface/coin/add`，aid/multiply=1或2/select_like=0 | 单独数量预览；官方网页copyright1/3上限2，其余1；仍受本人已有投币/余额/源端校验限制 |
| 官方三连 | POST `/x/web-interface/archive/like/triple`，aid；返回like/coin/fav/multiply | 未给调用者数量/目标夹合同；本项目改用用户明确的三项组合，见ADR-062，不调用此端点 |

所有写接口CSRF均从本人的保护会话取出，先以Nav核对实际UID，不在源码嵌入或记录。官方网页使用的其余埋点/风控字段不伪造；若真实接口要求额外校验，明确失败/未知，不绕过限制。

主机匿名BV详情读取当前未获得可用响应；Python默认信任库首次TLS未通过，改用项目已固定CA后，匿名稍后再看获HTTP200/API-101，详情仍HTTP错误。仅诊断此主机读取，不用它推断电视/账号接口成功；两次记录仓库外`w05-interactions-primary-read*.json`，无Cookie/POST。真实字段兼容性与具体操作验收仍OPEN。
