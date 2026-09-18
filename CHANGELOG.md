# 更新日志 | Changelog

本项目的所有重要变更记录于此。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)。
All notable changes are documented here. Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [SemVer 2.0.0](https://semver.org/).

> 变更提交申请 changelog submissions: <dev@yanyucloud.com>

## [Unreleased]

### 计划 Planned

- `v0.2.0`: 推理矩阵多主机调度视图（M4 Max + iMac + NAS 拓扑可视化）
- `v0.2.0`: 报表导出 PDF 引擎（当前 CSV/JSON 基础上扩展）
- `v0.2.0`: AI 诊断建议闭环回写告警规则引擎

---

## [0.1.0] - 2026-09-18

### Added 新增

- **六大功能域**: 监控中心（数据监控/一键跟进/巡查模式/告警规则）· 运维管理（操作中心/文件管理/数据库管理/闭环/报表导出）· AI 智能（API 矩阵/辅助决策/诊断）· AI Family（12 小时钟盘/Family 中心）· 开发规范（设计系统/开发指南）· 系统管理（审计/用户/安全/PWA/环境变量）
  Six functional domains: Monitoring · Ops · AI · AI Family · Dev Standards · Admin
- **全端图标体系**: Android / Web / iOS / macOS / watchOS 五平台 32+ PNG，物理源 + 逻辑源 + CDN 回退四级兜底
  Full-platform icon system: 5 platforms, 32+ PNGs, four-level fallback chain
- **PWA 全链路**: manifest 13 档图标 + useYYC3Head 运行时注入 + 离线模式 + 安装引导
  PWA full-chain: manifest + runtime head injection + offline mode + install prompt
- **双语 i18n**: zh-CN / en-US 全量语言包，一致性测试保障
  Bilingual i18n guarded by consistency tests
- **零依赖部署**: deploy/server.mjs（Node 原生 http）静态托管 + Ollama 反向代理 + launchd/nginx 配置
  Zero-dependency deploy server with Ollama reverse proxy + launchd/nginx configs
- **质量门禁**: TypeScript strict + Vitest 4 双项目工作区（140+ 测试）+ 覆盖率 80% 门槛 + axe-core a11y 审计
  Quality gates: TS strict + Vitest dual-project (140+ tests) + 80% coverage + a11y audit
- **CI/CD**: GitHub Actions 四阶段流水线（typecheck→test→scan→build）+ tag 驱动发布
  CI/CD: four-stage pipeline + tag-driven release
- **仓库治理**: 标签体系 / Issue-PR 模板 / 贡献指南 / 安全策略 / 行为准则 / Apache-2.0 LICENSE
  Repo governance: labels / Issue-PR templates / contributing / security / CoC / license
- **文档体系**: 标规文档（五维驱动/开发标准/文档闭环/图标可视化/多端适配）+ 模版闭环 + 验收体系 + 开发者文档全套
  Documentation: team standards + template loop + acceptance system + full developer docs

### Fixed 修复

- package.json 规范化：`@figma/my-make-file` → `yyc3-ai-api-token-console`（团队 `yyc3-` 前缀命名标准）
  package.json normalized to team naming standard
- Issue 模板归位 `.github/ISSUE_TEMPLATE/`（原散落于 `.github/` 根，GitHub 无法识别）
  Issue templates relocated for GitHub recognition
- 冗余 CI 配置合并：`monorepo-ci.yml` 归档至 `src/app/ci/`，`github-actions-ci.yml` 同步对齐现役流水线
  Redundant CI configs consolidated

### Security 安全

- 全量环境变量隔离（`.env` gitignore + `.env.example` 白名单）
  Full env isolation with gitignore + example whitelist
- gitleaks 密钥扫描闸（CI + pre-commit 双层）
  gitleaks secret scanning at both CI and pre-commit layers

---

## 版本语义 | Versioning Semantics

| 变更类型 Change | 版本位 Bump |
| ---------------- | ------------- |
| 破坏性变更 Breaking | MAJOR |
| 新功能/新文档 Feature/Docs addition | MINOR |
| 缺陷修复/笔误 Bug fix/Typos | PATCH |

> 发布由 `v*.*.*` 标签自动触发 Release 流水线（见 [RELEASE.md](./YYC3-开发者文档/RELEASE.md)）。
> Releases auto-trigger on `v*.*.*` tags (see RELEASE.md).

[Unreleased]: https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YYC-Cube/YYC3-AI-API-Token-Console/releases/tag/v0.1.0

---

<div align="center">

**® YANYUCLOUDCUBE** · © 2025-2026 言语（河南）智能科技有限公司 · Yanyu Intelligent Technology Co., Ltd.

</div>
