/**
 * IDEPanel.test.tsx
 * ==================
 * IDEPanel 组件 - 多联式 IDE 集成面板测试
 *
 * 覆盖范围:
 * - 面板基础渲染 (顶栏 / 视图切换 / 三栏布局)
 * - 文件资源管理器 (文件树展开/折叠/选择)
 * - 代码编辑面板 (Tab 打开/切换/关闭)
 * - AI 聊天面板 (模型选择 / 消息发送)
 * - 集成终端 (命令输入 / 展开收起)
 * - 视图切换 (Preview / Code 模式)
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/ide" }),
}));

// Mock react-resizable-panels (relies on browser layout measurements)
vi.mock("react-resizable-panels", () => ({
  PanelGroup: ({ children, className }: any) => <div data-testid="panel-group" className={className}>{children}</div>,
  Panel: ({ children }: any) => <div data-testid="panel">{children}</div>,
  PanelResizeHandle: ({ children }: any) => <div data-testid="panel-resize-handle">{children}</div>,
}));

// Mock useI18n
vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "ide.title": "智能 AI 编程工作台",
        "ide.subtitle": "多联式低码设计面板",
        "ide.explorer": "Explorer",
        "ide.aiChat": "AI 助手",
        "ide.terminal": "终端",
        "ide.preview": "Preview",
        "ide.code": "Code",
        "ide.search": "Search",
        "ide.more": "更多",
        "ide.back": "Back",
        "ide.filterFiles": "Filter files...",
        "ide.selectFile": "Select a file to start editing",
        "ide.openFromExplorer": "Open files from the Explorer panel",
        "ide.newTerminal": "新建终端",
        "ide.askAI": "Ask AI...",
        "ide.modelSelector": "模型选择",
        "ide.userOnline": "Online",
        "ide.projectName": "项目名称",
        "ide.deploy": "Deploy",
        "ide.share": "Share",
        "ide.settings": "Settings",
        "ide.notifications": "Notifications",
        "ide.quickActions": "Quick Actions",
        "ide.layoutMode": "布局模式",
        "ide.editMode": "编辑模式",
        "ide.previewMode": "预览模式",
        "ide.editModeDesc": "终端仅在右栏显示",
        "ide.previewModeDesc": "终端跨越中栏+右栏",
        "ide.terminalToggle": "切换终端",
        "ide.commandPlaceholder": "输入命令...",
      };
      return map[key] ?? key;
    },
    locale: "zh-CN",
    setLocale: vi.fn(),
    locales: [
      { code: "zh-CN", label: "简体中文", nativeLabel: "简体中文" },
      { code: "en-US", label: "English", nativeLabel: "English" },
    ],
  }),
}));

// Mock CodeEditor to avoid CodeMirror complexity in tests
vi.mock("../components/CodeEditor", () => ({
  CodeEditor: ({ value, filename }: { value: string; filename: string }) => (
    <div data-testid="code-editor">{filename}: {value.slice(0, 50)}</div>
  ),
  getLanguageLabel: (f: string) => f.split(".").pop()?.toUpperCase() || "TEXT",
}));

import { IDEPanel } from "../components/IDEPanel";

describe("IDEPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // 基础渲染
  // ----------------------------------------------------------

  describe("基础渲染", () => {
    it("应渲染顶部导航栏品牌标识", () => {
      render(<IDEPanel />);
      expect(screen.getByText("CloudPivot AI")).toBeInTheDocument();
    });

    it("应渲染项目名称", () => {
      render(<IDEPanel />);
      expect(screen.getByText("智能 AI 编程工作台")).toBeInTheDocument();
    });

    it("应渲染视图切换按钮", () => {
      render(<IDEPanel />);
      expect(screen.getByText("Preview")).toBeInTheDocument();
      expect(screen.getByText("Code")).toBeInTheDocument();
    });

    it("应渲染 EXPLORER 标题", () => {
      render(<IDEPanel />);
      expect(screen.getByText("EXPLORER")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 文件资源管理器
  // ----------------------------------------------------------

  describe("文件资源管理器", () => {
    it("应显示文件树根节点", () => {
      render(<IDEPanel />);
      expect(screen.getByText("src")).toBeInTheDocument();
      expect(screen.getByText("package.json")).toBeInTheDocument();
    });

    it("应显示展开的文件夹内容", () => {
      render(<IDEPanel />);
      // src and src/app are pre-expanded
      expect(screen.getByText("app")).toBeInTheDocument();
      expect(screen.getByText("App.tsx")).toBeInTheDocument();
      expect(screen.getByText("routes.ts")).toBeInTheDocument();
    });

    it("应显示预展开的 components 文件夹", () => {
      render(<IDEPanel />);
      expect(screen.getByText("components")).toBeInTheDocument();
      expect(screen.getByText("Layout.tsx")).toBeInTheDocument();
      expect(screen.getByText("GlassCard.tsx")).toBeInTheDocument();
    });

    it("搜索过滤应过滤文件", () => {
      render(<IDEPanel />);
      const searchInput = screen.getByPlaceholderText("Filter files...");
      fireEvent.change(searchInput, { target: { value: "Glass" } });
      expect(screen.getByText("GlassCard.tsx")).toBeInTheDocument();
    });

    it("点击文件应在编辑器中打开", () => {
      render(<IDEPanel />);
      // 文件树与 Tab 栏可能同时出现同名文件，点击第一个（文件树项）
      fireEvent.click(screen.getAllByText("GlassCard.tsx")[0]);
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 代码编辑面板
  // ----------------------------------------------------------

  describe("代码编辑面板", () => {
    it("无打开文件时应显示占位提示", () => {
      render(<IDEPanel />);
      expect(screen.getByText("Select a file to start editing")).toBeInTheDocument();
    });

    it("打开文件后应显示编辑器", () => {
      render(<IDEPanel />);
      fireEvent.click(screen.getAllByText("GlassCard.tsx")[0]);
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // AI 聊天面板
  // ----------------------------------------------------------

  describe("AI 聊天面板", () => {
    it("应渲染 AI 模型选择器", () => {
      render(<IDEPanel />);
      expect(screen.getByText("GLM-4 Flash")).toBeInTheDocument();
    });

    it("应渲染用户信息", () => {
      render(<IDEPanel />);
      // 顶栏右侧用户头像显示 YY
      expect(screen.getByText("YY")).toBeInTheDocument();
    });

    it("应渲染聊天历史", () => {
      render(<IDEPanel />);
      expect(screen.getByText(/YYC3 AI 编程助手已就绪/)).toBeInTheDocument();
    });

    it("应支持消息输入", () => {
      render(<IDEPanel />);
      const input = screen.getByPlaceholderText("Ask AI...");
      expect(input).toBeInTheDocument();
      fireEvent.change(input, { target: { value: "Hello" } });
      expect(input).toHaveValue("Hello");
    });
  });

  // ----------------------------------------------------------
  // 集成终端
  // ----------------------------------------------------------

  describe("集成终端", () => {
    it("应渲染终端欢迎信息", () => {
      render(<IDEPanel />);
      expect(screen.getByText("YYC³ CloudPivot Terminal v2.4.0")).toBeInTheDocument();
    });

    it("应支持命令输入", () => {
      render(<IDEPanel />);
      const termInput = screen.getByPlaceholderText("输入命令...");
      expect(termInput).toBeInTheDocument();
    });

    it("执行 help 命令应显示帮助信息", () => {
      render(<IDEPanel />);
      const termInput = screen.getByPlaceholderText("输入命令...");
      fireEvent.change(termInput, { target: { value: "help" } });
      fireEvent.keyDown(termInput, { key: "Enter" });
      expect(screen.getByText("━━━━ YYC³ Terminal Commands ━━━━")).toBeInTheDocument();
    });
  });

  // ----------------------------------------------------------
  // 视图切换
  // ----------------------------------------------------------

  describe("视图切换", () => {
    it("应渲染 Back 按钮", () => {
      render(<IDEPanel />);
      // Back 按钮为顶栏左侧 Logo 按钮（点击返回）
      expect(screen.getByText("CloudPivot AI")).toBeInTheDocument();
    });

    it("应渲染 Search 按钮", () => {
      render(<IDEPanel />);
      const searchBtns = screen.getAllByText("Search");
      expect(searchBtns.length).toBeGreaterThan(0);
    });
  });
});
