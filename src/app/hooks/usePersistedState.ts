/**
 * usePersistedState.ts
 * =====================
 * IndexedDB 持久化 Hook — 通用状态持久化层
 *
 * 将 React 状态与 IndexedDB 双向绑定:
 * - 初始化时从 IndexedDB 加载
 * - 状态变更后异步写回 IndexedDB
 * - 支持 BroadcastChannel 跨标签页同步
 *
 * 使用方式:
 *   const [rules, setRules] = usePersistedList<AlertRule>("alertRules");
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  idbGetAll,
  idbPut,
  idbPutMany,
  idbDelete,
  idbClear,
  onStorageChange,
} from "../lib/yyc3-storage";
import type { StoreName } from "../types";

/**
 * 持久化列表状态 — 适用于告警规则/巡查历史/闭环历史等
 *
 * @param store IndexedDB store 名称
 * @param initialData 当 IndexedDB 为空时使用的默认数据
 */
export function usePersistedList<T extends { id: string }>(
  store: StoreName,
  initialData: T[] = []
) {
  const [items, setItems] = useState<T[]>(initialData);
  const [loaded, setLoaded] = useState(false);
  const storeRef = useRef(store);
  storeRef.current = store;

  // 初始化: 从 IndexedDB 加载
  useEffect(() => {
    let cancelled = false;
    idbGetAll<T>(store).then((data) => {
      if (!cancelled) {
        if (data.length > 0) {
          setItems(data);
        }
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [store]);

  // 跨标签页同步: 收到其他 Tab 的变更时重新加载
  useEffect(() => {
    const unsubscribe = onStorageChange((event) => {
      if (event.store === storeRef.current) {
        idbGetAll<T>(storeRef.current).then(setItems);
      }
    });
    return unsubscribe;
  }, []);

  /** 添加或更新单条 */
  const upsert = useCallback(async (item: T) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    await idbPut(store, item);
  }, [store]);

  /** 批量设置 (全量替换) */
  const setAll = useCallback(async (newItems: T[]) => {
    setItems(newItems);
    await idbClear(store);
    if (newItems.length > 0) {
      await idbPutMany(store, newItems);
    }
  }, [store]);

  /** 删除单条 */
  const remove = useCallback(async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await idbDelete(store, id);
  }, [store]);

  /** 清空 */
  const clear = useCallback(async () => {
    setItems([]);
    await idbClear(store);
  }, [store]);

  /** 追加一条到开头 (最新在前) */
  const prepend = useCallback(async (item: T) => {
    setItems((prev) => [item, ...prev]);
    await idbPut(store, item);
  }, [store]);

  return {
    items,
    loaded,
    upsert,
    setAll,
    remove,
    clear,
    prepend,
    setItems,
  };
}