/**
 * usePushNotifications Hook
 * =========================
 * 推送通知管理
 * - 权限请求
 * - 通知发送
 * - 订阅管理
 */

import { useState, useEffect, useCallback } from "react";
import type { AlertLevel } from "../types";

export function usePushNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = "Notification" in window;
    setSupported(isSupported);
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return "denied" as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [supported]);

  const showNotification = useCallback(
    (title: string, options: NotificationOptions = {}) => {
      if (permission !== "granted") return null;

      try {
        return new Notification(title, {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: "cpim-notification",
          ...options,
        });
      } catch {
        // 通知创建失败（可能在不支持的环境中）
        return null;
      }
    },
    [permission]
  );

  /** 发送系统告警通知 */
  const sendAlert = useCallback(
    (
      level: AlertLevel,
      message: string,
      detail?: string
    ) => {
      const titles: Record<AlertLevel, string> = {
        info: "CP-IM 信息",
        warning: "CP-IM 告警",
        error: "CP-IM 错误",
        critical: "CP-IM 严重告警",
      };

      return showNotification(titles[level], {
        body: detail ? `${message}\n${detail}` : message,
        tag: `cpim-alert-${level}`,
        requireInteraction: level === "error" || level === "critical",
      });
    },
    [showNotification]
  );

  return {
    permission,
    supported,
    requestPermission,
    showNotification,
    sendAlert,
  };
}