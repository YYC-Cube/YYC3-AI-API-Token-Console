/**
 * console-auth.mjs 纯函数单测（批4 鉴权内核）
 * 覆盖: constant-time 比较 / 令牌签发与校验（篡改·过期·垃圾输入）/ 登录限流 / Cookie 解析
 */
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- deploy/ 下 .mjs 为无类型声明的 ESM 纯 JS 模块
// @ts-expect-error
import { LoginRateLimiter, RATE_LIMIT_MAX, SESSION_TTL_MS, constantTimeEqual, parseCookies, signToken, verifyToken } from "../../../deploy/console-auth.mjs";

const HMAC_TEST_VECTOR = "0123456789abcdef0123456789abcdef";

describe("constantTimeEqual", () => {
  it("相同字符串 → true", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
  });

  it("不同字符串 → false", () => {
    expect(constantTimeEqual("abc", "abd")).toBe(false);
  });

  it("不同长度 → false（定长化处理，不抛异常）", () => {
    expect(constantTimeEqual("abc", "abcdef")).toBe(false);
    expect(constantTimeEqual("", "x")).toBe(false);
  });
});

describe("signToken / verifyToken", () => {
  it("签发令牌在有效期内可校验", () => {
    const token = signToken(HMAC_TEST_VECTOR, 1_000_000);
    expect(verifyToken(HMAC_TEST_VECTOR, token, 1_000_000)).toBe(true);
    expect(verifyToken(HMAC_TEST_VECTOR, token, 1_000_000 + SESSION_TTL_MS - 1)).toBe(true);
  });

  it("过期令牌 → false", () => {
    const token = signToken(HMAC_TEST_VECTOR, 1_000_000);
    expect(verifyToken(HMAC_TEST_VECTOR, token, 1_000_000 + SESSION_TTL_MS)).toBe(false);
  });

  it("密钥不匹配 → false", () => {
    const token = signToken(HMAC_TEST_VECTOR, 1_000_000);
    expect(verifyToken("other-secret", token, 1_000_000)).toBe(false);
  });

  it("篡改签名 → false", () => {
    const token = signToken(HMAC_TEST_VECTOR, 1_000_000);
    const last = token.slice(-1);
    const tampered = token.slice(0, -1) + (last === "A" ? "B" : "A");
    expect(verifyToken(HMAC_TEST_VECTOR, tampered, 1_000_000)).toBe(false);
  });

  it("垃圾输入 → false（不抛异常）", () => {
    expect(verifyToken(HMAC_TEST_VECTOR, "", 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, "no-dot", 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, ".sig", 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, "body.", 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, 123, 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, null, 0)).toBe(false);
    expect(verifyToken(HMAC_TEST_VECTOR, undefined, 0)).toBe(false);
  });
});

describe("LoginRateLimiter", () => {
  it("窗口内允许 RATE_LIMIT_MAX 次，之后拒绝", () => {
    const rl = new LoginRateLimiter();
    const t = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) {
      expect(rl.allow("ip-1", t)).toBe(true);
    }
    expect(rl.allow("ip-1", t + 1)).toBe(false);
  });

  it("窗口滑动后恢复放行", () => {
    const rl = new LoginRateLimiter();
    const t = 2_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) rl.allow("ip-2", t);
    expect(rl.allow("ip-2", t + 1)).toBe(false);
    expect(rl.allow("ip-2", t + 5 * 60_000 + 1)).toBe(true);
  });

  it("不同 IP 互不影响", () => {
    const rl = new LoginRateLimiter();
    const t = 3_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) rl.allow("ip-a", t);
    expect(rl.allow("ip-b", t)).toBe(true);
  });

  it("reset 清除计数（登录成功后调用）", () => {
    const rl = new LoginRateLimiter();
    const t = 4_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX; i++) rl.allow("ip-c", t);
    expect(rl.allow("ip-c", t + 1)).toBe(false);
    rl.reset("ip-c");
    expect(rl.allow("ip-c", t + 2)).toBe(true);
  });
});

describe("parseCookies", () => {
  it("解析标准 Cookie 头（含 URL 编码）", () => {
    expect(parseCookies("a=1; console_session=tok; b=%E4%B8%AD")).toEqual({
      a: "1",
      console_session: "tok",
      b: "中",
    });
  });

  it("空/undefined → 空对象", () => {
    expect(parseCookies(undefined)).toEqual({});
    expect(parseCookies("")).toEqual({});
  });
});
