/**
 * supabaseClient.test.ts
 * =======================
 * YYC³ 认证模块 - 单元测试
 *
 * 覆盖范围:
 * - Mock 登录成功/失败
 * - 会话持久化（localStorage）
 * - 会话过期检测
 * - 登出清除状态
 * - 认证状态监听
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { supabase } from "../lib/supabaseClient";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("supabaseClient (Mock)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // ----------------------------------------------------------
  // signInWithPassword
  // ----------------------------------------------------------

  describe("auth.signInWithPassword", () => {
    it("正确凭据应登录成功", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.user.email).toBe("admin@cloudpivot.local");
      expect(data!.user.role).toBe("admin");
    });

    it("开发者账号应登录成功", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "dev@cloudpivot.local",
        password: "dev123",
      });

      expect(error).toBeNull();
      expect(data!.user.role).toBe("developer");
    });

    it("错误密码应返回错误", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "wrong-password",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toContain("不正确");
    });

    it("不存在的邮箱应返回错误", async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: "nobody@example.com",
        password: "password",
      });

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it("登录成功后应写入 localStorage", async () => {
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "yyc3_session",
        expect.any(String)
      );
    });
  });

  // ----------------------------------------------------------
  // getSession
  // ----------------------------------------------------------

  describe("auth.getSession", () => {
    it("未登录时应返回空会话", async () => {
      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });

    it("登录后应返回有效会话", async () => {
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      const { data } = await supabase.auth.getSession();
      expect(data.session).not.toBeNull();
      expect(data.session!.user.email).toBe("admin@cloudpivot.local");
    });

    it("会话过期后应返回空会话", async () => {
      // 手动写入一个过期会话
      const expiredSession = {
        user: { id: "test", email: "test@test.com", role: "admin", name: "Test" },
        token: "expired_token",
        expiresAt: Date.now() - 1000, // 已过期
      };
      localStorageMock.setItem("yyc3_session", JSON.stringify(expiredSession));

      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });

    it("localStorage 数据损坏时应返回空会话", async () => {
      localStorageMock.setItem("yyc3_session", "corrupted-data!!!");
      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // getUser
  // ----------------------------------------------------------

  describe("auth.getUser", () => {
    it("未登录时应返回 null 用户", async () => {
      const { data } = await supabase.auth.getUser();
      expect(data.user).toBeNull();
    });

    it("登录后应返回当前用户信息", async () => {
      await supabase.auth.signInWithPassword({
        email: "dev@cloudpivot.local",
        password: "dev123",
      });

      const { data } = await supabase.auth.getUser();
      expect(data.user).not.toBeNull();
      expect(data.user!.email).toBe("dev@cloudpivot.local");
      expect(data.user!.role).toBe("developer");
    });
  });

  // ----------------------------------------------------------
  // signOut
  // ----------------------------------------------------------

  describe("auth.signOut", () => {
    it("登出后会话应被清除", async () => {
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      await supabase.auth.signOut();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("yyc3_session");

      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });
  });

  // ----------------------------------------------------------
  // onAuthStateChange
  // ----------------------------------------------------------

  describe("auth.onAuthStateChange", () => {
    it("未登录时应回调 SIGNED_OUT", () => {
      const callback = vi.fn();
      supabase.auth.onAuthStateChange(callback);

      expect(callback).toHaveBeenCalledWith("SIGNED_OUT", null);
    });

    it("已登录时应回调 SIGNED_IN", async () => {
      await supabase.auth.signInWithPassword({
        email: "admin@cloudpivot.local",
        password: "admin123",
      });

      const callback = vi.fn();
      supabase.auth.onAuthStateChange(callback);

      expect(callback).toHaveBeenCalledWith("SIGNED_IN", expect.any(Object));
    });

    it("应返回包含 unsubscribe 函数的对象", () => {
      const { data } = supabase.auth.onAuthStateChange(() => {});
      expect(typeof data.subscription.unsubscribe).toBe("function");
    });
  });

  // ----------------------------------------------------------
  // from (Mock 查询)
  // ----------------------------------------------------------

  describe("from (Mock 查询)", () => {
    it("应返回空数据和 null 错误", () => {
      const result = supabase.from("any_table").select("*").eq("id", "1");
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });
});