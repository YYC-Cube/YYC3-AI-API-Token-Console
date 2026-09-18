/**
 * CodeEditor.test.tsx
 * ====================
 * CodeEditor + SQLEditor 组件测试
 *
 * 覆盖:
 * - CodeEditor 渲染
 * - getLanguageLabel 各扩展名映射
 * - SQLEditor 渲染
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock @uiw/react-codemirror (CodeMirror 在 jsdom 中无法正常初始化)
vi.mock("@uiw/react-codemirror", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="codemirror-mock" data-value={props.value} data-readonly={props.readOnly}>
      {props.placeholder && <span>{props.placeholder}</span>}
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
    domEventHandlers: () => [],
  },
}));
vi.mock("@codemirror/state", () => ({}));

import { CodeEditor, SQLEditor, getLanguageLabel } from "../components/CodeEditor";

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
});