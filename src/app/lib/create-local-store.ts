/**
 * create-local-store.ts
 * ======================
 * 通用 localStorage CRUD 工厂
 *
 * 将任意 MOCK 数组转化为可持久化、可编辑的数据源
 * 供各 Hook 调用以消除硬编码
 *
 * 用法:
 *   const store = createLocalStore<Model>("yyc3_models", DEFAULT_MODELS);
 *   store.getAll();           // 首次返回 DEFAULT_MODELS (并写入 localStorage)
 *   store.add(newModel);      // 添加
 *   store.update("m1", {...}) // 更新
 *   store.remove("m1");       // 删除
 *   store.reset();            // 重置为 DEFAULT_MODELS
 *   store.export();           // 导出 JSON
 *   store.import(json);       // 导入
 */

// ============================================================
// 类型
// ============================================================

export interface LocalStore<T extends { id: string }> {
  getAll: () => T[];
  getById: (id: string) => T | undefined;
  add: (item: Omit<T, "id"> & { id?: string }) => T;
  update: (id: string, updates: Partial<T>) => T | null;
  remove: (id: string) => boolean;
  removeBatch: (ids: string[]) => number;
  reset: () => T[];
  exportData: () => string;
  importData: (json: string) => boolean;
  count: () => number;
}

// ============================================================
// 工厂
// ============================================================

export function createLocalStore<T extends { id: string }>(
  storageKey: string,
  defaults: T[],
  idPrefix = "item"
): LocalStore<T> {
  // 内存缓存
  let _cache: T[] | null = null;

  function load(): T[] {
    if (_cache) return _cache;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        _cache = JSON.parse(raw);
        return _cache!;
      }
    } catch { /* ignore */ }
    // 首次: 写入默认值
    _cache = defaults.map((d) => ({ ...d }));
    save();
    return _cache;
  }

  function save(): void {
    if (!_cache) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(_cache));
    } catch { /* ignore */ }
  }

  function invalidate(): void {
    _cache = null;
  }

  return {
    getAll: () => [...load()],

    getById: (id: string) => load().find((item) => item.id === id),

    add: (item) => {
      const data = load();
      const newItem = {
        ...item,
        id: item.id || `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      } as T;
      data.push(newItem);
      _cache = data;
      save();
      return newItem;
    },

    update: (id, updates) => {
      const data = load();
      const idx = data.findIndex((item) => item.id === id);
      if (idx < 0) return null;
      data[idx] = { ...data[idx], ...updates };
      _cache = data;
      save();
      return data[idx];
    },

    remove: (id) => {
      const data = load();
      const idx = data.findIndex((item) => item.id === id);
      if (idx < 0) return false;
      data.splice(idx, 1);
      _cache = data;
      save();
      return true;
    },

    removeBatch: (ids) => {
      const data = load();
      const idSet = new Set(ids);
      const before = data.length;
      _cache = data.filter((item) => !idSet.has(item.id));
      save();
      return before - _cache.length;
    },

    reset: () => {
      _cache = defaults.map((d) => ({ ...d }));
      save();
      return [..._cache];
    },

    exportData: () => JSON.stringify({
      _key: storageKey,
      _exportedAt: new Date().toISOString(),
      data: load(),
    }, null, 2),

    importData: (json) => {
      try {
        const parsed = JSON.parse(json);
        const items = Array.isArray(parsed) ? parsed : parsed.data;
        if (!Array.isArray(items)) return false;
        _cache = items;
        save();
        return true;
      } catch {
        return false;
      }
    },

    count: () => load().length,
  };
}
