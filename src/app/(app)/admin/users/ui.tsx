"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { updateUserRole, addUser, removeUser } from "./actions";
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  X, 
  Trash2, 
  Search,
  CheckCircle,
  ShieldAlert
} from "lucide-react";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

export default function UsersTable({
  users,
  currentEmail,
}: {
  users: UserProfile[];
  currentEmail?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("VIEWER");

  // Stats Calculations
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === "ADMIN").length;

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    startTransition(async () => {
      try {
        await addUser(newEmail, newName, newRole);
        setNewEmail("");
        setNewName("");
        setNewRole("VIEWER");
        setIsModalOpen(false);
        alert("Invitation email sent successfully!");
      } catch (error: any) {
        alert(error?.message || "Failed to add user");
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // SUPER ADMIN PROTECTION LOGIC
  const SUPER_ADMIN_EMAIL = "samkwesidavid456@gmail.com";

  return (
    <div className={`relative min-h-screen overflow-hidden ${dark ? "bg-[#0d1117] text-slate-200" : "bg-[#f7f4ee] text-slate-900"}`}>
      
      {/* SLEEK BACKGROUND DECORATIONS (Matches Login) */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-20 top-10 h-96 w-96 rounded-full opacity-20 blur-3xl ${dark ? "bg-blue-500" : "bg-[#1d5fa8]"}`} />
        <div className={`absolute right-0 top-40 h-96 w-96 rounded-full opacity-20 blur-3xl ${dark ? "bg-orange-500" : "bg-[#c8611a]"}`} />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(to right, #1d5fa8 1px, transparent 1px), linear-gradient(to bottom, #1d5fa8 1px, transparent 1px)",
          backgroundSize: "45px 45px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        
        {/* COMPACT HEADER SECTION */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-[linear-gradient(90deg,#1d5fa8,#c8611a)] bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Manage platform access and assign security roles.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#1d5fa8] px-6 py-3.5 font-bold text-white shadow-xl shadow-blue-900/20 hover:bg-[#3b82f6] transition-all active:scale-95"
          >
            <UserPlus size={20} /> Add New User
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-10">
          <StatCard title="Total Users" value={totalUsers} icon={<Users size={24} className="text-blue-500" />} dark={dark} />
          <StatCard title="System Admins" value={adminCount} icon={<ShieldCheck size={24} className="text-orange-500" />} dark={dark} />
          <StatCard title="Site Status" value="Live" icon={<CheckCircle size={24} className="text-emerald-500" />} dark={dark} />
        </div>

        {/* TABLE CONTROLS */}
        <div className="relative w-full max-w-md mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full rounded-2xl border ${dark ? "border-white/10 bg-white/5" : "border-[#e4dccf] bg-white/80"} pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 backdrop-blur-sm`}
          />
        </div>

        {/* USERS TABLE */}
        <div className={`overflow-hidden rounded-[30px] border ${dark ? "border-white/10 bg-white/5" : "border-[#e4dccf] bg-white/80"} backdrop-blur-xl shadow-2xl`}>
          <table className="w-full text-left">
            <thead>
              <tr className={`${dark ? "bg-white/5 text-slate-400" : "bg-slate-50/50 text-slate-500"} border-b border-inherit`}>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest">User Profile</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? "divide-white/5" : "divide-[#efe8de]"}`}>
              {filteredUsers.map((u) => {
                const isMe = currentEmail === u.email;
                const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL;

                return (
                  <tr key={u.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${isSuperAdmin ? "bg-[linear-gradient(135deg,#c8611a,#f97316)]" : "bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)]"}`}>
                          {u.fullName?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-base">{u.fullName || "Pending Activation"}</div>
                          <div className="text-xs text-slate-500 font-medium">{u.email} {isMe && "(You)"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      {isSuperAdmin ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 text-xs font-black tracking-widest uppercase">
                          <ShieldAlert size={14} /> Master Admin
                        </div>
                      ) : (
                        <select
                          value={u.role}
                          disabled={isPending}
                          title="Change user role" 
                          aria-label={`Change role for ${u.email}`} 
                          onChange={(e) => startTransition(() => updateUserRole(u.id, e.target.value as Role))}
                          className={`rounded-xl border-none text-xs font-black tracking-tighter px-4 py-2 outline-none cursor-pointer ${dark ? "bg-white/5" : "bg-slate-100"} ${roleColor(u.role)}`}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {!isSuperAdmin && (
                        <button 
                          onClick={() => { if(confirm("Remove this user?")) startTransition(() => removeUser(u.id)) }}
                          title="Remove user" 
                          className="text-slate-400 hover:text-red-500 transition-all hover:scale-110 p-2"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className={`relative w-full max-w-lg rounded-4xl border ${dark ? "border-white/10 bg-[#0d1117]" : "bg-white"} p-10 shadow-2xl scale-in-center`}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">Add New User</h2>
                <p className="text-slate-500 text-sm mt-1">Send an invitation to join the platform.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)}
              title="Close modal" 
              aria-label="Close add user modal" 
              className="text-slate-400 hover:text-red-500 transition-colors">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={onAddUser} className="space-y-6">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Full Name</label>
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className={`w-full rounded-2xl border ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"} px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Email Address</label>
                <input 
                  type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className={`w-full rounded-2xl border ${dark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"} px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/50`}
                  placeholder="user@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block ml-1">Assign Role</label>
                <select 
                  value={newRole} onChange={e => setNewRole(e.target.value as Role)}
                  title="Assign a role" 
                  aria-label="Select role for new user" 
                  className={`w-full rounded-2xl border ${dark ? "border-white/10 bg-[#161b22]" : "border-slate-200 bg-slate-50"} px-5 py-4 text-sm outline-none`}
                >
                  <option value="VIEWER">Viewer (Read Only)</option>
                  <option value="EDITOR">Editor (Can Update Assets)</option>
                  <option value="ADMIN">Administrator (Full Control)</option>
                </select>
              </div>

              <button 
                type="submit" disabled={isPending}
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] py-5 font-bold text-white shadow-xl shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isPending ? "Sending Invite..." : "Send Invitation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, dark }: any) {
  return (
    <div className={`group rounded-[28px] border ${dark ? "border-white/10 bg-white/5" : "border-[#e4dccf] bg-white"} p-8 backdrop-blur-xl transition-all hover:-translate-y-1`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
          <h3 className="mt-3 text-4xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner ${dark ? "bg-white/5" : "bg-slate-50"}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function roleColor(role: Role) {
  if (role === "ADMIN") return "text-orange-500";
  if (role === "EDITOR") return "text-blue-500";
  return "text-emerald-500";
}