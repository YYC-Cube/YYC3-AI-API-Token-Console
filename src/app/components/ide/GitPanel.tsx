/**
 * GitPanel.tsx
 * =============
 * Git 版本控制面板
 * 分支管理 + 变更暂存 + 提交历史 + Diff 预览
 */

import React, { useState, useCallback } from "react";
import {
  GitBranch, GitCommit as GitCommitIcon, GitPullRequest,
  Plus, Minus, FileEdit, FilePlus, FileX, FileType,
  Check, ChevronDown, ChevronRight, RefreshCw,
  ArrowUp, ArrowDown, Search,
} from "lucide-react";
import { useI18n } from "../../hooks/useI18n";
import { MOCK_GIT_BRANCHES, MOCK_GIT_CHANGES, MOCK_GIT_COMMITS } from "./ide-mock-data";
import type { GitChange, GitCommit } from "./ide-types";

type GitTab = "changes" | "commits" | "branches";

const STATUS_ICONS: Record<string, React.ElementType> = {
  modified: FileEdit,
  added: FilePlus,
  deleted: FileX,
  renamed: FileType,
  untracked: Plus,
};

const STATUS_COLORS: Record<string, string> = {
  modified: "#ffaa00",
  added: "#00ff88",
  deleted: "#ff3366",
  renamed: "#c792ea",
  untracked: "#7b8cff",
};

