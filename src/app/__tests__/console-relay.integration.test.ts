/**
 * console-relay.integration.test.ts
 * ==================================
 * 中继链契约 E2E（双端联通 R6 / P2 治理）——真实进程级闭环:
 *
 *   测试客户端 ──HTTP/WS──> console-server.mjs(真实子进程) ──代理/WS──> 桩网关(本进程内 http server)
 *
 * 覆盖:
 *   ① /console/gw/* 代理透传（含 GW_ADMIN_KEY 注入断言——桩网关侧捕获请求头）
 *   ② /console/ws/monitor RFC 6455 全握手（101 + Sec-WebSocket-Accept 官方向量）
 *   ③ 桩网关下行 metrics 帧 → 中继透传 → 客户端收到等值文本帧
 *   ④ 客户端 masked close 帧 → 中继回 close 帧（优雅关闭语义）
 *
 * 运行: YYC3_TEST_INTEGRATION=1 pnpm vitest run src/app/__tests__/console-relay.integration.test.ts
 * （integration 项目默认跳过; 桩网关 WS 服务端帧复用 deploy/console-ws-relay.mjs 编解码器）
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error -- deploy/ 下 .mjs 无类型声明（同 console-metrics.test 先例; 单行 import 保覆盖）
import { computeAcceptKey, encodeCloseFrame, encodeTextFrame, parseClientFrames } from "../../../deploy/console-ws-relay.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const GW_KEY_FOR_TEST = ["k-test", "gw-admin"].join("-");

/** 桩网关: /healthz JSON + /ws/monitor WS 下行帧推送（服务端帧用 relay 编码器构造） */
function startStubGateway(): Promise<{ server: http.Server; port: number; seenAuthHeaders: string[] }> {
  return new Promise((resolve) => {
    const seenAuthHeaders: string[] = [];
    const server = http.createServer((req, res) => {
      seenAuthHeaders.push(String(req.headers["x-api-key"] ?? ""));
      if (req.url === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy", stub: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.on("upgrade", (req, socket) => {
      if (!req.url?.startsWith("/ws/monitor")) {
        socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      socket.on("error", () => { /* 测试收尾 destroy 竞态的 ECONNRESET 吞噬 — 防 unhandled 拖垮退出码 */ });
      const key = String(req.headers["sec-websocket-key"] ?? "");
      // 服务端握手: accept 头 + 101（与 console-server 中继对客户端行为对称）
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\n" +
          "Connection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${computeAcceptKey(key)}\r\n\r\n`
      );
      // token 校验断言素材
      seenAuthHeaders.push(String(req.url));
      // 下行: 100ms 后推送一条 metrics 帧（中继应原样透传给浏览器侧）
      setTimeout(() => {
        try {
          socket.write(encodeTextFrame(JSON.stringify({ event: "metrics", data: { active_requests: 1, total_requests: 42 } })));
        } catch { /* 已断开 */ }
      }, 100);
      // 浏览器侧（中继客户端）帧解析: 收 close 即回 close
      let buf = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        const parsed = parseClientFrames(buf);
        if (!parsed) return;
        buf = parsed.rest;
        for (const f of parsed.frames) {
          if (f.opcode === 0x8) {
            try { socket.write(encodeCloseFrame(1000)); } catch { /* 同步关闭 */ }
            socket.end();
          }
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ server, port: addr.port, seenAuthHeaders });
    });
  });
}

/** 取一个空闲 TCP 端口（先占后释, 传给子进程显式监听——避免 PORT=0 日志解析竞态） */
async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const port = (probe.address() as net.AddressInfo).port;
      probe.close(() => resolve(port));
    });
  });
}

/** 起真实 console-server 子进程（空 DIST + 桩 GW_ORIGIN + 显式端口） */
function startConsoleServer(gwPort: number, port: number): Promise<{ child: ChildProcess; port: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(REPO_ROOT, "deploy/console-server.mjs")], {
      env: {
        ...process.env,
        PORT: String(port),
        GW_ORIGIN: `http://127.0.0.1:${gwPort}`,
        GW_ADMIN_KEY: GW_KEY_FOR_TEST,
        DIST_DIR: path.join(REPO_ROOT, "deploy"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error("console-server 启动超时")); }
    }, 8000);
    child.stdout!.on("data", () => {
      if (!settled) { settled = true; clearTimeout(timer); resolve({ child, port }); }
    });
    child.on("exit", (code) => {
      if (!settled) { settled = true; clearTimeout(timer); reject(new Error(`console-server 提前退出 code=${code}`)); }
    });
  });
}

