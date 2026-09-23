/**
 * NetworkConfig.tsx
 * =================
 * 网络连接配置弹窗组件
 * - 三种配置方式：自动检测 / WiFi 配置 / 手动配置
 * - GlassCard 统一风格
 * - 连接测试 + 状态指示
 */

import {
  AlertTriangle,
  Check,
  Clock,
  Globe,
  HardDrive,
  History,
  Loader2,
  Monitor,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNetworkConfig } from "../hooks/useNetworkConfig";
import {
  getWifiAutoReconnectConfig,
  updateWifiAutoReconnectConfig, wifiNetworkStore, type WifiAutoReconnectSettings, type WifiNetwork
} from "../stores/dashboard-stores";
import type { TestStatus } from "../types";
import { GlassCard } from "./GlassCard";

/** Navigator.connection — Network Information API (W3C 草案, TS DOM 未收录) */
interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    type?: string;
    downlink?: number;
    rtt?: number;
  };
}

interface NetworkConfigProps {
  open: boolean;
  onClose: () => void;
}

const tabs = [
  { id: "auto", label: "自动检测", icon: Radio },
  { id: "wifi", label: "WiFi 配置", icon: Wifi },
  { id: "manual", label: "手动配置", icon: Settings },
  { id: "history", label: "连接历史", icon: History },
] as const;

type TabId = (typeof tabs)[number]["id"];

