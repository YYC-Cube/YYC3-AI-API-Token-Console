/**
 * settings/sections-admin.tsx — 管理设置分区 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: Security / Notification / Advanced
 */
import { AlertTriangle, Code, RefreshCw, Shield, Trash2 } from "lucide-react";
import { EditableField, Toggle, type SettingsSectionProps } from "./shared";
import { APIEndpointConfig } from "./APIEndpointConfig";

// ============================================================
// Security 安全设置
// ============================================================

export function SecuritySection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>安全设置</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>多因素认证 (MFA)</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>要求所有用户启用 MFA</p>
          </div>
          <Toggle enabled={settings.mfa} onChange={() => toggleSetting("mfa")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>审计日志</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>记录所有操作行为</p>
          </div>
          <Toggle enabled={settings.auditLog} onChange={() => toggleSetting("auditLog")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>API 速率限制</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>限制 API 请求频率</p>
          </div>
          <Toggle enabled={settings.rateLimiting} onChange={() => toggleSetting("rateLimiting")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>CORS 跨域</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>允许跨域请求访问</p>
          </div>
          <Toggle enabled={settings.corsEnabled} onChange={() => toggleSetting("corsEnabled")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>会话超时</p>
          </div>
          <select
            value={values.sessionTimeout}
            onChange={e => updateValue("sessionTimeout", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            <option value="30">30 分钟</option>
            <option value="60">1 小时</option>
            <option value="240">4 小时</option>
            <option value="480">8 小时</option>
            <option value="0">永不过期</option>
          </select>
        </div>
        <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <p className="text-[#c0dcf0] mb-2" style={{ fontSize: "0.82rem" }}>IP 白名单</p>
          <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.68rem" }}>每行一个 CIDR 地址段</p>
          <textarea
            value={values.ipWhitelist}
            onChange={e => { updateValue("ipWhitelist", e.target.value); }}
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)] resize-none font-mono"
            style={{ fontSize: "0.75rem" }}
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Notification 通知配置
// ============================================================

export function NotificationSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>通知配置</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>邮件通知</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>通过邮件发送告警通知</p>
          </div>
          <Toggle enabled={settings.alertEmail} onChange={() => toggleSetting("alertEmail")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>Slack 通知</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>通过 Slack 频道推送告警</p>
          </div>
          <Toggle enabled={settings.alertSlack} onChange={() => toggleSetting("alertSlack")} />
        </div>
        <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <p className="text-[#c0dcf0] mb-2" style={{ fontSize: "0.82rem" }}>GPU 使用率告警阈值</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="100"
              value={values.alertGpuThreshold}
              onChange={e => updateValue("alertGpuThreshold", e.target.value)}
              className="flex-1 accent-[#00d4ff]"
            />
            <span className="text-[#00d4ff] w-12 text-right" style={{ fontSize: "0.8rem" }}>{values.alertGpuThreshold}%</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <p className="text-[#c0dcf0] mb-2" style={{ fontSize: "0.82rem" }}>温度告警阈值</p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="100"
              value={values.alertTempThreshold}
              onChange={e => updateValue("alertTempThreshold", e.target.value)}
              className="flex-1 accent-[#ff6600]"
            />
            <span className="text-[#ff6600] w-12 text-right" style={{ fontSize: "0.8rem" }}>{values.alertTempThreshold}°C</span>
          </div>
        </div>
        <EditableField label="通知邮箱" value={values.alertEmailAddr} onChange={v => updateValue("alertEmailAddr", v)} type="email" />
        <EditableField label="Webhook URL" value={values.webhookUrl} onChange={v => updateValue("webhookUrl", v)} type="url" placeholder="https://hooks.slack.com/..." description="Slack / 飞书 / 钉钉 Webhook 地址" />
      </div>
    </div>
  );
}

// ============================================================
// Advanced 高级设置
// ============================================================

export function AdvancedSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Code className="w-4 h-4 text-[#ff6600]" />
        高级设置
      </h3>

      {/* API 端点配置 */}
      <APIEndpointConfig />

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>调试模式</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>启用详细日志输出</p>
          </div>
          <Toggle enabled={settings.debugMode} onChange={() => toggleSetting("debugMode")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>性能日志</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>记录每次请求的性能指标</p>
          </div>
          <Toggle enabled={settings.performanceLog} onChange={() => toggleSetting("performanceLog")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>自动更新</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>自动检查和安装系统更新</p>
          </div>
          <Toggle enabled={settings.autoUpdate} onChange={() => toggleSetting("autoUpdate")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>日志级别</p>
          </div>
          <select
            value={values.logLevel}
            onChange={e => updateValue("logLevel", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
        </div>
        <EditableField label="日志保留天数" value={values.logRetention} onChange={v => updateValue("logRetention", v)} type="number" description="超过天数的日志自动清理" />
        <EditableField label="最大并发数" value={values.maxConcurrency} onChange={v => updateValue("maxConcurrency", v)} type="number" description="系统最大并发请求处理数" />
        <EditableField label="缓存大小 (MB)" value={values.cacheSize} onChange={v => updateValue("cacheSize", v)} type="number" description="内存缓存最大容量" />
        <EditableField label="缓存 TTL (秒)" value={values.cacheTTL} onChange={v => updateValue("cacheTTL", v)} type="number" description="缓存数据过期时间" />
      </div>

      {/* Danger zone */}
      <div className="mt-6 p-4 rounded-xl border border-[rgba(255,51,102,0.2)] bg-[rgba(255,51,102,0.03)]">
        <h4 className="text-[#ff3366] mb-3 flex items-center gap-2" style={{ fontSize: "0.85rem" }}>
          <AlertTriangle className="w-4 h-4" />
          危险操作
        </h4>
        <div className="space-y-2">
          <button className="w-full py-2.5 rounded-xl bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)] transition-all" style={{ fontSize: "0.78rem" }}>
            <RefreshCw className="w-3.5 h-3.5 inline mr-2" />
            重置所有设置为默认值
          </button>
          <button className="w-full py-2.5 rounded-xl bg-[rgba(255,51,102,0.05)] border border-[rgba(255,51,102,0.12)] text-[rgba(255,51,102,0.6)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.1)] transition-all" style={{ fontSize: "0.78rem" }}>
            <Trash2 className="w-3.5 h-3.5 inline mr-2" />
            清除所有缓存数据
          </button>
        </div>
      </div>
    </div>
  );
}
