import React, { useState, useCallback } from "react";
import {
  Users, UserPlus, Search, Shield, ShieldCheck, ShieldAlert, Crown,
  Edit2, Trash2, Lock, Unlock, Clock, Activity,
  Eye, XCircle, Save, X, Plus, Check, RotateCcw
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { useI18n } from "../hooks/useI18n";
import { toast } from "sonner";
import { userStore, type UserRecord } from "../stores/dashboard-stores";

const ROLE_LIST = ["超级管理员", "运维工程师", "开发者", "数据分析师", "测试工程师", "AI 研究员", "系统服务", "自动化运维"];

const roles = [
  { name: "超级管理员", count: 1, color: "#ff3366", icon: Crown, perms: "全部权限" },
  { name: "运维工程师", count: 3, color: "#ff6600", icon: ShieldAlert, perms: "节点管理、部署、监控" },
  { name: "开发者", count: 8, color: "#00d4ff", icon: ShieldCheck, perms: "模型调用、日志查看" },
  { name: "数据分析师", count: 4, color: "#00ff88", icon: Shield, perms: "数据查看、报表导出" },
  { name: "系统服务", count: 2, color: "#aa55ff", icon: Shield, perms: "API 调用、推理执行" },
];

const toastStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(0, 255, 136, 0.3)",
  color: "#e0f0ff",
};
const toastErrorStyle = {
  background: "rgba(8, 25, 55, 0.95)",
  border: "1px solid rgba(255, 51, 102, 0.3)",
  color: "#e0f0ff",
};

type ModalMode = "view" | "edit" | "add" | null;

