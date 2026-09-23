/**
 * settings/ModelManagementSection.tsx — 模型管理分区 (§6.6 Facade+Siblings)
 * 自 SystemSettings.tsx 迁入: DeployedModel CRUD + 表单 + 删除/编辑确认
 * 拆分时顺带消除 props 上的 as any 双重断言 (SettingsSectionProps 契约)
 */
import { useState } from "react";
import {
  Check, Edit2, Layers, Plus, RotateCcw, Save, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { deployedModelStore, type DeployedModel } from "../../stores/dashboard-stores";
import type { SettingsToggles } from "../../hooks/useSettingsStore";
import { Toggle } from "./shared";

const MODEL_STATUS_OPTIONS: DeployedModel["status"][] = ["deployed", "deploying", "standby", "error"];
const MODEL_STATUS_LABELS: Record<DeployedModel["status"], string> = {
  deployed: "已部署", deploying: "部署中", standby: "待命", error: "异常",
};

interface ModelManagementSectionProps {
  settings: SettingsToggles;
  toggleSetting: (key: keyof SettingsToggles) => void;
}

export function ModelManagementSection({ settings, toggleSetting }: ModelManagementSectionProps) {
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
        <Toggle enabled={settings.cacheEnabled} onChange={() => toggleSetting("cacheEnabled")} />
      </div>
    </div>
  );
}
