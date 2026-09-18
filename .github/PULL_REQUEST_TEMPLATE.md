# YYC³ PR 规范 | Pull Request Standard

> **执行有规划，规划有节点，节点有目标，目标可评估** — YYC³ 团队规范

## 📋 变更类型 | Change Type

- [ ] ✨ 新功能 Feature (`feature`)
- [ ] 🐛 缺陷修复 Bug fix (`bug`)
- [ ] 📝 文档 Documentation (`documentation`)
- [ ] ⚡ 性能优化 Performance (`performance`)
- [ ] 🛡️ 安全加固 Security (`security`)
- [ ] 🔧 CI/工具链 CI / tooling (`ci`)
- [ ] 💥 破坏性变更 Breaking change (`breaking-change`)

## 📝 变更说明 | Description

<!-- 一句话概括 what & why -->

## ✅ 自检清单 | Self-Check (YYC³ 质量门禁)

- [ ] `pnpm type-check` 通过 (0 errors)
- [ ] `pnpm test` 通过
- [ ] `pnpm build` 通过
- [ ] 无硬编码密钥 / Token (`gitleaks` 将自动扫描)
- [ ] 敏感配置走环境变量 `${ENV_VAR}` 而非明文
- [ ] 相关文档已同步更新

## 🔗 关联 Issue | Linked Issues

<!-- Closes #123 -->

## 🖼️ 截图/录屏 | Screenshots

<!-- UI 变更请附截图 -->
