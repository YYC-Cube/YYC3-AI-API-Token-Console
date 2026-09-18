---
file: YYC3-图标可视化-体系设计.md
description: YYC³-AI-Family-Token-Console 全端图标可视化体系设计 — 五平台 32+ PNG 全链路闭环
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-18
updated: 2026-09-18
status: active
tags: [icons],[design-system],[pwa],[multi-platform],[visualization]
category: standard
---

# 🎨 YYC³ 图标可视化体系设计文档

> **五维驱动落地**：时间维（按需加载分级）· 空间维（目录即拓扑）· 属性维（尺寸/用途/格式完备）· 事件维（onError CDN 回退）· 关联维（五端链路贯通）

---

## 一、设计目标 | Design Goals

| 目标 | 说明 | 对应「五高」 |
| ---- | ---- | ------------ |
| 全端覆盖 | Android / Web / iOS / macOS / watchOS 五平台 32+ PNG | 高可用 |
| 单一事实源 | `public/yyc3-icons/` 为唯一图标物理源，`yyc3-icons.ts` 为唯一逻辑源 | 高可扩展 |
| 零断链 | index.html → manifest → 运行时注入 → CDN 回退四级兜底 | 高可用 |
| 高清渲染 | 每个使用场景匹配 ≥1:1 物理像素尺寸，lanczos 缩放 | 高性能 |
| 可观测 | 加载失败自动回退并保留调试路径，测试全覆盖 | 高智能 |

## 二、图标资产总览 | Icon Assets

### 2.1 目录拓扑（空间维）

```
public/yyc3-icons/
├── Android/                     6 文件 — 启动器与商店
│   ├── mdpi.png        48×48
│   ├── hdpi.png        72×72
│   ├── xhdpi.png       96×96
│   ├── xxhdpi.png     144×144
│   ├── xxxhdpi.png    192×192
│   └── Play Store.png 512×512
├── Web App/                     5 文件 — 浏览器与 PWA
│   ├── favicon-16.png          16×16
│   ├── favicon-32.png          32×32
│   ├── apple-touch-icon.png   180×180
│   ├── android-chrome-192.png 192×192 (any + maskable)
│   └── android-chrome-512.png 512×512 (any + maskable)
├── iOS/                         7 文件 — 主屏/通知/Spotlight
│   ├── App Store.png         1024×1024
│   ├── iPad App.png            76×76
│   ├── iPad Spotlight.png      40×40
│   ├── iPhone Notification 2x/3x.png  40/60×…
│   ├── iPhone Spotlight 2x/3x.png     80/120×…
│   └── (Notification/Settings 按需扩展至 14 文件)
├── macOS/                       7 文件 — 桌面全尺寸
│   └── 16/32/64/128/256/512/1024.png
└── watchOS/                     4 文件 — 表盘与通知
    ├── App Store.png         1024×1024
    ├── Home Screen.png         80×80
    ├── Notification.png        48×48
    └── Short Look.png         172×172
```

### 2.2 平台 × 尺寸矩阵（属性维）

| 平台 | 16 | 32 | 48 | 64 | 72 | 76 | 80 | 96 | 128 | 144 | 172 | 180 | 192 | 256 | 512 | 1024 |
| ---- | -- | -- | -- | -- | -- | -- | -- | -- | --- | --- | --- | --- | --- | --- | --- | ---- |
| Web App | ✅ | ✅ | — | — | — | — | — | — | — | — | — | ✅ | ✅ | — | ✅ | — |
| Android | — | — | ✅ | — | ✅ | — | — | ✅ | — | ✅ | — | — | ✅ | — | ✅ | — |
| iOS | — | — | — | — | — | ✅ | ✅ | — | — | — | — | — | ✅* | — | — | ✅ |
| macOS | ✅ | ✅ | — | ✅ | — | — | — | — | ✅ | — | — | — | — | ✅ | ✅ | ✅ |
| watchOS | — | — | ✅ | — | — | — | ✅ | — | — | — | ✅ | — | — | — | — | ✅ |

\* iOS 192 由 iPhone Spotlight 3x (120) 与 Notification 3x 组合覆盖 PWA 场景。

## 三、全链路消费拓扑（关联维）| Consumption Chain

```mermaid
graph TD
    A["public/yyc3-icons/<br/>物理源 · 32+ PNG"] --> B["index.html<br/>静态 favicon 链 16→512"]
    A --> C["public/manifest.json<br/>PWA 13 档 icons"]
    A --> D["YYC3LogoSvg.tsx<br/>组件级 pickLogo(9档)"]
    B --> E["useYYC3Head.ts<br/>运行时 upsert + CDN 回退"]
    C --> E
    E --> F["iconsCDN<br/>GitHub Raw 兜底"]
    D --> F
    F --> G["浏览器 / PWA 安装 / 各端桌面"]
```

