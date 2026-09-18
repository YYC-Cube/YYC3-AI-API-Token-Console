import React, { useState, useContext, Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { AIAssistant } from "./AIAssistant";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { OfflineIndicator } from "./OfflineIndicator";
import { ErrorBoundary } from "./ErrorBoundary";
import { CommandPalette } from "./CommandPalette";
import { IntegratedTerminal } from "./IntegratedTerminal";
import { useWebSocketData } from "../hooks/useWebSocketData";
import { useMobileView } from "../hooks/useMobileView";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { AuthContext } from "../lib/authContext";
import { WebSocketContext, ViewContext } from "../lib/view-context";

/**
 * 路由懒加载 Suspense fallback — 赛博朋克风格加载指示器
 */
function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[rgba(0,212,255,0.15)] border-t-[#00d4ff] rounded-full animate-spin" />
        <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.72rem" }}>
          Loading module...
        </span>
      </div>
    </div>
  );
}

export function Layout() {
  const wsData = useWebSocketData();
  const view = useMobileView();
  const auth = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(false);

  const isDesktop = !view.isMobile && !view.isTablet;

  // 全局快捷键
  useKeyboardShortcuts({
    enabled: true,
    onEscape: () => {
      setMobileMenuOpen(false);
      setCommandPaletteOpen(false);
      setTerminalOpen(false);
    },
    onSearch: () => setCommandPaletteOpen(true),
    onToggleTerminal: () => setTerminalOpen((prev) => !prev),
  });

  return (
    <WebSocketContext.Provider value={wsData}>
      <ViewContext.Provider value={view}>
        <div className="h-screen w-screen flex flex-col overflow-hidden" style={{
          background: "linear-gradient(135deg, #060e1f 0%, #0a1628 30%, #081430 60%, #040c1a 100%)",
        }}>
          {/* Animated background elements */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `
                linear-gradient(rgba(0,212,255,1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,212,255,1) 1px, transparent 1px)
              `,
              backgroundSize: view.isMobile ? "40px 40px" : "60px 60px",
            }} />
            {/* Gradient orbs */}
            <div className="absolute top-[-20%] right-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full opacity-[0.06]"
              style={{ background: "radial-gradient(circle, #00d4ff, transparent 70%)" }} />
            <div className="absolute bottom-[-20%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full opacity-[0.04]"
              style={{ background: "radial-gradient(circle, #7b2ff7, transparent 70%)" }} />
            <div className="absolute top-[40%] left-[50%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] rounded-full opacity-[0.03]"
              style={{ background: "radial-gradient(circle, #00ff88, transparent 70%)" }} />
            {/* Scan line */}
            <div className="absolute w-full h-[2px] opacity-[0.03] animate-[scanline_8s_linear_infinite]"
              style={{ background: "linear-gradient(90deg, transparent, #00d4ff, transparent)" }} />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            {/* TopBar: minimal, always on top */}
            <TopBar
              connectionState={wsData.connectionState}
              reconnectCount={wsData.reconnectCount}
              lastSyncTime={wsData.lastSyncTime}
              onReconnect={wsData.manualReconnect}
              isMobile={view.isMobile}
              isTablet={view.isTablet}
              mobileMenuOpen={mobileMenuOpen}
              onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
              onLogout={auth.logout}
              userEmail={auth.userEmail}
              userRole={auth.userRole}
              onToggleTerminal={() => setTerminalOpen(prev => !prev)}
            />

            {/* Main area: Sidebar (desktop) + Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar: desktop only */}
              {isDesktop && (
                <Sidebar
                  collapsed={sidebarCollapsed}
                  onToggle={() => setSidebarCollapsed((prev) => !prev)}
                />
              )}

              {/* Page content */}
              <div className={`flex-1 overflow-auto ${
                ["/ai-family", "/ai-family-design"].includes(location.pathname)
                  ? ""
                  : view.isMobile ? "px-3 pt-2 pb-[72px]" : view.isTablet ? "px-4 pt-3 pb-[72px]" : "p-4"
              }`}>
                <ErrorBoundary level="module" source="PageContent">
                  <Suspense fallback={<RouteFallback />}>
                    <Outlet />
                  </Suspense>
                </ErrorBoundary>
              </div>
            </div>

            {/* Bottom Nav - mobile & tablet only */}
            {(view.isMobile || view.isTablet) && <BottomNav />}
          </div>

          {/* AI 智能助理浮窗 */}
          <AIAssistant isMobile={view.isMobile} />

          {/* 全局命令面板 (⌘K) */}
          <CommandPalette
            isOpen={commandPaletteOpen}
            onClose={() => setCommandPaletteOpen(false)}
          />

          {/* 集成终端 (Ctrl+`) */}
          <IntegratedTerminal
            open={terminalOpen}
            onClose={() => setTerminalOpen(false)}
          />

          {/* PWA 安装提示 */}
          <PWAInstallPrompt />

          {/* 离线状态指示器 */}
          <OfflineIndicator />

          {/* Toast notifications */}
          <Toaster
            position={view.isMobile ? "top-center" : "top-right"}
            toastOptions={{
              style: {
                background: "rgba(8, 25, 55, 0.95)",
                border: "1px solid rgba(0, 180, 255, 0.2)",
                color: "#e0f0ff",
                backdropFilter: "blur(10px)",
              },
            }}
          />

          <style>{`
            @keyframes scanline {
              0% { top: 0%; }
              100% { top: 100%; }
            }
          `}</style>
        </div>
      </ViewContext.Provider>
    </WebSocketContext.Provider>
  );
}