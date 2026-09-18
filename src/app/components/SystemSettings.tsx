import {
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Clock,
  Code,
  Cpu,
  Database,
  Download,
  Edit2,
  Eye, EyeOff,
  Globe,
  Key, Layers,
  Monitor, Network,
  Plug,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Save,
  Server,
  Settings,
  Shield,
  Sliders,
  Terminal,
  Timer,
  Trash2,
  Upload,
  Wifi,
  X,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "../hooks/useI18n";
import { useModelProvider } from "../hooks/useModelProvider";
import { useSettingsStore } from "../hooks/useSettingsStore";
import {
  ENDPOINT_META,
  getAPIConfig,
  onAPIConfigChange,
  resetAPIConfig as resetAPIConfigDefaults,
  setAPIConfig,
  type APIEndpoints,
} from "../lib/api-config";
import { deployedModelStore, type DeployedModel } from "../stores/dashboard-stores";
import { GlassCard } from "./GlassCard";
import { NetworkConfig } from "./NetworkConfig";
import { YYC3Logo } from "./YYC3Logo";

// ============================================================
// Settings sections config
// ============================================================

const settingsSections = [
  { id: "general", labelKey: "settings.general", icon: Settings },
  { id: "network", labelKey: "settings.network", icon: Globe },
  { id: "cluster", labelKey: "settings.cluster", icon: Server },
  { id: "model", labelKey: "settings.model", icon: Cpu },
  { id: "storage", labelKey: "settings.storage", icon: Database },
  { id: "websocket", labelKey: "settings.websocket", icon: Wifi },
  { id: "ai", labelKey: "settings.aiLlm", icon: Sliders },
  { id: "pwa", labelKey: "settings.pwaOffline", icon: Monitor },
  { id: "security", labelKey: "settings.security", icon: Shield },
  { id: "notification", labelKey: "settings.notification", icon: Bell },
  { id: "env", labelKey: "settings.envVars", icon: Terminal },
  { id: "advanced", labelKey: "settings.advanced", icon: Code },
];

// ============================================================
// Toggle component
// ============================================================

interface ToggleProps {
  enabled: boolean;
  onChange: (val: boolean) => void;
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled
        ? "bg-[rgba(0,212,255,0.3)] border border-[rgba(0,212,255,0.5)]"
        : "bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)]"
        }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${enabled
        ? "left-[22px] bg-[#00d4ff] shadow-[0_0_10px_rgba(0,212,255,0.5)]"
        : "left-0.5 bg-[rgba(0,180,255,0.3)]"
        }`} />
    </button>
  );
}

// ============================================================
// Editable field component
// ============================================================

interface EditableFieldProps {
  label: string;
  description?: string;
  value: string;
  onChange: (val: string) => void;
  type?: "text" | "number" | "password" | "url" | "email";
  placeholder?: string;
  mono?: boolean;
}

function EditableField({ label, description, value, onChange, type = "text", placeholder, mono }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{label}</p>
        <button
          onClick={() => setEditing(!editing)}
          className={`p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all ${editing ? "text-[#00d4ff]" : "text-[rgba(0,212,255,0.3)]"}`}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {description && (
        <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.68rem" }}>{description}</p>
      )}
      {editing ? (
        <div className="relative">
          <input
            type={type === "password" && !showPwd ? "password" : "text"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] focus:outline-none focus:shadow-[0_0_10px_rgba(0,180,255,0.1)] ${mono ? "font-mono" : ""}`}
            style={{ fontSize: "0.8rem" }}
            autoFocus
          />
          {type === "password" && (
            <button
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[rgba(0,212,255,0.1)]"
            >
              {showPwd ? <EyeOff className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /> : <Eye className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />}
            </button>
          )}
        </div>
      ) : (
        <span className={`text-[rgba(0,212,255,0.6)] ${mono ? "font-mono" : ""}`} style={{ fontSize: "0.78rem" }}>
          {type === "password" ? "••••••••" : (value || "-")}
        </span>
      )}
    </div>
  );
}

// ============================================================
// API Endpoint Config Sub-component
// ============================================================

