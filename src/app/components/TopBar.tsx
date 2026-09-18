/**
 * TopBar.tsx
 * ===========
 * 极简顶栏 · 导航已移至左侧 Sidebar（桌面）/ BottomNav + MobileDrawer（移动）
 * 
 * 移动端优化：
 * - 顶栏极简：仅 hamburger + logo + 通知 + 头像
 * - 全屏滑入抽屉 + 半透明遮罩
 * - 分类折叠/展开（手风琴模式）
 * - 用户/连接信息移入抽屉顶部
 * - 搜索框移入抽屉
 */

import React, { useState, useRef, useEffect } from "react";
import {
  Search, Bell, ChevronDown, ChevronRight, Menu, X, LogOut, User, Shield, Ghost,
  Activity, Wrench, Brain, Code2, ShieldCheck,
  BarChart3, AlertTriangle, Radar,
  Settings, FolderOpen, RefreshCcw,
  Sparkles, Cpu,
  Palette, BookOpen, Paintbrush, Terminal, Monitor,
  ClipboardList, Users, Cog,
  BellRing, FileBarChart, BrainCircuit,
  HardDrive, Database, GitBranch,
  Smartphone,
  UserCircle2,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useLocation } from "react-router";
import { ConnectionStatus } from "./ConnectionStatus";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { YYC3Logo } from "./YYC3Logo";
import { useI18n } from "../hooks/useI18n";
import { isGhostMode } from "../lib/supabaseClient";
import type { ConnectionState } from "../types";

/* ── 移动端导航分类 ─��� */
interface MobileNavChild {
  key: string;
  path: string;
  icon: React.ElementType;
}
interface MobileNavCategory {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  children: MobileNavChild[];
}
const MOBILE_NAV: MobileNavCategory[] = [
  {
    id: "monitor", labelKey: "nav.catMonitor", icon: Activity,
    children: [
      { key: "nav.dataMonitor", path: "/",           icon: BarChart3 },
      { key: "nav.followUp",    path: "/follow-up",   icon: AlertTriangle },
      { key: "nav.patrol",      path: "/patrol",       icon: Radar },
      { key: "nav.alertRules",  path: "/alerts",       icon: BellRing },
    ],
  },
  {
    id: "ops", labelKey: "nav.catOps", icon: Wrench,
    children: [
      { key: "nav.operations",   path: "/operations",  icon: RefreshCcw },
      { key: "nav.fileManager",  path: "/files",        icon: FolderOpen },
      { key: "nav.hostFiles",    path: "/host-files",   icon: HardDrive },
      { key: "nav.database",     path: "/database",     icon: Database },
      { key: "nav.serviceLoop",  path: "/loop",         icon: Settings },
      { key: "nav.reportExport", path: "/reports",      icon: FileBarChart },
    ],
  },
  {
    id: "ai", labelKey: "nav.catAI", icon: Brain,
    children: [
      { key: "nav.aiDecision",     path: "/ai",            icon: Sparkles },
      { key: "modelProvider.title", path: "/models",        icon: Cpu },
      { key: "nav.aiDiagnostics",  path: "/ai-diagnosis",  icon: BrainCircuit },
    ],
  },
  {
    id: "ai-family", labelKey: "nav.catAIFamily", icon: UserCircle2,
    children: [
      { key: "nav.aiFamily", path: "/ai-family", icon: UserCircle2 },
      { key: "nav.aiFamilyDesign", path: "/ai-family-design", icon: FileText },
    ],
  },
  {
    id: "dev", labelKey: "nav.catDev", icon: Code2,
    children: [
      { key: "nav.designSystem", path: "/design-system", icon: Palette },
      { key: "nav.devGuide",     path: "/dev-guide",     icon: BookOpen },
      { key: "nav.theme",        path: "/theme",          icon: Paintbrush },
      { key: "nav.terminal",     path: "/terminal",       icon: Terminal },
      { key: "nav.ide",          path: "/ide",             icon: Monitor },
      { key: "nav.refactoring",  path: "/refactoring",    icon: GitBranch },
    ],
  },
  {
    id: "admin", labelKey: "nav.catAdmin", icon: ShieldCheck,
    children: [
      { key: "nav.audit",           path: "/audit",    icon: ClipboardList },
      { key: "nav.userMgmt",        path: "/users",    icon: Users },
      { key: "nav.settings",        path: "/settings", icon: Cog },
      { key: "nav.securityMonitor", path: "/security", icon: ShieldCheck },
      { key: "nav.pwa",             path: "/pwa",      icon: Smartphone },
    ],
  },
];

