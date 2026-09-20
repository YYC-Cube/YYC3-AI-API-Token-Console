/**
 * OperationTemplate.tsx
 * ======================
 * 操作模板管理组件
 */

import React, { useState } from "react";
import {
  Plus, Play, Trash2, ChevronDown, ChevronUp,
  FileText, ListOrdered,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { CATEGORY_META } from "../hooks/useOperationCenter";
import type { OperationTemplateItem, OperationCategoryType } from "../types";

interface OperationTemplateProps {
  templates: OperationTemplateItem[];
  onRunTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddTemplate: (name: string, desc: string, cat: OperationCategoryType, steps: string[]) => void;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  return `${days}天前`;
}

export function OperationTemplate({
  templates, onRunTemplate, onDeleteTemplate, onAddTemplate,
}: OperationTemplateProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<OperationCategoryType>("system");
  const [newSteps, setNewSteps] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    const steps = newSteps.split("\n").map((s) => s.trim()).filter(Boolean);
    onAddTemplate(newName.trim(), newDesc.trim(), newCategory, steps);
    setNewName("");
    setNewDesc("");
    setNewSteps("");
    setShowCreate(false);
  };

  return (
    <GlassCard className="p-4" data-testid="operation-template">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            操作模板
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({templates.length})
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
          style={{ fontSize: "0.7rem" }}
          data-testid="add-template-btn"
        >
          <Plus className="w-3 h-3" />
          新建模板
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.1)] space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="模板名称"
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] outline-none focus:border-[rgba(0,212,255,0.3)]"
            style={{ fontSize: "0.75rem" }}
            data-testid="template-name-input"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="简要描述"
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] outline-none focus:border-[rgba(0,212,255,0.3)]"
            style={{ fontSize: "0.75rem" }}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as OperationCategoryType)}
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] outline-none"
            style={{ fontSize: "0.75rem" }}
          >
            {CATEGORY_META.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <textarea
            value={newSteps}
            onChange={(e) => setNewSteps(e.target.value)}
            placeholder={"步骤（每行一个）\n例如：\n检查节点状态\n重启服务\n验证结果"}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.1)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] outline-none focus:border-[rgba(0,212,255,0.3)] resize-none"
            style={{ fontSize: "0.75rem" }}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
              style={{ fontSize: "0.7rem" }}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)] hover:bg-[rgba(0,212,255,0.2)] transition-all disabled:opacity-30"
              style={{ fontSize: "0.7rem" }}
              data-testid="create-template-btn"
            >
              创建
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-1.5">
        {templates.map((tpl) => {
          const isExpanded = expandedId === tpl.id;
          const catMeta = CATEGORY_META.find((c) => c.key === tpl.category);

          return (
            <div
              key={tpl.id}
              className="rounded-xl bg-[rgba(0,40,80,0.1)] border border-[rgba(0,180,255,0.06)] overflow-hidden"
              data-testid={`template-${tpl.id}`}
            >
              <div className="flex items-center gap-3 p-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${catMeta?.color ?? "#00d4ff"}12` }}
                >
                  <ListOrdered className="w-4 h-4" style={{ color: catMeta?.color ?? "#00d4ff" }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[#e0f0ff] truncate" style={{ fontSize: "0.78rem" }}>
                    {tpl.name}
                  </p>
                  <p className="text-[rgba(0,212,255,0.3)] truncate" style={{ fontSize: "0.62rem" }}>
                    {tpl.description}
                    {tpl.lastUsed && (
                      <span className="ml-2">
                        · 上次使用 {formatTimeAgo(tpl.lastUsed)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onRunTemplate(tpl.id)}
                    className="p-1.5 rounded-lg text-[#00ff88] hover:bg-[rgba(0,255,136,0.08)] transition-all"
                    title="执行模板"
                    data-testid={`run-template-${tpl.id}`}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="p-1.5 rounded-lg text-[rgba(0,212,255,0.4)] hover:text-[#00d4ff] transition-all"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => onDeleteTemplate(tpl.id)}
                    className="p-1.5 rounded-lg text-[rgba(255,51,102,0.4)] hover:text-[#ff3366] hover:bg-[rgba(255,51,102,0.08)] transition-all"
                    title="删除模板"
                    data-testid={`delete-template-${tpl.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="p-2.5 rounded-lg bg-[rgba(0,40,80,0.12)]">
                    <p className="text-[rgba(0,212,255,0.4)] mb-2" style={{ fontSize: "0.68rem" }}>
                      步骤 ({tpl.steps.length})
                    </p>
                    <div className="space-y-1">
                      {tpl.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full bg-[rgba(0,212,255,0.08)] flex items-center justify-center shrink-0 text-[rgba(0,212,255,0.4)]"
                            style={{ fontSize: "0.58rem" }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-[#c0dcf0]" style={{ fontSize: "0.72rem" }}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {templates.length === 0 && (
          <div className="text-center py-6">
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
              暂无操作模板
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
