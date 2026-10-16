/**
 * ide-types.ts
 * =============
 * IDE 页面专用类型定义
 */

export interface IDEFile {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: IDEFile[];
  language?: string;
  content?: string;
  size?: string;
  modified?: string;
}

// S2 类型收敛: IDE 域聊天消息与 ui-shared.ChatMessage 同名异构(timestamp string vs number),
// 域名限定消歧 — 共享契约见 src/app/types/ui-shared.ts
export interface IdeChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface IDEProject {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  status: "active" | "archived";
  thumbnail?: string;
}

export type IDEViewMode = "default" | "preview" | "code";

export type IDELayoutMode = "edit" | "preview";

export interface OpenTab {
  id: string;
  filename: string;
  filepath: string;
  content: string;
  isModified: boolean;
}

// ======== Git Types ========

export type GitFileStatus = "modified" | "added" | "deleted" | "renamed" | "untracked";

export interface GitChange {
  id: string;
  filename: string;
  filepath: string;
  status: GitFileStatus;
  staged: boolean;
  additions: number;
  deletions: number;
}

export interface GitCommit {
  id: string;
  hash: string;
  message: string;
  author: string;
  date: string;
  branch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  lastCommit: string;
  behind: number;
  ahead: number;
}

// ======== Editor Types ========

export interface EditorDiagnostic {
  line: number;
  column: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source: string;
}
