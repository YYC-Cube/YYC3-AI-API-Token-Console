---
file: SECURITY.md
description: YYC3-AI-API-Token-Console 安全策略 — 漏洞报告渠道 · 响应 SLA · 安全基线
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-18
updated: 2026-09-18
status: stable
tags: [security],[policy],[vulnerability],[compliance]
category: policy
language: zh-CN
audience: developers,managers
complexity: intermediate
---

<div align="center">

# 安全策略 | Security Policy

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

</div>

> **报告漏洞 | Report a Vulnerability**: [创建私密安全通告 Open a private security advisory](https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/security/advisories/new) 或邮件 **sec@yanyucloud.com**
> **公开渠道 | Public channel**: 请勿在 Issue/PR 中披露未修复的漏洞 Do not disclose unfixed vulnerabilities in public issues.

---

## 支持版本 | Supported Versions

| 版本 Version | 支持状态 Status | 安全补丁 Security Fixes |
|--------------|----------------|:---:|
| latest (`main` / 最新 Release) | ✅ Full | ✅ |
| 前 1 个 minor（如 `N-1`） | ✅ Maintenance | ✅ |
| 更早版本 Earlier | ❌ EOL | ❌ |

## 报告内容 | What to Include

1. 漏洞类型与影响面 Vulnerability type & impact scope
2. 复现步骤（含最小 PoC，请脱敏）Repro steps (minimal, sanitized PoC)
3. 受影响版本 / 提交 Affected versions / commit SHA
4. 修复建议（如有）Suggested fix if any

## 响应流程 | Response Process

```mermaid
flowchart LR
  R["📩 收到报告<br/>Report received"] --> T["⏱️ 48h 内确认<br/>Ack <= 48h"]
  T --> A["🔬 评估定级<br/>Triage & CVSS"]
  A --> F["🛠️ 修复开发<br/>Private fix branch"]
  F --> V["✅ 内部验证<br/>Internal verify"]
  V --> D["🚀 发布补丁版本<br/>Patch release"]
  D --> C["📣 公开通告 + 致谢<br/>Advisory + credit"]
```

| 阶段 Stage | 目标时限 Target SLA |
|-----------|-------------------|
| 确认收到 Acknowledgement | ≤ 48 小时 hours |
| 初步评估 Initial assessment | ≤ 7 天 days |
| 高危修复 High-severity fix | ≤ 30 天 days |
| 公开通告 Public disclosure | 补丁发布后 90 天内 within 90 days after patch |

## 严重度处理 | Severity Handling

| CVSS | 处置 Handling |
|------|--------------|
| 9.0-10.0 Critical | 立即应急：冻结发布窗 + 热修 + 全员通告 Immediate hotfix, freeze, broadcast |
| 7.0-8.9 High | 30 天内补丁，扫描器自动建 Issue 指派 sec@ Patch in 30d, auto-issue to sec@ |
| 4.0-6.9 Medium | 下一例行版本 Next regular release |
| 0.1-3.9 Low | 积压清单 Backlog |

## 安全编码基线 | Secure Coding Baseline

- 密钥/凭证仅经环境变量注入，仓库内零硬编码（gitleaks 闸强制）
  Secrets via env vars only; zero hardcoding (enforced by gitleaks gate)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 等接入均走 `.env`（已 gitignore，`!.env.example` 白名单模板）
  Supabase and alike go through `.env` (gitignored, `.env.example` whitelisted)
- 内网部署 CORS 策略需按网段收敛（`deploy/server.mjs` 默认全放行仅限可信内网）
  Converge CORS by subnet for LAN deploy; wildcard in `server.mjs` is trusted-LAN-only
- 依赖锁定（pnpm-lock.yaml）+ 每周自动化漏洞扫描
  Pinned deps + weekly automated scans
- 文件管理/终端组件操作本地主机文件系统时遵循最小权限原则
  Least-privilege for FileBrowser/Terminal components touching the host FS

---

<div align="center">

**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司 · Yanyu Intelligent Technology Co., Ltd.

</div>
