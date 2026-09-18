/**
 * yyc3-storage.ts
 * ================
 * YYC³ 统一本地存储层 — 双层缓存策略
 *
 * 架构:
 *   localStorage  → 轻量配置 (认证/语言/网络/主题, < 5KB 单项)
 *   IndexedDB     → 大数据持久化 (告警规则/巡查历史/闭环历史/操作模板/诊断记录/报表/错误日志)
 *   BroadcastChannel → 多标签页实时同步
 *
 * Guidelines 10.1: IndexedDB + localStorage 双层缓存策略
 * Guidelines 4.1:  存储支持 CLI 终端数据导入导出
 */

// ============================================================
//  1. IndexedDB Wrapper
// ============================================================

const DB_NAME = "yyc3_matrix";
const DB_VERSION = 3;

/** IndexedDB store 名称 — centralized in types/index.ts */
import type { StorageChangeEvent, StoreName } from "../types";
// RF-011: Re-export 已移除 — StoreName/StorageChangeEvent 统一从 types/index.ts 导入

// RF-009: 统一 BroadcastChannel 工厂
import { getSharedChannel } from "./broadcast-channel";

/**
 * RF-004: 全局唯一 store 名称数组
 * 新增 store 时只需在此处和 types/index.ts 的 StoreName 联合类型中同步添加
 */
export const ALL_STORES: StoreName[] = [
  "alertRules",
  "alertEvents",
  "patrolHistory",
  "loopHistory",
  "operationTemplates",
  "operationLogs",
  "diagnosisHistory",
  "reports",
  "errorLog",
  "dashboardSnapshots",
  "fileVersions",
  "dbConnections",
  "queryHistory",
  "committedChanges",
] as const as unknown as StoreName[];

/** 打开数据库，自动创建 object stores */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      for (const name of ALL_STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };

    // RF-010: onblocked — 另一个标签页阻止了版本升级
    request.onblocked = () => {
      console.warn(
        "[YYC³ IndexedDB] 数据库版本升级被阻塞，请关闭其他标签页后刷新"
      );
    };

    request.onsuccess = () => {
      const db = request.result;

      // RF-010: versionchange — 另一个标签页升级了 DB_VERSION
      // 主动关闭 stale 连接，重置缓存，下次操作会自动重连
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
        console.info(
          "[YYC³ IndexedDB] 检测到数据库版本变更，已关闭旧连接，下次操作将自动重连"
        );
      };

      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/** 缓存数据库连接 */
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * 获取数据库连接
 * RF-010: 检测连接是否已关闭（objectStoreNames 不可访问 / 空），
 *         若已关闭则重置 dbPromise 并重新打开
 */
function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  // RF-010: 连接可能被 onversionchange 关闭，需要验证
  return dbPromise.then((db) => {
    try {
      // 如果连接已关闭，访问 objectStoreNames 会抛出 InvalidStateError
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      db.objectStoreNames;
      return db;
    } catch {
      // 连接已失效，重新打开
      dbPromise = null;
      return getDB();
    }
  });
}

// ============================================================
//  2. 通用 CRUD 操作
// ============================================================

/** 写入单条记录 */
export async function idbPut<T extends { id: string }>(
  store: StoreName,
  item: T
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(item);
      tx.oncomplete = () => {
        broadcastChange(store, "put", item.id);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB 不可用时静默降级
  }
}

/** 批量写入 */
export async function idbPutMany<T extends { id: string }>(
  store: StoreName,
  items: T[]
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const os = tx.objectStore(store);
      for (const item of items) {
        os.put(item);
      }
      tx.oncomplete = () => {
        broadcastChange(store, "putMany", items.length.toString());
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback silent
  }
}

/** 读取单条 */
export async function idbGet<T>(store: StoreName, id: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

/** 读取全部 */
export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/** 删除单条 */
export async function idbDelete(store: StoreName, id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => {
        broadcastChange(store, "delete", id);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback silent
  }
}

/** 清空 store */
export async function idbClear(store: StoreName): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => {
        broadcastChange(store, "clear", store);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // fallback silent
  }
}

/** 获取 store 记录数 */
export async function idbCount(store: StoreName): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

// ============================================================
//  3. BroadcastChannel — 多标签页同步
//  RF-009: 使用 broadcast-channel.ts 统一工厂，消除单独的单例管理
// ============================================================

