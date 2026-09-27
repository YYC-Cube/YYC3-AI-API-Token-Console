---
file: CONTRIBUTING.md
description: 贡献入口 — 快速通道 · 门禁清单 · 提交规范（全文见 docs/YYC3-开发者文档/CONTRIBUTING.md）
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-27
updated: 2026-09-27
status: stable
tags: [contributing],[entry],[quality-gates]
category: guide
---

# 贡献指南 | Contributing

> 完整版（分支模型 · 代码风格 · 标签体系 · 验收闭环）:
> **[docs/YYC3-开发者文档/CONTRIBUTING.md](docs/YYC3-开发者文档/CONTRIBUTING.md)**

## 快速通道 | Fast Path

```bash
git clone https://github.com/YYC-Cube/YYC3-AI-API-Token-Console.git
cd YYC3-AI-API-Token-Console && pnpm install   # Node 22+ / pnpm 11+
git checkout -b feat/your-topic                # 分支: feat/* fix/* docs/* perf/* ci/* refactor/*
pnpm dev                                       # 开发服务器: http://localhost:3030
```

## 提交前门禁 | Pre-submit Gates

```bash
pnpm typecheck        # tsc strict · 0 errors
pnpm lint             # eslint 0 errors + import 分层边界
pnpm test:unit        # vitest 分级单测
pnpm astgrep          # ast-grep 反模式扫描
pnpm size:check       # 文件体量基线（只减不增）
node scripts/knip-check.mjs   # 死代码基线门禁
pnpm guardrail-probe  # 门禁有效性探针（防门禁空心）
```

## 提交规范 | Commit Convention

Conventional Commits，中文描述：`feat(monitor): 新增 Token 用量迷你图`

| 类型 | 用途 |
| --- | --- |
| `feat` / `fix` | 新功能 / 缺陷修复 |
| `docs` / `refactor` / `perf` | 文档 / 重构 / 性能 |
| `test` / `build` / `ci` / `chore` | 测试 / 构建 / 流水线 / 维护 |

## 红线 | Red Lines

1. 零上游代码级依赖（借鉴思想与模式，禁止 submodule / 未声明复制）
2. 零硬编码密钥（敏感配置走环境变量，gitleaks 强制）
3. 禁止裸 `new WebSocket(...)`（必须经 `globalThis` 解析）
4. 依赖版本精确锁定（无 `^`/`~`）
5. 不做超出当前任务的重构

---

**行为准则**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · **安全策略**: [SECURITY.md](SECURITY.md)