// backward-compat export
export const navItems = MOBILE_NAV.flatMap((c) =>
  c.children.map((ch) => ({ label: ch.key, path: ch.path }))
);

// 找到当前路由所在分类
function getActiveCategoryId(pathname: string): string {
  for (const cat of MOBILE_NAV) {
    if (cat.children.some((c) => c.path === pathname)) return cat.id;
  }
  return "monitor";
}

interface TopBarProps {
  connectionState: ConnectionState;
  reconnectCount: number;
  lastSyncTime: string;
  onReconnect: () => void;
  isMobile: boolean;
  isTablet: boolean;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onLogout: () => void;
  userEmail: string;
  userRole: string;
  onToggleTerminal?: () => void;
}

export function TopBar({
  connectionState,
  reconnectCount,
  lastSyncTime,
  onReconnect,
  isMobile,
  isTablet,
  mobileMenuOpen,
  onToggleMobileMenu,
  onLogout,
  userEmail,
  userRole,
  onToggleTerminal,
}: TopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const ghost = isGhostMode();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // 手风琴：展开的分类（移动端）
  const [expandedCatId, setExpandedCatId] = useState<string | null>(() => getActiveCategoryId(location.pathname));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 路由变化时：展开对应分类
  useEffect(() => {
    setExpandedCatId(getActiveCategoryId(location.pathname));
  }, [location.pathname]);

  // 阻止 body 滚动
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [mobileMenuOpen]);

  const displayName = userEmail ? userEmail.split("@")[0] : "Admin";
  const roleLabel = userRole === "admin" ? t("nav.userMgmt") : userRole === "developer" ? t("nav.devGuide") : t("nav.userMgmt");
  const initials = displayName.slice(0, 2).toUpperCase();

  const isDesktop = !isMobile && !isTablet;

  // ── 连接状态颜色 ──
  const connColor = connectionState === "connected" || connectionState === "simulated"
    ? "#00ff88"
    : connectionState === "disconnected" ? "#ff3366" : "#ffdd00";

  return (
    <div className="w-full shrink-0">
      {/* ═══ 顶栏主体 ═══ */}
      <div
        className="flex items-center justify-between bg-[rgba(4,10,22,0.95)] backdrop-blur-xl border-b border-[rgba(0,180,255,0.08)]"
        style={{ height: 48, padding: isMobile ? "0 12px" : "0 20px" }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          {/* 移动/平板：汉堡按钮 */}
          {!isDesktop && (
            <button
              onClick={onToggleMobileMenu}
              className="relative p-2 rounded-lg bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,212,255,0.25)] transition-all min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              {mobileMenuOpen
                ? <X className="w-5 h-5 text-[#00d4ff]" />
                : <Menu className="w-5 h-5 text-[rgba(0,212,255,0.5)]" />}
            </button>
          )}

          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => navigate("/")}>
            {!isDesktop && <YYC3Logo size="xs" showStatus={false} glow={false} />}
            <span
              className="text-[#00d4ff] tracking-[0.15em]"
              style={{ fontFamily: "'Orbitron', sans-serif", fontSize: isDesktop ? "0.88rem" : "0.82rem" }}
            >
              {isDesktop ? "CP-IM" : "YYC³"}
            </span>
            {isDesktop && (
              <span className="text-[rgba(0,212,255,0.2)] hidden xl:inline" style={{ fontSize: "0.55rem", letterSpacing: "0.06em" }}>
                v3.2
              </span>
            )}
          </div>

          {/* Ghost mode badge */}
          {ghost && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[rgba(0,212,255,0.06)] border border-[rgba(0,212,255,0.12)]">
              <Ghost className="w-3 h-3 text-[rgba(0,212,255,0.4)]" />
              <span className="text-[rgba(0,212,255,0.35)] hidden sm:inline" style={{ fontSize: "0.52rem", fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.1em" }}>
                GHOST
              </span>
            </div>
          )}

          {/* 桌面/平板搜索 */}
          {!isMobile && (
            <div className={`relative flex items-center transition-all duration-300 ml-3 ${searchFocused ? "w-64 lg:w-80" : "w-40 lg:w-52"}`}>
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
              <input
                type="text"
                placeholder={t("palette.placeholder")}
                className={`
                  w-full pl-8 pr-8 rounded-lg
                  bg-[rgba(0,40,80,0.3)] border transition-all duration-300
                  text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] focus:outline-none
                  ${searchFocused
                    ? "border-[rgba(0,212,255,0.35)] shadow-[0_0_12px_rgba(0,180,255,0.08)]"
                    : "border-[rgba(0,180,255,0.08)]"
                  }
                `}
                style={{ fontSize: "0.72rem", height: 32 }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <kbd
                className="absolute right-2 px-1.5 py-0.5 rounded bg-[rgba(0,180,255,0.06)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.25)] hidden lg:block"
                style={{ fontSize: "0.52rem" }}
              >
                ⌘K
              </kbd>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* 移动端：微型连接状态点 */}
          {isMobile && (
            <div
              className="w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: connColor, boxShadow: `0 0 6px ${connColor}` }}
              title={connectionState}
            />
          )}

          {/* 桌面/平板：完整连接状态 */}
          {!isMobile && (
            <ConnectionStatus
              state={connectionState}
              reconnectCount={reconnectCount}
              lastSyncTime={lastSyncTime}
              onReconnect={onReconnect}
              compact
            />
          )}

          {/* Terminal toggle (desktop) */}
          {isDesktop && onToggleTerminal && (
            <button
              onClick={onToggleTerminal}
              className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.05)] transition-all min-w-[36px] min-h-[36px] flex items-center justify-center group"
              title="集成终端 (Ctrl+`)"
            >
              <Terminal className="w-4 h-4 text-[rgba(0,212,255,0.35)] group-hover:text-[rgba(0,212,255,0.7)] transition-colors" />
            </button>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
              className="relative p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.05)] transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <Bell className="w-4 h-4 text-[rgba(0,212,255,0.45)]" />
              <span
                className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-[#ff3366] flex items-center justify-center shadow-[0_0_6px_rgba(255,51,102,0.4)]"
                style={{ fontSize: "0.45rem", color: "white" }}
              >
                3
              </span>
            </button>

            {/* 通知下拉：移动端底部弹出，桌面端右对齐 */}
            <AnimatePresence>
              {notifOpen && (
                <>
                  {/* 移动端遮罩 */}
                  {isMobile && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.4)]"
                      onClick={() => setNotifOpen(false)}
                    />
                  )}
                  <motion.div
                    initial={isMobile ? { y: "100%", opacity: 0.8 } : { opacity: 0, scale: 0.95 }}
                    animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1 }}
                    exit={isMobile ? { y: "100%", opacity: 0.5 } : { opacity: 0, scale: 0.95 }}
                    transition={isMobile ? { type: "spring", damping: 25, stiffness: 300 } : { duration: 0.15 }}
                    className={
                      isMobile
                        ? "fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-[rgba(6,16,36,0.99)] backdrop-blur-xl border-t border-x border-[rgba(0,180,255,0.12)] shadow-[0_-8px_40px_rgba(0,0,0,0.5)] p-4"
                        : "absolute top-10 right-0 z-50 w-72 rounded-xl bg-[rgba(6,16,36,0.98)] backdrop-blur-xl border border-[rgba(0,180,255,0.15)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] p-3"
                    }
                  >
                    {/* 移动端拖拽指示 */}
                    {isMobile && (
                      <div className="flex justify-center mb-3">
                        <div className="w-10 h-1 rounded-full bg-[rgba(0,180,255,0.15)]" />
                      </div>
                    )}
                    <h4 className="text-[rgba(0,212,255,0.6)] mb-2" style={{ fontSize: "0.68rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {t("common.notifications")}
                    </h4>
                    {[
                      { msg: "GPU-A100-03 推理延迟异常", time: t("common.minutesAgo", { n: 2 }), type: "warn" },
                      { msg: "LLaMA-70B 部署完成", time: t("common.minutesAgo", { n: 15 }), type: "success" },
                      { msg: "存储集群 C2 容量预警 (85%)", time: t("common.hoursAgo", { n: 1 }), type: "error" },
                    ].map((n, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[rgba(0,180,255,0.04)] cursor-pointer mb-0.5 transition-colors min-h-[48px]">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === "warn" ? "bg-[#ffdd00]" : n.type === "success" ? "bg-[#00ff88]" : "bg-[#ff3366]"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>{n.msg}</p>
                          <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                    {isMobile && <div className="h-[env(safe-area-inset-bottom,0px)]" />}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* 分隔线 */}
          {!isMobile && <div className="w-px h-5 bg-[rgba(0,180,255,0.06)] mx-0.5" />}

          {/* User Avatar (桌面下拉菜单) */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
              className={`flex items-center gap-1.5 rounded-lg transition-all min-h-[36px] px-1.5 ${
                userMenuOpen ? "bg-[rgba(0,212,255,0.06)]" : "hover:bg-[rgba(0,212,255,0.04)]"
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center">
                <span className="text-white" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.5rem" }}>{initials}</span>
              </div>
              {!isMobile && (
                <ChevronDown className={`w-3 h-3 text-[rgba(0,212,255,0.3)] transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {userMenuOpen && isDesktop && (
              <div className="absolute top-10 right-0 w-56 rounded-xl bg-[rgba(6,16,36,0.98)] backdrop-blur-xl border border-[rgba(0,180,255,0.15)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-50 overflow-hidden">
                <div className="px-3.5 py-2.5 border-b border-[rgba(0,180,255,0.08)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center">
                      <span className="text-white" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.6rem" }}>{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#e0f0ff] truncate" style={{ fontSize: "0.75rem" }}>{displayName}</p>
                      <div className="flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" />
                        <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.58rem" }}>{roleLabel}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="py-1">
                  {[
                    { icon: User, label: t("nav.userMgmt"), path: "/users" },
                    { icon: Settings, label: t("nav.settings"), path: "/settings" },
                  ].map((item) => (
                    <button
                      key={item.path}
                      onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[rgba(0,212,255,0.55)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.04)] transition-all"
                      style={{ fontSize: "0.72rem" }}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[rgba(0,180,255,0.08)] py-1">
                  <button
                    onClick={() => { setUserMenuOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[#ff3366] hover:bg-[rgba(255,51,102,0.06)] transition-all"
                    style={{ fontSize: "0.72rem" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t("common.logout")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {!isMobile && <LanguageSwitcher compact={isTablet} />}
        </div>
      </div>

      {/* ═══ 移动端/平板端：全屏滑入抽屉 ═══ */}
      <AnimatePresence>
        {!isDesktop && mobileMenuOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm"
              onClick={onToggleMobileMenu}
              style={{ top: 48 }}
            />

            {/* 抽屉面板 */}
            <motion.div
              key="menu-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-[48px] left-0 bottom-0 z-50 overflow-hidden flex flex-col"
              style={{
                width: isMobile ? "85vw" : "320px",
                maxWidth: "360px",
                background: "linear-gradient(180deg, rgba(4,10,22,0.99) 0%, rgba(6,14,31,0.99) 100%)",
                borderRight: "1px solid rgba(0,180,255,0.08)",
              }}
            >
              {/* ── 用户信息卡 ── */}
              <div className="shrink-0 p-4 border-b border-[rgba(0,180,255,0.06)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#7b2ff7] flex items-center justify-center shadow-[0_0_12px_rgba(0,180,255,0.3)]">
                    <span className="text-white" style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "0.65rem" }}>{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#e0f0ff] truncate" style={{ fontSize: "0.85rem" }}>{displayName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Shield className="w-3 h-3 text-[rgba(0,212,255,0.3)]" />
                      <span className="text-[rgba(0,212,255,0.4)]" style={{ fontSize: "0.62rem" }}>{roleLabel}</span>
                    </div>
                  </div>
                  {/* 连接状态 */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ backgroundColor: `${connColor}10`, border: `1px solid ${connColor}30` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: connColor }} />
                    <span style={{ color: connColor, fontSize: "0.6rem" }}>
                      {connectionState === "connected" ? "在线" : connectionState === "simulated" ? "模拟" : "离线"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── 搜索 ── */}
              <div className="shrink-0 px-4 py-3">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-[rgba(0,212,255,0.35)]" />
                  <input
                    type="text"
                    placeholder={t("palette.placeholder")}
                    className="w-full pl-10 pr-4 rounded-xl bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] focus:outline-none focus:border-[rgba(0,212,255,0.25)]"
                    style={{ height: 40, fontSize: "0.8rem" }}
                  />
                </div>
              </div>

              {/* ── 导航分类（手风琴） ── */}
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                {MOBILE_NAV.map((cat) => {
                  const CatIcon = cat.icon;
                  const isExpanded = expandedCatId === cat.id;
                  const hasActive = cat.children.some((c) => c.path === location.pathname);

                  return (
                    <div key={cat.id} className="mb-1">
                      {/* 分类标题（可折叠） */}
                      <button
                        onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                        className={`
                          w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all min-h-[44px]
                          ${hasActive
                            ? "text-[#00d4ff]"
                            : "text-[rgba(0,212,255,0.4)]"
                          }
                        `}
                      >
                        <CatIcon className="w-4.5 h-4.5 shrink-0" style={{ width: 18, height: 18, opacity: hasActive ? 1 : 0.5 }} />
                        <span className="flex-1 text-left" style={{ fontSize: "0.82rem", letterSpacing: "0.03em" }}>
                          {t(cat.labelKey)}
                        </span>
                        {hasActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_6px_rgba(0,212,255,0.5)] mr-1" />
                        )}
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          style={{ opacity: 0.3 }}
                        />
                      </button>

                      {/* 子项列表 */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="pl-4 pr-1 pb-1">
                              {cat.children.map((item) => {
                                const ChildIcon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (
                                  <button
                                    key={item.path}
                                    onClick={() => {
                                      navigate(item.path);
                                      onToggleMobileMenu();
                                    }}
                                    className={`
                                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all min-h-[44px] my-0.5
                                      ${isActive
                                        ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff] border border-[rgba(0,212,255,0.15)]"
                                        : "text-[rgba(0,212,255,0.4)] active:bg-[rgba(0,212,255,0.04)] border border-transparent"
                                      }
                                    `}
                                  >
                                    <ChildIcon className="w-4 h-4 shrink-0" style={{ opacity: isActive ? 0.9 : 0.4 }} />
                                    <span className="flex-1 text-left" style={{ fontSize: "0.82rem" }}>
                                      {t(item.key)}
                                    </span>
                                    {isActive && (
                                      <ChevronRight className="w-3.5 h-3.5 text-[rgba(0,212,255,0.3)]" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* ── 底部操作 ── */}
              <div className="shrink-0 border-t border-[rgba(0,180,255,0.06)] p-3 space-y-1">
                <div className="flex items-center gap-2 mb-2 px-2">
                  <LanguageSwitcher compact={false} />
                </div>
                <button
                  onClick={() => { onToggleMobileMenu(); onLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#ff3366] active:bg-[rgba(255,51,102,0.06)] transition-all min-h-[44px]"
                  style={{ fontSize: "0.82rem" }}
                >
                  <LogOut className="w-4 h-4" />
                  {t("common.logout")}
                </button>
                <div className="h-[env(safe-area-inset-bottom,0px)]" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}