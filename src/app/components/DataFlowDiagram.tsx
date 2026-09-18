/**
 * DataFlowDiagram.tsx
 * =====================
 * 数据流向可视化组件
 *
 * 展示: 本地设备 ↔ 本地存储 ↔ Dashboard ↔ 终端集成
 * 连线带动画、带宽标注
 */

import React from "react";
import {
  Server, Database, Monitor, Terminal,
  ArrowRight, ArrowLeftRight,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { DataFlowEdge } from "../types";
import type { DataFlowNode } from "../types";

const nodeIcon: Record<string, React.ElementType> = {
  device: Server,
  storage: Database,
  dashboard: Monitor,
  terminal: Terminal,
};

interface DataFlowDiagramProps {
  nodes: DataFlowNode[];
  edges: DataFlowEdge[];
  isMobile?: boolean;
}

export function DataFlowDiagram({ nodes, edges, isMobile }: DataFlowDiagramProps) {
  return (
    <div data-testid="data-flow-diagram">
      {/* ======== Nodes Grid ======== */}
      <div className={`grid gap-3 mb-4 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {nodes.map((node) => {
          const Icon = nodeIcon[node.type] ?? Server;
          const relEdges = edges.filter(
            (e) => e.from === node.type || e.to === node.type
          );

          return (
            <div
              key={node.type}
              className="relative p-3 rounded-xl bg-[rgba(0,40,80,0.1)] border border-[rgba(0,180,255,0.1)] hover:border-[rgba(0,212,255,0.25)] transition-all text-center"
              data-testid={`flow-node-${node.type}`}
            >
              {/* Glow dot */}
              <div
                className="absolute top-2 right-2 w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: node.color, boxShadow: `0 0 6px ${node.color}` }}
              />

              <Icon className="w-7 h-7 mx-auto mb-2" style={{ color: node.color }} />
              <p className="text-[#e0f0ff]" style={{ fontSize: "0.78rem" }}>
                {node.label}
              </p>
              <p className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.6rem", fontFamily: "'JetBrains Mono', monospace" }}>
                {node.sublabel}
              </p>
              <p className="text-[rgba(0,212,255,0.2)] mt-1" style={{ fontSize: "0.55rem" }}>
                {relEdges.length} 条连线
              </p>
            </div>
          );
        })}
      </div>

      {/* ======== Edges List ======== */}
      <div className="space-y-1.5" data-testid="flow-edges">
        {edges.map((edge, i) => {
          const fromNode = nodes.find((n) => n.type === edge.from);
          const toNode = nodes.find((n) => n.type === edge.to);
          if (!fromNode || !toNode) return null;

          return (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(0,40,80,0.06)] hover:bg-[rgba(0,40,80,0.12)] transition-all"
              data-testid={`flow-edge-${edge.from}-${edge.to}`}
            >
              {/* From */}
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ fontSize: "0.62rem", color: fromNode.color, backgroundColor: `${fromNode.color}10` }}
              >
                {fromNode.label}
              </span>

              {/* Arrow */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <div className="flex-1 h-px relative overflow-hidden" style={{ backgroundColor: `${fromNode.color}20` }}>
                  {edge.active && (
                    <div
                      className="absolute top-0 left-0 h-full w-6 animate-[flowPulse_2s_linear_infinite]"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${fromNode.color}60, transparent)`,
                      }}
                    />
                  )}
                </div>
                <ArrowRight className="w-3 h-3 shrink-0" style={{ color: `${fromNode.color}50` }} />
              </div>

              {/* To */}
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ fontSize: "0.62rem", color: toNode.color, backgroundColor: `${toNode.color}10` }}
              >
                {toNode.label}
              </span>

              {/* Label + bandwidth */}
              <div className="hidden sm:flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[rgba(0,212,255,0.35)]" style={{ fontSize: "0.6rem" }}>
                  {edge.label}
                </span>
                <span className="text-[rgba(0,212,255,0.2)]" style={{ fontSize: "0.55rem", fontFamily: "'JetBrains Mono', monospace" }}>
                  {edge.bandwidth}
                </span>
                {edge.active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flow animation keyframe */}
      <style>{`
        @keyframes flowPulse {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(1000%); }
        }
      `}</style>
    </div>
  );
}