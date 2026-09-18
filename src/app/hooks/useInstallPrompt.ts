/**
 * useInstallPrompt Hook
 * =====================
 * PWA 安装提示管理
 * - 监听 beforeinstallprompt 事件
 * - 检测 standalone 模式
 * - 提供安装触发函数
 */

import { useState, useEffect, useCallback } from "react";
import type { BeforeInstallPromptEvent } from "../types";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // 检查是否已安装（standalone 模式）
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 监听安装状态变更
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener("change", handleChange);

    // 检查用户是否已关闭过安装提示
    const wasDismissed = localStorage.getItem("pwa_install_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("pwa_install_dismissed", "true");
  }, []);

  return {
    isInstalled,
    canInstall: !!deferredPrompt && !dismissed,
    promptInstall,
    dismiss,
  };
}