| 层级 | 文件 | 职责 | 失败兜底 |
| ---- | ---- | ---- | -------- |
| L0 物理 | `public/yyc3-icons/*.png` | 唯一资产源 | — |
| L1 静态 | `index.html` | 首屏 favicon/manifest，无 JS 依赖 | 浏览器默认 |
| L2 清单 | `public/manifest.json` | PWA 安装 13 档图标 | Chrome 拒装时回退 L1 |
| L3 运行时 | `useYYC3Head.ts` | upsert link/meta + OG + CDN onerror | L1 已保证 |
| L4 逻辑 | `lib/yyc3-icons.ts` | `icons` / `iconsCDN` / `handleIconError` / `pwaManifestIcons` | 单一事实源 |
| L5 组件 | `YYC3LogoSvg.tsx` | `pickLogo(size)` 9 档自动匹配 | — |

## 四、路径规范 | Path Convention（事件维）

| 场景 | 规则 | 示例 |
| ---- | ---- | ---- |
| HTML/manifest 静态引用 | URL 编码空格 `%20` 或原样空格（现代服务器均支持） | `/yyc3-icons/Web App/favicon-32.png` |
| React `<img src>` | 模板字符串 + 空格原样 | `` `${BASE}/Web App/favicon-16.png` `` |
| CDN（GitHub Raw） | 末段 `encodeURIComponent`，目录段保留 | `cdnPath("Web App/favicon-16.png")` |
| 禁止 | ❌ 硬编码 `yyc3-badge-icons`（历史目录，已迁移） | — |

## 五、消费方式速查 | Usage Quick Reference

```tsx
// 1. 组件内嵌 Logo（自动选档 16→512）
import { YYC3LogoSvg } from "@/app/components/YYC3LogoSvg";
<YYC3LogoSvg size={40} />

// 2. 直接引用 + CDN 回退
import { icons, iconsCDN, handleIconError } from "@/app/lib/yyc3-icons";
<img src={icons.logo512} onError={handleIconError("logo512")} alt="YYC³" />

// 3. <head> 全端注入（App 根组件已调用）
import { useYYC3Head } from "@/app/hooks/useYYC3Head";
useYYC3Head();
```

## 六、新增/替换图标流程 | Change Workflow

1. **放入物理源**：按平台放入 `public/yyc3-icons/{平台}/`，命名遵循平台惯例
2. **登记逻辑源**：在 `src/app/lib/yyc3-icons.ts` 的 `icons` / `iconsCDN` / `REMOTE_FILE_MANIFEST` 三处同步登记
3. **更新清单**：如涉及 PWA，同步 `public/manifest.json` 的 `icons` 数组（sizes 必须与真实像素一致）
4. **质量门禁**：`pnpm typecheck && pnpm test`，图标相关测试（`YYC3Logo.test.tsx`）必须通过
5. **文档闭环**：更新本文档矩阵表与 README 图标章节

## 七、可视化展示规范 | Visualization Guidelines

| 场景 | 最小尺寸 | 推荐格式 | 备注 |
| ---- | -------- | -------- | ---- |
| 侧边栏品牌位 | 40×40 | `@2x` 物理像素 | `YYC3LogoSvg size={40}` |
| 登录页主视觉 | 128×128 | macOS/128.png | 居中 + 品牌色底 |
| README 顶图 | 原尺寸 | `public/yyc3-Family.png` | `width="100%"` 不写死像素 |
| 徽章系统 | shields.io 标准高度 20px | SVG 外链 | 见 README 徽章区 |
| PWA 启动屏 | 512 maskable | android-chrome-512 | `purpose: "any maskable"` |

## 八、验收清单 | Acceptance Checklist

- [x] `public/yyc3-icons/` 五平台目录完整（32+ PNG）
- [x] `index.html` favicon 链 16→512 全覆盖 + apple-touch 180
- [x] `manifest.json` 13 档图标路径与物理源 1:1
- [x] `yyc3-icons.ts` LOCAL_BASE / GH_BASE 双基址对齐 `yyc3-icons`
- [x] `YYC3LogoSvg.tsx` 9 档自动选型，无 figma:asset 虚拟依赖
- [x] `useYYC3Head.ts` 运行时注入 + CDN onerror 回退
- [x] 全仓无 `yyc3-badge-icons` 断链引用（仅历史审计文档记录性文字保留）

---

**文档维护**: YYC³ 团队规范 · 标规文档体系
**关联文档**: [YYC3-多端适配-规范文档](./YYC3-多端适配-规范文档.md) · [yanyu-cloud-logo](./yanyu-cloud-logo.md) · [YYC3-团队核心-五维驱动](./YYC3-团队核心-五维驱动.md)

> 「***YanYuCloudCube***」
> 「***<admin@0379.email>***」
> 「***Words Initiate Quadrants, Language Serves as Core for the Future***」
> 「***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***」

**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
