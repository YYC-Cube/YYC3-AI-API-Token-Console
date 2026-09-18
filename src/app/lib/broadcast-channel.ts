/**
 * broadcast-channel.ts
 * =====================
 * RF-009: BroadcastChannel 单例工厂
 *
 * 统一 BroadcastChannel 使用模式 — 全局单例缓存，
 * 避免 api-config.ts 中每次 new/close 的性能开销和泄漏风险。
 *
 * 使用规范：
 *   1. 所有模块通过 getSharedChannel(name) 获取单例
 *   2. 不要手动 close()，由工厂统一管理生命周期
 *   3. 每个 name 对应唯一实例，多次获取返回同一对象
 */

/** 全局单例缓存 */
const channelMap = new Map<string, BroadcastChannel>();

/**
 * 获取指定名称的单例 BroadcastChannel
 * - 浏览器不支持 BroadcastChannel 时返回 null
 * - 同一 name 多次调用返回同一实例
 */
export function getSharedChannel(name: string): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;

  let ch = channelMap.get(name);
  if (!ch) {
    ch = new BroadcastChannel(name);
    channelMap.set(name, ch);
  }
  return ch;
}

/**
 * 安全发送消息到指定频道
 * - 频道不存在或发送失败时静默降级
 */
export function postToChannel(name: string, data: unknown): void {
  try {
    const ch = getSharedChannel(name);
    ch?.postMessage(data);
  } catch {
    // BroadcastChannel 异常 — 静默降级
  }
}

/**
 * 关闭并移除指定频道（仅在必要时调用，如模块卸载）
 */
export function closeChannel(name: string): void {
  const ch = channelMap.get(name);
  if (ch) {
    try { ch.close(); } catch { /* ignore */ }
    channelMap.delete(name);
  }
}

/**
 * 关闭所有频道（用于测试清理 / 应用销毁）
 */
export function closeAllChannels(): void {
  for (const [name, ch] of channelMap) {
    try { ch.close(); } catch { /* ignore */ }
  }
  channelMap.clear();
}
