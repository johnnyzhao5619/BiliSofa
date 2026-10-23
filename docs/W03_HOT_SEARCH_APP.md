# W03 热搜交付与验收记录

2026-10-18，W03/F03，ADR-038；内部BiliSofa01.TV 0.9.0。0.8.0本地历史人工组已全部通过并归档；首搜412与两次手动恢复另记，不声称已修复。

## 行为

“热搜”打开匿名公开十词快照，六词一组，两列方向导航，边界停留，Back回入口。显示名与实际查询词分别处理，选词才关闭模态并进入已有视频搜索；尊重当前身份的历史关闭状态。刷新清旧列表，HTTP/API/格式错误保留明确状态和手动刷新，不自动请求；空列表保留返回。无播放、账号或云端写操作。

平台边界见[ADR-038](adr/038-public-hot-search.md)：独立固定端点热搜Worker/C，TLS/CA/凭据范围保持，64KiB体/16KiB头、4秒连接/8秒总期限、最多10项；无外部脚本/常驻电脑，无新增权限或依赖。包中原四类16项native不应改变。首搜412、真实范围超时恢复、完整W03/F03仍未解决或未验收。

## 证据

HOST一次真实匿名GET：HTTP200/API0、4828bytes，直接用生产parseHotSearchBody解析出10个热词；未打印/保存热词、原始JSON、跟踪或Cookie。来源为[官方主机响应](https://s.search.bilibili.com/main/hotword)，不是社区文档复制。此项不等于TV网络通过。

新增4项单元/合同覆盖字段白名单、有限排序/关键词/显示名、重复/超大拒绝、忽略目标/跟踪及错误真实分类。新增7项HOST TLS原生检查覆盖固定Host/path/referer、无Cookie/Authorization/Range、不跟随redirect、错误CA、体/头/整数溢出预算及非法参数不进网络。Samsung实际链接与静态路径/CA/无eval扫描另附构建结果。

新增6项浏览器使用生产Worker/解析器/父适配器与合成C：入口按需读取、两组/第一列焦点/Back、外部markup惰性显示、用keyword而非label查询、历史开关复用、HTTP/API/格式/空态与显式刷新、Back/Home取消与晚到丢弃。首次Home场景断言期望“管理账号”不符既有shell按入口保存返回锚点的行为；实际应回“热搜”，修正测试期待，生产焦点恢复未改。首次原生链接缺stdlib声明已补显式include后重新链接，未放宽编译或TLS门禁。最终总数/工件见后续配对。

## 唯一新增真机组（待侧载）

打开“热搜”，核对热词可见与方向焦点；下一组、上一组，再Back应回入口。重新进入，只选一个词，核对进入对应视频搜索并显示结果或完整search.…/API错误；若失败直接反馈，不重试、不播放。无需重做历史清空、扫码、投屏、Home或长播。未反馈项保持UNVERIFIED；完整UP/PGC/live搜索及W03其他功能继续开放。

最终本地门禁：375单元/合同、135模块strict/边界、62浏览器流程（16搜索含6热搜、4目录、10本地、6投屏、10身份、16媒体）及7项新增HOST TLS原生检查通过；重复运行不重复计数。新增热搜Worker对不一致status/rc也返回闭合invalid_response，补入同一错误场景；仅该Worker变更后搜索16项再跑通过，其余应用/原native未改。截图已核对两列六词完整可见，标签仅惰性文字。9个包负例执行结果另附。

最终未签名包`dist/BiliSofa-W03-hot-search-unsigned.wgt` SHA256 `4b3c81070422e9caa9b9dbefe41a74fd3a1dc581cc3b5b9ad27a5e4d195f75f2`，UI sourceHash `c9e80b3413dc0c24d6bd20bbc05f338761f9ca0d0b98706294a26cc20d74bfa7`。与私密0.8.0逐字节比较identity/native/catalog/search共16个原生条目全数保持，新hot-search单独Samsung实际链接。没有重编译旧模块/新工具安装/账号写入/远程CI/提交/推送/公开发布。签名、侧载和USER观察另附，当前不能宣称TV热搜通过。


0.9.0实际部署：UTC2026-10-18T20:37:43.314407+00:00开始，state/capability/install/launch均exit0且平台明确成功；signed SHA256 `ec2911a90ec65380db16f95ea9ddc7ae6b8d2ab2a769c98973cd453ad2bc0cd2`，455文件源ZIP SHA256 `7cefe4099c26dcc2ba8dfc2d43fec8a32dc0112e3e5c746ab38a7a35aa7ab837`。沿用自有Author/Public Distributor，无新权限/证书/SDK变更；旧0.8.0工件及最终USER记录保持。9项包负例最终全部通过。仅安装/启动证据，新热搜功能USER仍UNVERIFIED，只安排一次显示/方向翻组/Back/选词组，不重测历史或媒体。


0.9.0 USER反馈：热搜显示、方向/翻组、Back“貌似没有问题”，保留为暂未见异常，非严格逐项全PASS；选词后的既有搜索有时search.http_412、有时search.invalid_response。完整热词→搜索链路仍部分通过。停止重复热搜/历史人工组，转本地解析与HTTP分类核查；两条失败不能混为同一原因。
