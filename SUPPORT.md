---
file: SUPPORT.md
description: 支持入口 — 求助渠道分流（Bug/功能走 Issue · 安全走 SECURITY · 文档导航）
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-09-27
updated: 2026-09-27
status: stable
tags: [support],[entry],[community]
category: guide
---

# 支持与求助 | Support

## 渠道分流 | Where to Ask

| 需求 | 渠道 |
| --- | --- |
| 🐞 缺陷报告 | [Issue · bug_report 模板](https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/issues/new?template=bug_report.yml) |
| 💡 功能建议 | [Issue · feature_request 模板](https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/issues/new?template=feature_request.yml) |
| 🔒 安全漏洞 | **不要开公开 Issue** → 见 [SECURITY.md](SECURITY.md)（私密安全通告 / sec@yanyucloud.com） |
| 📖 使用与开发问题 | [Discussions](https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/discussions) 或带 `question` 标签的 Issue |

## 文档导航 | Documentation

| 文档 | 路径 |
| --- | --- |
| 项目总览 | [README.md](README.md) |
| 贡献指南 | [CONTRIBUTING.md](CONTRIBUTING.md) |
| 架构说明 | [docs/YYC3-开发者文档/ARCHITECTURE.md](docs/YYC3-开发者文档/ARCHITECTURE.md) |
| CI/CD 流水线 | [docs/YYC3-开发者文档/CICD.md](docs/YYC3-开发者文档/CICD.md) |
| 发布流程 | [docs/YYC3-开发者文档/RELEASE.md](docs/YYC3-开发者文档/RELEASE.md) |
| 更新日志 | [CHANGELOG.md](CHANGELOG.md) |

## 提问前 | Before You Ask

1. 先跑自诊断: `pnpm doctor`（Node/pnpm 版本、依赖策略、构建链体检）
2. 确认门禁通过: `pnpm typecheck && pnpm lint && pnpm test:unit`
3. Issue 请附: 复现步骤 · 期望/实际行为 · 环境信息（OS / Node / pnpm 版本）