describe("console-relay 契约 E2E（integration · 真实进程）", { timeout: 30_000 }, () => {
  let stub: Awaited<ReturnType<typeof startStubGateway>>;
  let svc: Awaited<ReturnType<typeof startConsoleServer>>;

  beforeAll(async () => {
    stub = await startStubGateway();
    const port = await freePort();
    svc = await startConsoleServer(stub.port, port);
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(`http://127.0.0.1:${port}/console/auth/status`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  });

  afterAll(async () => {
    svc.child.kill("SIGTERM");
    stub.server.close();
    await new Promise<void>((r) => setTimeout(r, 200));
  });

  it("① /console/gw/* 代理透传 + GW_ADMIN_KEY 服务端注入（桩网关侧捕获断言）", async () => {
    const res = await fetch(`http://127.0.0.1:${svc.port}/console/gw/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string; stub?: boolean };
    expect(body).toMatchObject({ status: "healthy", stub: true });
    // 桩网关收到的 X-API-Key = 环境注入值（浏览器零暴露闭环证据）
    expect(stub.seenAuthHeaders).toContain(GW_KEY_FOR_TEST);
  });

  it("②③④ WS 中继: 101 握手(官方向量 accept) + 下行帧透传 + close 回环", async () => {
    const KEY = "dGhlIHNhbXBsZSBub25jZQ=="; // RFC 6455 官方向量
    const socket = net.connect(svc.port, "127.0.0.1");
    socket.on("error", () => { /* 同上: close 回环后对端 destroy 的竞态吞噬 */ });
    await new Promise<void>((r) => socket.once("connect", r));

    // 握手
    socket.write(
      `GET /console/ws/monitor HTTP/1.1\r\nHost: 127.0.0.1:${svc.port}\r\n` +
        "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
        `Sec-WebSocket-Key: ${KEY}\r\nSec-WebSocket-Version: 13\r\n\r\n`
    );

    let buf = Buffer.alloc(0);
    let mode: "http" | "ws" = "http";
    const frameReceived: Array<{ opcode: number; payload: Buffer }> = [];
    let closeSeen: (() => void) | null = null;
    const closedPromise = new Promise<void>((r) => { closeSeen = r; });
    let handshakeDone: ((head: string) => void) | null = null;
    const handshake = new Promise<string>((r) => { handshakeDone = r; });

    socket.on("data", (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      if (mode === "http") {
        const idx = buf.indexOf("\r\n\r\n");
        if (idx === -1) return;
        const head = buf.subarray(0, idx).toString();
        buf = buf.subarray(idx + 4);
        mode = "ws";
        handshakeDone?.(head);
      }
      const parsed = parseClientFrames(buf);
      if (!parsed) return;
      buf = parsed.rest;
      for (const f of parsed.frames) {
        frameReceived.push(f);
        if (f.opcode === 0x8) closeSeen?.();
      }
    });

    const head = await handshake;
    expect(head).toContain("101 Switching Protocols");
    expect(head).toContain(`Sec-WebSocket-Accept: ${computeAcceptKey(KEY)}`);

    // ③ 下行帧: 桩网关 100ms 后推 metrics → 中继透传（容错等待 3s）
    const deadline = Date.now() + 3000;
    while (frameReceived.length === 0 && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }
    const textFrame = frameReceived.find((f) => f.opcode === 0x1);
    expect(textFrame).toBeDefined();
    const payload = JSON.parse(textFrame!.payload.toString("utf8")) as { event?: string; data?: { total_requests?: number } };
    expect(payload.event).toBe("metrics");
    expect(payload.data?.total_requests).toBe(42);

    // ④ masked close 帧 → 中继回 close
    const mask = [0x11, 0x22, 0x33, 0x44];
    const closePayload = Buffer.from([0x03, 0xe8]);
    const masked = Buffer.from(closePayload.map((b, i) => b ^ mask[i & 3]));
    socket.write(Buffer.concat([Buffer.from([0x88, 0x80 | closePayload.length]), Buffer.from(mask), masked]));
    await Promise.race([closedPromise, new Promise((r) => setTimeout(r, 3000))]);
    expect(frameReceived.some((f) => f.opcode === 0x8)).toBe(true);
    socket.destroy();
  });
});