export function GitPanel() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<GitTab>("changes");
  const [changes, setChanges] = useState<GitChange[]>(MOCK_GIT_CHANGES);
  const [commitMsg, setCommitMsg] = useState("");
  const [showBranchSelect, setShowBranchSelect] = useState(false);
  const [searchCommits, setSearchCommits] = useState("");

  const currentBranch = MOCK_GIT_BRANCHES.find((b) => b.current) ?? MOCK_GIT_BRANCHES[0];
  const stagedChanges = changes.filter((c) => c.staged);
  const unstagedChanges = changes.filter((c) => !c.staged);

  const toggleStage = useCallback((id: string) => {
    setChanges((prev) => prev.map((c) => c.id === id ? { ...c, staged: !c.staged } : c));
  }, []);

  const stageAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, staged: true })));
  }, []);

  const unstageAll = useCallback(() => {
    setChanges((prev) => prev.map((c) => ({ ...c, staged: false })));
  }, []);

  const handleCommit = useCallback(() => {
    if (!commitMsg.trim() || stagedChanges.length === 0) return;
    // Mock commit - remove staged changes
    setChanges((prev) => prev.filter((c) => !c.staged));
    setCommitMsg("");
  }, [commitMsg, stagedChanges]);

  const filteredCommits = searchCommits
    ? MOCK_GIT_COMMITS.filter((c) =>
        c.message.toLowerCase().includes(searchCommits.toLowerCase()) ||
        c.hash.toLowerCase().includes(searchCommits.toLowerCase())
      )
    : MOCK_GIT_COMMITS;

  const tabs: { id: GitTab; label: string; count?: number }[] = [
    { id: "changes", label: t("ide.gitChanges"), count: changes.length },
    { id: "commits", label: t("ide.gitHistory"), count: MOCK_GIT_COMMITS.length },
    { id: "branches", label: t("ide.gitBranches"), count: MOCK_GIT_BRANCHES.length },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: "rgba(4,10,22,0.5)" }}>
      {/* Header: Branch selector */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid rgba(0,180,255,0.08)" }}
      >
        <div className="relative flex items-center gap-1.5 min-w-0">
          <GitBranch className="w-3.5 h-3.5 text-[#00d4ff] shrink-0" />
          <button
            onClick={() => setShowBranchSelect(!showBranchSelect)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[rgba(0,212,255,0.08)] transition-all"
          >
            <span className="text-[#e0f0ff] truncate" style={{ fontSize: "0.68rem" }}>
              {currentBranch.name}
            </span>
            <ChevronDown className="w-2.5 h-2.5 text-[rgba(0,212,255,0.3)]" />
          </button>
          {currentBranch.ahead > 0 && (
            <span className="flex items-center gap-0.5 text-[#00ff88]" style={{ fontSize: "0.5rem" }}>
              <ArrowUp className="w-2 h-2" />{currentBranch.ahead}
            </span>
          )}
          {currentBranch.behind > 0 && (
            <span className="flex items-center gap-0.5 text-[#ff6b9d]" style={{ fontSize: "0.5rem" }}>
              <ArrowDown className="w-2 h-2" />{currentBranch.behind}
            </span>
          )}

          {showBranchSelect && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowBranchSelect(false)} />
              <div
                className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-50"
                style={{
                  background: "rgba(8,20,45,0.95)",
                  border: "1px solid rgba(0,180,255,0.2)",
                  backdropFilter: "blur(12px)",
                  minWidth: "180px",
                }}
              >
                {MOCK_GIT_BRANCHES.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => setShowBranchSelect(false)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 transition-all ${
                      b.current ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]" : "text-[#c0dcf0] hover:bg-[rgba(0,40,80,0.3)]"
                    }`}
                  >
                    <GitBranch className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1 text-left" style={{ fontSize: "0.65rem" }}>{b.name}</span>
                    {b.current && <Check className="w-3 h-3 text-[#00ff88]" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all" title="Sync">
            <RefreshCw className="w-3 h-3" />
          </button>
          <button className="p-1 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all" title="Pull Request">
            <GitPullRequest className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center shrink-0 px-1" style={{ borderBottom: "1px solid rgba(0,180,255,0.06)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 transition-all border-b-2 ${
              activeTab === tab.id
                ? "text-[#00d4ff] border-[#00d4ff]"
                : "text-[rgba(0,212,255,0.35)] border-transparent hover:text-[rgba(0,212,255,0.6)]"
            }`}
            style={{ fontSize: "0.62rem" }}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1 rounded-full ${
                  activeTab === tab.id ? "bg-[rgba(0,212,255,0.15)]" : "bg-[rgba(0,40,80,0.3)]"
                }`}
                style={{ fontSize: "0.5rem" }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,180,255,0.15) transparent" }}
      >
        {activeTab === "changes" && (
          <div className="flex flex-col h-full">
            {/* Commit input */}
            <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid rgba(0,180,255,0.06)" }}>
              <textarea
                value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)}
                placeholder={t("ide.gitCommitMsg")}
                rows={2}
                className="w-full bg-[rgba(0,40,80,0.25)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] px-2 py-1.5 rounded-md border border-[rgba(0,180,255,0.1)] outline-none focus:border-[rgba(0,212,255,0.3)] resize-none"
                style={{ fontSize: "0.65rem", lineHeight: "1.4" }}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMsg.trim() || stagedChanges.length === 0}
                className={`w-full mt-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                  commitMsg.trim() && stagedChanges.length > 0
                    ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.25)] border border-[rgba(0,212,255,0.3)]"
                    : "bg-[rgba(0,40,80,0.2)] text-[rgba(0,212,255,0.2)] border border-[rgba(0,180,255,0.05)]"
                }`}
                style={{ fontSize: "0.62rem" }}
              >
                <Check className="w-3 h-3" />
                <span>{t("ide.gitCommit")} ({stagedChanges.length})</span>
              </button>
            </div>

            {/* Staged changes */}
            {stagedChanges.length > 0 && (
              <div className="px-1 py-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.58rem", letterSpacing: "0.5px" }}>
                    {t("ide.gitStaged")} ({stagedChanges.length})
                  </span>
                  <button
                    onClick={unstageAll}
                    className="text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all"
                    style={{ fontSize: "0.5rem" }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </div>
                {stagedChanges.map((c) => (
                  <ChangeItem key={c.id} change={c} onToggle={toggleStage} />
                ))}
              </div>
            )}

            {/* Unstaged changes */}
            {unstagedChanges.length > 0 && (
              <div className="px-1 py-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.58rem", letterSpacing: "0.5px" }}>
                    {t("ide.gitUnstaged")} ({unstagedChanges.length})
                  </span>
                  <button
                    onClick={stageAll}
                    className="text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] transition-all"
                    style={{ fontSize: "0.5rem" }}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                {unstagedChanges.map((c) => (
                  <ChangeItem key={c.id} change={c} onToggle={toggleStage} />
                ))}
              </div>
            )}

            {changes.length === 0 && (
              <div className="flex flex-col items-center justify-center flex-1 py-8">
                <Check className="w-8 h-8 text-[rgba(0,255,136,0.15)] mb-2" />
                <p className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.68rem" }}>
                  {t("ide.gitClean")}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "commits" && (
          <div className="flex flex-col">
            {/* Search */}
            <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid rgba(0,180,255,0.06)" }}>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(0,40,80,0.25)] border border-[rgba(0,180,255,0.08)]">
                <Search className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0" />
                <input
                  type="text"
                  value={searchCommits}
                  onChange={(e) => setSearchCommits(e.target.value)}
                  placeholder={t("ide.gitSearchCommits")}
                  className="flex-1 bg-transparent text-[#e0f0ff] placeholder-[rgba(0,212,255,0.2)] outline-none"
                  style={{ fontSize: "0.62rem" }}
                />
              </div>
            </div>
            {filteredCommits.map((commit) => (
              <CommitItem key={commit.id} commit={commit} />
            ))}
          </div>
        )}

        {activeTab === "branches" && (
          <div className="px-1 py-1">
            {MOCK_GIT_BRANCHES.map((branch) => (
              <div
                key={branch.name}
                className={`flex items-center gap-2 px-2 py-2 rounded-md transition-all ${
                  branch.current ? "bg-[rgba(0,212,255,0.08)]" : "hover:bg-[rgba(0,40,80,0.2)]"
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 shrink-0" style={{ color: branch.current ? "#00d4ff" : "rgba(0,212,255,0.3)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`truncate ${branch.current ? "text-[#00d4ff]" : "text-[#c0dcf0]"}`} style={{ fontSize: "0.68rem" }}>
                      {branch.name}
                    </span>
                    {branch.current && (
                      <span className="px-1 py-0.5 rounded text-[#00ff88] bg-[rgba(0,255,136,0.1)]" style={{ fontSize: "0.45rem" }}>
                        HEAD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[rgba(0,212,255,0.25)]" style={{ fontSize: "0.5rem" }}>
                      {branch.lastCommit}
                    </span>
                    {branch.ahead > 0 && (
                      <span className="flex items-center gap-0.5 text-[#00ff88]" style={{ fontSize: "0.5rem" }}>
                        ↑{branch.ahead}
                      </span>
                    )}
                    {branch.behind > 0 && (
                      <span className="flex items-center gap-0.5 text-[#ff6b9d]" style={{ fontSize: "0.5rem" }}>
                        ↓{branch.behind}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function ChangeItem({ change, onToggle }: { change: GitChange; onToggle: (id: string) => void }) {
  const Icon = STATUS_ICONS[change.status] || FileEdit;
  const color = STATUS_COLORS[change.status] || "#00d4ff";

  return (
    <button
      onClick={() => onToggle(change.id)}
      className="w-full flex items-center gap-1.5 px-2 py-[4px] rounded-[3px] hover:bg-[rgba(0,40,80,0.2)] transition-all group"
    >
      <Icon className="w-3 h-3 shrink-0" style={{ color }} />
      <span className="truncate flex-1 text-left text-[#c0dcf0]" style={{ fontSize: "0.65rem" }}>
        {change.filename}
      </span>
      <span className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {change.additions > 0 && (
          <span className="text-[#00ff88]" style={{ fontSize: "0.5rem" }}>+{change.additions}</span>
        )}
        {change.deletions > 0 && (
          <span className="text-[#ff3366]" style={{ fontSize: "0.5rem" }}>-{change.deletions}</span>
        )}
      </span>
      <span
        className="p-0.5 rounded text-[rgba(0,212,255,0.3)] hover:text-[#00d4ff] shrink-0"
        title={change.staged ? "Unstage" : "Stage"}
      >
        {change.staged ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
      </span>
    </button>
  );
}

function CommitItem({ commit }: { commit: GitCommit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="px-2 py-1.5 hover:bg-[rgba(0,40,80,0.15)] transition-all cursor-pointer"
      style={{ borderBottom: "1px solid rgba(0,180,255,0.04)" }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <GitCommitIcon className="w-3 h-3 text-[rgba(0,212,255,0.3)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[#c0dcf0] truncate" style={{ fontSize: "0.65rem" }}>
            {commit.message}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[rgba(0,212,255,0.25)] font-mono" style={{ fontSize: "0.5rem" }}>
              {commit.hash}
            </span>
            <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.5rem" }}>
              {commit.author}
            </span>
            <span className="text-[rgba(0,212,255,0.15)]" style={{ fontSize: "0.5rem" }}>
              {commit.date}
            </span>
          </div>
          {expanded && (
            <div className="flex items-center gap-3 mt-1 px-1 py-1 rounded bg-[rgba(0,40,80,0.2)]">
              <span className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.5rem" }}>
                {commit.filesChanged} files
              </span>
              <span className="text-[#00ff88]" style={{ fontSize: "0.5rem" }}>
                +{commit.additions}
              </span>
              <span className="text-[#ff3366]" style={{ fontSize: "0.5rem" }}>
                -{commit.deletions}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
