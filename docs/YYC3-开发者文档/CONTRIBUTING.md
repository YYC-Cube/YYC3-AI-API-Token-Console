---
file: CONTRIBUTING.md
description: YYC3-AI-API-Token-Console 贡献指南 — 快速通道 · 分支模型 · 提交规范 · 门禁清单
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-18
updated: 2026-09-18
status: stable
tags: [contributing],[workflow],[quality-gates],[community]
category: guide
language: zh-CN
audience: developers
complexity: basic
---

<div align="center">

# 贡献指南 | Contributing Guide

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

</div>

> 感谢您对 YANYUCLOUDCUBE 开源生态的关注！本指南帮助您快速完成第一次贡献。
> Thanks for your interest in contributing to YANYUCLOUDCUBE! This guide gets your first PR merged fast.

---

## 1. 快速通道 | Fast Path

```bash
# 1. Fork & Clone
git clone https://github.com/YYC-Cube/YYC3-AI-API-Token-Console.git
cd YYC3-AI-API-Token-Console

# 2. 开发环境（Node 22+ / pnpm 11+）
pnpm install

# 3. 分支 & 开发
git checkout -b feat/your-topic

# 4. 本地门禁（与 CI 同款 same gates as CI）
pnpm typecheck && pnpm test

# 5. 提交并推送（Conventional Commits）
git commit -m "feat(monitor): add token usage sparkline to dashboard"
git push origin feat/your-topic
# 6. 在 GitHub 上开 PR，按模板勾选标签与检查单
```

---

## 2. 环境要求 | Prerequisites

| 依赖 Dependency | 版本 Version | 必需 Required |
|-----------------|-------------|:---:|
| Node.js | 22+ | ✅ |
| pnpm | 11+ | ✅ |
| Git | 2.40+ | ✅ |
| gitleaks（本地可选） | latest | ⬜（密钥预扫描 local secret pre-scan） |
| pre-commit（推荐） | 3.x | ⬜（三闸钩子 three-gate hooks） |

**开发服务器端口 Dev port**: `3030`（`pnpm dev`）— 遵循团队端口纪律「3030 起」。

---

## 3. 分支模型 | Branching Model

```
main (protected)      ←─ 发布与集成分支 release & integration
 ├── feat/*           功能开发 features
 ├── fix/*            缺陷修复 bug fixes
 ├── docs/*           文档 documentation
 ├── perf/*           性能 performance
 ├── ci/*             流水线 pipeline
 └── refactor/*       重构 refactoring
```

- `main` 受分支保护（必需检查 + 审批），禁止 force-push。
  `main` is protected (required checks + approvals); force-push disabled.
- 功能分支生命周期 ≤ 2 周，过期请 rebase onto `main`。
  Feature branches live ≤ 2 weeks; rebase onto `main` when stale.

---

## 4. 提交规范 | Commit Convention

遵循 **Conventional Commits**：

```text
<type>(<scope>): <subject>

<body 可选 optional>
<footer 可选 optional>   # e.g. BREAKING CHANGE: migration note / Closes #123
```

| type | 用途 Usage | 对应标签 Label |
|------|-----------|----------------|
| `feat` | 新功能 new feature | `feature` |
| `fix` | 缺陷修复 bug fix | `bug` |
| `docs` | 文档 documentation | `documentation` |
| `perf` | 性能 performance | `performance` |
| `refactor` | 重构（不改行为）refactor w/o behavior change | `enhancement` |
| `test` | 测试 tests | — |
| `ci` | 流水线 pipeline | `ci` |
| `chore` | 杂项 chores | — |

**scope 建议 suggested scopes**: 六域模块（`monitor`/`ops`/`ai`/`family`/`devstd`/`admin`）、`infra`、`icons`、`docs`。

---

## 5. 标签使用 | Labels

提交 Issue / PR 时请按 [`LABELS.md`](./LABELS.md) 选择标签：
**1 类型 + 1 模块 + 1 优先级**（Issue），**1 类型 + 1 模块**（PR）。
Pick labels per [`LABELS.md`](./LABELS.md): type + module + priority for Issues; type + module for PRs.

---

## 6. PR 检查单 | PR Checklist

- [ ] 分支基于最新 `main`，提交符合 Conventional Commits
- [ ] `pnpm typecheck && pnpm lint && pnpm test:unit` 本地通过（coverage ≥ 基线门槛，月度爬坡见 [CICD.md](./CICD.md)）
- [ ] `pnpm build && pnpm astgrep && pnpm size:check` 通过（架构守护三件套）
- [ ] PR 标题、描述完整，已选类型/模块标签
- [ ] 无硬编码密钥/凭证（gitleaks 闸强制拦截）；敏感配置走 `${ENV_VAR}`
- [ ] 涉及文档时同步更新（双语：中文在上，英文在下）
- [ ] 新增代码有对应测试；修复附回归用例（参考 `rf00*` 命名）
- [ ] 大型变更（>500 行）已开 Issue 先行对齐设计

> CI 全绿后 @ 维护者 review；批准后 squash merge。
> After green CI, request review; maintainer squash-merges after approval.

---

## 7. 测试规范 | Testing Standards

| 维度 Dimension | 要求 Requirement |
|----------------|------------------|
| 组件测试 | `.test.tsx` → jsdom（unit-dom 项目），交互行为 + 渲染断言 |
| 纯函数测试 | `.test.ts` → node（unit-node 项目），lib/ 层 100% 单元覆盖 |
| 集成测试 | `.integration.test.ts`（integration 项目），`YYC3_TEST_INTEGRATION=1` 显式开启，不入 CI 默认档 |
| 回归用例 | 缺陷修复以 `rf{编号}-{主题}.test.ts` 命名（如 `rf001-ws-url-unification`） |
| 可达性 | UI 变更需通过 `a11y-audit.test.tsx`（axe-core） |
| i18n | 新增文案需同步 zh-CN / en-US 双语言包并通过 `i18n-consistency.test.ts` |
| 覆盖率 | 基线锁定策略：lines ≥ 38 / functions ≥ 31 / branches ≥ 36 / statements ≥ 36，月度 +2% 爬坡（见 [CICD.md](./CICD.md)） |

---

## 8. 文档贡献规范 | Documentation Standards

1. **双语对照**：中文段落在上，English 在下；代码块/图表/标签名保持英文。
   Bilingual: Chinese first, English second; code/diagrams/labels in English.
2. **frontmatter**：新增 md 文档需带 YAML 元数据（file/description/author/version/created/updated/status/tags/category），遵循《YYC3-团队规范-开发标准》（`docs/YYC3-AI-Family-团队规范/标规文档/`，本地参考，不入远程库）。
3. **Mermaid 图**：节点 ≤ 15 个；配色遵循 `#dfd/#0a0`（成功）与 `#fee/#c00`（失败）令牌；提交前 `python scripts/check_mermaid.py` 校验代码块闭合。
4. **品牌页脚**：每篇收尾 `**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司`。

---

## 9. 行为准则 | Code of Conduct

参与本项目即表示您同意 [贡献者公约](./CODE_OF_CONDUCT.md)。违例举报：<admin@yanyucloud.com>。
By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md). Report violations: <admin@yanyucloud.com>.

---

<div align="center">

**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司 · Yanyu Intelligent Technology Co., Ltd.

</div>
