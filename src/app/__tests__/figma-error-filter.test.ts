/**
 * figma-error-filter.test.ts
 * ===========================
 * isFigmaPlatformError() 统一判定函数 - 单元测试
 *
 * RF-003 核心测试：确保所有 Figma 平台错误被正确识别，
 *                  非 Figma 错误不被误判
 */

import { describe, it, expect } from "vitest";
import { isFigmaPlatformError } from "../lib/figma-error-filter";

describe("figma-error-filter", () => {
  // ----------------------------------------------------------
  // 维度 1: 错误名 / 构造函数名匹配
  // ----------------------------------------------------------

  describe("错误名匹配", () => {
    it("应识别 IframeMessageAbortError", () => {
      expect(isFigmaPlatformError("IframeMessageAbortError", "")).toBe(true);
    });

    it("应识别小写 iframemessage", () => {
      expect(isFigmaPlatformError("iframemessage", "some msg")).toBe(true);
    });

    it("应识别包含 IframeMessage 的名称", () => {
      expect(isFigmaPlatformError("SomeIframeMessageError", "")).toBe(true);
    });

    it("不应匹配普通错误名", () => {
      expect(isFigmaPlatformError("TypeError", "cannot read property")).toBe(false);
    });

    it("应识别 AbortError + message port 组合", () => {
      expect(isFigmaPlatformError("AbortError", "message port was destroyed")).toBe(true);
    });

    it("不应匹配裸 AbortError（无 port/message 上下文）", () => {
      expect(isFigmaPlatformError("AbortError", "user cancelled fetch")).toBe(false);
    });

    it("不应匹配空字符串（无其他匹配维度）", () => {
      expect(isFigmaPlatformError("", "")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 维度 2: 错误消息匹配
  // ----------------------------------------------------------

  describe("消息内容匹配", () => {
    it("应识别 'message aborted'", () => {
      expect(isFigmaPlatformError("", "Message aborted")).toBe(true);
    });

    it("应识别 'message port was destroyed'", () => {
      expect(isFigmaPlatformError("", "The message port was destroyed")).toBe(true);
    });

    it("应识别包含 IframeMessage 的消息", () => {
      expect(isFigmaPlatformError("", "IframeMessageAbortError: Message aborted")).toBe(true);
    });

    it("应识别 'message port closed'", () => {
      expect(isFigmaPlatformError("", "message port closed")).toBe(true);
    });

    it("应识别 setimmediate$ 内部消息", () => {
      expect(isFigmaPlatformError("", "setimmediate$callback")).toBe(true);
    });

    it("应识别 'port was destroyed' 简写", () => {
      expect(isFigmaPlatformError("", "port was destroyed")).toBe(true);
    });

    it("应识别 'message channel' 相关错误", () => {
      expect(isFigmaPlatformError("", "Failed to create message channel")).toBe(true);
    });

    it("应识别 'the message port' 相关错误", () => {
      expect(isFigmaPlatformError("", "The message port is closed")).toBe(true);
    });

    it("不应匹配普通错误消息", () => {
      expect(isFigmaPlatformError("", "Cannot read properties of undefined")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 维度 3: 来源文件匹配
  // ----------------------------------------------------------

  describe("来源文件匹配", () => {
    it("应识别 figma.com 来源", () => {
      expect(isFigmaPlatformError("", "", "https://www.figma.com/figbuild/dist/code.js")).toBe(true);
    });

    it("应识别 webpack-artifacts 来源", () => {
      expect(
        isFigmaPlatformError("", "", "https://www.figma.com/webpack-artifacts/assets/1741.min.js.br")
      ).toBe(true);
    });

    it("应识别 figma_app 来源", () => {
      expect(isFigmaPlatformError("", "", "/figma_app/bundle.js")).toBe(true);
    });

    it("应识别 figma- 前缀来源", () => {
      expect(isFigmaPlatformError("", "", "https://cdn.figma.com/figma-app-7a3deb8c.min.js")).toBe(true);
    });

    it("应识别 figma_infra 来源", () => {
      expect(isFigmaPlatformError("", "", "https://cdn.figma.com/figma_infra/bundle.js")).toBe(true);
    });

    it("应识别 Figma chunk 文件名模式 (数字-hex.min.js)", () => {
      expect(isFigmaPlatformError("", "", "1741-0091e26ad4c06e70.min.js")).toBe(true);
    });

    it("不应匹配本地来源", () => {
      expect(isFigmaPlatformError("", "", "http://localhost:3118/src/app/App.tsx")).toBe(false);
    });

    it("不应匹配无来源", () => {
      expect(isFigmaPlatformError("Error", "test error")).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 组合场景
  // ----------------------------------------------------------

  describe("组合场景", () => {
    it("典型 Figma IframeMessageAbortError 完整信息", () => {
      expect(
        isFigmaPlatformError(
          "IframeMessageAbortError",
          "Message aborted: message port was destroyed",
          "https://www.figma.com/webpack-artifacts/assets/code.js"
        )
      ).toBe(true);
    });

    it("仅来源匹配也应返回 true", () => {
      expect(
        isFigmaPlatformError("Error", "some error", "https://www.figma.com/script.js")
      ).toBe(true);
    });

    it("所有维度均不匹配应返回 false", () => {
      expect(
        isFigmaPlatformError("RangeError", "Maximum call stack size exceeded", "http://localhost:3118/app.js")
      ).toBe(false);
    });
  });

  // ----------------------------------------------------------
  // 维度 4: 堆栈匹配（cross-origin 场景）
  // ----------------------------------------------------------

  describe("堆栈匹配", () => {
    it("应通过堆栈中的 figma.com URL 识别", () => {
      const stack = `Error: something\n    at s.cleanup (https://www.figma.com/webpack-artifacts/assets/1741-0091e26ad4c06e70.min.js.br:1073:387757)`;
      expect(isFigmaPlatformError("Error", "something", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 webpack-artifacts 识别", () => {
      const stack = `Error\n    at Object.fn (webpack-artifacts/assets/code.js:10:20)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 figma_app 识别", () => {
      const stack = `Error\n    at eS.setupMessageChannel (figma_app-7a3deb8c5f1e60c7.min.js.br:547:11915)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 setupMessageChannel 识别", () => {
      const stack = `Error\n    at setupMessageChannel (https://example.com/bundle.js:1:1)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 iframemessage 识别", () => {
      const stack = `IframeMessageAbortError\n    at cleanup (bundle.js:1:1)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 s.cleanup 识别", () => {
      const stack = `Error\n    at s.cleanup (https://www.figma.com/webpack-artifacts/assets/1741.min.js:1:1)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("应通过堆栈中的 e.onload 识别", () => {
      const stack = `Error\n    at e.onload (https://www.figma.com/webpack-artifacts/assets/figma_app.min.js:1:1)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });

    it("不应匹配普通堆栈", () => {
      const stack = `TypeError: Cannot read properties\n    at App.tsx:10:5\n    at renderWithHooks (react-dom.js:100:1)`;
      expect(isFigmaPlatformError("", "", "", stack)).toBe(false);
    });

    it("典型完整 Figma 错误堆栈（仅 stack 维度）", () => {
      const stack = [
        "IframeMessageAbortError: Message aborted: message port was destroyed",
        "    at s.cleanup (https://www.figma.com/webpack-artifacts/assets/1741-0091e26ad4c06e70.min.js.br:1073:387757)",
        "    at l.cleanup (https://www.figma.com/webpack-artifacts/assets/1741-0091e26ad4c06e70.min.js.br:1073:390761)",
        "    at eS.setupMessageChannel (https://www.figma.com/webpack-artifacts/assets/figma_app-7a3deb8c5f1e60c7.min.js.br:547:11915)",
        "    at e.onload (https://www.figma.com/webpack-artifacts/assets/figma_app-7a3deb8c5f1e60c7.min.js.br:547:5177)",
      ].join("\n");
      // Even with empty name/message/source, stack alone should match
      expect(isFigmaPlatformError("", "", "", stack)).toBe(true);
    });
  });

  // ----------------------------------------------------------
  // 维度 5: Combined heuristic (AbortError + port keywords)
  // ----------------------------------------------------------

  describe("组合启发式匹配", () => {
    it("AbortError + port 关键字 → Figma", () => {
      expect(isFigmaPlatformError("AbortError", "port was destroyed")).toBe(true);
    });

    it("DOMAbortError + message 关键字 → Figma", () => {
      expect(isFigmaPlatformError("DOMAbortError", "message aborted")).toBe(true);
    });

    it("abort 名 + 堆栈含 port → Figma", () => {
      const stack = `AbortError\n    at MessagePort.close (native)`;
      expect(isFigmaPlatformError("AbortError", "unknown", "", stack)).toBe(true);
    });

    it("非 abort 名 + port 消息 → 仍通过消息匹配", () => {
      expect(isFigmaPlatformError("Error", "message port was destroyed")).toBe(true);
    });
  });
});