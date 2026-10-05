---
file: README.md
description: YYC3 设置与变量指南 — 对齐导航分类/子菜单的设置·变量·数值全景（架构命名对齐项目实况页面）
author: YanYuCloudCube Team <admin@0379.email>
version: v1.0.0
created: 2026-10-05
updated: 2026-10-05
status: stable
tags: [settings],[variables],[guide],[navigation-aligned]
category: guide
---

# 📖 YYC³ 设置与变量指南（导航对齐版）

> 架构命名对齐项目实况页面：入口 = 侧边栏「系统管理 → 系统设置」（`/settings`，`SystemSettings.tsx` Facade 委派 12 分区）+ 各功能页内嵌面板。
> **编辑即生效链**：onChange → settingsBus（模块级单例 + listeners）→ 全树重渲染 / BroadcastChannel 跨标签页 / 行为桥（WS 热重建等）。

## 目录（分区 ⇄ 文档对齐）

| # | 文档 | 对应设置分区（SystemSettings 左栏） | 关联导航页 |
| - | ---- | ---- | ---- |
| 01 | [通用设置](./01-通用设置.md) | 通用设置 (general) | /settings |
| 02 | [网络与 WebSocket](./02-网络与WebSocket.md) | 网络连接 · WebSocket | /connection-test |
| 03 | [集群与负载](./03-集群与负载.md) | 集群配置 (cluster) | / · /operations |
| 04 | [模型与 AI 推理](./04-模型与AI推理.md) | 模型管理 (model) · AI/LLM (ai) | /models · /ai · /ai-family-models |
| 05 | [存储与缓存](./05-存储与缓存.md) | 存储配置 (storage) | /database · /files |
| 06 | [安全与审计](./06-安全与审计.md) | 安全设置 (security) | /security · /audit · /users |
| 07 | [通知与告警](./07-通知与告警.md) | 通知配置 (notification) | /alerts · /follow-up |
| 08 | [环境变量与 API 端点](./08-环境变量与API端点.md) | 环境变量 (env) · 高级设置 (advanced) · PWA | /env-config · /pwa |
| 09 | [AI Family 设置](./09-AI-Family设置.md) | （子页面 /ai-family-settings） | /ai-family-settings · /ai-family-voice |

## 四套设置体系全景（存储 ⇄ 消费）

| 体系 | 存储 key | 管理入口 | 变更通知 |
| ---- | ---- | ---- | ---- |
| **系统设置**（19 开关 + 41 值） | `yyc3_system_settings` | /settings 12 分区 | settingsBus listeners + `yyc3_settings_sync` BC |
| **环境变量**（31 键，不可逆类） | `yyc3_env_config` | /env-config（终端 `env` 命令） | subscribeEnvConfig + `yyc3_env_config_sync` BC |
| **API 端点**（9 端点 + 通用） | `yyc3_api_endpoints` | /settings·API 配置区 | onAPIConfigChange + `yyc3_api_config` BC |
| **网关**（3 项） | `yyc3_gateway_config` | /models 网关配置 | 内存即时 + BC |
| （附）**AI Family**（8 键） | `yyc3-family-*` | /ai-family-settings 等子页 | 各面板局部 |

## 数值示例速查（高频）

```text
刷新间隔 refreshInterval: 2 | 5 | 10 | 30 | 60 (秒)
WS 重连间隔 wsReconnectInterval: 5000 (ms)   心跳间隔: 30000 (ms)
GPU 告警阈值 alertGpuThreshold: 90 (%)        温度阈值: 80 (°C)
会话超时 sessionTimeout: 30 (分钟, P4 下发键 sessionTimeoutMin 1-1440)
缩容/扩容阈值: 30 / 85 (%)                    采样温度 aiTemperature: 0.7 (0-2)
```

## 生效语义速查

- **即时生效**：全部 60 个 settings 键（settingsBus 全树）+ env/api（订阅方即时）
- **行为重建**：`wsEndpoint`（旧连接自动关闭→新端点重连）；`refreshInterval`（下一次模拟/轮询周期）
- **服务端下发**（P4 白名单）：`ipWhitelist` · `alertEmailAddr` · `webhookUrl` · `sessionTimeoutMin` → `PUT /console/settings`

---

**© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
