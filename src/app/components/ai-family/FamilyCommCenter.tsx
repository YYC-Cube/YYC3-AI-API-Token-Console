/**
 * FamilyCommCenter.tsx
 * =====================
 * AI Family 内部通信中心
 *
 * 功能：
 *  - 全家广播 / 点对点消息
 *  - 消息类型：公告、警报、心跳、普通文本
 *  - 家人在线状态面板
 *  - 快捷发送预设消息
 *  - localStorage 消息持久化 + 历史翻阅
 *  - 消息搜索 & 按日期分组
 *  - 聊天记录导出
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  MessageCircle, Send, Users, Heart, Shield,
  Sparkles, Filter, ChevronDown, ChevronUp,
  Radio, Wifi, CheckCheck, Search,
  Download, Trash2, CalendarDays, X,
} from "lucide-react";
import { GlassCard } from "../GlassCard";
import { FadeIn } from "./FadeIn";
import {
  FAMILY_MEMBERS, SAMPLE_MESSAGES, AI_RESPONSES, hexToRgb,
  type FamilyMember, type FamilyMessage,
} from "./shared";

// ═══ localStorage 持久化 ═══

const COMM_STORAGE_KEY = "yyc3-family-comm-messages";
const COMM_PAGE_SIZE = 30;

function loadMessages(): FamilyMessage[] {
  try {
    const raw = localStorage.getItem(COMM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* noop */ }
  // First load → seed with sample data and persist
  saveMessages(SAMPLE_MESSAGES);
  return [...SAMPLE_MESSAGES];
}

function saveMessages(msgs: FamilyMessage[]) {
  try {
    // Keep max 500 messages
    const trimmed = msgs.slice(-500);
    localStorage.setItem(COMM_STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* noop */ }
}

// ═══ 消息类型配置 ═══

const MSG_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  announcement: { label: "公告", color: "#f59e0b", icon: Sparkles },
  alert:        { label: "警报", color: "#ef4444", icon: Shield },
  text:         { label: "消息", color: "#3b82f6", icon: MessageCircle },
  heartbeat:    { label: "心跳", color: "#ec4899", icon: Heart },
};

// ═══ 日期分组工具 ═══

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "今天";
  if (date.toDateString() === yesterday.toDateString()) return "昨天";
  return date.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
}

// ═══ 子组件：家人状态栏 ═══

function MemberStatusBar({ selectedMember, onSelect }: {
  selectedMember: string | "all";
  onSelect: (id: string | "all") => void;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      <button
        onClick={() => onSelect("all")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg shrink-0 transition-all ${
          selectedMember === "all"
            ? "bg-[rgba(0,212,255,0.1)] text-cyan-300 border border-[rgba(0,212,255,0.2)]"
            : "bg-white/[0.03] text-white/40 border border-transparent hover:bg-white/[0.06]"
        }`}
        style={{ fontSize: "0.7rem" }}
      >
        <Users className="w-3 h-3" />
        全部
      </button>
      {FAMILY_MEMBERS.map(m => {
        const rgb = hexToRgb(m.color);
        const active = selectedMember === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 transition-all ${
              active
                ? "border"
                : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
            }`}
            style={{
              ...(active ? { background: `rgba(${rgb},0.1)`, borderColor: `rgba(${rgb},0.3)`, color: m.color } : { color: "rgba(255,255,255,0.4)" }),
              fontSize: "0.7rem",
            }}
          >
            <div className="relative">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: `rgba(${rgb},0.2)` }}
              >
                <m.icon className="w-2.5 h-2.5" style={{ color: m.color }} />
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[rgba(8,16,35,1)]"
                style={{ background: m.status === "online" ? "#00FF88" : m.status === "speaking" ? "#FFD700" : "#666" }}
              />
            </div>
            {m.shortName}
          </button>
        );
      })}
    </div>
  );
}

// ═══ 子组件：消息气泡 ═══

