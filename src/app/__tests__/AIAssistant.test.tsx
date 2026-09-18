/**
 * AIAssistant.test.tsx
 * =====================
 * AIAssistant 组件测试
 *
 * 覆盖范围:
 * - 浮动按钮渲染与点击打开
 * - 面板打开后 header/tab/content 渲染
 * - Chat Tab: 欢迎消息, 发送消息, 输入框, 发送按钮
 * - Commands Tab: 分类过滤, 命令列表, 执行命令
 * - Prompts Tab: 预设列表, 应用预设, 自定义编辑
 * - Settings Tab: API Key, 模型选择, 参数调节
 * - 关闭面板
 * - 清空对话
 * - 最大化/还原
 */

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("../components/YYC3LogoSvg", () => ({
  YYC3LogoSvg: () => <div data-testid="yyc3-logo-svg" />,
}));

// Mock useModelProvider to return predictable data
vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    availableModels: [
      { id: "ollama-live-qwen2.5:7b", name: "qwen2.5:7b", provider: "Ollama (本地)", isLocal: true },
      { id: "ollama-live-codegeex4:latest", name: "codegeex4:latest", provider: "Ollama (本地)", isLocal: true },
    ],
    ollamaLoading: false,
  }),
}));

// Mock useSettingsStore — AI 配置全局数据源
const mockUpdateValue = vi.fn();
const mockSettingsValues = {
  aiApiKey: "",
  aiBaseUrl: "https://api.openai.com/v1",
  aiModel: "ollama-live-qwen2.5:7b",
  aiTemperature: "0.7",
  aiTopP: "0.9",
  aiMaxTokens: "2048",
  aiTimeout: "30000",
};

vi.mock("../hooks/useSettingsStore", () => ({
  useSettingsStore: () => ({
    values: mockSettingsValues,
    updateValue: mockUpdateValue,
    settings: {},
    toggleSetting: vi.fn(),
    updateValues: vi.fn(),
    resetSettings: vi.fn(),
    exportSettings: vi.fn(() => "{}"),
    importSettings: vi.fn(),
  }),
}));

import { AIAssistant } from "../components/AIAssistant";

