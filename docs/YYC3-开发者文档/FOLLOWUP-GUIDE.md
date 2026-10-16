# YYC³ Token Console 后续指导文档

> 生成: 2026-10-17 · 基于 15 阶段全链审计闭环 (S15 PASS) + 留账清偿 (L-01~L-08/L-12a/L-13) 后的终态
> 定位: 项目交接后任何人接手时的**第一份读文档**——当前状态、开口项、触发条件、执行方式
> 入口索引: `docs/audit/INDEX.md` (审计链) · `docs/audit/20261016T2200-backlog/backlog-resolution.md` (遗留登记)

---

## 一、项目当前状态快照

| 维度 | 现状 | 变化来源 |
| --- | --- | --- |
| 测试 | 190 文件 / 3230 用例 / maxWorkers=8 | S4+S5 热点批+0% 清零 |
| 覆盖率 | lines 95.19 / funcs 90.92 / branches 86.22 / stmts 93.21 | 门槛 90/85/80/88 |
| E2E | 13 用例 (11 功能 + Lighthouse 98 + 离线多路由) | S11 扩容+S12 修复 |
| 构建 | 34s / 90 chunks / 2990KB raw / 909KB gzip | S12 (gzip 修复 80→98) |
| 安全 | gitleaks 双模式 0 / HMAC+jti 吊销 / 审计 JSONL | S6+S11+S6增强 |
| 色值 | 基线 5486 冻结 (6080→6080→5841→5486 五批) | L-08 五片 |
| 部署 | LAN 3118 + NAS 3210 + ECS 3100 (三端 gzip) | S14+L-01+L-02 |
| 元门禁 | 20 探针双跑全拦截 | S10 扩容 |

**提交链**: 2026-10-16~17 共 ~50 笔 (136fbec→当前), 含 15 阶段审计闭环 + 留账清偿 + 缓办推进。

---

## 二、八项遗留开口——触发条件与执行方式

### L-06 · jti 吊销持久化

| | |
| --- | --- |
| **现状** | `deploy/console-auth.mjs` 的 `revoked` Map 是内存态——服务重启后已登出的旧 Cookie 重新有效（12h TTL 封顶） |
| **为什么可接受** | 单管理员形态下知道密码的人本来就能重登；暴露窗口被 TTL 硬封顶；持久化需引入文件读写时序复杂度 |
| **触发条件** | 出现第二个管理员账号，且「除名后立即失效其全部会话」成为需求 |
| **执行方式** | `console-auth.mjs` 的 `revoked` Map 改为启动时读 `console-revoked.json` + 退出时写（与 `console-settings.json` 同模式）；预估 0.5d |
| **不改的风险** | 重启后 12h 内已除名管理员的旧 Cookie 仍有效（如 Cookie 未被浏览器清除） |

### L-07 · e2e 登录态工程化

| | |
| --- | --- |
| **现状** | e2e 套件 13 用例共用 5 次登录（限流 5/5min/IP 刚好满额）；fullchain 的六域+i18n 挤在一个 90 秒长测试里 |
| **为什么可接受** | 当前 13 用例全部稳定，长测试可维护 |
| **触发条件** | 需要新增需要登录态的 e2e 用例时（再登录就 429） |
| **执行方式** | Playwright setup project 模式——独立 setup 测试登录一次 + `storageState` 写文件，后续 `test.use({ storageState })` 声明式复用；预估 0.5d |

### L-10 · vitest json-reporter 偶发 exit 1

| | |
| --- | --- |
| **现状** | `vitest run --reporter=json --outputFile=...` 与 `--coverage` 同时启用时偶尔 exit 1 但零失败痕迹 |
| **为什么可接受** | CI 契约命令 `pnpm test:coverage` 退出码正确；json 形态只用于审计归档且有 stdout 重定向替代 |
| **触发条件** | 下次 vitest 小版本升级 |
| **执行方式** | 升级后复测一次（5 分钟）；如复现则查 vitest GitHub issues / 提上游 |

### L-11 · coverage include 口径扩展

| | |
| --- | --- |
| **现状** | coverage include 只覆盖 `src/app/{lib,hooks,components,types}`——`deploy/*.mjs` 和 `routes.ts`、`i18n` 不在统计内（以测试域证据判性） |
| **为什么可接受** | deploy 侧已有 14 个 console-auth 单测 + relay 集成 + e2e；纳入分母会跳变百分比需重评阈值 |
| **触发条件** | `deploy/*.mjs` 补 `.d.ts` 后（顺带消 6 处 @ts-expect-error） |
| **执行方式** | tsconfig include 加 `deploy` → 重评四阈值基线 → 全量 coverage 验证；预估 0.5d |

### L-12b · 图表种子派生 (radar 轴语义)

| | |
| --- | --- |
| **现状** | Dashboard 雷达图用 `radarStore` 静态种子数据（5 维预置指标），不从真实数据推导 |
| **为什么可接受** | 五个轴的选取和归一化方式是产品语义决策——选错了会误导运维判断 |
| **触发条件** | 产品确认「五维分别衡量什么、怎么归一」（如 QPS/延迟/GPU/内存/存储健康度的百分位 vs 绝对值） |
| **执行方式** | 产品定义后从四源设备清单的真实数据推导 `radarStore` 种子；预估 0.5d 含确认 |

