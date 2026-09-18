/**
 * BottomNav 组件
 * ==============
 * 移动端底部导航栏 · 专业级重构
 *
 * 优化点：
 * - 4 核心 Tab + "更多" 弹出抽屉
 * - 拇指热区优化 (48x48 最小触控)
 * - 激活态发光 + 微动效
 * - 安全区域适配 (iPhone notch)
 * - 长按快捷预览（预留）
 *
 * i18n 完整覆盖
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Activity, BarChart3, AlertTriangle, Radar,
  Wrench, RefreshCcw, FolderOpen, Settings,
  Brain, Sparkles, Cpu,
  Code2, Palette, BookOpen, Paintbrush, Terminal, Monitor,
  ShieldCheck, ClipboardList, Users, Cog,
  MoreHorizontal, X, ChevronRight,
  BellRing, FileBarChart, BrainCircuit,
  HardDrive, Database, GitBranch,
  Smartphone,
  Package,
  Gauge,
  ServerCog,
  UserCircle2,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useI18n } from "../hooks/useI18n";

/* ── 底部 4 核心 Tab ──────────────────────────── */
const PRIMARY_TABS = [
  { i18nKey: "bottomNav.monitor",    path: "/",           icon: Activity },
  { i18nKey: "bottomNav.followUp",   path: "/follow-up",  icon: AlertTriangle },
  { i18nKey: "bottomNav.operations", path: "/operations",  icon: Wrench },
  { i18nKey: "bottomNav.patrol",     path: "/patrol",     icon: Radar },
];

/* ── "更多" 抽屉内容（按分类） ──────────────── */
interface MoreCategory {
  labelKey: string;
  icon: React.ElementType;
  items: { key: string; path: string; icon: React.ElementType }[];
}

const MORE_CATEGORIES: MoreCategory[] = [
  {
    labelKey: "nav.catOps", icon: Wrench,
    items: [
      { key: "nav.fileManager",  path: "/files",       icon: FolderOpen },
      { key: "nav.hostFiles",    path: "/host-files",   icon: HardDrive },
      { key: "nav.database",     path: "/database",     icon: Database },
      { key: "nav.dataEditor",   path: "/data-editor",  icon: Package },
      { key: "nav.performance",  path: "/performance",  icon: Gauge },
      { key: "nav.envConfig",    path: "/env-config",   icon: ServerCog },
      { key: "nav.serviceLoop",  path: "/loop",         icon: Settings },
      { key: "nav.reportExport", path: "/reports",      icon: FileBarChart },
    ],
  },
  {
    labelKey: "nav.catMonitor", icon: Activity,
    items: [
      { key: "nav.alertRules", path: "/alerts", icon: BellRing },
    ],
  },
  {
    labelKey: "nav.catAI", icon: Brain,
    items: [
      { key: "nav.aiDecision",     path: "/ai",           icon: Sparkles },
      { key: "modelProvider.title", path: "/models",       icon: Cpu },
      { key: "nav.aiDiagnostics",  path: "/ai-diagnosis", icon: BrainCircuit },
    ],
  },
  {
    labelKey: "nav.catAIFamily", icon: UserCircle2,
    items: [
      { key: "nav.aiFamily",       path: "/ai-family",        icon: UserCircle2 },
      { key: "nav.aiFamilyDesign", path: "/ai-family-design", icon: FileText },
    ],
  },
  {
    labelKey: "nav.catDev", icon: Code2,
    items: [
      { key: "nav.designSystem", path: "/design-system", icon: Palette },
      { key: "nav.devGuide",     path: "/dev-guide",     icon: BookOpen },
      { key: "nav.theme",        path: "/theme",          icon: Paintbrush },
      { key: "nav.terminal",     path: "/terminal",       icon: Terminal },
      { key: "nav.ide",          path: "/ide",             icon: Monitor },
      { key: "nav.refactoring",  path: "/refactoring",    icon: GitBranch },
    ],
  },
  {
    labelKey: "nav.catAdmin", icon: ShieldCheck,
    items: [
      { key: "nav.audit",           path: "/audit",    icon: ClipboardList },
      { key: "nav.userMgmt",        path: "/users",    icon: Users },
      { key: "nav.settings",        path: "/settings", icon: Cog },
      { key: "nav.securityMonitor", path: "/security", icon: ShieldCheck },
      { key: "nav.pwa",             path: "/pwa",      icon: Smartphone },
    ],
  },
];

