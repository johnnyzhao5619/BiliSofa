# BiliSofa 门户发布记录

更新：2026-10-27。门户源文件为 `docs/index.html`，样式位于 `docs/portal/`，界面图片来自仓库的历史合成截图。用户授权将门户放在 GitHub 项目主页；仓库 README 已展示截图和安装入口。

## 当前 GitHub Pages 状态

GitHub Pages 已启用，来源为 `main` 分支的 `/docs`，构建状态 `built`。源文件 `docs/.nojekyll` 用于按原样发布静态资源。该仓库只公开 0.66.0 预览版 WGT，门户不修改软件包或签名。

账号的用户级 Pages 站点 `johnnyzhao5619.github.io` 设置了自定义域名 `lunarca.app`。因此 GitHub 将 `https://johnnyzhao5619.github.io/BiliSofa/` 重定向至 `https://lunarca.app/BiliSofa/`；该域名当前由现有 Lunarca 生产服务器处理，目标路径返回 HTTP 404。GitHub 返回的项目 Pages 地址也指向该域名路径。

2026-10-27 检查：匿名公开访问随重定向返回 404；使用系统 curl 将同一域名临时解析到 GitHub Pages 服务地址，且保持 HTTPS 证书验证时，首页、样式、token、基础样式和示例截图均返回 200。这只证明 GitHub 发布源可用，不证明普通访问已修复。Lunarca 现有主页返回 200；没有修改其服务器、DNS、用户级 Pages 设置或证书。

GitHub 说明用户级自定义域名会成为项目 Pages 的默认域名，单个项目可用自己配置的域名覆盖：[GitHub Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)。后续方案需由用户决定，例如授权在现有站点增加独立路由，或提供可配置 DNS 的独立域名。原仓库 README 避免发布已知失效的网站链接；解决后再更新 README 与仓库 homepage，并验证普通匿名访问及资源。

## 证据范围

门户用本地 HTTP 服务、Chrome 与 Hallmark render 检查了桌面 / 手机断点；无 JavaScript 依赖。图形安装流程和 0.66.0 的电视安装 / 运行仍未获得实机验收。没有执行或声称应用测试、电视部署、全设备兼容、Lunarca 生产部署或 DNS 变更。未接受的 logo 草稿没有纳入本次提交。
