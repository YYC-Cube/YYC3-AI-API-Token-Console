// @ts-check
/// <reference types="node" />
/**
 * console-auth.mjs — Console 公网部署鉴权（纯函数 + 轻状态）
 * ==========================================================
 * 供 console-server.mjs 接线的最小鉴权内核：
 *   - HMAC-SHA256 签名会话令牌（服务端 HttpOnly Cookie，SameSite=Strict）
 *   - constant-time 密码/签名比对（SHA-256 定长化 + timingSafeEqual，防时序侧信道）
 *   - 登录限流（内存滑动窗口：5 次 / 5 分钟 / IP）
 *
 * 启用条件（二者同时配置）：CONSOLE_AUTH_SECRET + CONSOLE_ADMIN_PASSWORD
 * 未配置时鉴权禁用（本地 / LAN 开发形态不受影响）。
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** 会话有效期 (ms) — 12h */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** 登录限流: 滑动窗口内最多尝试次数 */
export const RATE_LIMIT_MAX = 5;
/** 登录限流: 窗口时长 (ms) — 5 分钟 */
export const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/**
 * constant-time 字符串比较 — 先 SHA-256 定长化消除长度信息，再 timingSafeEqual。
 */
export function constantTimeEqual(/** @type {string} */ a, /** @type {string} */ b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

/** 签发会话令牌: base64url(payload).base64url(hmac) */
export function signToken(/** @type {string} */ secret, /** @type {number} */ now = Date.now()) {
  const payload = { exp: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** 校验令牌: 签名有效且未过期 → true */
export function verifyToken(/** @type {string} */ secret, /** @type {unknown} */ token, /** @type {number} */ now = Date.now()) {
  if (typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = createHmac("sha256", secret).update(body).digest("base64url");
  if (!constantTimeEqual(sig, expect)) return false;
  try {
    /** @type {{exp?: unknown}} */
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof payload.exp === "number" && now < payload.exp;
  } catch {
    return false;
  }
}

/** 登录限流器 — 内存滑动窗口（单进程部署足够） */
export class LoginRateLimiter {
  /** @type {Map<string, number[]>} */
  #hits = new Map();

  /** @returns {boolean} 是否放行 */
  allow(/** @type {string} */ key, /** @type {number} */ now = Date.now()) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    const hits = (this.#hits.get(key) || []).filter((t) => t > cutoff);
    if (hits.length >= RATE_LIMIT_MAX) {
      this.#hits.set(key, hits);
      return false;
    }
    hits.push(now);
    this.#hits.set(key, hits);
    if (this.#hits.size > 10000) {
      for (const [k, v] of this.#hits) {
        if (v.every((t) => t <= cutoff)) this.#hits.delete(k);
      }
    }
    return true;
  }

  /** 登录成功后清除该 key 的计数 */
  reset(/** @type {string} */ key) {
    this.#hits.delete(key);
  }
}

/** 解析 Cookie 请求头为键值表 */
export function parseCookies(/** @type {string | undefined} */ header) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}
