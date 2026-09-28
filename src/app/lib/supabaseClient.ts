/**
 * Supabase Client 封装（Mock 模式）
 * ==================================
 * YYC³ 本地多端推理矩阵数据库
 *
 * 当前状态：纯前端 Mock 模式
 * 接入方式：配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量
 *
 * .env.development 配置示例：
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 *
 * 本地直连 PostgreSQL 备选方案：
 *   VITE_DB_HOST=localhost
 *   VITE_DB_PORT=5433
 *   VITE_DB_NAME=yyc3_matrix
 *
 * RF-012: 迁移指南
 * ─────────────────
 * 切换到真实 Supabase 时需注意：
 *   1. 替换 MockSupabaseClient 为 createClient() from @supabase/supabase-js
 *   2. 创建 adapter 层转换 session/user 结构:
 *      - Supabase Session: { access_token, user: { id, email, user_metadata } }
 *      - App Session:      { user: AppUser, token, expiresAt }
 *      使用 toAppSession(supabaseSession) / toAppUser(supabaseUser) 函数
 *   3. App.tsx 中移除 `as AppSession` 类型断言，改用 adapter 函数
 *   4. 更新 auth.onAuthStateChange 回调签名以匹配 Supabase SDK
 */
import type { AppSession, AppUser } from "../types";
import { isConsoleDeployment } from "./ollama-url";

// RF-011: Legacy type aliases (MockUser/MockSession) 已移除
// 所有类型统一从 types/index.ts 导入 AppUser / AppSession

// 预设用户（本地闭环系统：admin + developer 两种角色）
const MOCK_USERS: Record<string, { password: string; user: AppUser }> = {
  "admin@cloudpivot.local": {
    password: "admin123",
    user: { id: "usr-001", email: "admin@cloudpivot.local", role: "admin", name: "YYC Admin" },
  },
  "dev@cloudpivot.local": {
    password: "dev123",
    user: { id: "usr-002", email: "dev@cloudpivot.local", role: "developer", name: "YYC Developer" },
  },
};

/** 幽灵用户 · Ghost Mode — 无需凭证，全权限 */
const GHOST_USER: AppUser = {
  id: "ghost-000",
  email: "ghost@yyc3.local",
  role: "admin",
  name: "Ghost Operator",
};

const SESSION_KEY = "yyc3_session";

// ── Console 公网部署形态（批4 鉴权） ──
// 真实鉴权在服务端（/console/auth/*，HttpOnly Cookie，浏览器不可读）；
// 本地 SESSION_KEY 仅承载 UI 展示态（用户名/角色），不承载凭证。
const CONSOLE_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const CONSOLE_USER: AppUser = {
  id: "console-admin",
  email: "admin@console.local",
  role: "admin",
  name: "Console Admin",
};

function newConsoleSession(): AppSession {
  return { user: CONSOLE_USER, token: "console-session", expiresAt: Date.now() + CONSOLE_SESSION_TTL_MS };
}

/** console 形态登录 — 密码直登，会话 Cookie 由服务端 Set-Cookie 写入 */
async function consoleSignIn(password: string): Promise<{
  data: { user: AppUser; session: AppSession } | null;
  error: { message: string } | null;
}> {
  try {
    const r = await fetch("/console/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      const message = r.status === 401 ? "密码不正确"
        : r.status === 429 ? "尝试过于频繁，请 5 分钟后再试"
          : j.error || `登录失败 (${r.status})`;
      return { data: null, error: { message } };
    }
    const session = newConsoleSession();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { data: { user: CONSOLE_USER, session }, error: null };
  } catch {
    return { data: null, error: { message: "登录服务不可达" } };
  }
}

