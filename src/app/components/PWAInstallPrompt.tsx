/**
 * PWAInstallPrompt.tsx
 * ====================
 * PWA 安装提示横幅组件
 * - 底部浮动提示安装到桌面
 * - 可关闭并记住选择
 * - 赛博朋克风格
 */

import React from "react";
import { Download, X } from "lucide-react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { YYC3Logo } from "./YYC3Logo";

export function PWAInstallPrompt() {
  const { isInstalled, canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (isInstalled || !canInstall) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[150]">
      <div className="relative rounded-xl bg-[rgba(8,25,55,0.95)] backdrop-blur-xl border border-[rgba(0,212,255,0.25)] shadow-[0_0_40px_rgba(0,180,255,0.15)] p-4">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-[rgba(0,212,255,0.1)] transition-all"
        >
          <X className="w-4 h-4 text-[rgba(0,212,255,0.4)]" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-3">
          <YYC3Logo size="sm" showStatus={false} glow={false} />
          <div className="flex-1 min-w-0">
            <p className="text-[#e0f0ff] mb-1" style={{ fontSize: "0.85rem" }}>
              安装 CP-IM CloudPivot
            </p>
            <p
              className="text-[rgba(0,212,255,0.4)] mb-3"
              style={{ fontSize: "0.7rem" }}
            >
              添加到桌面，获得原生应用体验，支持离线使用
            </p>
            <button
              onClick={promptInstall}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.3)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] transition-all shadow-[0_0_15px_rgba(0,180,255,0.1)]"
              style={{ fontSize: "0.78rem" }}
            >
              <Download className="w-4 h-4" />
              安装到桌面
            </button>
          </div>
        </div>

        {/* Glow effect */}
        <div className="absolute -top-px -left-px -right-px h-px bg-gradient-to-r from-transparent via-[rgba(0,212,255,0.5)] to-transparent" />
      </div>
    </div>
  );
}