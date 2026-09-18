/**
 * network-utils.ts
 * ================
 * YYC3 网络工具函数
 * - WebRTC 本机 IP 检测
 * - 网络接口信息获取
 * - WebSocket 连接测试
 */

import type { NetworkInterface, NetworkConfig, ConnectionTestResult } from "../types";

// RF-011: Re-export 已移除 — 所有类型统一从 types/index.ts 导入

/** 根据服务器地址和端口自动生成 WebSocket URL */
export function generateWsUrl(address: string, port: string): string {
  return `ws://${address}:${port}/ws`;
}

// RF-001: DEFAULT_NETWORK_CONFIG.wsUrl 由 serverAddress+port 推导，保持内部一致
const _DEFAULT_SERVER = "192.168.3.45";
const _DEFAULT_PORT = "3113";

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  serverAddress: _DEFAULT_SERVER,
  port: _DEFAULT_PORT,
  nasAddress: `${_DEFAULT_SERVER}:9898`,
  wsUrl: generateWsUrl(_DEFAULT_SERVER, _DEFAULT_PORT),
  mode: "auto",
};

const STORAGE_KEY = "network_config";

/** 从 localStorage 读取网络配置 */
export function loadNetworkConfig(): NetworkConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_NETWORK_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_NETWORK_CONFIG };
}

/** 保存网络配置到 localStorage */
export function saveNetworkConfig(config: NetworkConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** 重置网络配置 */
export function resetNetworkConfig(): NetworkConfig {
  localStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_NETWORK_CONFIG };
}

/** WebRTC 获取本机 IP（浏览器环境） */
export async function getLocalIP(): Promise<string> {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("test");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdp = offer.sdp || "";
    const regex = /c=IN IP4 (\d+\.\d+\.\d+\.\d+)/;
    const match = sdp.match(regex);
    pc.close();

    if (match && match[1] && match[1] !== "0.0.0.0") {
      return match[1];
    }
  } catch {
    // WebRTC 不可用
  }
  return "127.0.0.1";
}

/** 检测网络接口信息 */
export async function getNetworkInterfaces(): Promise<NetworkInterface[]> {
  const ip = await getLocalIP();
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || "unknown";
  const isWifi = effectiveType === "4g" || connection?.type === "wifi";

  const interfaces: NetworkInterface[] = [
    {
      name: isWifi ? "wlan0" : "en0",
      type: isWifi ? "WiFi" : "有线以太网",
      ip,
      status: navigator.onLine ? "active" : "inactive",
    },
  ];

  // 模拟额外接口
  if (ip !== "127.0.0.1") {
    interfaces.push({
      name: "lo0",
      type: "Loopback",
      ip: "127.0.0.1",
      status: "active",
    });
  }

  return interfaces;
}

/** 测试 WebSocket 连接 */
export function testWebSocketConnection(
  url: string,
  timeoutMs = 5000
): Promise<ConnectionTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, latency: timeoutMs, error: "连接超时" });
      }
    }, timeoutMs);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const latency = Date.now() - start;
          ws.close();
          resolve({ success: true, latency });
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const latency = Date.now() - start;
          resolve({ success: false, latency, error: "连接被拒绝" });
        }
      };

      ws.onclose = (event) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          const latency = Date.now() - start;
          resolve({
            success: false,
            latency,
            error: event.reason || "连接已关闭",
          });
        }
      };
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({
          success: false,
          latency: Date.now() - start,
          error: err?.message || "网络不可达",
        });
      }
    }
  });
}

/** 测试 HTTP 端点可达性 */
export async function testHTTPConnection(
  url: string,
  timeoutMs = 5000
): Promise<ConnectionTestResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      mode: "no-cors",
    });
    clearTimeout(timer);
    return { success: true, latency: Date.now() - start };
  } catch (err: any) {
    clearTimeout(timer);
    return {
      success: false,
      latency: Date.now() - start,
      error: err?.name === "AbortError" ? "连接超时" : "网络不可达",
    };
  }
}