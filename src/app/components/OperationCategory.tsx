/**
 * OperationCategory.tsx
 * ======================
 * 操作分类标签页
 */

import React from "react";
import {
  Server, Brain, ListTodo, Settings, Puzzle, Layers,
} from "lucide-react";
import type { OperationCategoryType, OperationCategoryMeta } from "../types";

const iconMap: Record<string, React.ElementType> = {
  Server, Brain, ListTodo, Settings, Puzzle, Layers,
};

interface OperationCategoryProps {
  categories: OperationCategoryMeta[];
  active: OperationCategoryType | "all";
  onChange: (key: OperationCategoryType | "all") => void;
}

export function OperationCategory({ categories, active, onChange }: OperationCategoryProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="operation-category">
      {/* All tab */}
      <button
        onClick={() => onChange("all")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
          active === "all"
            ? "bg-[rgba(0,212,255,0.12)] text-[#00d4ff] border border-[rgba(0,212,255,0.25)]"
            : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
        }`}
        style={{ fontSize: "0.75rem" }}
        data-testid="category-all"
      >
        <Layers className="w-3.5 h-3.5" />
        全部
      </button>

      {categories.map((cat) => {
        const Icon = iconMap[cat.icon] ?? Puzzle;
        const isActive = active === cat.key;
        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              isActive
                ? "border border-current"
                : "text-[rgba(0,212,255,0.4)] border border-transparent hover:border-[rgba(0,180,255,0.15)]"
            }`}
            style={{
              fontSize: "0.75rem",
              color: isActive ? cat.color : undefined,
              backgroundColor: isActive ? `${cat.color}18` : undefined,
              borderColor: isActive ? `${cat.color}40` : undefined,
            }}
            data-testid={`category-${cat.key}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
