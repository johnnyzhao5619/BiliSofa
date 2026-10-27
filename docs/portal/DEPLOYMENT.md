# BiliSofa 门户发布记录

更新：2026-10-27。门户源文件为 `docs/index.html`，样式位于 `docs/portal/`；界面图片来自标明合成数据的历史截图。用户随后要求不使用 `lunarca.app`，原有 BiliSofa 独立路由已撤回，仓库 README 保留可访问的 GitHub 项目介绍和安装入口，GitHub 仓库 Homepage 暂时清空。项目只公开 0.66.0 预览版 WGT，门户不修改软件包或签名。

## 当前状态与历史发布结构

2026-10-27 后续：GitHub 用户级 Pages 仍绑定 `lunarca.app`，GitHub 原生项目地址仍重定向到该域名。撤掉服务器路由后目标返回 404，当前不能宣称独立门户已通过该地址公开访问。是否移除用户级 Pages 自定义域名须由用户决定；该操作会影响 GitHub 个人主页及所有继承此配置的项目。现有 `lunarca.app` 生产站点及 DNS 不受此决定直接修改。以下保留此前发布、回滚及核对记录。

GitHub Pages 来源为 `main` 分支的 `/docs`，`docs/.nojekyll` 使静态资源按原样发布。账号用户级 Pages 站点设有 `lunarca.app` 自定义域名，所以 GitHub 将 `https://johnnyzhao5619.github.io/BiliSofa/` 自动重定向到该域名路径。[GitHub 域名规则](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)

用户已明确授权配置现有站点的 `/BiliSofa/` 路径。此前生产入口的 Caddy `portal.caddy` 为该路径增加过受限反向代理，转发到 GitHub Pages 的 `johnnyzhao5619.github.io`，并以 `lunarca.app` 为上游 Host；上游 HTTPS 使用 `johnnyzhao5619.github.io` 进行正常证书验证。门户源仍由 GitHub Pages 构建和提供，提交更新后须等待 Pages 构建及缓存更新。若以后移除账号级 Pages 域名，需重新核对上游 Host 和路由。

原代理只允许首页、三份门户样式及三张已列明的界面截图，其他 `/BiliSofa/` 请求返回 404。门户响应附带 CSP、nosniff、拒绝嵌入、权限和缓存头；不加载远程字体、脚本或分析工具。`Cookie`、`Authorization`、`Referer` 与反向代理转发地址头在上游请求中删除。其他 Lunarca 路径仍转发至原 `lunarca-website:8080`；`www` 重定向、API、现有 HTTPS 证书、DNS 和 Lunarca 发布目录未更改。历史代理配置保存在 [lunarca-route.caddy](lunarca-route.caddy)，当前没有启用。

## 回滚结果与历史备份

已核对现有规则及原备份 SHA-256，在生产容器预校验完整配置，通过原子替换恢复原规则，随后再次验证并 reload。恢复后 `portal.caddy` 摘要与原规则一致；原 Lunarca 首页、`release.json` 与操作前逐字节一致，API 返回 200，原 BiliSofa 路径返回 404。恢复前的 BiliSofa 规则另存为 `~/lunarca-server/tls/backups/portal.removed-bilisofa-a49977d1.caddy.bak`。没有修改 Lunarca 的 DNS、发布目录或其他站点规则。

以下为原发布时的规则与备份信息：

- 生产代理：`lunarca-caddy-1`；站点规则：`~/lunarca-server/tls/sites/portal.caddy`，由现有主 Caddyfile 的站点导入加载。
- 切换前站点规则 SHA-256：`bfd54c4cc09d100ea062946db08ac633281cbf33a07478b1095b1b4c9868d433`。
- 新站点规则 SHA-256：`a49977d1412431515324ff4749bdf70a4bbbe04c8bab7141edddc3f71e5e34f4`。
- 原规则备份：`~/lunarca-server/tls/backups/portal.before-bilisofa-a49977d1.caddy.bak`；恢复时先在临时配置中验证完整主配置，确认线上规则未被其他操作改变，再恢复原规则、验证并 reload 代理。恢复会撤销 BiliSofa 路由，保留 Lunarca 原站点。不要覆盖其他站点配置或重启 / 删除 API 服务。
- 样式或页面修改需提交到本仓库并等待 GitHub Pages 构建；新增门户静态文件时必须同步更新 Caddy 的允许路径，否则该文件返回 404。未来通过其他脚本更新 `portal.caddy` 时要保留或明确撤销此路由。

## 原发布时的核对

上线前在生产容器使用临时完整配置执行 `caddy validate`，检查现有规则与主配置摘要；保存原规则后原子替换，重新验证并 reload。上线后普通 HTTPS 与 GitHub Pages 默认网址的重定向均返回 200，首页、三份 CSS 和三张图片的内容与本地文件逐字节一致；未允许文件返回 404。Lunarca 中 / 英 / 法首页及 `release.json` 与切换前逐字节一致，`api.lunarca.app/healthz` 返回 200。桌面 / 手机布局由 Hallmark render 检查。

门户截图是历史合成界面，不是 0.66.0 实机验收。图形安装路径、电视安装 / 播放与全设备兼容仍未验收。未修改或提交本地未接受的 logo 草稿。
