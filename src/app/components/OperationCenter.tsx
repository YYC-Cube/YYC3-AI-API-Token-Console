/**
 * OperationCenter.tsx
 * ====================
 * 操作中心主界面
 * 路由: /operations
 *
 * i18n 已迁移
 */

import React, { useContext } from "react";
import { Settings, Zap } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { OperationCategory } from "./OperationCategory";
import { QuickActionGrid } from "./QuickActionGrid";
import { OperationTemplate } from "./OperationTemplate";
import { OperationLogStream } from "./OperationLogStream";
import { useOperationCenter } from "../hooks/useOperationCenter";
import { useI18n } from "../hooks/useI18n";
import { ViewContext } from "../lib/view-context";

export function OperationCenter() {
  const view = useContext(ViewContext);
  const isMobile = view?.isMobile ?? false;
  const { t } = useI18n();

  const {
    categories,
    activeCategory,
    setActiveCategory,
    actions,
    isExecuting,
    executeAction,
    templates,
    runTemplate,
    addTemplate,
    deleteTemplate,
    logs,
    logFilter,
    setLogFilter,
    searchQuery,
    setSearchQuery,
  } = useOperationCenter();

  return (
    <div className="space-y-4">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h2 className="text-[#e0f0ff]" style={{ fontSize: "1.1rem" }}>
              {t("operations.title")}
            </h2>
            <p className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.7rem" }}>
              {t("operations.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* ======== Category Tabs ======== */}
      <OperationCategory
        categories={categories}
        active={activeCategory}
        onChange={setActiveCategory}
      />

      {/* ======== Quick Actions ======== */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#ffaa00]" />
          <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.88rem" }}>
            {t("operations.quickActions")}
          </h3>
          <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.65rem" }}>
            ({actions.length})
          </span>
        </div>
        <QuickActionGrid
          actions={actions}
          isExecuting={isExecuting}
          onExecute={executeAction}
          isMobile={isMobile}
        />
      </GlassCard>

      {/* ======== Templates ======== */}
      <OperationTemplate
        templates={templates}
        onRunTemplate={runTemplate}
        onDeleteTemplate={deleteTemplate}
        onAddTemplate={addTemplate}
      />

      {/* ======== Log Stream ======== */}
      <OperationLogStream
        logs={logs}
        filter={logFilter}
        onFilterChange={setLogFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isMobile={isMobile}
      />
    </div>
  );
}