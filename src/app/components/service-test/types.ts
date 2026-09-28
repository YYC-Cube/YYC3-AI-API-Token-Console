/**
 * service-test/types.ts — 连接测试类型与持久化（批7 Facade+Siblings 拆分）
 * ========================================================================
 */
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import type { ElementType } from "react";
import { lsGet, lsRemove, lsSetJSON } from "../../lib/yyc3-storage";

export type TestStatus = "idle" | "running" | "pass" | "fail" | "warn" | "skip";

export interface TestStep {
  label: string;
  status: TestStatus;
  detail: string;
  latencyMs?: number;
  timestamp?: number;
}

export interface TestResult {
  id: string;
  category: "ai" | "db" | "network" | "websocket";
  name: string;
  icon: ElementType;
  color: string;
  steps: TestStep[];
  overallStatus: TestStatus;
  startedAt?: number;
  completedAt?: number;
  suggestion?: string;
}

export const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};

export const STATUS_META: Record<TestStatus, { label: string; color: string; icon: ElementType }> = {
  idle: { label: "待测试", color: "rgba(0,212,255,0.3)", icon: Clock },
  running: { label: "测试中", color: "#ffdd00", icon: Loader2 },
  pass: { label: "通过", color: "#00ff88", icon: CheckCircle2 },
  fail: { label: "失败", color: "#ff3366", icon: XCircle },
  warn: { label: "警告", color: "#ffaa00", icon: AlertTriangle },
  skip: { label: "跳过", color: "rgba(0,212,255,0.2)", icon: Clock },
};

const RESULTS_KEY = "yyc3_connection_test_results";

export function loadResults(): TestResult[] {
  try {
    const raw = lsGet(RESULTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveResults(results: TestResult[]) {
  try { lsSetJSON(RESULTS_KEY, results); } catch { }
}

export function clearStoredResults() {
  try { lsRemove(RESULTS_KEY); } catch { }
}
