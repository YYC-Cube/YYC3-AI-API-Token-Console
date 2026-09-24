---
file: YYC3-PWA浏览器人工验证清单.md
description: token.yyc3.vip PWA 安装链路人工验证清单 - 2026-09-24
author: AI Tutor <claude>
version: v1.0.0
created: 2026-09-24
updated: 2026-09-24
status: active
tags: [pwa],[verification],[manual-testing]
category: checklist
---

# 📱 PWA 浏览器人工验证清单

> **线上地址**: <https://token.yyc3.vip>
> **前置状态**: HTTP 层已全通过（首页/manifest/图标 200 + 深链 404 回退已修复，见衔接报告 §6.3-4）
> **执行方式**: 逐项人工勾选，结果记录至本文档表格
> **关联代码**: [manifest.json](../public/manifest.json) · [useInstallPrompt.ts](../src/app/hooks/useInstallPrompt.ts) · [PWAInstallPrompt.tsx](../src/app/components/PWAInstallPrompt.tsx) · [useOfflineMode.ts](../src/app/hooks/useOfflineMode.ts)

## ⚠️ 执行前必读：已知限制

| 项目 | 状态 | 影响 |
| ---- | ---- | ---- |
| Service Worker (sw.js) | ❌ **未注册**（GAP-006） | **离线回退/离线缓存预期不可用**，相关项标记为「预期失败」而非缺陷 |
| beforeinstallprompt | 仅 Chrome/Edge 触发 | iOS Safari 无此事件，走「手动添加到主屏」路径 |
| 安装提示 dismissed 状态 | localStorage `pwa_install_dismissed` | 测试前需清空该 key 以复现提示 |

## 一、桌面 Chrome / Edge（Windows / macOS）

### 1.1 安装链路

| # | 步骤 | 预期结果 | 结果 | 备注 |
| --- | ---- | -------- | ---- | ---- |
| 1.1.1 | 访问 `https://token.yyc3.vip`，打开 DevTools → Application → Manifest | Manifest 正确解析，无错误；name="YYC³ 本地多端推理矩阵数据库 · 数据看盘"，display=standalone | ⬜ | |
| 1.1.2 | DevTools → Application → Manifest → Icons | 192px 与 512px 图标均加载成功（android-chrome-192/512） | ⬜ | |
| 1.1.3 | DevTools → Application → Service Workers | 显示「无 SW 注册」（GAP-006 预期） | ⬜ | |
| 1.1.4 | 等待页面加载完成，观察地址栏右侧 | 出现「安装」图标（⊙+）；页面内 PWAInstallPrompt 组件出现引导条 | ⬜ | 若无：检查 beforeinstallprompt 是否被 preventDefault 后正确捕获 |
| 1.1.5 | 点击地址栏安装图标 → 确认安装 | 弹出独立窗口安装确认框；窗口标题/图标正确 | ⬜ | |
| 1.1.6 | 安装后检查 | 应用以独立窗口启动（无地址栏）；任务栏/启动台出现 YYC³ Matrix 图标 | ⬜ | |
| 1.1.7 | 独立窗口内导航 | 深链（如 `/settings`）正常路由，刷新不 404 | ⬜ | |

### 1.2 提示交互

| # | 步骤 | 预期结果 | 结果 | 备注 |
| --- | ---- | -------- | ---- | ---- |
| 1.2.1 | 点击 PWAInstallPrompt 的「关闭/忽略」 | 提示消失；localStorage 写入 `pwa_install_dismissed=true` | ⬜ | |
| 1.2.2 | 刷新页面 | 提示不再出现（dismissed 生效） | ⬜ | |
| 1.2.3 | 控制台执行 `localStorage.removeItem("pwa_install_dismissed")` 后刷新 | 提示恢复出现 | ⬜ | |

## 二、iOS Safari（iPhone / iPad）

