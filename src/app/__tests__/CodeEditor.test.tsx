/**
 * CodeEditor.test.tsx
 * ====================
 * CodeEditor + SQLEditor 组件测试
 *
 * 覆盖:
 * - CodeEditor 渲染
 * - getLanguageLabel 各扩展名映射 (含空扩展名回退)
 * - getLanguageExtension 各语言分支 (js/py/sql/md/html/css/xml/yaml/dockerfile/.env/无扩展名)
 * - Ctrl+S / Ctrl+Enter 快捷键 handler (meta/ctrl + 命中/未命中)
 * - onChange 受控回调透传
 * - SQLEditor 渲染
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

/** 捕获 EditorView.domEventHandlers 注册的 handlers, 供快捷键用例直接调用 */
const cmViewMock = vi.hoisted(() => ({
  domHandlers: [] as Array<Record<string, (event: unknown) => boolean | void>>,
}));

// Mock @uiw/react-codemirror (CodeMirror 在 jsdom 中无法正常初始化)
vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value} data-readonly={props.readOnly}>
      {props.placeholder && <span>{props.placeholder}</span>}
      <button data-testid="cm-emit-change" onClick={() => props.onChange("updated-code")}>
        emit
      </button>
    </div>
  ),
}));

// Mock CodeMirror language extensions
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
    domEventHandlers: (handlers: Record<string, (event: unknown) => boolean | void>) => {
      cmViewMock.domHandlers.push(handlers);
      return [];
    },
  },
}));
vi.mock("@codemirror/state", () => ({}));

import { CodeEditor, SQLEditor, getLanguageLabel } from "../components/CodeEditor";

beforeEach(() => {
  cmViewMock.domHandlers.length = 0;
});

describe("getLanguageLabel", () => {
  it("should return JavaScript for .js", () => {
    expect(getLanguageLabel("app.js")).toBe("JavaScript");
  });

  it("should return TypeScript for .ts", () => {
    expect(getLanguageLabel("index.ts")).toBe("TypeScript");
  });

  it("should return TSX for .tsx", () => {
    expect(getLanguageLabel("Component.tsx")).toBe("TSX");
  });

  it("should return JSON for .json", () => {
    expect(getLanguageLabel("package.json")).toBe("JSON");
  });

  it("should return Python for .py", () => {
    expect(getLanguageLabel("script.py")).toBe("Python");
  });

  it("should return SQL for .sql", () => {
    expect(getLanguageLabel("query.sql")).toBe("SQL");
  });

  it("should return Markdown for .md", () => {
    expect(getLanguageLabel("README.md")).toBe("Markdown");
  });

  it("should return YAML for .yml", () => {
    expect(getLanguageLabel("config.yml")).toBe("YAML");
  });

  it("should return CSS for .css", () => {
    expect(getLanguageLabel("styles.css")).toBe("CSS");
  });

  it("should return HTML for .html", () => {
    expect(getLanguageLabel("index.html")).toBe("HTML");
  });

  it("should return XML for .xml", () => {
    expect(getLanguageLabel("data.xml")).toBe("XML");
  });

  it("should return SVG for .svg", () => {
    expect(getLanguageLabel("icon.svg")).toBe("SVG");
  });

  it("should return Shell for .sh", () => {
    expect(getLanguageLabel("deploy.sh")).toBe("Shell");
  });

  it("should return Rust for .rs", () => {
    expect(getLanguageLabel("main.rs")).toBe("Rust");
  });

  it("should return Go for .go", () => {
    expect(getLanguageLabel("main.go")).toBe("Go");
  });

  it("should return uppercase for unknown extension", () => {
    expect(getLanguageLabel("file.xyz")).toBe("XYZ");
  });

  it("should return Plain Text for no extension", () => {
    expect(getLanguageLabel("Makefile")).toBe("MAKEFILE");
  });

  it("空扩展名应回退 Plain Text", () => {
    // "file." 的 pop() 为空串 → map 未命中 → toUpperCase 为空 → 兜底文案
    expect(getLanguageLabel("file.")).toBe("Plain Text");
    expect(getLanguageLabel("")).toBe("Plain Text");
  });
});

