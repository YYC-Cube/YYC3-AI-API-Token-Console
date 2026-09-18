---
file: CICD.md
description: YYC3-AI-API-Token-Console CI/CD 流水线详解 — 四阶段门禁与发布触发
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-18
updated: 2026-09-18
status: stable
tags: [cicd],[github-actions],[quality-gates],[automation]
category: technical
language: zh-CN
audience: developers
complexity: intermediate
---

<div align="center">

# CI/CD 流水线详解 | CI/CD Pipeline Reference

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

</div>

> 版本 v1.1.0 · 2026-09-18 · 工作流源码 [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) · [`release.yml`](../../.github/workflows/release.yml) · [`pages.yml`](../../.github/workflows/pages.yml)

---

## 一、全景流程图 | End-to-End Flow

```mermaid
flowchart TD
  C0["📝 代码提交<br/>Commit / Push / PR / Tag v*"]
  C0 --> T0{"workflow 触发路由<br/>Trigger Router"}
  T0 -->|"push / pull_request"| TC1["🔍 Typecheck<br/>tsc --noEmit strict"]
  T0 -->|"tag v*.*.*"| RL1["📦 Release Build<br/>gates + vite build"]
  TC1 -->|fail| F1["❌ 告警<br/>dev@ / ops@yanyucloud.com"]
  TC1 -->|pass| T1["🧪 Unit Test<br/>vitest · coverage ≥ 80%"]
  T1 -->|fail| F1
  T1 -->|pass| S1["🛡️ Security Scan<br/>gitleaks 密钥扫描"]
  S1 -->|"secret hit"| F1
  S1 -->|pass| B1["📦 Build<br/>vite production build"]
  B1 --> ART["📤 Artifacts<br/>dist/ · coverage/ · test-results/"]
  RL1 -->|"final gates 全绿"| REL["🚀 GitHub Release<br/>tag + changelog + 制品"]
  ART --> E1["✅ Pipeline Complete"]
  REL --> E1
  style F1 fill:#fee,stroke:#c00
  style REL fill:#dfd,stroke:#0a0
  style E1 fill:#dfd,stroke:#0a0
```

---

## 二、工作流矩阵 | Workflow Matrix

| 工作流 Workflow | 触发 Trigger | Job 链 Chain | 备注 Notes |
| ----------------- | ------------- | -------------- | ----------- |
| `ci.yml` | push → main/develop；PR → main/develop | typecheck → lint → unit-test → security-scan → build | Lint 0-errors 门槛；Coverage 上报 Codecov；PR 覆盖率评论 |
| `release.yml` | tag `v*.*.*` | release-build → release-publish → release-notify | environment: production；软删除保护 |
| `pages.yml` | `ci.yml` 成功后自动（workflow_run）；手动 dispatch | build (VITE_BASE=/) → deploy | 部署 GitHub Pages → **<https://token.yyc3.vip**（CNAME> 随构建注入） |

**并发控制 Concurrency**: `ci-${{ github.ref }}` 组内取消旧运行（节省 Runner 配额，对标模版闭环规范）。

**权限最小化 Least privilege**: 默认 `contents: read`；release 发布 job 单独提升 `contents: write`。

---

## 三、门禁标准 | Gate Standards

| 阶段 Stage | 工具 Tooling | 命令 Command | 失败条件 Fail when |
| ------------ | ------------- | -------------- | -------------------- |
| 1. Typecheck | TypeScript 5 strict | `pnpm typecheck` | 任何 error（`tsc --noEmit`） |
| 1b. Lint | ESLint 9 flat config | `pnpm lint` | 任何 error（warnings 有 500 上限） |
| 2. Unit Test | Vitest 4 + V8 coverage | `pnpm test:ci` + `pnpm test:coverage` | 用例失败 或 lines/branches/statements < 80% / functions < 70% |
| 2b. Codecov | codecov-action@v5 | 上报 `coverage/lcov.info` | 上报失败不阻断（`fail_ci_if_error: false`） |
| 3. Security | gitleaks | `gitleaks/gitleaks-action@v2` | 命中任何密钥模式 |
| 4. Build | Vite 6 | `pnpm build` | 构建失败或产物缺失 |

> 覆盖率阈值定义于 [`vitest.config.ts`](../../vitest.config.ts) `coverage.thresholds`，本地与 CI 同源，确保「本地绿 = CI 绿」；Codecov 项目级 80% 目标（±2% 容差）见 [`codecov.yml`](../../codecov.yml)。
> Thresholds live in `vitest.config.ts` — same source locally and in CI: green locally means green in CI.

### 测试工作区双轨制 | Test Projects Dual-Track

```
dom 项目  → src/app/__tests__/**/*.test.tsx → jsdom + setup.ts（React 组件 / a11y / 集成）
node 项目 → src/app/__tests__/**/*.test.ts  → node 环境（lib 纯函数 / 类型审计 / i18n 一致性）
```

---

