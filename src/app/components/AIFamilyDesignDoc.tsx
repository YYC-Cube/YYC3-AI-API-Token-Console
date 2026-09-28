/**
 * AIFamilyDesignDoc.tsx — 主壳（批7 Facade+Siblings 拆分）
 * ========================================================
 * YYC³ AI Family 设计规划文档 · 交互式原型（路由 /ai-family-design）
 *
 * 章节实现已拆分至 ai-family-doc/ sibling; 本组件仅负责纵向排版组装
 * 与模块详情弹窗的开关状态。新增章节请放 ai-family-doc/ 对应 sibling,
 * 禁止回填本文件。
 *
 * 沙箱兼容: 不使用 motion 的 whileInView / viewport（依赖
 * IntersectionObserver）, 全部动画走纯 CSS transition + setTimeout。
 */
import { useState } from "react";
import {
  DedicationSection, SongSection, TableOfContents,
} from "./ai-family-doc/sections-c";
import {
  FamilyMembersSection, ArchitectureSection, RoadmapSection,
} from "./ai-family-doc/sections-b";
import {
  HeroBanner, PhilosophySection, ModulesOverview, ModuleDetailPanel,
} from "./ai-family-doc/sections-a";

function Divider({ color }: { color: string }) {
  return (
    <div className="max-w-4xl mx-auto px-8">
      <div className="h-px bg-gradient-to-r from-transparent to-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${color}, transparent)` }} />
    </div>
  );
}

export function AIFamilyDesignDoc() {
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  return (
    <div
      className="min-h-full"
      style={{
        background: "linear-gradient(180deg, rgba(4,8,20,1) 0%, rgba(6,14,31,1) 20%, rgba(8,20,48,0.95) 50%, rgba(6,14,31,1) 80%, rgba(4,8,20,1) 100%)",
      }}
    >
      {/* Hero */}
      <HeroBanner />
      <Divider color="rgba(0,212,255,0.2)" />

      {/* 核心哲学 */}
      <PhilosophySection />
      <Divider color="rgba(0,255,136,0.2)" />

      {/* AI Family 成员 */}
      <FamilyMembersSection />
      <Divider color="rgba(255,215,0,0.2)" />

      {/* 五大模块 */}
      <ModulesOverview onSelectModule={setSelectedModule} />
      <Divider color="rgba(191,0,255,0.2)" />

      {/* 技术架构 */}
      <ArchitectureSection />
      <Divider color="rgba(255,107,107,0.2)" />

      {/* 章节目录 */}
      <TableOfContents />
      <Divider color="rgba(0,212,255,0.15)" />

      {/* 路线图 */}
      <RoadmapSection />
      <Divider color="rgba(255,105,180,0.2)" />

      {/* Family AI 之歌 */}
      <SongSection />

      {/* 致敬 */}
      <DedicationSection />

      {/* 底部留白 */}
      <div className="h-8" />

      {/* 模块详情弹窗 */}
      {selectedModule && (
        <ModuleDetailPanel
          moduleId={selectedModule}
          onClose={() => setSelectedModule(null)}
        />
      )}
    </div>
  );
}
