/**
 * settings/sections-core.tsx — 基础设置分区 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: General / Network / Cluster / Storage
 */
import { useState } from "react";
import {
  Clock, Database, Download, Globe, Key, Network, Upload, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { NetworkConfig } from "../NetworkConfig";
import { YYC3Logo } from "../YYC3Logo";
import { EditableField, Toggle, type SettingsSectionProps } from "./shared";

// ============================================================
// General 通用
// ============================================================

export function GeneralSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  const handleExport = () => {
    const json = JSON.stringify({ values }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpim-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("settings.exported");
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <YYC3Logo size="sm" showStatus={false} glow={false} />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>系统信息</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <EditableField label="系统名称" value={values.systemName} onChange={v => updateValue("systemName", v)} description="系统显示标题" />
          <EditableField label="集群 ID" value={values.clusterId} onChange={v => updateValue("clusterId", v)} description="全局唯一集群标识" mono />
          <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>运行时间</span>
            </div>
            <span className="text-[#c0dcf0]" style={{ fontSize: "0.85rem" }}>127 天 14 小时</span>
          </div>
          <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>许可证</span>
            </div>
            <span className="text-[#c0dcf0]" style={{ fontSize: "0.85rem" }}>Enterprise Pro</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>显示与界面</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div>
              <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>深色模式</p>
              <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>使用深色主题界面</p>
            </div>
            <Toggle enabled={settings.darkMode} onChange={() => toggleSetting("darkMode")} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div>
              <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>数据刷新间隔</p>
              <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>设置仪表盘自动刷新频率</p>
            </div>
            <select
              value={values.refreshInterval}
              onChange={e => updateValue("refreshInterval", e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
              style={{ fontSize: "0.75rem" }}
            >
              <option value="2">2 秒</option>
              <option value="5">5 秒</option>
              <option value="10">10 秒</option>
              <option value="30">30 秒</option>
              <option value="60">1 分钟</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div>
              <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>语言</p>
              <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>系统显示语言</p>
            </div>
            <select
              value={values.language}
              onChange={e => updateValue("language", e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
              style={{ fontSize: "0.75rem" }}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
          <EditableField label="时区" value={values.timezone} onChange={v => updateValue("timezone", v)} description="系统时区设置" />
        </div>
      </div>

      {/* Import/Export */}
      <div>
        <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>配置导入 / 导出</h3>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
            style={{ fontSize: "0.8rem" }}
          >
            <Download className="w-4 h-4" />
            导出配置
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.8rem" }}
          >
            <Upload className="w-4 h-4" />
            导入配置
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Network 网络
// ============================================================

export function NetworkSection({ values }: SettingsSectionProps) {
  const [networkConfigOpen, setNetworkConfigOpen] = useState(false);

  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4 flex items-center gap-2" style={{ fontSize: "0.95rem" }}>
        <Globe className="w-4 h-4 text-[#00d4ff]" />
        网络连接配置
      </h3>

      {/* 快捷操作 */}
      <button
        onClick={() => setNetworkConfigOpen(true)}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-[rgba(0,212,255,0.05)] border border-[rgba(0,212,255,0.15)] hover:border-[rgba(0,212,255,0.3)] hover:bg-[rgba(0,212,255,0.08)] transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[rgba(0,212,255,0.1)] group-hover:bg-[rgba(0,212,255,0.15)] transition-all">
            <Network className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div className="text-left">
            <p className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>打开网络配置面板</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>自动检测 / WiFi 配置 / 手动配置</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[rgba(0,212,255,0.3)] group-hover:text-[#00d4ff] transition-all" />
      </button>

      {/* 当前连接状态 */}
      <div className="space-y-3">
        <h4 className="text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.8rem" }}>当前连接</h4>
        {[
          { label: "WebSocket 端点", value: values.wsEndpoint },
          { label: "数据库地址", value: `${values.dbHost}:${values.dbPort}` },
          { label: "网络状态", value: navigator.onLine ? "已连接" : "未连接" },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.78rem" }}>{item.label}</span>
            <span className="text-[#c0dcf0] font-mono" style={{ fontSize: "0.78rem" }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* 节点拓扑 */}
      <div>
        <h4 className="text-[rgba(0,212,255,0.6)] mb-3" style={{ fontSize: "0.8rem" }}>节点拓扑</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: "M4 Max 主节点", ip: "192.168.3.45", role: "主节点", status: "active", color: "#00d4ff" },
            { name: "iMac 辅助节点", ip: "192.168.3.46", role: "辅助", status: "active", color: "#00ff88" },
            { name: "NAS 数据中心", ip: "192.168.3.45:9898", role: "存储", status: "active", color: "#aa55ff" },
          ].map((node) => (
            <div key={node.name} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: node.color, boxShadow: `0 0 8px ${node.color}60` }} />
                <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>{node.name}</span>
              </div>
              <p className="text-[rgba(0,212,255,0.5)] font-mono" style={{ fontSize: "0.7rem" }}>{node.ip}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.62rem", backgroundColor: `${node.color}15`, border: `1px solid ${node.color}30` }}>
                {node.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* NetworkConfig Modal */}
      <NetworkConfig open={networkConfigOpen} onClose={() => setNetworkConfigOpen(false)} />
    </div>
  );
}

// ============================================================
// Cluster 集群
// ============================================================

export function ClusterSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>集群配置</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>自动弹性伸缩</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>根据负载自动增减节点</p>
          </div>
          <Toggle enabled={settings.autoScale} onChange={() => toggleSetting("autoScale")} />
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>健康检查</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>定时检测节点状态</p>
          </div>
          <Toggle enabled={settings.healthCheck} onChange={() => toggleSetting("healthCheck")} />
        </div>
        <EditableField label="最大节点数量" value={values.maxNodes} onChange={v => updateValue("maxNodes", v)} type="number" />
        <EditableField label="健康检查间隔 (秒)" value={values.healthCheckInterval} onChange={v => updateValue("healthCheckInterval", v)} type="number" description="每次健康检查的时间间隔" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>负载均衡策略</p>
          </div>
          <select
            value={values.loadBalanceStrategy}
            onChange={e => updateValue("loadBalanceStrategy", e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            <option>轮询 (Round Robin)</option>
            <option>最少连接 (Least Connections)</option>
            <option>加权轮询 (Weighted RR)</option>
            <option>一致性哈希 (Consistent Hash)</option>
          </select>
        </div>
        <EditableField label="扩容阈值 (%)" value={values.scaleUpThreshold} onChange={v => updateValue("scaleUpThreshold", v)} type="number" description="GPU 利用率超过此值时触发扩容" />
        <EditableField label="缩容阈值 (%)" value={values.scaleDownThreshold} onChange={v => updateValue("scaleDownThreshold", v)} type="number" description="GPU 利用率低于此值时触发缩容" />
      </div>
    </div>
  );
}

// ============================================================
// Storage 存储
// ============================================================

export function StorageSection({ settings, values, updateValue, toggleSetting }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-[#e0f0ff] mb-4" style={{ fontSize: "0.95rem" }}>存储配置</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {[
          { label: "总存储", value: "48 TB", used: "12.8 TB", pct: 27, color: "#00d4ff" },
          { label: "向量数据库", value: "8 TB", used: "5.2 TB", pct: 65, color: "#00ff88" },
          { label: "模型仓库", value: "20 TB", used: "4.8 TB", pct: 24, color: "#aa55ff" },
          { label: "日志存储", value: "10 TB", used: "2.8 TB", pct: 28, color: "#ffdd00" },
        ].map((store) => (
          <div key={store.label} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#c0dcf0]" style={{ fontSize: "0.8rem" }}>{store.label}</span>
              <span style={{ fontSize: "0.7rem", color: store.color }}>{store.used} / {store.value}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[rgba(0,180,255,0.08)]">
              <div className="h-full rounded-full transition-all" style={{
                width: `${store.pct}%`,
                backgroundColor: store.color,
                opacity: 0.7,
              }} />
            </div>
            <div className="text-right mt-1">
              <span style={{ fontSize: "0.65rem", color: store.color }}>{store.pct}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>自动备份</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>按 Cron 计划自动备份</p>
          </div>
          <Toggle enabled={settings.autoBackup} onChange={() => toggleSetting("autoBackup")} />
        </div>
        <EditableField label="备份调度 (Cron)" value={values.backupSchedule} onChange={v => updateValue("backupSchedule", v)} mono description="默认每天凌晨 2:00" />
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
          <div>
            <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>数据压缩</p>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>启用传输和存储压缩</p>
          </div>
          <Toggle enabled={settings.dataCompression} onChange={() => toggleSetting("dataCompression")} />
        </div>
      </div>
    </div>
  );
}
