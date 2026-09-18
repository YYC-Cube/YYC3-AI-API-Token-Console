/**
 * CodeEditor.tsx
 * ===============
 * CodeMirror 语法高亮编辑器 · 赛博朋克主题
 *
 * 自动检测文件扩展名切换语言模式:
 *  js/ts/jsx/tsx → JavaScript/TypeScript
 *  json → JSON
 *  py → Python
 *  sql → SQL
 *  md → Markdown
 *  html/htm → HTML
 *  css/scss → CSS
 *  xml/svg → XML
 *  yaml/yml → YAML
 */

import React, { useMemo, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { markdown } from "@codemirror/lang-markdown";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

/** 赛博朋克深色主题 */
const cyberpunkTheme = EditorView.theme({
  "&": {
    backgroundColor: "rgba(4, 10, 22, 0.85)",
    color: "#c0dcf0",
    fontSize: "13px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', monospace",
  },
  ".cm-content": {
    caretColor: "#00d4ff",
    lineHeight: "1.65",
  },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#00d4ff",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(0, 212, 255, 0.12) !important",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 80, 140, 0.08)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(0, 80, 140, 0.12)",
  },
  ".cm-gutters": {
    backgroundColor: "rgba(4, 10, 22, 0.6)",
    color: "rgba(0, 212, 255, 0.2)",
    borderRight: "1px solid rgba(0, 180, 255, 0.06)",
    fontSize: "11px",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 8px 0 4px",
  },
  ".cm-foldGutter": {
    width: "12px",
  },
  ".cm-matchingBracket": {
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    outline: "1px solid rgba(0, 212, 255, 0.4)",
  },
  ".cm-searchMatch": {
    backgroundColor: "rgba(255, 170, 0, 0.2)",
    outline: "1px solid rgba(255, 170, 0, 0.4)",
  },
  ".cm-tooltip": {
    backgroundColor: "rgba(8, 20, 45, 0.95)",
    border: "1px solid rgba(0, 180, 255, 0.2)",
    borderRadius: "6px",
    color: "#c0dcf0",
  },
  ".cm-tooltip-autocomplete": {
    "& > ul > li": {
      padding: "2px 8px",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: "rgba(0, 212, 255, 0.15)",
      color: "#00d4ff",
    },
  },
  ".cm-panels": {
    backgroundColor: "rgba(8, 20, 45, 0.95)",
    border: "1px solid rgba(0, 180, 255, 0.15)",
    color: "#c0dcf0",
  },
  // Syntax colors
  ".ͼb": { color: "#7b8cff" },   // keyword
  ".ͼd": { color: "#00d4ff" },   // variable
  ".ͼe": { color: "#00ff88" },   // string
  ".ͼf": { color: "#ffaa00" },   // number
  ".ͼg": { color: "#ff6b9d" },   // operator
  ".ͼi": { color: "rgba(0, 212, 255, 0.35)" }, // comment
  ".ͼc": { color: "#c792ea" },   // type
  ".ͼh": { color: "#f78c6c" },   // property
  ".ͼj": { color: "#82aaff" },   // function
  ".ͼl": { color: "#c3e88d" },   // className
  ".ͼm": { color: "#89ddff" },   // punctuation
  ".ͼn": { color: "#f07178" },   // tag
  ".ͼo": { color: "#c792ea" },   // attribute
});

/** 根据文件扩展名获取语言扩展 */
function getLanguageExtension(filename: string): Extension | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const base = filename.toLowerCase();

  switch (ext) {
    case "js":
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    case "json":
      return json();
    case "py":
      return python();
    case "sql":
      return sql();
    case "md":
    case "markdown":
      return markdown();
    case "html":
    case "htm":
      return html();
    case "css":
    case "scss":
    case "less":
      return css();
    case "xml":
    case "svg":
      return xml();
    case "yaml":
    case "yml":
      return yaml();
    default:
      // 无扩展名但可能是已知文件
      if (base === "dockerfile" || base === "makefile") return null;
      if (base.endsWith(".env") || base.startsWith(".env")) return null;
      return null;
  }
}

/** 获取语言标签 (显示用) */
export function getLanguageLabel(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    js: "JavaScript", jsx: "JSX", ts: "TypeScript", tsx: "TSX",
    json: "JSON", py: "Python", sql: "SQL", md: "Markdown",
    html: "HTML", htm: "HTML", css: "CSS", scss: "SCSS", less: "LESS",
    xml: "XML", svg: "SVG", yaml: "YAML", yml: "YAML",
    sh: "Shell", bash: "Bash", zsh: "Zsh",
    log: "Log", txt: "Text", env: "Env", toml: "TOML",
    rs: "Rust", go: "Go", java: "Java", rb: "Ruby",
    php: "PHP", swift: "Swift", kt: "Kotlin", c: "C", cpp: "C++",
    h: "C Header", hpp: "C++ Header", r: "R", jl: "Julia",
    dart: "Dart", lua: "Lua", ex: "Elixir", vue: "Vue",
    svelte: "Svelte", astro: "Astro", graphql: "GraphQL",
    ini: "INI", cfg: "Config", conf: "Config", csv: "CSV", tsv: "TSV",
  };
  return map[ext] || ext.toUpperCase() || "Plain Text";
}

// ============================================================
//  Props
// ============================================================

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filename: string;
  readOnly?: boolean;
  height?: string;
  /** Ctrl+S / Cmd+S 保存回调 */
  onSave?: () => void;
}

export function CodeEditor({
  value,
  onChange,
  filename,
  readOnly = false,
  height = "400px",
  onSave,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      cyberpunkTheme,
      EditorView.lineWrapping,
    ];

    // 语言扩展
    const langExt = getLanguageExtension(filename);
    if (langExt) exts.push(langExt);

    // Ctrl+S 快捷键
    if (onSave) {
      exts.push(
        EditorView.domEventHandlers({
          keydown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === "s") {
              event.preventDefault();
              onSave();
              return true;
            }
            return false;
          },
        })
      );
    }

    return exts;
  }, [filename, onSave]);

  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  return (
    <div className="rounded-lg overflow-hidden border border-[rgba(0,180,255,0.1)] focus-within:border-[rgba(0,212,255,0.3)] transition-colors">
      <CodeMirror
        value={value}
        onChange={handleChange}
        extensions={extensions}
        readOnly={readOnly}
        height={height}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          searchKeymap: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}

// ============================================================
//  SQL 专用编辑器 (固定 SQL 模式, 用于数据库查询)
// ============================================================

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute?: () => void;
  height?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  height = "120px",
  readOnly = false,
  placeholder,
}: SQLEditorProps) {
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      cyberpunkTheme,
      sql(),
      EditorView.lineWrapping,
    ];

    // Ctrl+Enter 执行
    if (onExecute) {
      exts.push(
        EditorView.domEventHandlers({
          keydown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              onExecute();
              return true;
            }
            return false;
          },
        })
      );
    }

    return exts;
  }, [onExecute]);

  return (
    <div className="rounded-lg overflow-hidden border border-[rgba(0,180,255,0.1)] focus-within:border-[rgba(0,212,255,0.3)] transition-colors">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        readOnly={readOnly}
        height={height}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          tabSize: 2,
        }}
      />
    </div>
  );
}
