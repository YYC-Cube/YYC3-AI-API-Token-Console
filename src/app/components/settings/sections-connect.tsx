/**
 * settings/sections-connect.tsx — 连接与集成设置分区 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: WebSocket / AI 大模型 / PWA 离线 / 环境变量
 */
import { AlertTriangle, Database, Monitor, Sliders, Terminal, Wifi, Zap } from "lucide-react";
import { useModelProvider } from "../../hooks/useModelProvider";
import { EditableField, Toggle, type SettingsSectionProps } from "./shared";

// ============================================================
// WebSocket 连接配置
// ============================================================

export function WebSocketSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Wifi className="w-4 h-4 text-[#00d4ff]" />
        WebSocket 连接配置
      </h3>
      <div className="space-y-3">
        <EditableField label="WebSocket 端点" value={values.wsEndpoint} onChange={v => updateValue("wsEndpoint", v)} mono description="实时数据推送 WebSocket 服务地址" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>自动重连</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>断线后自动尝试重新连接</p>
          </div>
          <Toggle enabled={settings.wsAutoReconnect} onChange={() => toggleSetting("wsAutoReconnect")} />
        </div>
        <EditableField label="重连间隔 (ms)" value={values.wsReconnectInterval} onChange={v => updateValue("wsReconnectInterval", v)} type="number" description="两次重连之间的等待时间" />
        <EditableField label="最大重连次数" value={values.wsMaxReconnect} onChange={v => updateValue("wsMaxReconnect", v)} type="number" description="超过此次数后切换模拟模式" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>心跳检测</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>定时发送心跳保持连接</p>
          </div>
          <Toggle enabled={settings.wsHeartbeat} onChange={() => toggleSetting("wsHeartbeat")} />
        </div>
        <EditableField label="心跳间隔 (ms)" value={values.wsHeartbeatInterval} onChange={v => updateValue("wsHeartbeatInterval", v)} type="number" />
        <EditableField label="UI 更新节流 (ms)" value={values.wsThrottleMs} onChange={v => updateValue("wsThrottleMs", v)} type="number" description="防止高频更新导致渲染卡顿" />
      </div>
    </div>
  );
}

// ============================================================
// AI / 大模型配置
// ============================================================

export function AISection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  const { availableModels } = useModelProvider();

  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Sliders className="w-4 h-4 text-[#aa55ff]" />
        AI / 大模型配置
      </h3>
      <div className="p-2.5 rounded-xl bg-[rgba(0,255,136,0.04)] border border-[rgba(0,255,136,0.1)] mb-2">
        <p className="text-[rgba(0,255,136,0.5)] flex items-center gap-1.5" style={{ fontSize: "0.65rem" }}>
          <Zap className="w-3 h-3" />
          以下配置与 AI 智能助理（悬浮窗）实时双向同步，修改即时生效
        </p>
      </div>
      <div className="space-y-3">
        <EditableField label="OpenAI API Key" value={values.aiApiKey} onChange={v => updateValue("aiApiKey", v)} type="password" placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx" description="留空使用本地模拟模式" />
        <EditableField label="API Base URL" value={values.aiBaseUrl} onChange={v => updateValue("aiBaseUrl", v)} type="url" mono description="兼容 OpenAI 协议的 API 端点" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>默认模型</p>
          </div>
          <select
            value={values.aiModel}
            onChange={e => updateValue("aiModel", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none max-w-[220px]"
            style={{ fontSize: "0.75rem" }}
          >
            {availableModels.length > 0 ? (
              availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.isLocal ? "🟢 " : ""}{m.name}
                </option>
              ))
            ) : (
              <option value="">暂无可用模型</option>
            )}
          </select>
        </div>
        <EditableField label="温度 (Temperature)" value={values.aiTemperature} onChange={v => updateValue("aiTemperature", v)} type="number" description="0=精确，2=创意" />
        <EditableField label="Top-P (核采样)" value={values.aiTopP} onChange={v => updateValue("aiTopP", v)} type="number" description="控制采样多样性" />
        <EditableField label="最大 Token" value={values.aiMaxTokens} onChange={v => updateValue("aiMaxTokens", v)} type="number" description="单次对话最大生成长度" />
        <EditableField label="API 超时 (ms)" value={values.aiTimeout} onChange={v => updateValue("aiTimeout", v)} type="number" description="API 请求超时时间" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>流式输出 (Stream)</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>启用 SSE 流式响应</p>
          </div>
          <Toggle enabled={settings.aiStreamMode} onChange={() => toggleSetting("aiStreamMode")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>上下文记忆</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>保留对话历史作为上下文</p>
          </div>
          <Toggle enabled={settings.aiContextMemory} onChange={() => toggleSetting("aiContextMemory")} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PWA / 离线配置
// ============================================================

export function PWASection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Monitor className="w-4 h-4 text-[#ff6600]" />
        PWA / 离线配置
      </h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>启用 PWA</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>允许用户离线访问</p>
          </div>
          <Toggle enabled={settings.cacheEnabled} onChange={() => toggleSetting("cacheEnabled")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>缓存大小 (MB)</p>
          </div>
          <select
            value={values.cacheSize}
            onChange={e => updateValue("cacheSize", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            <option value="512">512 MB</option>
            <option value="1024">1 GB</option>
            <option value="2048">2 GB</option>
            <option value="4096">4 GB</option>
          </select>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>缓存 TTL (秒)</p>
          </div>
          <select
            value={values.cacheTTL}
            onChange={e => updateValue("cacheTTL", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            <option value="3600">1 小时</option>
            <option value="86400">24 小时</option>
            <option value="604800">7 天</option>
          </select>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 环境变量 & 数据库
// ============================================================

export function EnvSection({ values, updateValue }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Terminal className="w-4 h-4 text-[#ffdd00]" />
        环境变量 & 数据库
      </h3>
      <div className="p-3 rounded-xl bg-[rgba(255,221,0,0.05)] border border-[rgba(255,221,0,0.15)]">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-[#ffdd00]" />
          <span className="text-[#ffdd00]" style={{ fontSize: "0.75rem" }}>注意</span>
        </div>
        <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>
          修改环境变量可能影响系统运行，请谨慎操作。变更将在下次重启后生效。
        </p>
      </div>

      <div className="space-y-3">
        <h4 className="text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.8rem" }}>PostgreSQL 数据库</h4>
        <EditableField label="数据库主机" value={values.dbHost} onChange={v => updateValue("dbHost", v)} mono />
        <EditableField label="数据库端口" value={values.dbPort} onChange={v => updateValue("dbPort", v)} type="number" mono />
        <EditableField label="数据库名称" value={values.dbName} onChange={v => updateValue("dbName", v)} mono />
        <EditableField label="数据库用户名" value={values.dbUser} onChange={v => updateValue("dbUser", v)} mono />
        <EditableField label="数据库密码" value={values.dbPassword} onChange={v => updateValue("dbPassword", v)} type="password" />
        <EditableField label="连接池大小" value={values.dbPoolSize} onChange={v => updateValue("dbPoolSize", v)} type="number" description="最大并发数据库连接数" />
      </div>
    </div>
  );
}