const ALL_MORE_PATHS = MORE_CATEGORIES.flatMap((c) => c.items.map((i) => i.path));

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);

  // 判断当前是否在 "更多" 中某个页面
  const isInMoreSection = ALL_MORE_PATHS.includes(location.pathname);

  // 路由变化时关闭抽屉
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // 阻止 body 滚动
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [moreOpen]);

  return (
    <>
      {/* ══ 更多抽屉 · 底部半屏 ══ */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />

            {/* 抽屉面板 */}
            <motion.div
              key="more-drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[rgba(6,14,31,0.98)] backdrop-blur-2xl border-t border-x border-[rgba(0,180,255,0.12)] shadow-[0_-10px_50px_rgba(0,0,0,0.5)]"
              style={{ maxHeight: "70vh" }}
            >
              {/* 拖拽指示条 */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-[rgba(0,180,255,0.15)]" />
              </div>

              {/* 标题 */}
              <div className="flex items-center justify-between px-5 pb-3">
                <span className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>
                  {t("common.more")}
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-2 -mr-1 rounded-lg hover:bg-[rgba(0,212,255,0.06)] transition-all"
                >
                  <X className="w-5 h-5 text-[rgba(0,212,255,0.4)]" />
                </button>
              </div>

              {/* 分类列表 */}
              <div className="overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]" style={{ maxHeight: "calc(70vh - 80px)" }}>
                {MORE_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.labelKey} className="mb-3">
                      {/* 分类标题 */}
                      <div className="flex items-center gap-2 px-1 mb-1.5">
                        <CatIcon className="w-3.5 h-3.5 text-[rgba(0,212,255,0.2)]" />
                        <span
                          className="text-[rgba(0,212,255,0.25)]"
                          style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
                        >
                          {t(cat.labelKey)}
                        </span>
                        <div className="flex-1 h-px bg-[rgba(0,180,255,0.04)]" />
                      </div>

                      {/* 子项网格：2 列 */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {cat.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <button
                              key={item.path}
                              onClick={() => navigate(item.path)}
                              className={`
                                flex items-center gap-2.5 rounded-xl transition-all min-h-[48px] px-3
                                ${isActive
                                  ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.2)]"
                                  : "bg-[rgba(0,40,80,0.15)] text-[rgba(0,212,255,0.45)] border border-[rgba(0,180,255,0.04)] active:bg-[rgba(0,212,255,0.06)]"
                                }
                              `}
                            >
                              <ItemIcon className="w-4 h-4 shrink-0" style={{ opacity: isActive ? 1 : 0.5 }} />
                              <span style={{ fontSize: "0.78rem" }}>{t(item.key)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ 底部导航栏主体 ══ */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {/* 毛玻璃背景 */}
        <div className="bg-[rgba(4,10,22,0.92)] backdrop-blur-2xl border-t border-[rgba(0,180,255,0.08)]">
          <div className="flex items-end justify-around px-1">
            {/* ── 4 核心 Tab ── */}
            {PRIMARY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[52px] pt-2 pb-1 transition-all duration-150"
                >
                  {/* 激活背景光 */}
                  {isActive && (
                    <div
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-b-full bg-[#00d4ff]"
                      style={{ boxShadow: "0 2px 12px rgba(0,212,255,0.4)" }}
                    />
                  )}

                  <div className="relative">
                    <Icon
                      className={`w-[22px] h-[22px] transition-all duration-200 ${
                        isActive
                          ? "text-[#00d4ff]"
                          : "text-[rgba(0,212,255,0.3)]"
                      }`}
                      style={isActive ? { filter: "drop-shadow(0 0 6px rgba(0,212,255,0.5))" } : undefined}
                    />
                  </div>

                  <span
                    className={`mt-0.5 transition-colors duration-200 ${
                      isActive ? "text-[#00d4ff]" : "text-[rgba(0,212,255,0.25)]"
                    }`}
                    style={{ fontSize: "0.58rem" }}
                  >
                    {t(tab.i18nKey)}
                  </span>
                </button>
              );
            })}

            {/* ── 更多 Tab ── */}
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="relative flex flex-col items-center justify-center min-w-[56px] min-h-[52px] pt-2 pb-1 transition-all duration-150"
            >
              {(isInMoreSection || moreOpen) && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-b-full bg-[#00d4ff]"
                  style={{ boxShadow: "0 2px 12px rgba(0,212,255,0.4)" }}
                />
              )}

              <div className="relative">
                <MoreHorizontal
                  className={`w-[22px] h-[22px] transition-all duration-200 ${
                    isInMoreSection || moreOpen
                      ? "text-[#00d4ff]"
                      : "text-[rgba(0,212,255,0.3)]"
                  }`}
                  style={(isInMoreSection || moreOpen) ? { filter: "drop-shadow(0 0 6px rgba(0,212,255,0.5))" } : undefined}
                />
                {/* 小点指示有更多内容 */}
                {!isInMoreSection && !moreOpen && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[rgba(0,212,255,0.4)]" />
                )}
              </div>

              <span
                className={`mt-0.5 transition-colors duration-200 ${
                  isInMoreSection || moreOpen ? "text-[#00d4ff]" : "text-[rgba(0,212,255,0.25)]"
                }`}
                style={{ fontSize: "0.58rem" }}
              >
                {t("common.more") || "更多"}
              </span>
            </button>
          </div>

          {/* iOS 安全区域占位 */}
          <div className="h-[env(safe-area-inset-bottom,0px)]" />
        </div>
      </div>
    </>
  );
}