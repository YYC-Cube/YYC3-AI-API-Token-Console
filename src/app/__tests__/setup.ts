/**
 * setup.ts
 * =========
 * Vitest 全局 setup
 * - jsdom 环境: 注入 jest-dom matchers + polyfills
 * - node 环境: 安全跳过 DOM 相关 mock
 * - figma:asset 虚拟模块 mock
 * - axe-core 无障碍检测 matchers
 */

// jest-dom matchers（仅 jsdom 环境生效）
if (typeof window !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
}

// RTL cleanup：globals:false 时自动 cleanup 不生效，需显式注册
// 否则上一测试渲染的 DOM 残留，导致 "Found multiple elements" 错误
if (typeof window !== "undefined") {
  const { afterEach } = await import("vitest");
  const { cleanup } = await import("@testing-library/react");
  afterEach(() => cleanup());
}

// 以下仅在 jsdom 环境执行
if (typeof window !== "undefined") {
  // Mock matchMedia (jsdom 不支持)
  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
      }),
    });
  }

  // Mock ResizeObserver
  if (!(window as any).ResizeObserver) {
    (window as any).ResizeObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  }

  // Mock IntersectionObserver
  if (!(window as any).IntersectionObserver) {
    (window as any).IntersectionObserver = class {
      observe() { }
      unobserve() { }
      disconnect() { }
    };
  }

  // Mock scrollTo
  if (!window.scrollTo) {
    window.scrollTo = (() => { }) as any;
  }

  // Mock scrollIntoView (jsdom 不实现此 API)
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = (() => { }) as any;
  }

  // Mock navigator.clipboard
  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => { },
        readText: async () => "",
      },
      writable: true,
    });
  }

  // Mock HTMLCanvasElement.getContext (jsdom 不支持 canvas)
  if (!(HTMLCanvasElement.prototype as any)._mockGetContext) {
    (HTMLCanvasElement.prototype as any)._mockGetContext = true;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      if (type === "2d") {
        return {
          fillRect: () => { },
          clearRect: () => { },
          getImageData: () => ({ data: [] }),
          putImageData: () => { },
          createImageData: () => [],
          setTransform: () => { },
          drawImage: () => { },
          save: () => { },
          fillText: () => { },
          restore: () => { },
          beginPath: () => { },
          moveTo: () => { },
          lineTo: () => { },
          closePath: () => { },
          stroke: () => { },
          translate: () => { },
          scale: () => { },
          rotate: () => { },
          arc: () => { },
          fill: () => { },
          measureText: () => ({ width: 0 }),
          transform: () => { },
          rect: () => { },
          clip: () => { },
          canvas: this,
        } as unknown as CanvasRenderingContext2D;
      }
      return originalGetContext.call(this, type, ...args);
    } as any;
  }
}

// Ensure this file is treated as a module (required for top-level await + isolatedModules)
export { };
