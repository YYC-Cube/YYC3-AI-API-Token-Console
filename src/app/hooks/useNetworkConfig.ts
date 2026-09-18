/**
 * useNetworkConfig Hook
 * =====================
 * 网络连接配置管理 Hook
 * - 读写 localStorage 持久化配置
 * - 自动检测网络环境
 * - WebSocket 连接测试
 */

import { useState, useEffect, useCallback } from "react";
import type { NetworkConfig, NetworkInterface, TestStatus, NetworkConfigState } from "../types";
import {
  loadNetworkConfig,
  saveNetworkConfig,
  resetNetworkConfig,
  getNetworkInterfaces,
  getLocalIP,
  generateWsUrl,
  testWebSocketConnection,
} from "../lib/network-utils";

export function useNetworkConfig() {
  const [state, setState] = useState<NetworkConfigState>({
    config: loadNetworkConfig(),
    interfaces: [],
    localIP: "127.0.0.1",
    testStatus: "idle",
    testLatency: 0,
    testError: "",
    detecting: false,
  });

  // 启动时自动检测
  useEffect(() => {
    detectNetwork();
  }, []);

  /** 刷新网络检测 */
  const detectNetwork = useCallback(async () => {
    setState((prev) => ({ ...prev, detecting: true }));
    try {
      const [ip, ifaces] = await Promise.all([
        getLocalIP(),
        getNetworkInterfaces(),
      ]);
      setState((prev) => ({
        ...prev,
        localIP: ip,
        interfaces: ifaces,
        detecting: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, detecting: false }));
    }
  }, []);

  /** 更新配置字段 */
  const updateConfig = useCallback(
    (partial: Partial<NetworkConfig>) => {
      setState((prev) => {
        const newConfig = { ...prev.config, ...partial };
        // 自动生成 wsUrl
        if (partial.serverAddress || partial.port) {
          newConfig.wsUrl = generateWsUrl(
            newConfig.serverAddress,
            newConfig.port
          );
        }
        return { ...prev, config: newConfig, testStatus: "idle" };
      });
    },
    []
  );

  /** 保存配置 */
  const save = useCallback(() => {
    saveNetworkConfig(state.config);
  }, [state.config]);

  /** 重置配置 */
  const reset = useCallback(() => {
    const defaultConfig = resetNetworkConfig();
    setState((prev) => ({
      ...prev,
      config: defaultConfig,
      testStatus: "idle",
      testError: "",
    }));
  }, []);

  /** 测试连接 */
  const testConnection = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      testStatus: "testing",
      testError: "",
      testLatency: 0,
    }));
    const result = await testWebSocketConnection(state.config.wsUrl);
    setState((prev) => ({
      ...prev,
      testStatus: result.success ? "success" : "failed",
      testLatency: result.latency,
      testError: result.error || "",
    }));
    return result;
  }, [state.config.wsUrl]);

  return {
    ...state,
    updateConfig,
    save,
    reset,
    detectNetwork,
    testConnection,
  };
}