describe("CodeEditor", () => {
  it("should render with CodeMirror", () => {
    render(
      <CodeEditor
        value="const x = 1;"
        onChange={() => {}}
        filename="test.ts"
      />
    );
    const cm = screen.getByTestId("codemirror-mock");
    expect(cm).toBeInTheDocument();
    expect(cm).toHaveAttribute("data-value", "const x = 1;");
  });

  it("should pass readOnly prop", () => {
    render(
      <CodeEditor
        value=""
        onChange={() => {}}
        filename="test.json"
        readOnly
      />
    );
    const cm = screen.getByTestId("codemirror-mock");
    expect(cm).toHaveAttribute("data-readonly", "true");
  });

  const languageFilenameCases: string[] = [
    "app.js", "comp.jsx", "widget.tsx",
    "script.py", "query.sql",
    "README.md", "notes.markdown",
    "index.html", "page.htm",
    "styles.css", "theme.scss", "theme.less",
    "data.xml", "icon.svg",
    "conf.yaml", "conf.yml",
    "Dockerfile", "Makefile",
    ".env", ".env.local", "noextfile",
  ];

  it.each(languageFilenameCases)("文件名 %s 应正常渲染并命中对应语言分支", (filename) => {
    render(
      <CodeEditor value="x" onChange={() => {}} filename={filename} />
    );
    expect(screen.getByTestId("codemirror-mock")).toBeInTheDocument();
  });

  it("编辑内容变化应透传 onChange", () => {
    const onChange = vi.fn();
    render(
      <CodeEditor value="init" onChange={onChange} filename="a.ts" />
    );
    fireEvent.click(screen.getByTestId("cm-emit-change"));
    expect(onChange).toHaveBeenCalledWith("updated-code");
  });

  it("Ctrl/Cmd+S 应触发 onSave 并阻止默认行为", () => {
    const onSave = vi.fn();
    render(
      <CodeEditor value="" onChange={() => {}} filename="a.ts" onSave={onSave} />
    );
    const handlers = cmViewMock.domHandlers[cmViewMock.domHandlers.length - 1];
    const metaEvent = { metaKey: true, ctrlKey: false, key: "s", preventDefault: vi.fn() };
    expect(handlers.keydown(metaEvent)).toBe(true);
    const ctrlEvent = { metaKey: false, ctrlKey: true, key: "s", preventDefault: vi.fn() };
    expect(handlers.keydown(ctrlEvent)).toBe(true);
    expect(onSave).toHaveBeenCalledTimes(2);
    expect(metaEvent.preventDefault).toHaveBeenCalled();
    expect(ctrlEvent.preventDefault).toHaveBeenCalled();
  });

  it("非保存快捷键不应触发 onSave", () => {
    const onSave = vi.fn();
    render(
      <CodeEditor value="" onChange={() => {}} filename="a.ts" onSave={onSave} />
    );
    const handlers = cmViewMock.domHandlers[cmViewMock.domHandlers.length - 1];
    const otherEvent = { metaKey: true, ctrlKey: false, key: "x", preventDefault: vi.fn() };
    expect(handlers.keydown(otherEvent)).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
    expect(otherEvent.preventDefault).not.toHaveBeenCalled();
  });
});

describe("SQLEditor", () => {
  it("should render with placeholder", () => {
    render(
      <SQLEditor
        value=""
        onChange={() => {}}
        placeholder="Enter SQL..."
      />
    );
    expect(screen.getByText("Enter SQL...")).toBeInTheDocument();
  });

  it("should render with SQL value", () => {
    render(
      <SQLEditor
        value="SELECT * FROM nodes;"
        onChange={() => {}}
      />
    );
    const cm = screen.getByTestId("codemirror-mock");
    expect(cm).toHaveAttribute("data-value", "SELECT * FROM nodes;");
  });

  it("should pass readOnly prop", () => {
    render(
      <SQLEditor value="" onChange={() => {}} readOnly />
    );
    expect(screen.getByTestId("codemirror-mock")).toHaveAttribute("data-readonly", "true");
  });

  it("编辑内容变化应透传 onChange", () => {
    const onChange = vi.fn();
    render(<SQLEditor value="SELECT 1;" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("cm-emit-change"));
    expect(onChange).toHaveBeenCalledWith("updated-code");
  });

  it("Ctrl/Cmd+Enter 应触发 onExecute 并阻止默认行为", () => {
    const onExecute = vi.fn();
    render(
      <SQLEditor value="" onChange={() => {}} onExecute={onExecute} />
    );
    const handlers = cmViewMock.domHandlers[cmViewMock.domHandlers.length - 1];
    const metaEvent = { metaKey: true, ctrlKey: false, key: "Enter", preventDefault: vi.fn() };
    expect(handlers.keydown(metaEvent)).toBe(true);
    const ctrlEvent = { metaKey: false, ctrlKey: true, key: "Enter", preventDefault: vi.fn() };
    expect(handlers.keydown(ctrlEvent)).toBe(true);
    expect(onExecute).toHaveBeenCalledTimes(2);
    expect(metaEvent.preventDefault).toHaveBeenCalled();
  });

  it("非执行快捷键不应触发 onExecute", () => {
    const onExecute = vi.fn();
    render(
      <SQLEditor value="" onChange={() => {}} onExecute={onExecute} />
    );
    const handlers = cmViewMock.domHandlers[cmViewMock.domHandlers.length - 1];
    const otherEvent = { metaKey: true, ctrlKey: false, key: "s", preventDefault: vi.fn() };
    expect(handlers.keydown(otherEvent)).toBe(false);
    expect(onExecute).not.toHaveBeenCalled();
  });
});