### 后端 · deploy key

| | |
| --- | --- |
| **现状** | `YYC3-0379-World` 仓的 origin 指向 GitHub，本机 push 需凭据（403） |
| **触发条件** | 需要从本机直接推送后端仓时 |
| **执行方式** | GitHub Settings → Deploy keys → 添加本机 `~/.ssh/id_ed25519.pub`（写权限）；这是运维决策 |

### 后端 · compose 重建终验

| | |
| --- | --- |
| **现状** | `docker-compose.yml` 中 prometheus 声明已修正为具名卷（037dac3），但未实际 `docker compose up -d prometheus` 验证 |
| **触发条件** | 下次 NAS 运维窗口 |
| **执行方式** | SSH NAS → `cd /Volume2/yyc3-33 && docker compose up -d prometheus` → 验证 9090 探活 200 + targets 含 gateway |

### NAS · 自然重启终验

| | |
| --- | --- |
| **现状** | @reboot cron 钩子三环静态验证完整（cron 条目 + dump 含进程 + ops.mjs boot 实测），但未经真实重启 |
| **为什么被动** | SSH 五条关机/重启路径全被 fnOS polkit 封锁（S1~S14 判例）；sysrq 硬切对生产库不净洁 |
| **触发条件** | NAS 因维护/断电自然重启后 |
| **执行方式** | `ssh -p 9557 yyc3-45 'node /Volume2/yyc3-console/ops.mjs boot && node /Volume2/yyc3-console/ops.mjs verify'`——boot 显示 boot.log resurrect 痕迹，verify 七项全绿即闭环 |

---

## 三、生产环境运维速查

### 三端部署拓扑

```
浏览器
  ├─ https://api.0379.world  → ECS Traefik → console-server :3100 (PM2 yyc3-console)
  ├─ http://192.168.3.45:3210 → NAS PM2 yyc3-console-nas (console-server)
  └─ http://<内网>:3118       → LAN (server.mjs, 无鉴权)
                                        │
                                        ▼ (gw proxy / WS relay)
                              NAS 网关容器 :8000 (FastAPI)
                                        │
                              ┌─────────┼─────────┐
                           PG :5432  Redis :6379  Prometheus :9090
```

### 常用运维命令

```bash
# NAS console 运维台 (status / verify 七项 / heal / boot / logs)
ssh -p 9557 yyc3-45 'node /Volume2/yyc3-console/ops.mjs status'
ssh -p 9557 yyc3-45 'node /Volume2/yyc3-console/ops.mjs verify'
ssh -p 9557 yyc3-45 'node /Volume2/yyc3-console/ops.mjs boot'   # @reboot 链路三环体检
ssh -p 9557 yyc3-45 'cat ~/.yyc3-console-cred'                  # 管理员密码 (600)

# ECS console
ssh yyc3-33 'cat /root/.yyc3-console-cred'                      # 密码 (600)
ssh yyc3-33 'pm2 ls | grep yyc3-console'                        # 进程状态
ssh yyc3-33 'tail -3 /opt/yyc3/console/console-audit.log'        # 登录审计

# 本地全量门禁 (CI 同款)
pnpm typecheck && pnpm lint && pnpm lint:fp && pnpm test:unit && pnpm test:coverage && pnpm astgrep && pnpm size:check && pnpm color:check && pnpm dup:check && node scripts/knip-check.mjs && pnpm guardrail-probe && pnpm test:e2e && pnpm build
```

### 判例速查（防复踩）

| 坑 | 避法 |
| --- | --- |
| 手工 `node deploy/server.mjs` 跨回合残留占端口 | 起前查 `lsof :3118`，用完 kill |
| Playwright 浏览器缓存被外部清除 | `pnpm exec playwright install chromium`（EBUSY 重试） |
| gitleaks 豁免条目跟随文件迁移失守 | 路径用位置无关后缀匹配 |
| 同名 .ts/.tsx 并存被 TS 程序去重 | 测试文件拆分禁用同名异扩展 |
| pnpm dlx 被供应链守卫拦截（bidi 等） | 降版本试 devDep 或不绕策略 |
| fnOS 关机/重启全被 polkit 拦 | sysrq 硬切勿用于生产库 |
| 实施日志插新批次吞旧标题行 | new_string 尾部必须带回被匹配标题 |

---

## 四、新开发者上手清单

1. **读 AGENTS.md**（项目总纲：技术栈/红线/分层/域契约/门禁速查）
2. **跑 `pnpm run doctor`**（12 项环境自诊断；注意裸 `pnpm doctor` 会执行 pnpm 内建命令）
3. **跑全量门禁**（上方命令块，确认本地全绿 = CI 绿）
4. **读本文件**（遗留开口与运维速查）
5. **浏览 `docs/audit/INDEX.md`**（22 目录审计链入口——了解做过什么、为什么）
6. **开发** → 跑门禁 → Conventional Commits（中文描述）→ PR

---

## 五、本文档维护约定

- 每完成一项遗留 → 更新对应小节状态标记（✅ + 提交哈希）
- 每新增遗留 → 新增小节（含五要素表：现状/为什么/触发/执行/风险）
- 每次生产部署变更 → 更新「三端部署拓扑」图
- 每新增判例 → 追加「判例速查」表
- 本文档不删旧条目——完成后标 ✅ 留档，保持完整决策历史