export function UserManagement() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<UserRecord[]>(() => userStore.getAll());
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [showPermMatrix, setShowPermMatrix] = useState(false);

  const refreshUsers = () => setUsers(userStore.getAll());

  // Form state for add/edit
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("开发者");

  const filteredUsers = users.filter(u =>
    u.name.includes(searchQuery) || u.username.includes(searchQuery) || u.email.includes(searchQuery)
  );

  const openView = (user: UserRecord) => {
    setSelectedUser(user);
    setModalMode("view");
  };

  const openEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormUsername(user.username);
    setFormEmail(user.email);
    setFormRole(user.role);
    setModalMode("edit");
  };

  const openAdd = () => {
    setSelectedUser(null);
    setFormName("");
    setFormUsername("");
    setFormEmail("");
    setFormRole("开发者");
    setModalMode("add");
  };

  const closeModal = () => {
    setSelectedUser(null);
    setModalMode(null);
  };

  const handleSaveUser = useCallback(() => {
    if (!formName.trim() || !formUsername.trim() || !formEmail.trim()) {
      toast.error("请填写完整信息", { style: toastErrorStyle });
      return;
    }
    if (modalMode === "add") {
      userStore.add({
        name: formName.trim(),
        username: formUsername.trim(),
        email: formEmail.trim(),
        role: formRole,
        status: "offline",
        lastLogin: "--",
        sessions: 0,
        apiCalls: 0,
        locked: false,
      });
      toast.success(`用户 ${formName} 已创建`, { style: toastStyle });
    } else if (modalMode === "edit" && selectedUser) {
      userStore.update(selectedUser.id, {
        name: formName.trim(),
        username: formUsername.trim(),
        email: formEmail.trim(),
        role: formRole,
      });
      toast.success(`用户 ${formName} 信息已更新`, { style: toastStyle });
    }
    closeModal();
    refreshUsers();
  }, [modalMode, formName, formUsername, formEmail, formRole, selectedUser]);

  const handleDeleteUser = useCallback((user: UserRecord) => {
    if (user.role === "超级管理员") {
      toast.error("无法删除超级管理员", { style: toastErrorStyle });
      return;
    }
    userStore.remove(user.id);
    toast.success(`用户 ${user.name} 已删除`, { style: toastStyle });
    closeModal();
    refreshUsers();
  }, []);

  const handleToggleLock = useCallback((user: UserRecord) => {
    userStore.update(user.id, {
      locked: !user.locked,
      status: user.locked ? user.status : "offline",
    });
    toast.success(user.locked ? `${user.name} 已解锁` : `${user.name} 已锁定`, { style: toastStyle });
    refreshUsers();
  }, []);

  const handleResetUsers = useCallback(() => {
    userStore.reset();
    refreshUsers();
    toast.info("用户列表已重置为默认值", { style: toastStyle });
  }, []);

  const onlineCount = users.filter(u => u.status === "online").length;
  const adminCount = users.filter(u => u.role === "超级管理员").length;
  const serviceCount = users.filter(u => u.role === "系统服务" || u.role === "自动化运维").length;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
        {[
          { label: t("userMgmt.totalUsers"), value: String(users.length), color: "#00d4ff", icon: Users },
          { label: t("userMgmt.onlineUsers"), value: String(onlineCount), color: "#00ff88", icon: Activity },
          { label: t("userMgmt.admins"), value: String(adminCount), color: "#ff3366", icon: Crown },
          { label: t("userMgmt.serviceAccounts"), value: String(serviceCount), color: "#aa55ff", icon: Shield },
          { label: t("userMgmt.todayApiCalls"), value: `${(users.reduce((s, u) => s + u.apiCalls, 0) / 1000).toFixed(1)}K`, color: "#ffdd00", icon: Activity },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: "1.4rem", color: s.color, fontFamily: "'Orbitron', sans-serif" }}>{s.value}</div>
            <div className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-3">
        {/* Users Table */}
        <GlassCard className="lg:col-span-8 p-3 md:p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00d4ff]" />
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{t("userMgmt.userList")}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("userMgmt.searchUser")}
                  className="pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.3)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                  style={{ fontSize: "0.75rem", width: "180px" }}
                />
              </div>
              <button
                onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,255,0.12)] border border-[rgba(0,212,255,0.25)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all"
                style={{ fontSize: "0.75rem" }}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t("userMgmt.addUser")}
              </button>
              <button
                onClick={handleResetUsers}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-all"
                style={{ fontSize: "0.75rem" }}
                title="重置为默认用户列表"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[rgba(0,180,255,0.08)]">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-[rgba(0,40,80,0.3)]">
                  {[t("userMgmt.colStatus"), t("userMgmt.colUser"), t("userMgmt.colRole"), t("userMgmt.colLastLogin"), t("userMgmt.colSessions"), t("userMgmt.colApiCalls"), t("userMgmt.colActions")].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.7rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-[rgba(0,180,255,0.05)] hover:bg-[rgba(0,180,255,0.03)] transition-colors">
                    <td className="px-3 py-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        user.locked ? "bg-[#ff3366] shadow-[0_0_6px_rgba(255,51,102,0.5)]" :
                        user.status === "online" ? "bg-[#00ff88] shadow-[0_0_6px_rgba(0,255,136,0.5)]" : "bg-[rgba(0,212,255,0.2)]"
                      }`} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(0,212,255,0.3)] to-[rgba(170,85,255,0.3)] flex items-center justify-center border border-[rgba(0,180,255,0.15)]">
                          <span className="text-[#e0f0ff]" style={{ fontSize: "0.7rem" }}>{user.name.slice(0, 1)}</span>
                        </div>
                        <div>
                          <div className="text-[#c0dcf0] flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                            {user.name}
                            {user.locked && <Lock className="w-3 h-3 text-[#ff3366]" />}
                          </div>
                          <div className="text-[rgba(0,212,255,0.3)]" style={{ fontSize: "0.62rem" }}>{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded ${
                        user.role === "超级管理员" ? "bg-[rgba(255,51,102,0.1)] text-[#ff3366]" :
                        user.role === "运维工程师" || user.role === "自动化运维" ? "bg-[rgba(255,102,0,0.1)] text-[#ff6600]" :
                        user.role === "开发者" || user.role === "AI 研究员" || user.role === "测试工程师" ? "bg-[rgba(0,212,255,0.1)] text-[#00d4ff]" :
                        user.role === "系统服务" ? "bg-[rgba(170,85,255,0.1)] text-[#aa55ff]" :
                        "bg-[rgba(0,255,136,0.1)] text-[#00ff88]"
                      }`} style={{ fontSize: "0.65rem" }}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.72rem" }}>{user.lastLogin}</td>
                    <td className="px-3 py-2.5 text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>{user.sessions}</td>
                    <td className="px-3 py-2.5 text-[#00d4ff]" style={{ fontSize: "0.78rem", fontFamily: "'Orbitron', sans-serif" }}>{user.apiCalls.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(user)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title="查看详情">
                          <Eye className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                        </button>
                        <button onClick={() => openEdit(user)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title="编辑">
                          <Edit2 className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />
                        </button>
                        <button onClick={() => handleToggleLock(user)} className="p-1 rounded hover:bg-[rgba(0,212,255,0.1)] transition-all" title={user.locked ? "解锁" : "锁定"}>
                          {user.locked ? <Unlock className="w-3.5 h-3.5 text-[#ff3366]" /> : <Lock className="w-3.5 h-3.5 text-[rgba(0,212,255,0.4)]" />}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1 rounded hover:bg-[rgba(255,51,102,0.1)] transition-all"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-[rgba(255,51,102,0.4)]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Roles Panel */}
        <GlassCard className="lg:col-span-4 p-3 md:p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#aa55ff]" />
            <h3 className="text-[#e0f0ff]" style={{ fontSize: "0.9rem" }}>{t("userMgmt.rolesPerms")}</h3>
          </div>
          <div className="space-y-2.5">
            {roles.map((role) => {
              const cnt = users.filter(u => u.role === role.name).length;
              return (
                <div key={role.name} className="p-3 rounded-xl bg-[rgba(0,40,80,0.2)] border border-[rgba(0,180,255,0.08)] hover:border-[rgba(0,180,255,0.2)] transition-all cursor-pointer">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${role.color}15` }}>
                      <role.icon className="w-4 h-4" style={{ color: role.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#c0dcf0]" style={{ fontSize: "0.8rem" }}>{role.name}</span>
                        <span style={{ fontSize: "0.75rem", color: role.color, fontFamily: "'Orbitron', sans-serif" }}>{cnt}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[rgba(0,212,255,0.35)] ml-10" style={{ fontSize: "0.68rem" }}>{role.perms}</p>
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-4 space-y-2">
            <button
              onClick={openAdd}
              className="w-full py-2.5 rounded-xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.15)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.15)] transition-all"
              style={{ fontSize: "0.78rem" }}
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              {t("userMgmt.createRole")}
            </button>
            <button
              onClick={() => setShowPermMatrix(!showPermMatrix)}
              className={`w-full py-2.5 rounded-xl border transition-all ${
                showPermMatrix
                  ? "bg-[rgba(0,212,255,0.1)] border-[rgba(0,212,255,0.25)] text-[#00d4ff]"
                  : "bg-[rgba(0,40,80,0.2)] border-[rgba(0,180,255,0.08)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff]"
              }`}
              style={{ fontSize: "0.78rem" }}
            >
              {t("userMgmt.permMatrix")}
            </button>
          </div>

          {/* Permission Matrix */}
          {showPermMatrix && (
            <div className="mt-3 p-3 rounded-xl bg-[rgba(0,40,80,0.15)] border border-[rgba(0,180,255,0.1)]">
              <h4 className="text-[#e0f0ff] mb-2" style={{ fontSize: "0.78rem" }}>权限矩阵</h4>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ fontSize: "0.62rem" }}>
                  <thead>
                    <tr>
                      <th className="text-left text-[rgba(0,212,255,0.5)] px-1.5 py-1">权限</th>
                      <th className="text-center text-[#ff3366] px-1.5 py-1">管理员</th>
                      <th className="text-center text-[#ff6600] px-1.5 py-1">运维</th>
                      <th className="text-center text-[#00d4ff] px-1.5 py-1">开发</th>
                      <th className="text-center text-[#00ff88] px-1.5 py-1">分析</th>
                    </tr>
                  </thead>
                  <tbody>
                    {["节点管理", "模型部署", "数据查看", "用户管理", "系统配置", "日志导出"].map(perm => (
                      <tr key={perm} className="border-t border-[rgba(0,180,255,0.05)]">
                        <td className="text-[rgba(0,212,255,0.4)] px-1.5 py-1">{perm}</td>
                        <td className="text-center px-1.5 py-1"><Check className="w-3 h-3 text-[#00ff88] mx-auto" /></td>
                        <td className="text-center px-1.5 py-1">
                          {["节点管理", "模型部署", "日志导出"].includes(perm) ? <Check className="w-3 h-3 text-[#00ff88] mx-auto" /> : <X className="w-3 h-3 text-[rgba(255,51,102,0.3)] mx-auto" />}
                        </td>
                        <td className="text-center px-1.5 py-1">
                          {["数据查看", "日志导出"].includes(perm) ? <Check className="w-3 h-3 text-[#00ff88] mx-auto" /> : <X className="w-3 h-3 text-[rgba(255,51,102,0.3)] mx-auto" />}
                        </td>
                        <td className="text-center px-1.5 py-1">
                          {["数据查看", "日志导出"].includes(perm) ? <Check className="w-3 h-3 text-[#00ff88] mx-auto" /> : <X className="w-3 h-3 text-[rgba(255,51,102,0.3)] mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ======== User Modal (View / Edit / Add) ======== */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-0" onClick={closeModal}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm" />
          <div className="relative w-full max-w-[480px] max-h-[85vh] overflow-auto rounded-2xl bg-[rgba(8,25,55,0.9)] backdrop-blur-2xl border border-[rgba(0,180,255,0.2)] shadow-[0_0_60px_rgba(0,180,255,0.1)] p-4 md:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[#e0f0ff]" style={{ fontSize: "1rem" }}>
                {modalMode === "add" ? "添加用户" : modalMode === "edit" ? "编辑用户" : t("userMgmt.userDetail")}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-[rgba(0,212,255,0.1)]">
                <XCircle className="w-5 h-5 text-[rgba(0,212,255,0.4)]" />
              </button>
            </div>

            {/* View mode */}
            {modalMode === "view" && selectedUser && (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[rgba(0,212,255,0.4)] to-[rgba(170,85,255,0.4)] flex items-center justify-center border border-[rgba(0,180,255,0.2)]">
                    <span className="text-[#e0f0ff]" style={{ fontSize: "1.2rem" }}>{selectedUser.name.slice(0, 1)}</span>
                  </div>
                  <div>
                    <h4 className="text-[#e0f0ff] flex items-center gap-2" style={{ fontSize: "1rem" }}>
                      {selectedUser.name}
                      {selectedUser.locked && <Lock className="w-4 h-4 text-[#ff3366]" />}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.75rem" }}>@{selectedUser.username}</span>
                      <div className={`w-2 h-2 rounded-full ${selectedUser.status === "online" ? "bg-[#00ff88]" : "bg-[rgba(0,212,255,0.2)]"}`} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { k: t("userMgmt.fieldEmail"), v: selectedUser.email },
                    { k: t("userMgmt.fieldRole"), v: selectedUser.role },
                    { k: t("userMgmt.fieldLastLogin"), v: selectedUser.lastLogin },
                    { k: t("userMgmt.fieldSessions"), v: t("userMgmt.sessionsUnit").replace("{n}", String(selectedUser.sessions)) },
                    { k: t("userMgmt.fieldApiCalls"), v: t("userMgmt.apiCallsUnit").replace("{n}", selectedUser.apiCalls.toLocaleString()) },
                    { k: "账号状态", v: selectedUser.locked ? "🔒 已锁定" : "✅ 正常" },
                  ].map((row) => (
                    <div key={row.k} className="flex items-center justify-between py-2 border-b border-[rgba(0,180,255,0.06)]">
                      <span className="text-[rgba(0,212,255,0.5)]" style={{ fontSize: "0.78rem" }}>{row.k}</span>
                      <span className="text-[#c0dcf0]" style={{ fontSize: "0.78rem" }}>{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => { setModalMode("edit"); setFormName(selectedUser.name); setFormUsername(selectedUser.username); setFormEmail(selectedUser.email); setFormRole(selectedUser.role); }}
                    className="flex-1 py-2 rounded-xl bg-[rgba(0,212,255,0.1)] border border-[rgba(0,212,255,0.2)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.2)] transition-all flex items-center justify-center gap-1.5"
                    style={{ fontSize: "0.8rem" }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {t("userMgmt.editInfo")}
                  </button>
                  <button
                    onClick={() => handleToggleLock(selectedUser)}
                    className="flex-1 py-2 rounded-xl bg-[rgba(255,51,102,0.08)] border border-[rgba(255,51,102,0.2)] text-[#ff3366] hover:bg-[rgba(255,51,102,0.15)] transition-all flex items-center justify-center gap-1.5"
                    style={{ fontSize: "0.8rem" }}
                  >
                    {selectedUser.locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {selectedUser.locked ? "解锁账号" : t("userMgmt.disableAccount")}
                  </button>
                </div>
              </>
            )}

            {/* Add / Edit mode */}
            {(modalMode === "add" || modalMode === "edit") && (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] mb-1 block" style={{ fontSize: "0.75rem" }}>用户名称</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="输入名称..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
                {/* Username */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] mb-1 block" style={{ fontSize: "0.75rem" }}>登录账号</label>
                  <input
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="输入登录账号..."
                    className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.82rem", fontFamily: "'JetBrains Mono', monospace" }}
                  />
                </div>
                {/* Email */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] mb-1 block" style={{ fontSize: "0.75rem" }}>邮箱</label>
                  <input
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="user@cloudpivot.ai"
                    className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] placeholder-[rgba(0,212,255,0.25)] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
                {/* Role */}
                <div>
                  <label className="text-[rgba(0,212,255,0.5)] mb-1 block" style={{ fontSize: "0.75rem" }}>角色</label>
                  <select
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[rgba(0,40,80,0.4)] border border-[rgba(0,180,255,0.15)] text-[#e0f0ff] focus:outline-none focus:border-[rgba(0,212,255,0.4)]"
                    style={{ fontSize: "0.82rem" }}
                  >
                    {ROLE_LIST.map(r => <option key={r} value={r} style={{ background: "#0a1830", color: "#e0f0ff" }}>{r}</option>)}
                  </select>
                </div>
                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-[rgba(0,40,80,0.3)] border border-[rgba(0,180,255,0.1)] text-[rgba(0,212,255,0.5)] hover:text-[#00d4ff] transition-all" style={{ fontSize: "0.82rem" }}>
                    取消
                  </button>
                  <button
                    onClick={handleSaveUser}
                    className="flex-1 py-2.5 rounded-xl bg-[rgba(0,140,200,0.6)] border border-[rgba(0,180,255,0.3)] text-white hover:bg-[rgba(0,160,220,0.7)] transition-all flex items-center justify-center gap-1.5"
                    style={{ fontSize: "0.82rem" }}
                  >
                    <Save className="w-4 h-4" />
                    {modalMode === "add" ? "创建" : "保存"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}