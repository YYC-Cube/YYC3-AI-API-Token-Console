/**
 * LocalFileManager.test.tsx
 * ==========================
 * LocalFileManager 组件测试
 *
 * 覆盖:
 * - 基本渲染 (标题、Tab)
 * - 快捷操作按钮
 * - Tab 切换
 * - FileDetailEditor + CodeEditor 集成
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

// Mock CodeMirror
vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value}>
      {props.placeholder && <span>{props.placeholder}</span>}
    </div>
  ),
}));
vi.mock("@codemirror/lang-javascript", () => ({ javascript: () => [] }));
vi.mock("@codemirror/lang-json", () => ({ json: () => [] }));
vi.mock("@codemirror/lang-python", () => ({ python: () => [] }));
vi.mock("@codemirror/lang-sql", () => ({ sql: () => [] }));
vi.mock("@codemirror/lang-markdown", () => ({ markdown: () => [] }));
vi.mock("@codemirror/lang-html", () => ({ html: () => [] }));
vi.mock("@codemirror/lang-css", () => ({ css: () => [] }));
vi.mock("@codemirror/lang-xml", () => ({ xml: () => [] }));
vi.mock("@codemirror/lang-yaml", () => ({ yaml: () => [] }));
vi.mock("@codemirror/view", () => ({
  EditorView: {
    theme: () => [],
    lineWrapping: [],
    domEventHandlers: () => [],
  },
}));
vi.mock("@codemirror/state", () => ({}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Mock ViewContext
vi.mock("../lib/view-context", () => ({
  ViewContext: React.createContext({ isMobile: false }),
}));

// Mock useI18n
vi.mock("../hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "fileManager.title": "本地文件管理",
        "fileManager.subtitle": "~/.yyc3-cloudpivot",
        "fileManager.fileBrowse": "文件浏览",
        "fileManager.logViewer": "日志查看",
        "fileManager.reportGen": "报告生成",
        "fileManager.downloadLogs": "下载日志",
        "fileManager.exportToLocal": "导出到本地",
        "fileManager.executeBackup": "执行备份",
        "fileManager.clearCache": "清理缓存",
        "fileManager.releaseSpace": "释放空间",
        "common.close": "关闭",
        "common.unknown": "未知",
      };
      return map[key] || key;
    },
    locale: "zh-CN",
  }),
}));

// Mock useLocalFileSystem
const mockFs = {
  fileTree: [],
  currentItems: [
    { id: "f1", name: "config.json", type: "file", path: "~/.yyc3-cloudpivot/configs/config.json", size: 1024, extension: "json", modifiedAt: Date.now() },
    { id: "f2", name: "inference.log", type: "file", path: "~/.yyc3-cloudpivot/logs/inference.log", size: 2048, extension: "log", modifiedAt: Date.now() },
  ],
  breadcrumbs: [{ label: "~/.yyc3-cloudpivot", path: "~/.yyc3-cloudpivot" }],
  currentPath: "~/.yyc3-cloudpivot",
  selectedFile: null as any,
  logs: [],
  reports: [],
  isGenerating: false,
  logLevelFilter: "all",
  logSourceFilter: "all",
  logSearchQuery: "",
  logSources: ["GPU-A100-01", "system"],
  downloadLogs: vi.fn(),
  executeBackup: vi.fn(),
  clearCache: vi.fn(),
  selectFile: vi.fn(),
  navigateTo: vi.fn(),
  goUp: vi.fn(),
  generateReport: vi.fn(),
  formatSize: (n?: number) => n ? `${(n / 1024).toFixed(1)}KB` : "0B",
  getFileContent: vi.fn((id: string) => '{ "key": "value" }'),
  saveFileContent: vi.fn(),
  setLogLevelFilter: vi.fn(),
  setLogSourceFilter: vi.fn(),
  setLogSearchQuery: vi.fn(),
};

vi.mock("../hooks/useLocalFileSystem", () => ({
  useLocalFileSystem: () => mockFs,
}));

// Mock sub-components
vi.mock("../components/FileBrowser", () => ({
  FileBrowser: (props: any) => <div data-testid="file-browser">FileBrowser</div>,
}));
vi.mock("../components/LogViewer", () => ({
  LogViewer: (props: any) => <div data-testid="log-viewer">LogViewer</div>,
}));
vi.mock("../components/ReportGenerator", () => ({
  ReportGenerator: (props: any) => <div data-testid="report-generator">ReportGenerator</div>,
}));

import { LocalFileManager } from "../components/LocalFileManager";

describe("LocalFileManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.selectedFile = null;
  });

  it("should render the title", () => {
    render(<LocalFileManager />);
    expect(screen.getByText("本地文件管理")).toBeInTheDocument();
  });

  it("should render 3 tabs", () => {
    render(<LocalFileManager />);
    expect(screen.getByTestId("tab-files")).toBeInTheDocument();
    expect(screen.getByTestId("tab-logs")).toBeInTheDocument();
    expect(screen.getByTestId("tab-reports")).toBeInTheDocument();
  });

  it("should render quick action buttons", () => {
    render(<LocalFileManager />);
    expect(screen.getByTestId("quick-download")).toBeInTheDocument();
    expect(screen.getByTestId("quick-backup")).toBeInTheDocument();
    expect(screen.getByTestId("quick-clear")).toBeInTheDocument();
  });

  it("should show FileBrowser by default", () => {
    render(<LocalFileManager />);
    expect(screen.getByTestId("file-browser")).toBeInTheDocument();
  });

  it("should switch to LogViewer when logs tab is clicked", () => {
    render(<LocalFileManager />);
    fireEvent.click(screen.getByTestId("tab-logs"));
    expect(screen.getByTestId("log-viewer")).toBeInTheDocument();
  });

  it("should switch to ReportGenerator when reports tab is clicked", () => {
    render(<LocalFileManager />);
    fireEvent.click(screen.getByTestId("tab-reports"));
    expect(screen.getByTestId("report-generator")).toBeInTheDocument();
  });

  it("should show FileDetailEditor when a file is selected", () => {
    mockFs.selectedFile = {
      id: "f1",
      name: "config.json",
      path: "~/.yyc3-cloudpivot/configs/config.json",
      size: 1024,
      extension: "json",
      modifiedAt: Date.now(),
    };
    render(<LocalFileManager />);
    expect(screen.getByTestId("file-detail")).toBeInTheDocument();
    expect(screen.getByText("config.json")).toBeInTheDocument();
  });

  it("should show file metadata in FileDetailEditor", () => {
    mockFs.selectedFile = {
      id: "f1",
      name: "test.py",
      path: "~/.yyc3-cloudpivot/scripts/test.py",
      size: 512,
      extension: "py",
      modifiedAt: Date.now(),
    };
    render(<LocalFileManager />);
    expect(screen.getByText("test.py")).toBeInTheDocument();
    expect(screen.getByText(".py")).toBeInTheDocument();
  });

  it("should show 编辑内容 button in FileDetailEditor", () => {
    mockFs.selectedFile = {
      id: "f1",
      name: "config.json",
      path: "~/.yyc3-cloudpivot/configs/config.json",
      size: 1024,
      extension: "json",
      modifiedAt: Date.now(),
    };
    render(<LocalFileManager />);
    expect(screen.getByText("编辑内容")).toBeInTheDocument();
  });

  it("should show CodeEditor when 编辑内容 is clicked", () => {
    mockFs.selectedFile = {
      id: "f1",
      name: "config.json",
      path: "~/.yyc3-cloudpivot/configs/config.json",
      size: 1024,
      extension: "json",
      modifiedAt: Date.now(),
    };
    render(<LocalFileManager />);
    fireEvent.click(screen.getByText("编辑内容"));
    // CodeEditor should now be visible (mocked as codemirror-mock)
    expect(screen.getByTestId("codemirror-mock")).toBeInTheDocument();
    // Language label should show JSON
    expect(screen.getByText("JSON")).toBeInTheDocument();
    // Save and Close buttons should appear
    expect(screen.getByText("保存")).toBeInTheDocument();
    expect(screen.getByText("关闭编辑")).toBeInTheDocument();
  });

  it("should call downloadLogs on quick action click", () => {
    render(<LocalFileManager />);
    fireEvent.click(screen.getByTestId("quick-download"));
    expect(mockFs.downloadLogs).toHaveBeenCalled();
  });

  it("should call executeBackup on quick action click", () => {
    render(<LocalFileManager />);
    fireEvent.click(screen.getByTestId("quick-backup"));
    expect(mockFs.executeBackup).toHaveBeenCalled();
  });

  it("should call clearCache on quick action click", () => {
    render(<LocalFileManager />);
    fireEvent.click(screen.getByTestId("quick-clear"));
    expect(mockFs.clearCache).toHaveBeenCalled();
  });
});