function APIEndpointConfig() {
  const [apiConfig, setApiConfigState] = useState<APIEndpoints>(getAPIConfig());

  // 监听跨标签页变更
  useEffect(() => {
    return onAPIConfigChange((config) => {
      setApiConfigState(config);
    });
  }, []);

  const updateField = useCallback((key: keyof APIEndpoints, value: string | boolean | number) => {
    const patch: Partial<APIEndpoints> = {};
    (patch as Record<string, unknown>)[key] = value;
    const updated = setAPIConfig(patch);
    setApiConfigState(updated);
    toast.success(`已更新: ${key}`, {
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        color: "#e0f0ff",
      },
    });
  }, []);

  const handleReset = useCallback(() => {
    const defaults = resetAPIConfigDefaults();
    setApiConfigState(defaults);
    toast.info("API 配置已重置为默认值");
  }, []);

  // Group ENDPOINT_META by group
  const groups = ENDPOINT_META.reduce<Record<string, typeof ENDPOINT_META>>((acc, meta) => {
    const g = meta.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(meta);
    return acc;
  }, {});

  return (
    <div className="p-4 rounded-xl bg-[rgba(0,20,40,0.4)] border border-[rgba(0,180,255,0.1)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-[#00d4ff]" />
          <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>后端 API 端点配置</h4>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
          style={{ fontSize: "0.68rem" }}
        >
          <RotateCcw className="w-3 h-3" />
          重置默认
        </button>
      </div>

      <p className="text-[rgba(0,212,255,0.35)] mb-4" style={{ fontSize: "0.68rem" }}>
        控制后端 API 连接参数。关闭「启用后端 API」时使用前端 Mock 数据，无需真实后端服务。
      </p>

      {Object.entries(groups).map(([groupName, metas]) => (
        <div key={groupName} className="mb-4 last:mb-0">
          <p className="text-[rgba(0,212,255,0.5)] mb-2 px-1" style={{ fontSize: "0.7rem" }}>
            {groupName}
          </p>
          <div className="space-y-2">
            {metas.map((meta) => {
              const val = apiConfig[meta.key];

              if (meta.type === "boolean") {
                return (
                  <div key={meta.key} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                      <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.64rem" }}>{meta.description}</p>
                    </div>
                    <Toggle enabled={!!val} onChange={(v) => updateField(meta.key, v)} />
                  </div>
                );
              }

              if (meta.type === "number") {
                const numVal = Number(val) || 0;
                const isRetries = meta.key === "maxRetries";

                return (
                  <div key={meta.key} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isRetries ? <Repeat className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" /> : <Timer className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />}
                        <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                      </div>
                      <span className="text-[#00d4ff] font-mono" style={{ fontSize: "0.78rem" }}>{numVal}</span>
                    </div>
                    <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.64rem" }}>{meta.description}</p>

                    {isRetries ? (
                      /* maxRetries: 可视化滑块 0~5 */
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={1}
                          value={numVal}
                          onChange={(e) => updateField(meta.key, parseInt(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, rgba(0,212,255,0.6) ${(numVal / 5) * 100}%, rgba(0,40,80,0.4) ${(numVal / 5) * 100}%)`,
                            accentColor: "#00d4ff",
                          }}
                        />
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4, 5].map(n => (
                            <button
                              key={n}
                              onClick={() => updateField(meta.key, n)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${numVal === n
                                ? "bg-[rgba(0,212,255,0.2)] border border-[rgba(0,212,255,0.5)] text-[#00d4ff]"
                                : "bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]"
                                }`}
                              style={{ fontSize: "0.65rem" }}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* timeout: 数字输入框 */
                      <input
                        type="number"
                        value={numVal}
                        onChange={(e) => updateField(meta.key, parseInt(e.target.value) || 0)}
                        min={1000}
                        max={120000}
                        step={1000}
                        className="w-full px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                        style={{ fontSize: "0.78rem" }}
                      />
                    )}

                    {/* maxRetries 额外提示 */}
                    {isRetries && (
                      <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[rgba(0,212,255,0.06)]">
                        <Repeat className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0" />
                        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>
                          {numVal === 0
                            ? "不重试，请求失败立即返回"
                            : `失败后最多重试 ${numVal} 次 (指数退避: ${[500, 1000, 2000, 4000, 8000].slice(0, numVal).join("ms → ")}ms)`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }

              // URL type
              return (
                <div key={meta.key} className="p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.15)] transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                    <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{meta.labelCn}</p>
                  </div>
                  <p className="text-[rgba(0,212,255,0.35)] mb-2" style={{ fontSize: "0.64rem" }}>{meta.description}</p>
                  <input
                    type="text"
                    value={String(val)}
                    onChange={(e) => updateField(meta.key, e.target.value)}
                    placeholder={meta.placeholder}
                    className="w-full px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] font-mono focus:outline-none focus:border-[rgba(0,212,255,0.4)] focus:shadow-[0_0_10px_rgba(0,180,255,0.1)]"
                    style={{ fontSize: "0.78rem" }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 当前配置状态概要 */}
      <div className="mt-4 p-3 rounded-lg bg-[rgba(0,20,40,0.6)] border border-[rgba(0,180,255,0.06)]">
        <p className="text-[rgba(0,212,255,0.3)] mb-2" style={{ fontSize: "0.62rem" }}>当前配置概要</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="text-center">
            <p className={`font-mono ${apiConfig.enableBackend ? "text-[#00ff88]" : "text-[rgba(255,100,100,0.6)]"}`} style={{ fontSize: "0.75rem" }}>
              {apiConfig.enableBackend ? "已启用" : "Mock 模式"}
            </p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>后端 API</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono" style={{ fontSize: "0.75rem" }}>{apiConfig.timeout / 1000}s</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>超时</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono" style={{ fontSize: "0.75rem" }}>{apiConfig.maxRetries}x</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>最大重试</p>
          </div>
          <div className="text-center">
            <p className="text-[#00d4ff] font-mono truncate" style={{ fontSize: "0.75rem" }}>{apiConfig.dbBase}</p>
            <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.58rem" }}>数据库 API</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Model Management Section (CRUD)
// ============================================================

const MODEL_STATUS_OPTIONS: DeployedModel["status"][] = ["deployed", "deploying", "standby", "error"];
const MODEL_STATUS_LABELS: Record<DeployedModel["status"], string> = {
  deployed: "已部署", deploying: "部署中", standby: "待命", error: "异常",
};

function ModelManagementSection({ settings, toggleSetting }: { settings: Record<string, boolean>; toggleSetting: (key: any) => void }) {
  const [models, setModels] = useState<DeployedModel[]>(deployedModelStore.getAll());
  const [editModel, setEditModel] = useState<DeployedModel | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editConfirm, setEditConfirm] = useState<string | null>(null);

  // form state
  const [fName, setFName] = useState("");
  const [fVersion, setFVersion] = useState("");
  const [fSize, setFSize] = useState("");
  const [fStatus, setFStatus] = useState<DeployedModel["status"]>("standby");
  const [fGpu, setFGpu] = useState("");

  const refresh = () => setModels(deployedModelStore.getAll());

  const openAdd = () => {
    setEditModel(null);
    setFName(""); setFVersion("v1.0"); setFSize(""); setFStatus("standby"); setFGpu("-");
    setIsAdding(true);
  };

  const openEdit = (m: DeployedModel) => {
    setIsAdding(false);
    setEditModel(m);
    setFName(m.name); setFVersion(m.version); setFSize(m.size); setFStatus(m.status); setFGpu(m.gpu);
  };

  const closeForm = () => { setEditModel(null); setIsAdding(false); };

  const handleSave = () => {
    if (!fName.trim()) { toast.error("模型名称不能为空"); return; }
    if (isAdding) {
      deployedModelStore.add({ name: fName.trim(), version: fVersion.trim(), size: fSize.trim(), status: fStatus, gpu: fGpu.trim() || "-" });
      toast.success(`模型 ${fName} 已添加`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    } else if (editModel) {
      deployedModelStore.update(editModel.id, { name: fName.trim(), version: fVersion.trim(), size: fSize.trim(), status: fStatus, gpu: fGpu.trim() || "-" });
      toast.success(`模型 ${fName} 已更新`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    }
    closeForm();
    refresh();
  };

  const handleDelete = (id: string) => {
    const m = deployedModelStore.getById(id);
    deployedModelStore.remove(id);
    toast.success(`模型 ${m?.name || ""} 已删除`, { style: { background: "rgba(8,25,55,0.95)", border: "1px solid rgba(0,255,136,0.3)", color: "#e0f0ff" } });
    setDeleteConfirm(null);
    refresh();
  };

  const handleReset = () => {
    deployedModelStore.reset();
    refresh();
    toast.info("模型列表已重置为默认值");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.95rem" }}>模型管理</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
            style={{ fontSize: "0.68rem" }}
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
            style={{ fontSize: "0.72rem" }}
          >
            <Plus className="w-3.5 h-3.5" />
            添加模型
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editModel) && (
        <div className="p-4 rounded-xl bg-[rgba(0,20,40,0.5)] border border-[rgba(0,212,255,0.2)] space-y-3">
          <h4 className="text-[#e0f0ff]" style={{ fontSize: "0.85rem" }}>{isAdding ? "添加新模型" : `编辑: ${editModel?.name}`}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>模型名称 *</label>
              <input value={fName} onChange={e => setFName(e.target.value)} placeholder="例: LLaMA-70B"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>版本</label>
              <input value={fVersion} onChange={e => setFVersion(e.target.value)} placeholder="v1.0"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>模型大小</label>
              <input value={fSize} onChange={e => setFSize(e.target.value)} placeholder="140GB"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>GPU 节点</label>
              <input value={fGpu} onChange={e => setFGpu(e.target.value)} placeholder="GPU-A100-01"
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                style={{ fontSize: "0.8rem" }} />
            </div>
            <div>
              <label className="text-[rgba(0,212,255,0.5)] block mb-1" style={{ fontSize: "0.7rem" }}>状态</label>
              <select value={fStatus} onChange={e => setFStatus(e.target.value as DeployedModel["status"])}
                className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#00d4ff] focus:outline-none"
                style={{ fontSize: "0.8rem" }}>
                {MODEL_STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ background: "#0a1830" }}>{MODEL_STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={closeForm}
              className="px-4 py-2 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.78rem" }}>取消</button>
            <button onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[rgba(0,140,200,0.5)] border border-[rgba(0,180,255,0.3)] text-white hover:bg-[rgba(0,160,220,0.6)] transition-all flex items-center gap-1.5"
              style={{ fontSize: "0.78rem" }}>
              <Save className="w-3.5 h-3.5" />
              {isAdding ? "创建" : "保存"}
            </button>
          </div>
        </div>
      )}

      {/* Model List */}
      <div className="space-y-3">
        {models.map((model) => (
          <div key={model.id} className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)] hover:border-[rgba(0,180,255,0.2)] transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[rgba(0,212,255,0.08)]">
                <Layers className="w-4 h-4 text-[#00d4ff]" />
              </div>
              <div>
                <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>{model.name}</p>
                <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.65rem" }}>{model.version} · {model.size} · {model.gpu}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded ${model.status === "deployed" ? "bg-[rgba(0,255,136,0.1)] text-[#00ff88]" :
                model.status === "deploying" ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]" :
                  model.status === "error" ? "bg-[rgba(255,51,102,0.1)] text-[#ff3366]" :
                    "bg-[rgba(170,85,255,0.1)] text-[#aa55ff]"
                }`} style={{ fontSize: "0.65rem" }}>
                {MODEL_STATUS_LABELS[model.status]}
              </span>
              {editConfirm === model.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-[rgba(0,212,255,0.5)] mr-0.5" style={{ fontSize: "0.6rem" }}>确认编辑?</span>
                  <button onClick={() => { openEdit(model); setEditConfirm(null); }} className="p-1 rounded bg-[rgba(0,212,255,0.2)] hover:bg-[rgba(0,212,255,0.3)] transition-all" title="确认编辑">
                    <Check className="w-3.5 h-3.5 text-[#00d4ff]" />
                  </button>
                  <button onClick={() => setEditConfirm(null)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title="取消">
                    <X className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditConfirm(model.id); setDeleteConfirm(null); }} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title="编辑">
                  <Edit2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff]" />
                </button>
              )}
              {deleteConfirm === model.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDelete(model.id)} className="p-1 rounded bg-[rgba(255,51,102,0.2)] hover:bg-[rgba(255,51,102,0.3)] transition-all" title="确认删除">
                    <Check className="w-3.5 h-3.5 text-[#ff3366]" />
                  </button>
                  <button onClick={() => setDeleteConfirm(null)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title="取消">
                    <X className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(model.id)} className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)] transition-all" title="删除">
                  <Trash2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                </button>
              )}
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="text-center py-8 text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.8rem" }}>
            暂无模型，点击"添加模型"创建
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.06)]">
        <div>
          <p className="text-[#c0dcf0]" style={{ fontSize: "0.82rem" }}>推理缓存 (KV-Cache)</p>
          <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.68rem" }}>启用 KV-Cache 加速推理</p>
        </div>
        <Toggle enabled={(settings as any).cacheEnabled} onChange={() => toggleSetting("cacheEnabled" as any)} />
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export function SystemSettings() {
  const { t } = useI18n();
  const { availableModels } = useModelProvider();
  const [activeSection, setActiveSection] = useState("general");
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [networkConfigOpen, setNetworkConfigOpen] = useState(false);

  // 统一持久化设置 (localStorage + BroadcastChannel)
  const settingsStore = useSettingsStore();
  const { settings, values, toggleSetting: storeToggle, updateValue: storeUpdate, resetSettings, exportSettings } = settingsStore;

  const updateValue = (key: string, val: string) => {
    storeUpdate(key as any, val);
    setHasChanges(true);
  };

  const toggleSetting = (key: keyof typeof settings) => {
    storeToggle(key);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // 数据已自动持久化到 localStorage, 此处仅为 UI 反馈
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setHasChanges(false);
    toast.success(t("settings.saved"), {
      description: t("settings.savedDesc"),
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 255, 136, 0.3)",
        color: "#e0f0ff",
      },
    });
  };

  const handleReset = () => {
    resetSettings();
    setHasChanges(false);
    toast.info(t("settings.resetDone"), {
      style: {
        background: "rgba(8, 25, 55, 0.95)",
        border: "1px solid rgba(0, 180, 255, 0.3)",
        color: "#e0f0ff",
      },
    });
  };

  const handleExport = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cpim-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("settings.exported"));
  };

  // ============================================================
  // Render sections
  // ============================================================

  const renderSection = () => {
    switch (activeSection) {
      case "general":
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

      case "network":
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

      case "cluster":
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

      case "model":
        return <ModelManagementSection settings={settings as unknown as Record<string, boolean>} toggleSetting={toggleSetting as (key: string) => void} />;

      case "storage":
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

      case "websocket":
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

      case "ai":
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

      case "pwa":
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
                  <option value="7200">2 小时</option>
                  <option value="14400">4 小时</option>
                  <option value="28800">8 小时</option>
                </select>
              </div>
            </div>
          </div>
        );

      case "security":
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

      case "notification":
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

      case "env":
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

      case "advanced":
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

      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-full">
      {/* Left sidebar */}
      <GlassCard className="md:col-span-3 p-3">
        <h3 className="text-[#e0f0ff] px-3 mb-4" style={{ fontSize: "0.9rem" }}>系统设置</h3>
        <div className="space-y-1">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${activeSection === section.id
                ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]"
                : "text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.05)] border border-transparent"
                }`}
              style={{ fontSize: "0.82rem" }}
            >
              <section.icon className="w-4 h-4" />
              {t(section.labelKey)}
            </button>
          ))}
        </div>

        {/* System Health */}
        <div className="mt-6 p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)]">
          <h4 className="text-[rgba(0,212,255,0.5)] mb-3" style={{ fontSize: "0.75rem" }}>系统健康度</h4>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="text-[#00ff88]" style={{ fontSize: "0.72rem" }}>所有服务正常</span>
          </div>
          <div className="space-y-1.5">
            {[
              { name: "API Gateway", status: "ok" },
              { name: "推理引擎", status: "ok" },
              { name: "数据库", status: "ok" },
              { name: "消息队列", status: "ok" },
              { name: "缓存服务", status: "warn" },
            ].map((svc) => (
              <div key={svc.name} className="flex items-center justify-between">
                <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.68rem" }}>{svc.name}</span>
                <div className={`w-1.5 h-1.5 rounded-full ${svc.status === "ok" ? "bg-[#00ff88]" : "bg-[#ffdd00] animate-pulse"}`} />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Right content */}
      <GlassCard className="md:col-span-9 p-4 md:p-6 overflow-auto">
        {renderSection()}

        {/* Save / Reset buttons - sticky at bottom */}
        <div className={`flex items-center gap-3 mt-8 pt-4 border-t border-[rgba(0,180,255,0.08)] ${hasChanges ? "" : "opacity-60"}`}>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all shadow-[0_0_15px_rgba(0,180,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: "0.82rem" }}
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                {t("settings.saving")}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {t("settings.saveChanges")}
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            style={{ fontSize: "0.82rem" }}
          >
            <RotateCcw className="w-4 h-4" />
            {t("settings.resetDefault")}
          </button>
          {hasChanges && (
            <span className="ml-auto text-[#ffdd00] flex items-center gap-1" style={{ fontSize: "0.72rem" }}>
              <div className="w-2 h-2 rounded-full bg-[#ffdd00] animate-pulse" />
              ⚠
            </span>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
