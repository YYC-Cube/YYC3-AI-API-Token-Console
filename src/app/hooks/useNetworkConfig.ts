/**
 * useNetworkConfig Hook
 * =====================
 * 网络连接配置管理 Hook
 * - 读写 localStorage 持久化配置
 * - 自动检测网络环境
 * - WebSocket 连接测试
 */

import { useCallback, useEffect, useState } from "react";
import { getAPIConfig, setAPIConfig } from "../lib/api-config";
import { setEnvConfig } from "../lib/env-config";
import {
  generateWsUrl,
  getLocalIP,
  getNetworkInterfaces,
  loadNetworkConfig,
  resetNetworkConfig,
  saveNetworkConfig,
  testWebSocketConnection,
} from "../lib/network-utils";
import type { NetworkConfig, NetworkConfigState } from "../types";

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

  // 启动时自动检测 (批9: effect 移至 detectNetwork 定义后 — 修复 deps 引用的 TDZ 风险并补齐依赖)
  useEffect(() => {
    detectNetwork();
  }, [detectNetwork]);

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

  /** 保存配置（双端联通 P0-5 三源收敛: 本表保存 → 权威源 api-config 同步生效,
   *  useWebSocketData 订阅即热重建; env-config 显示层单向镜像, 消除「改一处另两处不动」双源漂移） */
  const save = useCallback(() => {
    saveNetworkConfig(state.config);
    if (state.config.wsUrl && state.config.wsUrl !== getAPIConfig().wsEndpoint) {
      setAPIConfig({ wsEndpoint: state.config.wsUrl });
      setEnvConfig({ WS_ENDPOINT: state.config.wsUrl });
    }
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