function StatusBadge({ status }: { status: TestStatus }) {
  if (status === "idle") return null;
  const map = {
    testing: {
      bg: "bg-[rgba(0,212,255,0.15)]",
      text: "text-[#00d4ff]",
      label: "测试中...",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    success: {
      bg: "bg-[rgba(0,255,136,0.15)]",
      text: "text-[#00ff88]",
      label: "连接成功",
      icon: <Check className="w-3.5 h-3.5" />,
    },
    failed: {
      bg: "bg-[rgba(255,51,102,0.15)]",
      text: "text-[#ff3366]",
      label: "连接失败",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${s.bg} ${s.text}`}
      style={{ fontSize: "0.72rem" }}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

export function NetworkConfig({ open, onClose }: NetworkConfigProps) {
  const {
    config,
    interfaces,
    localIP,
    testStatus,
    testLatency,
    testError,
    detecting,
    updateConfig,
    save,
    reset,
    detectNetwork,
    testConnection,
  } = useNetworkConfig();

  const [activeTab, setActiveTab] = useState<TabId>("auto");
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>(() => wifiNetworkStore.getAll());
  const [wifiScanning, setWifiScanning] = useState(false);
  const [editingWifi, setEditingWifi] = useState<string | null>(null);
  const [wifiPassword, setWifiPassword] = useState("");

  // GAP-002: WiFi 自动重连设置 localStorage 持久化
  const [arConfig, setArConfig] = useState<WifiAutoReconnectSettings>(() => getWifiAutoReconnectConfig());

  const updateArSetting = <K extends keyof WifiAutoReconnectSettings>(
    key: K,
    value: WifiAutoReconnectSettings[K]
  ) => {
    const updated = updateWifiAutoReconnectConfig({ [key]: value });
    if (updated) {
      setArConfig(updated);
      toast.success("自动重连设置已保存", {
        style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" },
      });
    }
  };

  const refreshWifiFromStore = () => setWifiNetworks(wifiNetworkStore.getAll());

  const scanWifi = async () => {
    setWifiScanning(true);
    await new Promise(r => setTimeout(r, 1500));
    // Scanned networks (simulated)
    const scannedList = [
      { ssid: "YYC3-Matrix-5G", signal: 92, security: "WPA3" },
      { ssid: "YYC3-Matrix-2.4G", signal: 85, security: "WPA2" },
      { ssid: "YYC3-Lab-Internal", signal: 78, security: "WPA2-Enterprise" },
      { ssid: "iMac-Direct-Link", signal: 95, security: "WPA3" },
      { ssid: "MacStudio-Hotspot", signal: 70, security: "WPA2" },
      { ssid: "EdgeNode-WiFi", signal: 55, security: "WPA2" },
    ];
    // Merge with existing stored data (preserve connected state & passwords)
    const existing = wifiNetworkStore.getAll();
    const existingMap = new Map(existing.map(n => [n.ssid, n]));

    // Clear old and rebuild
    for (const old of existing) wifiNetworkStore.remove(old.id);
    for (const s of scannedList) {
      const prev = existingMap.get(s.ssid);
      wifiNetworkStore.add({
        ssid: s.ssid,
        signal: s.signal,
        security: s.security,
        connected: prev?.connected ?? false,
        password: prev?.password,
        lastConnectedAt: prev?.lastConnectedAt,
      });
    }
    refreshWifiFromStore();
    setWifiScanning(false);
    toast.success("扫描完成，发现 " + scannedList.length + " 个网络", {
      style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" },
    });
  };

  const connectWifi = (ssid: string) => {
    const all = wifiNetworkStore.getAll();
    // Disconnect all first, then connect target
    for (const n of all) {
      if (n.connected && n.ssid !== ssid) {
        wifiNetworkStore.update(n.id, { connected: false });
      }
    }
    const target = all.find(n => n.ssid === ssid);
    if (target) {
      wifiNetworkStore.update(target.id, {
        connected: true,
        password: wifiPassword || target.password,
        lastConnectedAt: Date.now(),
      });
    }
    setEditingWifi(null);
    setWifiPassword("");
    refreshWifiFromStore();
    toast.success(`已连接到 ${ssid}`, {
      style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" },
    });
  };

  const disconnectWifi = (ssid: string) => {
    const target = wifiNetworks.find(n => n.ssid === ssid);
    if (target) {
      wifiNetworkStore.update(target.id, { connected: false });
      refreshWifiFromStore();
      toast.info(`已断开 ${ssid}`);
    }
  };

  if (!open) return null;

  const handleSave = () => {
    save();
    toast.success("网络配置已保存", {
      description: `WebSocket: ${config.wsUrl}`,
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        color: "#e0f0ff",
      },
    });
  };

  const handleTest = async () => {
    const result = await testConnection();
    if (result.success) {
      toast.success(`连接成功 (${result.latency}ms)`, {
        style: {
          background: "rgba(8, 25, 55, 0.95)",
          border: "1px solid rgba(0, 255, 136, 0.3)",
          color: "#e0f0ff",
        },
      });
    } else {
      toast.error(`连接失败: ${result.error}`, {
        style: {
          background: "rgba(8, 25, 55, 0.95)",
          border: "1px solid rgba(255, 51, 102, 0.3)",
          color: "#e0f0ff",
        },
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <GlassCard className="relative z-10 w-full max-w-xl mx-4 max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,180,255,0.1)]">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#00d4ff]" />
            <h2
              className="text-[#e0f0ff]"
              style={{ fontSize: "1rem" }}
            >
              网络连接配置
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
          >
            <X className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                updateConfig({ mode: tab.id === "wifi" ? "wifi" : tab.id === "manual" ? "manual" : "auto" });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${activeTab === tab.id
                ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff] border border-[rgba(0,212,255,0.3)]"
                : "text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.05)] border border-transparent"
                }`}
              style={{ fontSize: "0.8rem" }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Auto Detect Tab */}
          {activeTab === "auto" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[rgba(0,212,255,0.6)]"
                    style={{ fontSize: "0.78rem" }}
                  >
                    自动检测 (WebRTC)
                  </span>
                  <button
                    onClick={detectNetwork}
                    disabled={detecting}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all disabled:opacity-50"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${detecting ? "animate-spin" : ""}`}
                    />
                    刷新检测
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[rgba(0,212,255,0.4)]"
                      style={{ fontSize: "0.75rem" }}
                    >
                      本机 IP
                    </span>
                    <span
                      className="text-[#00d4ff] font-mono"
                      style={{ fontSize: "0.8rem" }}
                    >
                      {localIP}
                    </span>
                  </div>

                  {interfaces.map((iface) => (
                    <div
                      key={iface.name}
                      className="flex items-center justify-between"
                    >
                      <span
                        className="text-[rgba(0,212,255,0.4)]"
                        style={{ fontSize: "0.75rem" }}
                      >
                        {iface.name} ({iface.type})
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[#c0dcf0] font-mono"
                          style={{ fontSize: "0.75rem" }}
                        >
                          {iface.ip}
                        </span>
                        <div
                          className={`w-2 h-2 rounded-full ${iface.status === "active"
                            ? "bg-[#00ff88]"
                            : "bg-[#ff3366]"
                            }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                <div className="flex items-center gap-2 mb-2">
                  {navigator.onLine ? (
                    <Wifi className="w-4 h-4 text-[#00ff88]" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-[#ff3366]" />
                  )}
                  <span
                    className={navigator.onLine ? "text-[#00ff88]" : "text-[#ff3366]"}
                    style={{ fontSize: "0.78rem" }}
                  >
                    {navigator.onLine ? "网络已连接" : "网络未连接"}
                  </span>
                </div>
                <span
                  className="text-[rgba(0,212,255,0.35)]"
                  style={{ fontSize: "0.68rem" }}
                >
                  检测到的网络类型：{(navigator as NavigatorWithConnection).connection?.effectiveType || "未知"}
                </span>
              </div>
            </div>
          )}

          {/* WiFi Tab */}
          {activeTab === "wifi" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-[#00d4ff]" />
                  <span
                    className="text-[rgba(0,212,255,0.6)]"
                    style={{ fontSize: "0.78rem" }}
                  >
                    WiFi 网络信息
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "网络状态", value: navigator.onLine ? "已连接" : "未连接" },
                    { label: "连接类型", value: (navigator as NavigatorWithConnection).connection?.effectiveType || "4g" },
                    { label: "下行带宽", value: `${(navigator as NavigatorWithConnection).connection?.downlink || "~10"} Mbps` },
                    { label: "RTT", value: `${(navigator as NavigatorWithConnection).connection?.rtt || "~50"} ms` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.75rem" }}>
                        {item.label}
                      </span>
                      <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(0,212,255,0.03)] border border-[rgba(0,180,255,0.08)]">
                <p className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.7rem" }}>
                  WiFi 配置将自动使用检测到的网络接口。在 M4 Max 主节点和 iMac 辅助节点之间自动路由。
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-[#00d4ff]" />
                  <span
                    className="text-[rgba(0,212,255,0.6)]"
                    style={{ fontSize: "0.78rem" }}
                  >
                    WiFi 网络扫描
                  </span>
                </div>
                <button
                  onClick={scanWifi}
                  disabled={wifiScanning}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all disabled:opacity-50"
                  style={{ fontSize: "0.72rem" }}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${wifiScanning ? "animate-spin" : ""}`}
                  />
                  扫描网络
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <Wifi className="w-4 h-4 text-[#00d4ff]" />
                  <span
                    className="text-[rgba(0,212,255,0.6)]"
                    style={{ fontSize: "0.78rem" }}
                  >
                    WiFi 网络列表
                  </span>
                </div>
                <div className="space-y-2">
                  {wifiNetworks.length === 0 && (
                    <p className="text-[rgba(0,212,255,0.3)] text-center py-3" style={{ fontSize: "0.72rem" }}>
                      请点击"扫描网络"发现可用 WiFi
                    </p>
                  )}
                  {wifiNetworks.map((network) => (
                    <div key={network.id} className={`flex items-center justify-between p-2 rounded-lg transition-all ${network.connected ? "bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.15)]" : "hover:bg-[rgba(0,212,255,0.03)]"}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${network.connected ? "bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]" : "bg-[rgba(0,212,255,0.2)]"}`} />
                        <div className="min-w-0">
                          <span className={`block truncate ${network.connected ? "text-[#00ff88]" : "text-[rgba(0,212,255,0.5)]"}`} style={{ fontSize: "0.75rem" }}>
                            {network.ssid}
                          </span>
                          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                            {network.security} · {network.signal}%
                            {network.lastConnectedAt ? ` · 上次连接: ${new Date(network.lastConnectedAt).toLocaleString("zh-CN")}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {/* Signal bars */}
                        <div className="flex items-end gap-0.5 h-3.5">
                          {[20, 40, 60, 80].map((threshold, i) => (
                            <div key={i} className={`w-1 rounded-sm ${network.signal >= threshold ? "bg-[#00d4ff]" : "bg-[rgba(0,212,255,0.15)]"}`}
                              style={{ height: `${40 + i * 20}%` }} />
                          ))}
                        </div>
                        {network.connected ? (
                          <button
                            onClick={() => disconnectWifi(network.ssid)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)] transition-all"
                            style={{ fontSize: "0.68rem" }}
                          >
                            断开
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingWifi(network.ssid)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
                            style={{ fontSize: "0.68rem" }}
                          >
                            <Radio className="w-3 h-3" />
                            连接
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editingWifi && (
                <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Wifi className="w-4 h-4 text-[#00d4ff]" />
                    <span
                      className="text-[rgba(0,212,255,0.6)]"
                      style={{ fontSize: "0.78rem" }}
                    >
                      输入密码
                    </span>
                  </div>
                  <input
                    type="password"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="WiFi 密码"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                    style={{ fontSize: "0.8rem" }}
                  />
                  <button
                    onClick={() => connectWifi(editingWifi)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Radio className="w-4 h-4" />
                    连接
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Manual Tab */}
          {activeTab === "manual" && (
            <div className="space-y-3">
              {[
                {
                  label: "服务器地址",
                  value: config.serverAddress,
                  key: "serverAddress" as const,
                  icon: Server,
                  placeholder: "192.168.3.45",
                },
                {
                  label: "端口",
                  value: config.port,
                  key: "port" as const,
                  icon: Monitor,
                  placeholder: "3113",
                },
                {
                  label: "NAS 地址",
                  value: config.nasAddress,
                  key: "nasAddress" as const,
                  icon: HardDrive,
                  placeholder: "192.168.3.45:9898",
                },
              ].map((field) => (
                <div
                  key={field.key}
                  className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <field.icon className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                    <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>
                      {field.label}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateConfig({ [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.5)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                    style={{ fontSize: "0.8rem" }}
                  />
                </div>
              ))}

              {/* Auto-generated WebSocket URL */}
              <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                  <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>
                    WebSocket URL
                  </span>
                  <span className="text-[rgba(0,212,255,0.25)] ml-auto" style={{ fontSize: "0.65rem" }}>
                    自动生成
                  </span>
                </div>
                <input
                  type="text"
                  value={config.wsUrl}
                  onChange={(e) => updateConfig({ wsUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.5)]"
                  style={{ fontSize: "0.8rem" }}
                />
              </div>
            </div>
          )}

          {/* Connection History Tab */}
          {activeTab === "history" && (() => {
            const allNetworks = wifiNetworkStore.getAll();
            const historyNetworks = allNetworks
              .filter(n => n.lastConnectedAt)
              .sort((a, b) => (b.lastConnectedAt || 0) - (a.lastConnectedAt || 0));
            const connectedNetwork = allNetworks.find(n => n.connected);

            return (
              <div className="space-y-3">
                {/* Auto-reconnect settings */}
                <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <RotateCcw className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.78rem" }}>
                      自动重连设置
                    </span>
                  </div>
                  <div className="space-y-2">
                    {/* 自动重连开关 (可交互 + localStorage 持久化) */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                      <div>
                        <p className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>自动重连</p>
                        <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                          断开后自动尝试重连上次成功的网络
                        </p>
                      </div>
                      <button
                        onClick={() => updateArSetting("enabled", !arConfig.enabled)}
                        className={`relative w-9 h-5 rounded-full transition-all ${arConfig.enabled
                          ? "bg-[rgba(0,255,136,0.3)] border border-[rgba(0,255,136,0.4)]"
                          : "bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.15)]"
                          }`}
                        title={arConfig.enabled ? "已启用 - 点击关闭" : "已关闭 - 点击启用"}
                      >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${arConfig.enabled
                          ? "left-[18px] bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                          : "left-0.5 bg-[rgba(0,212,255,0.3)]"
                          }`} />
                      </button>
                    </div>
                    {/* 优先信号最强网络 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                      <div>
                        <p className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>优先信号最强</p>
                        <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                          优先连接信号最强的已知网络
                        </p>
                      </div>
                      <button
                        onClick={() => updateArSetting("preferStrongestSignal", !arConfig.preferStrongestSignal)}
                        className={`relative w-9 h-5 rounded-full transition-all ${arConfig.preferStrongestSignal
                          ? "bg-[rgba(0,255,136,0.3)] border border-[rgba(0,255,136,0.4)]"
                          : "bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.15)]"
                          }`}
                        title={arConfig.preferStrongestSignal ? "已启用" : "已关闭"}
                      >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${arConfig.preferStrongestSignal
                          ? "left-[18px] bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]"
                          : "left-0.5 bg-[rgba(0,212,255,0.3)]"
                          }`} />
                      </button>
                    </div>
                    {/* 优先网络显示 */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                      <div>
                        <p className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>优先网络</p>
                        <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>
                          指定优先连接的 SSID（留空则自动选择）
                        </p>
                      </div>
                      <input
                        type="text"
                        value={arConfig.preferredSsid}
                        onChange={(e) => updateArSetting("preferredSsid", e.target.value)}
                        placeholder={connectedNetwork?.ssid || historyNetworks[0]?.ssid || "自动"}
                        className="w-28 px-2 py-1 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] font-mono text-right focus:outline-none focus:border-[rgba(0,212,255,0.5)]"
                        style={{ fontSize: "0.72rem" }}
                      />
                    </div>
                    {/* 重连间隔 (可编辑) */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                      <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>重连间隔</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateArSetting("intervalSeconds", Math.max(1, arConfig.intervalSeconds - 1))}
                          className="w-5 h-5 rounded bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center justify-center"
                          style={{ fontSize: "0.72rem" }}
                        >-</button>
                        <span className="text-[#00d4ff] font-mono w-8 text-center" style={{ fontSize: "0.72rem" }}>
                          {arConfig.intervalSeconds}s
                        </span>
                        <button
                          onClick={() => updateArSetting("intervalSeconds", Math.min(60, arConfig.intervalSeconds + 1))}
                          className="w-5 h-5 rounded bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center justify-center"
                          style={{ fontSize: "0.72rem" }}
                        >+</button>
                      </div>
                    </div>
                    {/* 最大重试次数 (可编辑) */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
                      <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>最大重试次数</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateArSetting("maxRetries", Math.max(1, arConfig.maxRetries - 1))}
                          className="w-5 h-5 rounded bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center justify-center"
                          style={{ fontSize: "0.72rem" }}
                        >-</button>
                        <span className="text-[#00d4ff] font-mono w-8 text-center" style={{ fontSize: "0.72rem" }}>
                          {arConfig.maxRetries}
                        </span>
                        <button
                          onClick={() => updateArSetting("maxRetries", Math.min(50, arConfig.maxRetries + 1))}
                          className="w-5 h-5 rounded bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all flex items-center justify-center"
                          style={{ fontSize: "0.72rem" }}
                        >+</button>
                      </div>
                    </div>
                    {/* 上次更新时间 */}
                    <div className="flex items-center justify-end gap-1 pt-1">
                      <Clock className="w-2.5 h-2.5 text-[rgba(0,212,255,0.2)]" />
                      <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>
                        上次保存: {new Date(arConfig.lastUpdatedAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Current connection */}
                {connectedNetwork && (
                  <div className="p-3 rounded-xl bg-[rgba(0,255,136,0.03)] border border-[rgba(0,255,136,0.15)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Wifi className="w-4 h-4 text-[#00ff88]" />
                      <span className="text-[#00ff88]" style={{ fontSize: "0.78rem" }}>当前连接</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[#e0f0ff]" style={{ fontSize: "0.82rem" }}>{connectedNetwork.ssid}</p>
                        <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.62rem" }}>
                          {connectedNetwork.security} · 信号强度 {connectedNetwork.signal}%
                        </p>
                      </div>
                      <div className="flex items-end gap-0.5 h-4">
                        {[20, 40, 60, 80].map((threshold, i) => (
                          <div key={i} className={`w-1.5 rounded-sm ${connectedNetwork.signal >= threshold ? "bg-[#00ff88]" : "bg-[rgba(0,255,136,0.15)]"}`}
                            style={{ height: `${40 + i * 20}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Connection history */}
                <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-[rgba(0,212,255,0.6)]" style={{ fontSize: "0.78rem" }}>
                      连接历史记录
                    </span>
                    <span className="text-[rgba(0,212,255,0.25)] ml-auto" style={{ fontSize: "0.62rem" }}>
                      {historyNetworks.length} 条记录
                    </span>
                  </div>
                  <div className="space-y-2">
                    {historyNetworks.length === 0 && (
                      <p className="text-[rgba(0,212,255,0.3)] text-center py-4" style={{ fontSize: "0.72rem" }}>
                        暂无连接历史记录
                      </p>
                    )}
                    {historyNetworks.map((network) => (
                      <div key={network.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${network.connected ? "bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]" : "bg-[rgba(0,212,255,0.15)]"}`} />
                          <div className="min-w-0">
                            <span className={`block truncate ${network.connected ? "text-[#00ff88]" : "text-[#c0dcf0]"}`} style={{ fontSize: "0.78rem" }}>
                              {network.ssid}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                                {network.security}
                              </span>
                              <Clock className="w-2.5 h-2.5 text-[rgba(0,212,255,0.2)]" />
                              <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem" }}>
                                {network.lastConnectedAt
                                  ? new Date(network.lastConnectedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                                  : "--"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            connectWifi(network.ssid);
                            refreshWifiFromStore();
                          }}
                          disabled={network.connected}
                          className={`shrink-0 ml-2 px-2.5 py-1 rounded-lg transition-all ${network.connected
                            ? "bg-[rgba(0,255,136,0.05)] border border-[rgba(0,255,136,0.15)] text-[#00ff88] cursor-default"
                            : "bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.15)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.12)]"
                            }`}
                          style={{ fontSize: "0.65rem" }}
                        >
                          {network.connected ? "已连接" : "重连"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Test Result */}
          {testStatus !== "idle" && (
            <div
              className={`p-3 rounded-xl border ${testStatus === "success"
                ? "bg-[rgba(0,255,136,0.05)] border-[rgba(0,255,136,0.2)]"
                : testStatus === "failed"
                  ? "bg-[rgba(255,51,102,0.05)] border-[rgba(255,51,102,0.2)]"
                  : "bg-[rgba(0,212,255,0.05)] border-[rgba(0,212,255,0.2)]"
                }`}
            >
              <div className="flex items-center justify-between">
                <StatusBadge status={testStatus} />
                {testLatency > 0 && (
                  <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>
                    延迟: {testLatency}ms
                  </span>
                )}
              </div>
              {testError && (
                <p className="text-[#ff3366] mt-1.5" style={{ fontSize: "0.72rem" }}>
                  {testError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-4 border-t border-[rgba(0,180,255,0.1)]">
          <button
            onClick={handleTest}
            disabled={testStatus === "testing"}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all disabled:opacity-50"
            style={{ fontSize: "0.8rem" }}
          >
            {testStatus === "testing" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Radio className="w-4 h-4" />
            )}
            测试连接
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all shadow-[0_0_15px_rgba(0,180,255,0.1)]"
            style={{ fontSize: "0.8rem" }}
          >
            <Check className="w-4 h-4" />
            保存配置
          </button>
          <button
            onClick={reset}
            className="ml-auto text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.75rem" }}
          >
            重置默认
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