## 四、失败告警 | Failure Alerts

| 场景 Scenario | 通道 Channel |
| --------------- | ------------- |
| CI 任一 job 失败 | GitHub Actions 界面 + 可选 Email → <dev@yanyucloud.com> / <ops@yanyucloud.com> |
| Release 失败 | release-notify job → <admin@yanyucloud.com> |
| 密钥泄露命中 | gitleaks 直接阻断合并 + 安全审计复盘 |

> 可选接入 Slack/钉钉 Webhook：在 repo Secrets 配置 `WEBHOOK_URL` 后于 ci.yml notify job 启用。
> Optional Slack/DingTalk webhook: set `WEBHOOK_URL` secret and enable the notify job.

---

## 五、分支保护策略 | Branch Protection

**`main`**（推荐配置 recommended）:

- Require pull request + 1 approval
- Required checks: `Typecheck` / `Lint` / `Unit Test` / `Security Scan` / `Build`
- Dismiss stale approvals · require linear history · no force-push
- Restrictions: 仅维护者可推送 only maintainers push

**`develop`**: required checks 通过即可合并 mergeable when green

**Tags**: `v*` 模式仅维护者可创建 maintainer-only creation

---

## 六、制品存储与保留 | Artifacts & Retention

| 制品 Artifact | 位置 Location | 保留 Retention |
| --------------- | -------------- | ---------------- |
| 构建产物 dist/ | Actions artifact `build-output` | 7 天 days |
| 覆盖率 coverage/ | Actions artifact `coverage-report` + PR 评论 + **Codecov Dashboard** | 30 天 days |
| 测试结果 test-results/ (JUnit) | Actions artifact `test-results` | 30 天 days |
| 发布制品 | GitHub Releases | 永久 forever |
| Pages 站点 | token.yyc3.vip（github-pages environment） | 随最新 main 滚动更新 |

---

## 七、本地等价命令 | Local Equivalents

```bash
# 与 CI 完全同款（本地绿 = CI 绿）Same gates as CI
pnpm typecheck        # Gate 1 · TypeScript strict
pnpm lint             # Gate 1b · ESLint 0-errors
pnpm test             # Gate 2a · 单元测试
pnpm test:coverage    # Gate 2b · 覆盖率 ≥ 80%
pnpm build            # Gate 4 · 生产构建
# Gate 3 · gitleaks（本地可选）brew install gitleaks && gitleaks detect --no-banner
```

> 提交前建议安装 pre-commit 三闸（详见 [CONTRIBUTING.md](./CONTRIBUTING.md)）：
> `pre-commit install` — 基础卫生 + 密钥扫描 + Mermaid 代码块校验。
> Install pre-commit hooks for hygiene + secret scan + mermaid fence checks before committing.

---

## 八、GitHub Pages 自动部署 | Pages Auto-Deploy

> 工作流 [`pages.yml`](../../.github/workflows/pages.yml) · 线上站点 **<https://token.yyc3.vip>**

### 8.1 链路 | Chain

```mermaid
flowchart LR
  P["push → main"] --> CI["YYC³ CI<br/>五阶段全绿"] --> PG["pages.yml 触发<br/>workflow_run:completed"]
  PG --> B["vite build --base=/<br/>+ CNAME 注入 token.yyc3.vip"]
  B --> D["deploy-pages@v4<br/>github-pages environment"]
  D --> S["🌐 token.yyc3.vip<br/>HTTPS · CDN"]
```

### 8.2 关键配置 | Key Configs

| 配置项 | 值 | 说明 |
| ------ | -- | ---- |
| 触发方式 | `workflow_run`（CI 成功后）+ `workflow_dispatch` | 只有门禁全绿的 main 才会上线 |
| Base 路径 | `/`（`--base=/`） | 自定义域名根路径托管，非 `/<repo>/` 子路径 |
| CNAME | 构建时注入 `public/CNAME` → `token.yyc3.vip` | 无需手工维护文件，避免被本地误删 |
| 并发 | `group: pages`，`cancel-in-progress: false` | 部署排队执行，避免 Pages 状态竞态 |
| 环境 | `github-pages`，URL 绑定 `https://token.yyc3.vip` | Deployment 状态徽章实时可见 |

### 8.3 前置一次性设置 | One-time Setup

1. 仓库 **Settings → Pages → Source** 选择 **GitHub Actions**（本工作流已按此设计）
2. **Settings → Pages → Custom domain** 填入 `token.yyc3.vip`（或由首次部署的 CNAME 自动填充）
3. DNS：`token.yyc3.vip` CNAME 指向 `YYC-Cube.github.io`（已验证 ✅）
4. 首次部署成功后勾选 **Enforce HTTPS**

> 常见坑：若站点 404，检查 Pages Source 是否仍为 `deploy from branch`；若资源 404，确认构建参数为 `--base=/` 而非默认子路径。

---

<div align="center">

**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司 · Yanyu Intelligent Technology Co., Ltd.

</div>
