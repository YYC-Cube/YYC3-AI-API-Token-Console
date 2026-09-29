/**
 * DataEditorPanel.tsx — 数据管理面板主壳（批8 自治 Tab 拆分）
 * ===========================================================
 * 路由: /data-editor
 * 职责: 仅导航（Tab 切换/搜索/计数徽标）+ 条件渲染委派。
 * 全部 CRUD/编辑会话/批选/排序已下放 data-editor/ 自治 Tab;
 * 规范: 新增分区放 data-editor/ sibling, 禁止回填主壳。
 *
 * Tab 清单:
 * - db 族 (Models/Nodes/AgentsTab): localStorage 持久化 CRUD, 计数经 onCountChange 上报
 * - store 族 (LiveNodes/ModelPerf/RecentOps/RadarData/ModelDist/LogsData): dashboard store 单例, 计数直查 store.count()
 * - export: ConfigExportCenter 配置中心
 */
import {
  Activity, BarChart3, Bot,
  Cpu, Package, PieChart, Radar,
  ScrollText, Search, Server, Zap
} from "lucide-react";
import React, { useCallback, useContext, useState } from "react";
import { ViewContext } from "../lib/view-context";
import {
  logStore, modelDistStore, modelPerfStore, nodeStore, radarStore, recentOpsStore,
} from "../stores/dashboard-stores";
import { AgentsTab } from "./data-editor/agents-tab";
import { ModelsTab } from "./data-editor/models-tab";
import { NodesTab } from "./data-editor/nodes-tab";
import { LiveNodesTab, ModelPerfTab, RecentOpsTab } from "./data-editor/store-tabs-a";
import { LogsDataTab, ModelDistTab, RadarDataTab } from "./data-editor/store-tabs-b";
import { ConfigExportCenter } from "./ConfigExportCenter";

type ActiveTab = "models" | "nodes" | "agents" | "export" | "liveNodes" | "modelPerf" | "recentOps" | "radarData" | "modelDist" | "logsData";

const TABS: { key: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "models", label: "模型管理", icon: <Cpu className="w-4 h-4" />, color: "#00d4ff" },
  { key: "nodes", label: "节点管理", icon: <Server className="w-4 h-4" />, color: "#00ff88" },
  { key: "agents", label: "Agent 管理", icon: <Bot className="w-4 h-4" />, color: "#aa77ff" },
  { key: "liveNodes", label: "实时节点", icon: <Activity className="w-4 h-4" />, color: "#ff6600" },
  { key: "modelPerf", label: "模型性能", icon: <BarChart3 className="w-4 h-4" />, color: "#ffdd00" },
  { key: "recentOps", label: "操作记录", icon: <Zap className="w-4 h-4" />, color: "#ff3366" },
  { key: "radarData", label: "雷达数据", icon: <Radar className="w-4 h-4" />, color: "#00ccaa" },
  { key: "modelDist", label: "模型分布", icon: <PieChart className="w-4 h-4" />, color: "#cc66ff" },
  { key: "logsData", label: "日志管理", icon: <ScrollText className="w-4 h-4" />, color: "#ff8844" },
  { key: "export", label: "配置中心", icon: <Package className="w-4 h-4" />, color: "#ffaa00" },
];

// ============================================================
// Main Component（主壳: 导航 + 委派）
// ============================================================
export function DataEditorPanel() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const [activeTab, setActiveTab] = useState<ActiveTab>("models");
  const [searchQuery, setSearchQuery] = useState("");

  // db 族计数徽标（自治 Tab 经 onCountChange 上报; 稳定引用防 effect 环）
  const [dbCounts, setDbCounts] = useState({ models: 0, nodes: 0, agents: 0 });
  const onModelsCount = useCallback((n: number) => setDbCounts((p) => (p.models === n ? p : { ...p, models: n })), []);
  const onNodesCount = useCallback((n: number) => setDbCounts((p) => (p.nodes === n ? p : { ...p, nodes: n })), []);
  const onAgentsCount = useCallback((n: number) => setDbCounts((p) => (p.agents === n ? p : { ...p, agents: n })), []);

  const handleTabClick = useCallback((key: ActiveTab) => {
    setActiveTab(key);
    setSearchQuery("");
  }, []);

  const tabCount = (key: ActiveTab): number => {
    switch (key) {
      case "models": return dbCounts.models;
      case "nodes": return dbCounts.nodes;
      case "agents": return dbCounts.agents;
      case "liveNodes": return nodeStore.count();
      case "modelPerf": return modelPerfStore.count();
      case "recentOps": return recentOpsStore.count();
      case "radarData": return radarStore.count();
      case "modelDist": return modelDistStore.count();
      case "logsData": return logStore.count();
      default: return 0;
    }
  };

  // ═══ Render ═══
  return (
    <div className="space-y-4" data-testid="data-editor-panel">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
          <Cpu className="w-5 h-5 text-[#00d4ff]" />
        </div>
        <div>
          <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
            数据管理
          </h2>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
            模型 · 节点 · Agent — 完全可编辑 CRUD + 持久化
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = tabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all ${active
                ? "bg-[rgba(0,140,200,0.15)] border border-[rgba(0,180,255,0.3)] text-[#00d4ff]"
                : "text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,100,150,0.08)] border border-transparent"
                }`}
              style={{ fontSize: "0.78rem" }}
            >
              <span style={{ color: active ? tab.color : undefined }}>{tab.icon}</span>
              {tab.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.55rem" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── 搜索 ── */}
      {activeTab !== "export" && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,212,255,0.3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.3)] transition-all"
            style={{ fontSize: "0.78rem" }}
          />
        </div>
      )}

      {/* ── Tab 内容（条件渲染, 卸载即重置编辑会话）── */}
      {activeTab === "export" && <ConfigExportCenter />}
      {activeTab === "models" && <ModelsTab searchQuery={searchQuery} onCountChange={onModelsCount} />}
      {activeTab === "nodes" && <NodesTab searchQuery={searchQuery} onCountChange={onNodesCount} />}
      {activeTab === "agents" && <AgentsTab searchQuery={searchQuery} onCountChange={onAgentsCount} />}
      {activeTab === "liveNodes" && <LiveNodesTab isMobile={isMobile} searchQuery={searchQuery} />}
      {activeTab === "modelPerf" && <ModelPerfTab isMobile={isMobile} searchQuery={searchQuery} />}
      {activeTab === "recentOps" && <RecentOpsTab isMobile={isMobile} searchQuery={searchQuery} />}
      {activeTab === "radarData" && <RadarDataTab isMobile={isMobile} searchQuery={searchQuery} />}
      {activeTab === "modelDist" && <ModelDistTab isMobile={isMobile} searchQuery={searchQuery} />}
      {activeTab === "logsData" && <LogsDataTab isMobile={isMobile} searchQuery={searchQuery} />}
    </div>
  );
}
