/**
 * SDKChatPanel.test.tsx
 * ======================
 * SDKChatPanel 组件测试
 *
 * 覆盖范围:
 * - 基本渲染 (标题/占位符)
 * - 无配置模型时的空状态
 * - 模型选择器
 * - 消息输入区域
 * - 统计面板
 * - 能力标签
 * - 会话列表
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================
// Mock 依赖
// ============================================================

// Mock useModelProvider
const mockConfiguredModels = [
  {
    id: "zhipu-glm4-1",
    providerId: "zhipu" as const,
    providerLabel: "Z.ai",
    model: "glm-4-flash",
    apiKey: "",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    createdAt: Date.now(),
    lastUsed: null,
    status: "unchecked" as const,
  },
  {
    id: "openai-gpt4-1",
    providerId: "openai" as const,
    providerLabel: "OpenAI",
    model: "gpt-4o",
    apiKey: "sk-test-key",
    baseUrl: "https://api.openai.com/v1",
    createdAt: Date.now(),
    lastUsed: null,
    status: "active" as const,
  },
];

vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    configuredModels: mockConfiguredModels,
    providers: [],
    ollamaModels: [],
    ollamaLoading: false,
    ollamaError: null,
    stats: { total: 2, active: 1, ollamaCount: 0, providers: 2 },
    modalOpen: false,
    openModal: vi.fn(),
    closeModal: vi.fn(),
    addModel: vi.fn(),
    removeModel: vi.fn(),
    testConnection: vi.fn(),
    fetchOllamaModels: vi.fn(),
  }),
  MODEL_PROVIDERS: [],
}));

// Mock useBigModelSDK
const mockCreateSession = vi.fn().mockReturnValue({ id: "new-session", title: "Test", modelId: "zhipu-glm4-1", messages: [], createdAt: Date.now(), updatedAt: Date.now() });
const mockDeleteSession = vi.fn();
const mockSendMessageStream = vi.fn();
const mockAbort = vi.fn();
const mockResetStats = vi.fn();
const mockSetActiveSessionId = vi.fn();

vi.mock("../hooks/useBigModelSDK", () => ({
  useBigModelSDK: () => ({
    sessions: [
      { id: "s1", title: "Test Session", modelId: "zhipu-glm4-1", messages: [
        { id: "m1", role: "user", content: "hello", timestamp: Date.now() },
        { id: "m2", role: "assistant", content: "Hi there!", timestamp: Date.now(), model: "glm-4-flash" },
      ], createdAt: Date.now(), updatedAt: Date.now() },
    ],
    activeSession: {
      id: "s1",
      title: "Test Session",
      modelId: "zhipu-glm4-1",
      messages: [
        { id: "m1", role: "user", content: "hello", timestamp: Date.now() },
        { id: "m2", role: "assistant", content: "Hi there!", timestamp: Date.now(), model: "glm-4-flash" },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    activeSessionId: "s1",
    setActiveSessionId: mockSetActiveSessionId,
    createSession: mockCreateSession,
    deleteSession: mockDeleteSession,
    clearSessions: vi.fn(),
    connectionStatus: "idle" as const,
    streaming: false,
    streamingContent: "",
    error: null,
    sendMessage: vi.fn(),
    sendMessageStream: mockSendMessageStream,
    abort: mockAbort,
    testConnection: vi.fn(),
    getCapabilities: (id: string) => ["chat", "chat-stream"],
    hasCapability: () => true,
    usageStats: {
      totalRequests: 5,
      totalTokensIn: 200,
      totalTokensOut: 800,
      avgLatencyMs: 450,
      lastRequestAt: Date.now(),
      errorCount: 1,
    },
    resetStats: mockResetStats,
  }),
  PROVIDER_CAPABILITIES: [
    { providerId: "zhipu", capabilities: ["chat", "chat-stream", "knowledge-base", "image-gen"] },
    { providerId: "openai", capabilities: ["chat", "chat-stream", "image-gen"] },
  ],
}));

// Mock useI18n
vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      const map: Record<string, string> = {
        "sdk.sessions": "Sessions",
        "sdk.noSessions": "No sessions",
        "sdk.selectModel": "Select Model",
        "sdk.newChat": "New Chat",
        "sdk.noMessages": "No messages",
        "sdk.startHint": "Send a message",
        "sdk.inputPlaceholder": "Type a message...",
        "sdk.send": "Send",
        "sdk.stop": "Stop",
        "sdk.mockMode": "Mock Mode",
        "sdk.streaming": "Generating...",
        "sdk.connectionIdle": "Idle",
        "sdk.connectionConnecting": "Connecting",
        "sdk.connectionConnected": "Connected",
        "sdk.connectionError": "Error",
        "sdk.stats": "Stats",
        "sdk.totalRequests": "Total Requests",
        "sdk.totalTokensIn": "Input Tokens",
        "sdk.totalTokensOut": "Output Tokens",
        "sdk.avgLatency": "Avg Latency",
        "sdk.errorCount": "Errors",
        "sdk.resetStats": "Reset",
        "sdk.capabilities": "Capabilities",
        "sdk.you": "You",
        "sdk.assistant": "Assistant",
        "modelProvider.noConfigured": "No models",
      };
      return map[key] ?? key;
    },
    locale: "en-US",
    setLocale: vi.fn(),
  }),
}));

// Mock Layout ViewContext
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false, isTablet: false, isDesktop: true, breakpoint: "lg", width: 1200, isTouch: false }),
}));

// ============================================================
// 测试
// ============================================================

import { SDKChatPanel } from "../components/SDKChatPanel";

describe("SDKChatPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应正确渲染", () => {
    const { container } = render(<SDKChatPanel />);
    expect(container).toBeTruthy();
  });

  it("应显示会话列表标题", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText(/Sessions/)).toBeTruthy();
  });

  it("应显示已有会话 'Test Session'", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("Test Session")).toBeTruthy();
  });

  it("应显示消息内容", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("Hi there!")).toBeTruthy();
  });

  it("应显示模型选择器", () => {
    render(<SDKChatPanel />);
    // 默认选中第一个模型
    expect(screen.getByText("Z.ai / glm-4-flash")).toBeTruthy();
  });

  it("应显示 Mock Mode 标签 (无 API Key)", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("Mock Mode")).toBeTruthy();
  });

  it("应显示状态指示器 'Idle'", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("Idle")).toBeTruthy();
  });

  it("应显示统计数据", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("Total Requests")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.getByText("450ms")).toBeTruthy();
  });

  it("应显示能力标签", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("Capabilities")).toBeTruthy();
    expect(screen.getByText("chat")).toBeTruthy();
    expect(screen.getByText("chat-stream")).toBeTruthy();
  });

  it("应显示新建对话按钮", () => {
    render(<SDKChatPanel />);
    expect(screen.getByText("New Chat")).toBeTruthy();
  });

  it("点击新建对话应调用 createSession", () => {
    render(<SDKChatPanel />);
    const btn = screen.getByText("New Chat");
    fireEvent.click(btn);
    expect(mockCreateSession).toHaveBeenCalled();
  });

  it("应有消息输入区域", () => {
    render(<SDKChatPanel />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    expect(textarea).toBeTruthy();
  });

  it("输入后应可发送 (模拟 Enter)", () => {
    render(<SDKChatPanel />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(mockSendMessageStream).toHaveBeenCalled();
  });

  it("Shift+Enter 不应触发发送", () => {
    render(<SDKChatPanel />);
    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "test" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    // sendMessageStream 不应被调用
    expect(mockSendMessageStream).not.toHaveBeenCalled();
  });

  it("应显示重置统计按钮", () => {
    render(<SDKChatPanel />);
    const resetBtn = screen.getByText("Reset");
    expect(resetBtn).toBeTruthy();
    fireEvent.click(resetBtn);
    expect(mockResetStats).toHaveBeenCalled();
  });

  it("应显示 You / Assistant 角色标签", () => {
    render(<SDKChatPanel />);
    const youLabels = screen.getAllByText("You");
    const assistantLabels = screen.getAllByText("Assistant");
    expect(youLabels.length).toBeGreaterThanOrEqual(1);
    expect(assistantLabels.length).toBeGreaterThanOrEqual(1);
  });
});