function MessageBubble({ msg, onDelete }: { msg: FamilyMessage; onDelete?: (id: string) => void }) {
  const from = FAMILY_MEMBERS.find(m => m.id === msg.from);
  const to = msg.to === "all" ? null : FAMILY_MEMBERS.find(m => m.id === msg.to);
  if (!from) return null;
  const rgb = hexToRgb(from.color);
  const typeConfig = MSG_TYPE_CONFIG[msg.type] || MSG_TYPE_CONFIG.text;
  const TypeIcon = typeConfig.icon;

  return (
    <div className="flex items-start gap-2.5 group">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `rgba(${rgb},0.15)`, border: `1px solid rgba(${rgb},0.3)` }}
      >
        <from.icon className="w-4 h-4" style={{ color: from.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span style={{ fontSize: "0.75rem", color: from.color }}>{from.shortName}</span>
          {to && (
            <>
              <span className="text-white/15" style={{ fontSize: "0.55rem" }}>to</span>
              <span className="text-white/40" style={{ fontSize: "0.65rem" }}>{to.shortName}</span>
            </>
          )}
          {msg.to === "all" && (
            <span className="px-1 py-0.5 rounded text-white/30" style={{ fontSize: "0.5rem", background: "rgba(255,255,255,0.04)" }}>
              @全家
            </span>
          )}
          <TypeIcon className="w-2.5 h-2.5" style={{ color: typeConfig.color }} />
          <span className="text-white/15 ml-auto" style={{ fontSize: "0.55rem" }}>
            {msg.timestamp.split("T")[1]?.slice(0, 5)}
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-white/20 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <div
          className="p-2.5 rounded-xl rounded-tl-sm"
          style={{
            background: `rgba(${rgb},0.06)`,
            border: `1px solid rgba(${rgb},0.1)`,
          }}
        >
          <span className="text-white/60" style={{ fontSize: "0.75rem", lineHeight: "1.6" }}>{msg.content}</span>
        </div>
        {msg.read && (
          <div className="flex items-center gap-0.5 mt-0.5 justify-end">
            <CheckCheck className="w-3 h-3 text-cyan-500/40" />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ 子组件：日期分隔线 ═══

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-white/[0.06]" />
      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.03] text-white/25" style={{ fontSize: "0.6rem" }}>
        <CalendarDays className="w-3 h-3" />
        {label}
      </span>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}

// ═══ 主组件 ═══

export function FamilyCommCenter() {
  const [messages, setMessages] = useState<FamilyMessage[]>(() => loadMessages());
  const [filterMember, setFilterMember] = useState<string | "all">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [inputText, setInputText] = useState("");
  const [sendAs, setSendAs] = useState("meta-oracle");
  const [sendTo, setSendTo] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [displayCount, setDisplayCount] = useState(COMM_PAGE_SIZE);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Persist on every change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Filter & search messages
  const filteredMessages = useMemo(() => {
    let result = messages.filter(msg => {
      if (filterMember !== "all") {
        if (msg.from !== filterMember && msg.to !== filterMember && msg.to !== "all") return false;
      }
      if (filterType !== "all" && msg.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const from = FAMILY_MEMBERS.find(m => m.id === msg.from);
        if (
          !msg.content.toLowerCase().includes(q) &&
          !(from?.shortName.toLowerCase().includes(q)) &&
          !(from?.name.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, filterMember, filterType, searchQuery]);

  // Messages to display (paginated)
  const displayMessages = useMemo(() => {
    const start = Math.max(0, filteredMessages.length - displayCount);
    return filteredMessages.slice(start);
  }, [filteredMessages, displayCount]);

  const hasMoreHistory = displayCount < filteredMessages.length;

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; msgs: FamilyMessage[] }[] = [];
    let currentDate = "";
    for (const msg of displayMessages) {
      const dateStr = msg.timestamp.split("T")[0];
      if (dateStr !== currentDate) {
        currentDate = dateStr;
        groups.push({ date: dateStr, msgs: [] });
      }
      groups[groups.length - 1].msgs.push(msg);
    }
    return groups;
  }, [displayMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Send message
  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    const newMsg: FamilyMessage = {
      id: `msg-${Date.now()}`,
      from: sendAs,
      to: sendTo,
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
      type: "text",
      read: false,
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText("");

    // Auto-reply after delay
    setTimeout(() => {
      const responders = sendTo === "all"
        ? FAMILY_MEMBERS.filter(m => m.id !== sendAs).slice(0, 2)
        : [FAMILY_MEMBERS.find(m => m.id === sendTo)].filter(Boolean) as FamilyMember[];

      responders.forEach((responder, i) => {
        setTimeout(() => {
          const responses = AI_RESPONSES[responder.id] || ["收到！"];
          const response: FamilyMessage = {
            id: `msg-${Date.now()}-reply-${i}`,
            from: responder.id,
            to: sendAs,
            content: responses[Math.floor(Math.random() * responses.length)],
            timestamp: new Date().toISOString(),
            type: "text",
            read: false,
          };
          setMessages(prev => [...prev, response]);
        }, 800 + i * 600);
      });
    }, 500);
  }, [inputText, sendAs, sendTo]);

  // Delete message
  const handleDelete = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  // Clear all
  const handleClearAll = useCallback(() => {
    setMessages([]);
    setDisplayCount(COMM_PAGE_SIZE);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    const data = {
      exportDate: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map(m => ({
        ...m,
        fromName: FAMILY_MEMBERS.find(f => f.id === m.from)?.shortName || m.from,
        toName: m.to === "all" ? "全家" : FAMILY_MEMBERS.find(f => f.id === m.to)?.shortName || m.to,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `family-comm-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  // Load more history
  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev => prev + COMM_PAGE_SIZE);
  }, []);

  const unreadCount = messages.filter(m => !m.read).length;
  const totalCount = messages.length;

  // Mark all as read
  const handleMarkAllRead = useCallback(() => {
    setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-4" style={{ background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(8,16,35,1) 50%, rgba(6,12,28,1) 100%)" }}>
      <div className="max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 flex items-center justify-center">
                <Radio className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-white/90" style={{ fontSize: "1.25rem" }}>Family 通信中心</h1>
                <p className="text-white/40" style={{ fontSize: "0.7rem" }}>
                  {totalCount} 条消息 · {unreadCount} 条未读 · {FAMILY_MEMBERS.filter(m => m.status === "online").length} 人在线 · 本地持久化
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`p-2 rounded-lg transition-all ${showSearch ? "bg-cyan-500/10 text-cyan-300" : "text-white/30 hover:text-white/50 hover:bg-white/[0.04]"}`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={handleMarkAllRead}
                className="p-2 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="全部已读"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={handleExport}
                className="p-2 rounded-lg text-white/30 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                title="导出记录"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleClearAll}
                className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="清空全部"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400" style={{ fontSize: "0.6rem" }}>通信就绪</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Search bar */}
        {showSearch && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索消息内容或家人名称..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-10 py-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30"
              style={{ fontSize: "0.8rem" }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {searchQuery && (
              <div className="absolute right-10 top-1/2 -translate-y-1/2 text-white/20" style={{ fontSize: "0.6rem" }}>
                {filteredMessages.length} 条结果
              </div>
            )}
          </div>
        )}

        {/* Member filter bar */}
        <FadeIn delay={0.05}>
          <MemberStatusBar selectedMember={filterMember} onSelect={setFilterMember} />
        </FadeIn>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 my-3">
          <Filter className="w-3 h-3 text-white/20" />
          {[{ key: "all", label: "全部" }, ...Object.entries(MSG_TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(item => (
            <button
              key={item.key}
              onClick={() => setFilterType(item.key)}
              className={`px-2 py-1 rounded transition-all ${
                filterType === item.key
                  ? "bg-[rgba(0,212,255,0.1)] text-cyan-300"
                  : "text-white/30 hover:text-white/50"
              }`}
              style={{ fontSize: "0.6rem" }}
            >
              {item.label}
            </button>
          ))}
          <span className="text-white/15 ml-auto" style={{ fontSize: "0.55rem" }}>
            共 {filteredMessages.length} 条
          </span>
        </div>

        {/* Messages area */}
        <GlassCard className="flex-1 p-4 overflow-y-auto mb-4" ref={scrollContainerRef as any}>
          <div className="space-y-4">
            {/* Load more button */}
            {hasMoreHistory && (
              <div className="text-center">
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-1.5 mx-auto px-4 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-all"
                  style={{ fontSize: "0.7rem" }}
                >
                  <ChevronUp className="w-3 h-3" />
                  加载更早的消息 ({filteredMessages.length - displayCount} 条)
                </button>
              </div>
            )}

            {groupedMessages.length === 0 ? (
              <div className="text-center text-white/20 py-12" style={{ fontSize: "0.8rem" }}>
                暂无消息
              </div>
            ) : (
              groupedMessages.map((group, gi) => (
                <React.Fragment key={group.date}>
                  <DateSeparator label={formatDateGroup(group.date)} />
                  {group.msgs.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} onDelete={handleDelete} />
                  ))}
                </React.Fragment>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </GlassCard>

        {/* Input area */}
        <FadeIn delay={0.1}>
          <div className="flex items-center gap-2">
            {/* Send-as selector */}
            <div className="relative">
              <select
                value={sendAs}
                onChange={e => setSendAs(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white/60 focus:outline-none focus:border-cyan-500/30 pr-6 cursor-pointer"
                style={{ fontSize: "0.7rem" }}
              >
                {FAMILY_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>{m.shortName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
            </div>

            {/* Send-to selector */}
            <div className="relative">
              <select
                value={sendTo}
                onChange={e => setSendTo(e.target.value)}
                className="appearance-none bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-white/60 focus:outline-none focus:border-cyan-500/30 pr-6 cursor-pointer"
                style={{ fontSize: "0.7rem" }}
              >
                <option value="all">@全家</option>
                {FAMILY_MEMBERS.map(m => (
                  <option key={m.id} value={m.id}>@{m.shortName}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 pointer-events-none" />
            </div>

            {/* Input */}
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="输入消息..."
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30"
              style={{ fontSize: "0.8rem" }}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2 rounded-lg bg-[rgba(0,212,255,0.15)] border border-[rgba(0,212,255,0.2)] text-cyan-300 hover:bg-[rgba(0,212,255,0.25)] transition-all disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}