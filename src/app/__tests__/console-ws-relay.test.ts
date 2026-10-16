/**
 * console-ws-relay.test.ts
 * =========================
 * deploy/console-ws-relay.mjs 纯逻辑单测（node 项目, 双端联通 P0-1）
 *
 * 覆盖: deriveGatewayWsUrl 派生与拒绝 / RFC 6455 握手 accept 官方测试向量 /
 * 文本帧编码（短/扩展长度）/ masked 客户端帧解码（完整/分包/close/ping/多帧）/
 * 原始 HTTP 拒绝应答
 */

import { describe, it, expect } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- deploy/ 下 .mjs 为无类型声明的 ESM 纯 JS 模块 (同 console-metrics.test 先例; 单行 import 保证 @ts-expect-error 覆盖模块解析错误); 失效条件: deploy/*.mjs 有 .d.ts 类型声明后移除本指令与该豁免
// @ts-expect-error
import { WS_MONITOR_PATH, computeAcceptKey, deriveGatewayWsUrl, encodeCloseFrame, encodePongFrame, encodeTextFrame, handshakeResponse, parseClientFrames, rawRejectResponse } from "../../../deploy/console-ws-relay.mjs";

/** 构造 masked 客户端帧（RFC 6455 §5.3: 客户端→服务端必掩码） */
function clientFrame(opcode: number, payload: Buffer, mask: number[] = [0x11, 0x22, 0x33, 0x44]): Buffer {
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = payload[i]! ^ mask[i & 3]!;
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, 0x80 | len]);
  } else {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  }
  return Buffer.concat([header, Buffer.from(mask), masked]);
}

describe("console-ws-relay: deriveGatewayWsUrl", () => {
  it("http→ws / https→wss, token 注入查询串", () => {
    const a = deriveGatewayWsUrl("http://127.0.0.1:8800", "sk-admin-x");
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.url).toBe("ws://127.0.0.1:8800/ws/monitor?token=sk-admin-x");
    }
    const b = deriveGatewayWsUrl("https://gw.example.com", "k1 k2&"); // 特殊字符须编码
    expect(b.ok).toBe(true);
    if (b.ok) {
      // URLSearchParams 表单编码: 空格→+, &→%26（查询串合法, 网关侧按表单语义解码）
      expect(b.url.startsWith("wss://gw.example.com/ws/monitor?token=")).toBe(true);
      expect(b.url).toContain("token=k1+k2%26");
    }
  });

  it("缺密钥 / 非法 origin / 非 http(s) scheme 拒绝", () => {
    expect(deriveGatewayWsUrl("http://x", "").ok).toBe(false);
    expect(deriveGatewayWsUrl("::::", "k").ok).toBe(false);
    expect(deriveGatewayWsUrl("ftp://x", "k").ok).toBe(false);
    expect(deriveGatewayWsUrl("ws://x", "k").ok).toBe(false);
  });

  it("中继路径常量", () => {
    expect(WS_MONITOR_PATH).toBe("/console/ws/monitor");
  });
});

describe("console-ws-relay: RFC 6455 握手", () => {
  it("accept key 官方测试向量 (RFC 6455 §1.25 / §4.2.2)", () => {
    // 向量: key "dGhlIHNhbXBsZSBub25jZQ==" → "s3pPLMBiTxaQ9kYGzzhZRbK+xOo="
    expect(computeAcceptKey("dGhlIHNhbXBsZSBub25jZQ==")).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });

  it("handshakeResponse 含 101 行与 accept 头", () => {
    const res = handshakeResponse("dGhlIHNhbXBsZSBub25jZQ==");
    expect(res.startsWith("HTTP/1.1 101 Switching Protocols\r\n")).toBe(true);
    expect(res).toContain("Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
    expect(res.endsWith("\r\n\r\n")).toBe(true);
  });
});

describe("console-ws-relay: 服务端帧编码", () => {
  it("短文本帧: 0x81 + 长度 + UTF-8 载荷（服务端不掩码）", () => {
    const f = encodeTextFrame("Hello");
    expect(Array.from(f.subarray(0, 6))).toEqual([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c]);
    expect(f.toString("utf8", 2)).toBe("Hello");
  });

  it("扩展长度: ≥126 字节走 16 位长度", () => {
    const payload = "x".repeat(200);
    const f = encodeTextFrame(payload);
    expect(f[0]).toBe(0x81);
    expect(f[1]).toBe(126);
    expect(f.readUInt16BE(2)).toBe(200);
    expect(f.length).toBe(4 + 200);
  });

  it("pong / close 帧 opcode 正确", () => {
    expect(encodePongFrame()[0] & 0x0f).toBe(0xa);
    const close = encodeCloseFrame(1000);
    expect(close[0] & 0x0f).toBe(0x8);
    expect(close.readUInt16BE(2)).toBe(1000);
  });
});

describe("console-ws-relay: masked 客户端帧解码", () => {
  it("文本帧解掩码还原载荷", () => {
    const f = clientFrame(0x1, Buffer.from("Hello", "utf8"));
    const parsed = parseClientFrames(f);
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.frames).toHaveLength(1);
      expect(parsed.frames[0].opcode).toBe(0x1);
      expect(parsed.frames[0].payload.toString("utf8")).toBe("Hello");
      expect(parsed.rest.length).toBe(0);
    }
  });

  it("分包: 头未齐 / 载荷未齐 → null 等待更多字节", () => {
    const f = clientFrame(0x1, Buffer.from("Hello", "utf8"));
    expect(parseClientFrames(f.subarray(0, 1))).toBeNull();
    expect(parseClientFrames(f.subarray(0, 4))).toBeNull();
  });

  it("close(0x8) 与 ping(0x9) 帧解析", () => {
    const close = clientFrame(0x8, Buffer.from([0x03, 0xe8]));
    const p1 = parseClientFrames(close);
    if (p1) { expect(p1.frames[0].opcode).toBe(0x8); expect(p1.frames[0].payload.readUInt16BE(0)).toBe(1000); }
    const ping = clientFrame(0x9, Buffer.from("hb"));
    const p2 = parseClientFrames(ping);
    if (p2) { expect(p2.frames[0].opcode).toBe(0x9); expect(p2.frames[0].payload.toString()).toBe("hb"); }
  });

  it("单缓冲多帧连发 + 残留字节", () => {
    const a = clientFrame(0x1, Buffer.from("abc"));
    const b = clientFrame(0x1, Buffer.from("de"));
    const c = clientFrame(0x1, Buffer.from("f"));
    const parsed = parseClientFrames(Buffer.concat([a, b, c]));
    if (parsed) {
      expect(parsed.frames.map((x: { payload: Buffer }) => x.payload.toString())).toEqual(["abc", "de", "f"]);
      expect(parsed.rest.length).toBe(0);
    }
  });

  it("16 位扩展长度 masked 帧解码", () => {
    const big = Buffer.alloc(300, 0x61);
    const f = clientFrame(0x1, big);
    const parsed = parseClientFrames(f);
    if (parsed) {
      expect(parsed.frames[0].payload.length).toBe(300);
      expect(parsed.frames[0].payload[0]).toBe(0x61);
    }
  });
});

describe("console-ws-relay: rawRejectResponse", () => {
  it("状态行 + JSON 体", () => {
    const res = rawRejectResponse(401, "未认证");
    expect(res.startsWith("HTTP/1.1 401 Rejected\r\n")).toBe(true);
    expect(res).toContain('"error":"未认证"');
  });
});
