/**
 * FileBrowser.tsx
 * ================
 * 文件浏览器组件 · 浏览 ~/.yyc3-cloudpivot/ 目录结构
 */

import React from "react";
import {
  Folder, FileText, FileJson, FileCode, ChevronRight,
  ArrowUp, Home,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { FileItem } from "../types";

const extIcon: Record<string, React.ElementType> = {
  log: FileText,
  json: FileJson,
  md: FileCode,
  csv: FileText,
};

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min}分钟前`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}小时前`;
  return `${Math.floor(hrs / 24)}天前`;
}

interface FileBrowserProps {
  items: FileItem[];
  breadcrumbs: Array<{ label: string; path: string }>;
  onSelect: (file: FileItem) => void;
  onNavigate: (path: string) => void;
  onGoUp: () => void;
  formatSize: (bytes?: number) => string;
  canGoUp: boolean;
}

export function FileBrowser({
  items, breadcrumbs, onSelect, onNavigate, onGoUp, formatSize, canGoUp,
}: FileBrowserProps) {
  return (
    <GlassCard className="p-4" data-testid="file-browser">
      {/* Breadcrumb nav */}
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        <button
          onClick={() => onNavigate("~/.yyc3-cloudpivot")}
          className="p-1 rounded hover:bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
        >
          <Home className="w-3.5 h-3.5" />
        </button>
        {canGoUp && (
          <button
            onClick={onGoUp}
            className="p-1 rounded hover:bg-[rgba(0,212,255,0.08)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all"
            data-testid="go-up-btn"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex items-center gap-0.5 ml-1">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="inline-flex items-center">
              {i > 0 && <ChevronRight className="w-3 h-3 text-[rgba(0,212,255,0.2)]" />}
              <button
                onClick={() => onNavigate(crumb.path)}
                className={`px-1.5 py-0.5 rounded text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all ${
                  i === breadcrumbs.length - 1 ? "text-[#00d4ff]" : ""
                }`}
                style={{ fontSize: "0.72rem" }}
                data-testid={`breadcrumb-${i}`}
              >
                {crumb.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* File list */}
      <div className="space-y-0.5" data-testid="file-list">
        {items.length > 0 ? (
          items.map((item) => {
            const isDir = item.type === "directory";
            const Icon = isDir ? Folder : (extIcon[item.extension ?? ""] ?? FileText);
            const childCount = isDir ? (item.children?.length ?? 0) : null;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.18)] transition-all text-left group"
                data-testid={`file-${item.id}`}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={{ color: isDir ? "#ffaa00" : "#00d4ff", opacity: isDir ? 0.8 : 0.5 }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.78rem" }}>
                    {item.name}
                    {isDir && <span className="text-[rgba(0,212,255,0.25)] ml-1">/</span>}
                  </p>
                </div>

                {/* Meta */}
                {childCount != null && (
                  <span className="text-[rgba(0,212,255,0.2)] shrink-0" style={{ fontSize: "0.6rem" }}>
                    {childCount} 项
                  </span>
                )}
                {!isDir && (
                  <span className="text-[rgba(0,212,255,0.2)] shrink-0 hidden sm:inline" style={{ fontSize: "0.6rem" }}>
                    {formatSize(item.size)}
                  </span>
                )}
                <span className="text-[rgba(0,212,255,0.18)] shrink-0" style={{ fontSize: "0.58rem" }}>
                  {formatTimeAgo(item.modifiedAt)}
                </span>

                {isDir && (
                  <ChevronRight className="w-3 h-3 text-[rgba(0,212,255,0.15)] group-hover:text-[rgba(0,212,255,0.4)] transition-colors shrink-0" />
                )}
              </button>
            );
          })
        ) : (
          <div className="text-center py-6">
            <Folder className="w-8 h-8 text-[rgba(0,212,255,0.15)] mx-auto mb-2" />
            <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.78rem" }}>
              空目录
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}