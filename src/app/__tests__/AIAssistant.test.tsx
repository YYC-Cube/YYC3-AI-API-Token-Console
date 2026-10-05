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
import { fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../components/YYC3LogoSvg", () => ({
  YYC3LogoSvg: () => <div data-testid="yyc3-logo-svg" />,
}));

/** useModelProvider mock 的可变状态 (无模型/加载中场景需动态切换) */
const mpState = vi.hoisted(() => ({
  models: [
    { id: "ollama-live-qwen2.5:7b", name: "qwen2.5:7b", provider: "Ollama (本地)", isLocal: true },
    { id: "ollama-live-codegeex4:latest", name: "codegeex4:latest", provider: "Ollama (本地)", isLocal: true },
  ] as Array<{ id: string; name: string; provider: string; isLocal: boolean }>,
  loading: false,
}));

// Mock useModelProvider to return predictable data
vi.mock("../hooks/useModelProvider", () => ({
  useModelProvider: () => ({
    availableModels: mpState.models,
    ollamaLoading: mpState.loading,
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
    // 重置可变 mock 状态, 保证测试数据自包含
    mpState.models = [
      { id: "ollama-live-qwen2.5:7b", name: "qwen2.5:7b", provider: "Ollama (本地)", isLocal: true },
      { id: "ollama-live-codegeex4:latest", name: "codegeex4:latest", provider: "Ollama (本地)", isLocal: true },
    ];
    mpState.loading = false;
    mockSettingsValues.aiApiKey = "";
    mockSettingsValues.aiModel = "ollama-live-qwen2.5:7b";
    mockSettingsValues.aiTemperature = "0.7";
    mockSettingsValues.aiTopP = "0.9";
    mockSettingsValues.aiMaxTokens = "2048";
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
      // 多按钮无名(图标按钮)场景 → 用 getAllBy 取最后一个(发送按钮位于消息区末尾)
      const allBtns = screen.getAllByRole("button", { name: "" });
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
      // Models come from useModelProvider mock; 模型名同时出现于当前模型徽标与选项列表 → getAllBy
      expect(screen.getAllByText("qwen2.5:7b").length).toBeGreaterThan(0);
      expect(screen.getAllByText("codegeex4:latest").length).toBeGreaterThan(0);
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

  describe("消息发送与模拟回复", () => {
    async function openPanelAndSend(input: string) {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      const textarea = screen.getByPlaceholderText(/输入指令/);
      fireEvent.change(textarea, { target: { value: input } });
      fireEvent.keyDown(textarea, { key: "Enter" });
      // 推进虚拟时钟越过模拟延迟 (800~2000ms)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500);
      });
    }

    const replyCases: Array<[string, RegExp]> = [
      ["查看集群状态", /集群状态报告/],
      ["集群总览", /集群状态报告/],
      ["节点列表", /集群状态报告/],
      ["部署新服务", /模型部署方案/],
      ["切换模型", /模型部署方案/],
      ["优化参数", /AI 优化建议/],
      ["调整配置", /AI 优化建议/],
      ["安全扫描", /安全审计摘要/],
      ["执行审计", /安全审计摘要/],
      ["数据库检查", /数据库健康报告/],
      ["存储分析", /数据库健康报告/],
      ["查看postgresql", /数据库健康报告/],
      ["你好", /收到您的请求/],
    ];

    it.each(replyCases)("输入「%s」应返回对应模拟回复", async (input, matcher) => {
      await openPanelAndSend(input);
      expect(screen.getByText(matcher)).toBeInTheDocument();
      // 回复后输入框保持清空
      expect(screen.getByPlaceholderText(/输入指令/)).toHaveValue("");
    });

    it("点击发送按钮应发送消息", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByPlaceholderText(/输入指令/), { target: { value: "按钮发送" } });
      const allBtns = screen.getAllByRole("button", { name: "" });
      fireEvent.click(allBtns[allBtns.length - 1]);
      expect(screen.getByText("按钮发送")).toBeInTheDocument();
    });

    it("Shift+Enter 换行不应发送消息", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      const textarea = screen.getByPlaceholderText(/输入指令/);
      fireEvent.change(textarea, { target: { value: "换行内容" } });
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
      // 未发送: 输入框内容保留
      expect(textarea).toHaveValue("换行内容");
    });

    it("空内容发送应被忽略", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      const textarea = screen.getByPlaceholderText(/输入指令/);
      fireEvent.keyDown(textarea, { key: "Enter" });
      // 欢迎消息仍在, 无新消息
      expect(screen.getByText(/CP-IM AI 智能助理/)).toBeInTheDocument();
    });
  });

  describe("消息复制与面板关闭", () => {
    it("复制按钮应写入剪贴板", () => {
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue(undefined);
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      // 欢迎消息气泡内含复制按钮 (仅 assistant 消息有)
      const bubble = screen.getByText(/CP-IM AI 智能助理/).parentElement!;
      const copyBtn = bubble.querySelector("button")!;
      fireEvent.click(copyBtn);
      expect(writeTextSpy).toHaveBeenCalled();
      writeTextSpy.mockRestore();
    });

    it("关闭按钮应关闭面板并回到浮动按钮", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      // 头部按钮组: [清空对话, 最大化, 关闭] → 取最后一个
      const headerBtns = screen.getByTitle("清空对话").parentElement!.querySelectorAll("button");
      fireEvent.click(headerBtns[headerBtns.length - 1]);
      expect(screen.queryByText("AI 智能助理")).not.toBeInTheDocument();
      expect(screen.getByText("AI 智能助理 (⌘J)")).toBeInTheDocument();
    });
  });

  describe("模型状态", () => {
    it("未选择模型时应自动选中第一个可用模型", () => {
      mockSettingsValues.aiModel = "";
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      expect(mockUpdateValue).toHaveBeenCalledWith("aiModel", "ollama-live-qwen2.5:7b");
    });

    it("无模型且未加载时应显示未选择模型", () => {
      mpState.models = [];
      mockSettingsValues.aiModel = "";
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("未选择模型")).toBeInTheDocument();
    });

    it("模型加载中且列表为空时应显示加载提示", () => {
      mpState.models = [];
      mpState.loading = true;
      mockSettingsValues.aiModel = "";
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByText("模型加载中...")).toBeInTheDocument();
      // 配置页同步显示检测中与空列表提示
      fireEvent.click(screen.getByText("配置"));
      expect(screen.getByText("正在检测 Ollama 本地模型...")).toBeInTheDocument();
      expect(screen.getByText("暂无可用模型，请前往「模型设置」页面添加")).toBeInTheDocument();
    });
  });

  describe("参数配置交互", () => {
    it("已配置 API Key 时应显示已配置提示", () => {
      mockSettingsValues.aiApiKey = "sk-live";
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("配置"));
      expect(screen.getByText(/API Key 已配置/)).toBeInTheDocument();
    });

    it("非法参数值应回退默认值显示", () => {
      mockSettingsValues.aiTemperature = "abc";
      mockSettingsValues.aiTopP = "xyz";
      mockSettingsValues.aiMaxTokens = "oops";
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("配置"));
      expect(screen.getByText("0.70")).toBeInTheDocument();
      expect(screen.getByText("0.90")).toBeInTheDocument();
      expect(screen.getByText("2048")).toBeInTheDocument();
    });

    it("调节三个滑块应分别调用 updateValue", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("配置"));
      const ranges = document.querySelectorAll('input[type="range"]');
      // 顺序: [温度, Top-P, 最大 Token]
      expect(ranges.length).toBe(3);
      fireEvent.change(ranges[0], { target: { value: "1.5" } });
      expect(mockUpdateValue).toHaveBeenCalledWith("aiTemperature", "1.5");
      fireEvent.change(ranges[1], { target: { value: "0.5" } });
      expect(mockUpdateValue).toHaveBeenCalledWith("aiTopP", "0.5");
      fireEvent.change(ranges[2], { target: { value: "4096" } });
      expect(mockUpdateValue).toHaveBeenCalledWith("aiMaxTokens", "4096");
    });

    it("恢复默认参数应重置三项配置", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("配置"));
      fireEvent.click(screen.getByText("恢复默认参数"));
      expect(mockUpdateValue).toHaveBeenCalledWith("aiTemperature", "0.7");
      expect(mockUpdateValue).toHaveBeenCalledWith("aiTopP", "0.9");
      expect(mockUpdateValue).toHaveBeenCalledWith("aiMaxTokens", "2048");
    });
  });

  describe("自定义提示词", () => {
    it("编辑自定义提示词应更新字数统计", () => {
      render(<AIAssistant isMobile={false} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByText("提示词"));
      const textarea = screen.getByPlaceholderText("输入自定义系统提示词...");
      fireEvent.change(textarea, { target: { value: "abc" } });
      expect(screen.getByText(/字数: 3/)).toBeInTheDocument();
    });
  });
});