class MockSupabaseClient {
  auth = {
    /** 邮箱密码登录 */
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      if (isConsoleDeployment()) {
        return consoleSignIn(password); // console 形态: 密码直登（服务端 constant-time 校验）
      }
      const entry = MOCK_USERS[email];
      if (!entry || entry.password !== password) {
        return { data: null, error: { message: "邮箱或密码不正确" } };
      }
      const session: AppSession = {
        user: entry.user,
        token: `mock_token_${Date.now()}`,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { data: { user: entry.user, session }, error: null };
    },

    /** 获取当前会话 */
    getSession: async () => {
      if (isConsoleDeployment()) {
        // console 形态: 会话有效性以服务端 Cookie 为准（/console/auth/status）
        try {
          const r = await fetch("/console/auth/status");
          if (r.ok) {
            const s = (await r.json()) as { authenticated?: boolean };
            if (s.authenticated) {
              try {
                const raw = localStorage.getItem(SESSION_KEY);
                if (raw) {
                  const session = JSON.parse(raw) as AppSession;
                  if (Date.now() <= session.expiresAt) return { data: { session }, error: null };
                }
              } catch { /* 本地 UI 会话损坏则重建 */ }
              const session = newConsoleSession();
              localStorage.setItem(SESSION_KEY, JSON.stringify(session));
              return { data: { session }, error: null };
            }
          }
        } catch { /* 状态接口不可达按未登录处理 */ }
        localStorage.removeItem(SESSION_KEY);
        return { data: { session: null }, error: null };
      }
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return { data: { session: null }, error: null };
        const session: AppSession = JSON.parse(raw);
        if (Date.now() > session.expiresAt) {
          localStorage.removeItem(SESSION_KEY);
          return { data: { session: null }, error: null };
        }
        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    /** 获取当前用户 */
    getUser: async () => {
      const { data } = await this.auth.getSession();
      if (data.session) {
        return { data: { user: data.session.user }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    /** 登出 */
    signOut: async () => {
      if (isConsoleDeployment()) {
        try { await fetch("/console/auth/logout", { method: "POST" }); } catch { /* 服务端清理失败不阻塞登出 */ }
      }
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem("yyc3_ghost");
      return { error: null };
    },

    /** 监听认证状态变化（简化实现） */
    onAuthStateChange: (callback: (event: string, session: AppSession | null) => void) => {
      // 初始化时检查一次
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          const session = JSON.parse(raw);
          callback("SIGNED_IN", session);
        } catch {
          callback("SIGNED_OUT", null);
        }
      } else {
        callback("SIGNED_OUT", null);
      }
      return { data: { subscription: { unsubscribe: () => { } } } };
    },
  };

  /** Mock 数据查询（模拟 Supabase .from().select() 链） */
  from(table: string) {
    return {
      select: (_columns?: string) => ({
        eq: (col: string, val: string | number | boolean) =>
          this._mockQuery(table, { [col]: val }),
        order: (_col: string, _opts?: { ascending?: boolean }) => this._mockQuery(table),
        limit: (_n: number) => this._mockQuery(table),
        then: (resolve: (val: { data: never[]; error: null; count: number }) => void) =>
          resolve(this._mockQuery(table)),
      }),
    };
  }

  private _mockQuery(_table: string, _filters?: Record<string, string | number | boolean>) {
    return { data: [] as never[], error: null, count: 0 };
  }
}

export const supabase = new MockSupabaseClient();

/**
 * 幽灵登录 · Ghost Sign-In
 * 跳过所有认证流程，直接创建 admin 级会话
 * 功能完全不受限，适用于本地开发 / 演示 / 紧急运维
 */
export function ghostSignIn(): AppSession {
  if (isConsoleDeployment()) {
    throw new Error("Ghost 模式在 console 公网部署下已禁用");
  }
  const session: AppSession = {
    user: GHOST_USER,
    token: `ghost_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("yyc3_ghost", "1");
  return session;
}

/** 检查当前是否为幽灵模式 */
export function isGhostMode(): boolean {
  return localStorage.getItem("yyc3_ghost") === "1";
}