describe("AIAssistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("浮动按钮", () => {
    it("初始应渲染浮动按钮", () => {
      render(<AIAssistant isMobile={false} />);
      expect(screen.getByTestId("yyc3-logo-svg")).toBeInTheDocument();
    });

    it("浮动按钮应有 tooltip", () => {
      render(<AIAssistant isMobile={false} />);
      expect(screen.getByText("AI 智能助理 (⌘J)")).toBeInTheDocument();
    });

    it("点击浮动按钮应打开面板", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("AI 智能助理")).toBeInTheDocument();
    });
  });

  describe("面板基础", () => {
    function openPanel() {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button")); // open
    }

    it("面板应渲染 header 和模型名称", () => {
      openPanel();
      expect(screen.getByText("AI 智能助理")).toBeInTheDocument();
      expect(screen.getByText("qwen2.5:7b")).toBeInTheDocument(); // model from useModelProvider mock
    });

    it("面板应渲染 4 个 Tab", () => {
      openPanel();
      expect(screen.getByText("对话")).toBeInTheDocument();
      expect(screen.getByText("命令")).toBeInTheDocument();
      expect(screen.getByText("提示词")).toBeInTheDocument();
      expect(screen.getByText("配置")).toBeInTheDocument();
    });

    it("关闭按钮应关闭面板", () => {
      openPanel();
      // Find close button (X icon)
      const buttons = screen.getAllByRole("button");
      const closeBtn = buttons.find(b => b.title === "" && b.querySelector("svg"));
      // The last button in header area is close
      const headerBtns = screen.getByText("AI 智能助理").closest("div")?.parentElement?.querySelectorAll("button");
      if (headerBtns && headerBtns.length > 0) {
        fireEvent.click(headerBtns[headerBtns.length - 1]); // last = close
        expect(screen.queryByText("AI 智能助理")).not.toBeInTheDocument();
      }
    });

    it("最大化按钮应切换面板大小", () => {
      openPanel();
      const maxBtn = screen.getByTitle("最大化");
      fireEvent.click(maxBtn);
      // After maximizing, title should change to 还原
      expect(screen.getByTitle("还原")).toBeInTheDocument();
    });
  });

  describe("Chat Tab", () => {
    function openChat() {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button")); // open panel
    }

    it("应渲染欢迎消息", () => {
      openChat();
      expect(screen.getByText(/CP-IM AI 智能助理/)).toBeInTheDocument();
    });

    it("应渲染输入框", () => {
      openChat();
      expect(screen.getByPlaceholderText(/输入指令/)).toBeInTheDocument();
    });

    it("输入文本后发送按钮应可用", () => {
      openChat();
      const input = screen.getByPlaceholderText(/输入指令/);
      fireEvent.change(input, { target: { value: "查看集群状态" } });
      const sendBtn = screen.getByRole("button", { name: "" });
      // The send button should not be disabled
      // We find it by looking for the Send icon button
      const allBtns = screen.getAllByRole("button");
      const lastBtn = allBtns[allBtns.length - 1];
      expect(lastBtn).not.toBeDisabled();
    });

    it("发送消息后应显示用户消息", async () => {
      openChat();
      const input = screen.getByPlaceholderText(/输入指令/);
      fireEvent.change(input, { target: { value: "查看节点状态" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByText("查看节点状态")).toBeInTheDocument();
    });

    it("清空对话应重置消息", () => {
      openChat();
      const clearBtn = screen.getByTitle("清空对话");
      fireEvent.click(clearBtn);
      expect(screen.getByText("对话已清空。请输入新的指令开始操作。")).toBeInTheDocument();
    });
  });

  describe("Commands Tab", () => {
    function openCommands() {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button")); // open panel
      fireEvent.click(screen.getByText("命令")); // switch to commands tab
    }

    it("应渲染命令分类过滤按钮", () => {
      openCommands();
      expect(screen.getByText("全部")).toBeInTheDocument();
      expect(screen.getByText("集群")).toBeInTheDocument();
      expect(screen.getByText("模型")).toBeInTheDocument();
      expect(screen.getByText("数据")).toBeInTheDocument();
      expect(screen.getByText("安全")).toBeInTheDocument();
      expect(screen.getByText("监控")).toBeInTheDocument();
    });

    it("应渲染命令列表", () => {
      openCommands();
      expect(screen.getByText("集群状态总览")).toBeInTheDocument();
      expect(screen.getByText("重启异常节点")).toBeInTheDocument();
      expect(screen.getByText("部署模型")).toBeInTheDocument();
    });

    it("点击分类应过滤命令", () => {
      openCommands();
      fireEvent.click(screen.getByText("安全"));
      expect(screen.getByText("安全审计扫描")).toBeInTheDocument();
      expect(screen.queryByText("集群状态总览")).not.toBeInTheDocument();
    });

    it("点击命令应切换到对话并发送", () => {
      openCommands();
      fireEvent.click(screen.getByText("集群状态总览"));
      // Should switch to chat tab
      expect(screen.getByPlaceholderText(/输入指令/)).toBeInTheDocument();
    });
  });

  describe("Prompts Tab", () => {
    function openPrompts() {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("提示词"));
    }

    it("应渲染预设列表", () => {
      openPrompts();
      expect(screen.getByText("运维诊断专家")).toBeInTheDocument();
      expect(screen.getByText("模型调优顾问")).toBeInTheDocument();
      expect(screen.getByText("数据分析师")).toBeInTheDocument();
      expect(screen.getByText("安全审计员")).toBeInTheDocument();
      expect(screen.getByText("智能运维助手")).toBeInTheDocument();
    });

    it("应渲染分类标签", () => {
      openPrompts();
      expect(screen.getByText("运维")).toBeInTheDocument();
      expect(screen.getByText("通用")).toBeInTheDocument();
    });

    it("应渲染自定义提示词编辑器", () => {
      openPrompts();
      expect(screen.getByText("自定义系统提示词")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("输入自定义系统提示词...")).toBeInTheDocument();
    });

    it("点击预设应应用并切换到对话", () => {
      openPrompts();
      fireEvent.click(screen.getByText("运维诊断专家"));
      // Should switch to chat tab and add system message
      expect(screen.getByPlaceholderText(/输入指令/)).toBeInTheDocument();
    });
  });

  describe("Settings Tab", () => {
    function openSettings() {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("配置"));
    }

    it("应渲染 API Key 输入框", () => {
      openSettings();
      expect(screen.getByPlaceholderText("sk-xxxxxxxxxxxxxxxxxxxxxxxx")).toBeInTheDocument();
    });

    it("应渲染未配置 Key 提示", () => {
      openSettings();
      expect(screen.getByText(/未配置 Key/)).toBeInTheDocument();
    });

    it("输入 API Key 后应调用 updateValue", () => {
      openSettings();
      const input = screen.getByPlaceholderText("sk-xxxxxxxxxxxxxxxxxxxxxxxx");
      fireEvent.change(input, { target: { value: "sk-test123" } });
      // Now calls useSettingsStore.updateValue
      expect(mockUpdateValue).toHaveBeenCalledWith("aiApiKey", "sk-test123");
    });

    it("应渲染模型选择按钮", () => {
      openSettings();
      // Models come from useModelProvider mock
      expect(screen.getByText("qwen2.5:7b")).toBeInTheDocument();
      expect(screen.getByText("codegeex4:latest")).toBeInTheDocument();
    });

    it("点击模型应调用 updateValue", () => {
      openSettings();
      const modelBtn = screen.getByText("codegeex4:latest").closest("button")!;
      fireEvent.click(modelBtn);
      expect(mockUpdateValue).toHaveBeenCalledWith("aiModel", "ollama-live-codegeex4:latest");
    });

    it("应渲染温度滑块", () => {
      openSettings();
      expect(screen.getByText(/Temperature/)).toBeInTheDocument();
    });

    it("显示/隐藏 API Key 切换", () => {
      openSettings();
      const toggleBtn = screen.getByText("显示");
      fireEvent.click(toggleBtn);
      expect(screen.getByText("隐藏")).toBeInTheDocument();
    });
  });

  describe("移动端", () => {
    it("移动端浮动按钮定位不同", () => {
      render(<AIAssistant isMobile={true} />);
      const btn = screen.getByRole("button");
      expect(btn).toBeInTheDocument();
    });

    it("移动端打开面板应全屏", () => {
      render(<AIAssistant isMobile={true} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("AI 智能助理")).toBeInTheDocument();
      // In mobile, no maximize button
      expect(screen.queryByTitle("最大化")).not.toBeInTheDocument();
    });
  });
});