| # | 步骤 | 预期结果 | 结果 | 备注 |
| --- | ---- | -------- | ---- | ---- |
| 2.1 | Safari 访问首页 | 页面正常渲染；无 JS 报错 | ⬜ | |
| 2.2 | 分享按钮 → 「添加到主屏幕」 | 预览页显示正确名称「YYC³ Matrix」与 180px apple-touch-icon | ⬜ | |
| 2.3 | 确认添加 | 主屏出现图标（无白边；`purpose: any maskable` 图标适配） | ⬜ | |
| 2.4 | 从主屏启动 | 全屏 standalone 运行（无 Safari 浏览器栏）；状态栏配色 #060e1f | ⬜ | |
| 2.5 | 主屏应用内深链导航 + 刷新 | 正常路由；刷新命中 `/404.html` 回退而非 Safari 默认 404 | ⬜ | 深链回退修复的移动端复验 |
| 2.6 | 横竖屏切换 | orientation=any，布局自适应无异常 | ⬜ | |
| 2.7 | iOS「离线」场景 | **预期失败**：无 SW，断网后重新打开显示 Safari 离线页 | ⬜ | GAP-006 已知，不记为缺陷 |

## 三、Android Chrome

| # | 步骤 | 预期结果 | 结果 | 备注 |
| --- | ---- | -------- | ---- | ---- |
| 3.1 | Chrome 访问首页，等待数秒 | 底部弹出「添加到主屏幕」信息条（beforeinstallprompt 触发） | ⬜ | |
| 3.2 | 页面内 PWAInstallPrompt 点击「安装」 | `promptInstall()` 调用原生安装对话框；接受后 `outcome=accepted` | ⬜ | |
| 3.3 | 确认安装 | 桌面出现图标；maskable 图标无裁切变形 | ⬜ | |
| 3.4 | 从图标启动 | standalone 全屏；启动画面背景 #060e1f + 应用名 | ⬜ | |
| 3.5 | 设置 → 应用列表 | YYC³ Matrix 出现在应用列表（WebAPK 安装成功） | ⬜ | |

## 四、离线与降级行为（全平台）

> **前提声明**：GAP-006 未修复前，本节全部为「预期失败」基线记录，用于 SW 落地后的对照。

| # | 步骤 | 当前预期 | 结果 | 备注 |
| --- | ---- | -------- | ---- | ---- |
| 4.1 | 联网加载页面后 DevTools → Network → Offline → 刷新 | 失败（无 SW 缓存） | ⬜ | 基线记录 |
| 4.2 | 系统断网，观察页内 OfflineIndicator | `navigator.onLine=false` → 显示离线徽标（useOfflineMode 生效） | ⬜ | UI 层降级可用 |
| 4.3 | 恢复联网 | online 事件触发，徽标消失 | ⬜ | |
| 4.4 | （SW 落地后重测）断网刷新 | 命中 SW 缓存返回壳页面 | ⬜ | 待 GAP-006 修复 |

## 五、验收判定

| 结论 | 条件 |
| ---- | ---- |
| ✅ 通过 | §一/§二/§三 安装链路全部通过；§四 仅 4.1/4.4 失败（GAP-006 已知） |
| ⚠️ 有条件通过 | 安装链路主路径通过，仅提示交互小项失败（记录缺陷，不阻塞） |
| ❌ 需整改 | 任一平台安装失败 / standalone 启动失败 / 图标异常 |

## 六、缺陷记录

| 发现时间 | 平台 | 项目# | 现象 | 严重度 | 状态 |
| -------- | ---- | ----- | ---- | ------ | ---- |
| | | | | | |

## 七、验证完成记录

| 字段 | 值 |
| ---- | -- |
| 验证人 | |
| 验证日期 | |
| Chrome 版本 | |
| iOS 版本 | |
| Android 版本 | |
| 总体结论 | ⬜ 通过 / ⬜ 有条件通过 / ⬜ 需整改 |

---

> **后续衔接**: 验证完成后将结论同步至[全量落地实施总结与衔接报告 §6.2](./YYC3-全量落地实施总结与衔接报告.md)（PWA 链路验证行）与 §6.3-4。GAP-006（sw.js 未注册）若需修复，建议引入 `vite-plugin-pwa`（Workbox 预缓存 + 自动更新），触发条件见 §8.3。
