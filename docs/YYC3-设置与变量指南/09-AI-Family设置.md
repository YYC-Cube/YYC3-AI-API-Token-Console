# 09 · AI Family 设置（子页面族）

> 页面：`/ai-family-settings`（FamilyUISettings）及各子页内嵌面板
> 存储键前缀 `yyc3-family-*`（gitleaks 豁免登记——公开数据标识符，非凭证）

## 设置键全表（8 键实况）

| 存储键 | 管理页面 | 内容 / 示例 |
| ---- | ---- | ---- |
| `yyc3-family-ui-config` | /ai-family-settings | 界面偏好（主题色/字号等 UI 开关） |
| `yyc3-family-provider-keys` | /ai-family-settings | 各成员服务调用密钥配置（代理占位模式） |
| `yyc3-family-model-assignments` | /ai-family-models | 成员→提供商/模型映射（默认 8 条见 [04](./04-模型与AI推理.md)） |
| `yyc3-family-voice-profiles` | /ai-family-voice | 语音角色档案（音色/语速/音调数值型 profile） |
| `yyc3-family-voice-conversations` | /ai-family-voice | 语音对话记录 |
| `yyc3-family-comm-messages` | /ai-family-comm | 家人内部通信消息（FamilyMessage：from/to/content/type） |
| `yyc3-family-activities` | /ai-family-activities | 活动中心记录 |
| `yyc3-family-diagnostics` | /ai-family-data | 家族诊断/数据面板状态 |

## 对话真实化（实况）

`/ai-family-chat` 回复链：网关 `chat/completions`（system=成员人格 prompt + 最近 6 轮 + 成员分配模型，20s 超时）→ 失败降级 `AI_RESPONSES` 模拟语料（零后端可用）。终端 `family chat <成员名>` 可查档案（Tab 补全成员）。

---

返回 [目录](./README.md)
