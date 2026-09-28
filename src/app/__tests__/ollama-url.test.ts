/**
 * ollama-url.test.ts
 * ==================
 * Ollama 端点解析工具 - 单元测试 (回归: console 反代优先级策略)
 *
 * 运行命令: pnpm vitest run src/app/__tests__/ollama-url.test.ts
 *
 * 覆盖范围:
 * - 优先级策略: console 代理 > 同源代理 > 直连
 * - getOllamaUrl / getOllamaChatUrl / getOllamaTagsUrl 三者一致性
 * - subPath 前导斜杠归一化
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConsoleOllamaUrl,
  getOllamaChatUrl,
  getOllamaEndpointInfo,
  getOllamaTagsUrl,
  getOllamaUrl,
  isConsoleDeployment,
  isLocalDeployment,
  shouldUseProxy
} from "../lib/ollama-url";

/** 模拟浏览器 window 环境 */
function stubWindow(location: { hostname: string; pathname: string }): void {
  vi.stubGlobal("window", { location });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ollama-url 环境检测", () => {
  it("无 window (node 环境): 非 console / 非本地 / 不走代理", () => {
    expect(isConsoleDeployment()).toBe(false);
    expect(isLocalDeployment()).toBe(false);
    expect(shouldUseProxy()).toBe(false);
  });

  it("pathname 以 /console 开头: console 部署", () => {
    stubWindow({ hostname: "api.0379.world", pathname: "/console/dashboard" });
    expect(isConsoleDeployment()).toBe(true);
  });

  it("192.168.* 主机名: 本地部署走同源代理", () => {
    stubWindow({ hostname: "192.168.3.1", pathname: "/" });
    expect(isLocalDeployment()).toBe(true);
    expect(shouldUseProxy()).toBe(true);
    expect(isConsoleDeployment()).toBe(false);
  });
});

describe("ollama-url 端点解析优先级 (console > 同源代理 > 直连)", () => {
  it("console 部署: getOllamaUrl 走 console 反代 (回归: 此前缺失检测直连 11434)", () => {
    stubWindow({ hostname: "api.0379.world", pathname: "/console/dashboard" });
    expect(getOllamaUrl("show")).toBe("/console/ollama/n1/api/show");
    expect(getOllamaChatUrl()).toBe("/console/ollama/n1/api/chat");
    expect(getOllamaTagsUrl()).toBe("/console/ollama/n1/api/tags");
  });

  it("console 部署: subPath 前导斜杠归一化", () => {
    stubWindow({ hostname: "api.0379.world", pathname: "/console" });
    expect(getOllamaUrl("/generate")).toBe("/console/ollama/n1/api/generate");
  });

  it("本地部署: 三个函数一致走同源代理", () => {
    stubWindow({ hostname: "192.168.3.1", pathname: "/" });
    expect(getOllamaChatUrl()).toBe("/api/v1/llm/ollama/chat");
    expect(getOllamaTagsUrl()).toBe("/api/v1/llm/ollama/tags");
    expect(getOllamaUrl("embeddings")).toBe("/api/v1/llm/ollama/embeddings");
  });

  it("无 window: 三个函数一致直连 OLLAMA_BASE_URL 默认值", () => {
    expect(getOllamaChatUrl()).toBe("http://localhost:11434/api/chat");
    expect(getOllamaTagsUrl()).toBe("http://localhost:11434/api/tags");
    expect(getOllamaUrl("show")).toBe("http://localhost:11434/api/show");
  });

  it("getConsoleOllamaUrl: 节点参数与路径归一化", () => {
    expect(getConsoleOllamaUrl("tags", "n2")).toBe("/console/ollama/n2/api/tags");
    expect(getConsoleOllamaUrl("/show")).toBe("/console/ollama/n1/api/show");
  });
});

describe("getOllamaEndpointInfo 诊断模式 (回归: console 模式缺失)", () => {
  it("console 部署: mode=console, 端点为反代 URL (此前误报 direct)", () => {
    stubWindow({ hostname: "api.0379.world", pathname: "/console/dashboard" });
    const info = getOllamaEndpointInfo();
    expect(info.mode).toBe("console");
    expect(info.chatUrl).toBe("/console/ollama/n1/api/chat");
    expect(info.tagsUrl).toBe("/console/ollama/n1/api/tags");
  });

  it("本地部署: mode=proxy", () => {
    stubWindow({ hostname: "192.168.3.1", pathname: "/" });
    expect(getOllamaEndpointInfo().mode).toBe("proxy");
  });

  it("无 window: mode=direct", () => {
    expect(getOllamaEndpointInfo().mode).toBe("direct");
  });
});