const STORAGE_CHANNEL_NAME = "yyc3_storage_sync";

type ChangeListener = (event: StorageChangeEvent) => void;
const listeners: ChangeListener[] = [];
let channelInitialized = false;

/** 确保 storage channel 已初始化（注册 onmessage 监听） */
function ensureChannelListener(): void {
  if (channelInitialized) return;
  const ch = getSharedChannel(STORAGE_CHANNEL_NAME);
  if (!ch) return;
  ch.onmessage = (event: MessageEvent<StorageChangeEvent>) => {
    for (const fn of listeners) {
      try {
        fn(event.data);
      } catch {
        // listener error - ignore
      }
    }
  };
  channelInitialized = true;
}

/** 广播变更通知到其他标签页 */
function broadcastChange(store: StoreName, action: string, key: string) {
  const ch = getSharedChannel(STORAGE_CHANNEL_NAME);
  if (ch) {
    const event: StorageChangeEvent = {
      store,
      action,
      key,
      timestamp: Date.now(),
    };
    try {
      ch.postMessage(event);
    } catch {
      // BroadcastChannel 异常 - ignore
    }
  }
}

/** 注册跨标签页变更监听器 */
export function onStorageChange(listener: ChangeListener): () => void {
  ensureChannelListener(); // 确保 channel 已初始化
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

// ============================================================
//  4. 数据导入导出 (CLI / 设置页面使用)
// ============================================================

/** 导出所有 IndexedDB 数据为 JSON */
export async function exportAllData(): Promise<Record<StoreName, unknown[]>> {
  const result: Record<string, unknown[]> = {};
  for (const store of ALL_STORES) {
    result[store] = await idbGetAll(store);
  }
  return result as Record<StoreName, unknown[]>;
}

/** 导入 JSON 数据到 IndexedDB */
export async function importAllData(
  data: Partial<Record<StoreName, Record<string, unknown>[]>>
): Promise<{ imported: number; stores: string[] }> {
  let total = 0;
  const storeNames: string[] = [];

  for (const [store, items] of Object.entries(data)) {
    if (Array.isArray(items) && items.length > 0) {
      await idbPutMany(store as StoreName, items as { id: string }[]);
      total += items.length;
      storeNames.push(store);
    }
  }

  return { imported: total, stores: storeNames };
}

/** 获取所有 store 的存储统计 */
export async function getStorageStats(): Promise<{
  stores: { name: StoreName; count: number }[];
  totalRecords: number;
}> {
  const stores: { name: StoreName; count: number }[] = [];
  let totalRecords = 0;

  for (const name of ALL_STORES) {
    const count = await idbCount(name);
    stores.push({ name, count });
    totalRecords += count;
  }

  return { stores, totalRecords };
}

// ============================================================
//  5. localStorage Key 注册表 (统一管理)
// ============================================================

/**
 * YYC³ localStorage 全部 Key 清单
 * 用于安全检测扫描 / 数据清理 / 隐私合规
 */
export const LOCALSTORAGE_KEYS = {
  session: "yyc3_session",           // 认证会话
  ghost: "yyc3_ghost",             // 幽灵模式标记
  locale: "yyc3_locale",            // 语言偏好
  configuredModels: "yyc3_configured_models", // AI 模型配置
  sdkSessions: "yyc3_sdk_sessions",      // 聊天会话
  sdkStats: "yyc3_sdk_stats",         // SDK 使用统计
  syncQueue: "yyc3_sync_queue",        // 后台同步队列
  errorLog: "yyc3_error_log",         // 错误日志
  networkConfig: "network_config",         // 网络配置
  offlineSnapshot: "offline_snapshot",       // 离线快照
  offlineTime: "offline_snapshot_time",  // 离线快照时间
  pwaInstallDismiss: "pwa_install_dismissed",  // PWA 安装提示
  dashboardState: "dashboard_state",        // 仪表盘状态 (用于离线快照)
} as const;

/** 清除所有 YYC³ localStorage 数据 */
export function clearAllLocalStorage(): void {
  for (const key of Object.values(LOCALSTORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}

/** 清除所有 YYC³ 存储数据 (localStorage + IndexedDB) */
export async function clearAllStorage(): Promise<void> {
  clearAllLocalStorage();
  for (const store of ALL_STORES) {
    await idbClear(store);
  }
}
