---
file: SECURITY.md
description: 安全策略入口 — 漏洞报告渠道 · 支持版本 · 安全基线（全文见 docs/YYC3-开发者文档/SECURITY.md）
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-27
updated: 2026-09-27
status: stable
tags: [security],[entry],[vulnerability]
category: policy
---

# 安全策略 | Security Policy

> 完整版（响应 SLA · CVSS 定级 · 安全编码基线）:
> **[docs/YYC3-开发者文档/SECURITY.md](docs/YYC3-开发者文档/SECURITY.md)**

## 报告漏洞 | Report a Vulnerability

- **私密安全通告**: [创建 Security Advisory](https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/security/advisories/new)
- **邮件**: sec@yanyucloud.com
- 请**勿**在公开 Issue/PR 中披露未修复的漏洞。

## 支持版本 | Supported Versions

| 版本 | 支持状态 | 安全补丁 |
| --- | --- | :---: |
| latest（`main` / 最新 Release） | ✅ Full | ✅ |
| 前 1 个 minor | ✅ Maintenance | ✅ |
| 更早版本 | ❌ EOL | ❌ |

## 安全基线要点 | Security Baseline

- 密钥/凭证仅经环境变量注入，仓库与构建产物零硬编码（gitleaks + CI 产物断言双重强制）
- 敏感配置参照 `.env.example`（`.env` 已 gitignore）
- CI 内置门禁: gitleaks 密钥扫描 · ast-grep 反模式（含硬编码密钥检测）· 产物零密钥断言

## 响应时限 | Response SLA

| 阶段 | 目标时限 |
| --- | --- |
| 确认收到 | ≤ 48 小时 |
| 初步评估 | ≤ 7 天 |
| 高危修复 | ≤ 30 天 |

---

**行为准则**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · **贡献指南**: [CONTRIBUTING.md](CONTRIBUTING.md)
