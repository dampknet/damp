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
  ShieldAlert,
  ChevronRight
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("VIEWER");

  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === "ADMIN").length;
  const SUPER_ADMIN_EMAIL = "samkwesidavid456@gmail.com";

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    startTransition(async () => {
      try {
        await addUser(newEmail, newName, newRole);
        setNewEmail("");
        setNewName("");
        setIsModalOpen(false);
        alert("Invitation sent.");
      } catch (error: any) {
        alert(error?.message || "Failed to add user");
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${dark ? "bg-[#0b0e14] text-slate-200" : "bg-[#fcfcfc] text-slate-900"}`}>
      
      {/* PROFESSIONAL BREADCRUMB / SUB-HEADER */}
      <div className={`${dark ? "bg-[#11141d] border-white/5" : "bg-white border-slate-200"} border-b`}>
        <div className="mx-auto max-w-7xl px-8 py-4 flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-slate-400">
           <Link href="/dashboard" className="hover:text-[#1d5fa8] transition-colors">Dashboard</Link>
           <ChevronRight size={14} />
           <span className={dark ? "text-slate-100" : "text-slate-900"}>Admin Management</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-8 py-10">
        
        {/* BUSINESS HEADER */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Platform Access Control
            </h1>
            <p className="text-slate-500 text-sm mt-1">Configure user permissions and administrative roles for the DTT ecosystem.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#1d5fa8] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#164a82] transition-all"
          >
            <UserPlus size={18} /> Invite New Member
          </button>
        </div>

        {/* COMPACT BUSINESS STATS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-10">
          <StatCard title="Active Accounts" value={totalUsers} icon={<Users size={20} className="text-[#1d5fa8]" />} dark={dark} />
          <StatCard title="Privileged Admins" value={adminCount} icon={<ShieldCheck size={20} className="text-slate-600" />} dark={dark} />
          <StatCard title="System Integrity" value="Stable" icon={<CheckCircle size={20} className="text-emerald-600" />} dark={dark} />
        </div>

        {/* SEARCH & TABLE */}
        <div className={`rounded-xl border ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"} shadow-sm overflow-hidden`}>
          <div className="p-6 border-b border-inherit bg-slate-50/50 dark:bg-white/5">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-lg border ${dark ? "border-white/10 bg-[#0b0e14]" : "border-slate-200 bg-white"} pl-10 pr-4 py-2 text-sm outline-none focus:ring-1 focus:ring-[#1d5fa8]`}
              />
            </div>
          </div>

          <table className="w-full text-left">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <th className="px-8 py-4">Employee / User</th>
                <th className="px-8 py-4">Security Level</th>
                <th className="px-8 py-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? "divide-white/5" : "divide-slate-100"}`}>
              {filteredUsers.map((u) => {
                const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded flex items-center justify-center text-white text-xs font-bold ${isSuperAdmin ? "bg-slate-800" : "bg-[#1d5fa8]"}`}>
                          {u.fullName?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{u.fullName || "Awaiting Setup"}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {isSuperAdmin ? (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-600 dark:text-slate-400 tracking-tighter">MASTER SYSTEM ADMIN</span>
                      ) : (
                        <select
                          value={u.role}
                          disabled={isPending}
                          title="Assign Role"
                          aria-label={`Assign role for ${u.email}`}
                          onChange={(e) => startTransition(() => updateUserRole(u.id, e.target.value as Role))}
                          className={`text-xs font-bold border-none bg-transparent focus:ring-0 cursor-pointer ${roleColor(u.role)}`}
                        >
                          <option value="ADMIN">ADMINISTRATOR</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {!isSuperAdmin && (
                        <button 
                          onClick={() => { if(confirm("Revoke user access?")) startTransition(() => removeUser(u.id)) }}
                          title="Revoke Access"
                          aria-label="Revoke Access"
                          className="text-slate-300 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
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

      {/* MINIMAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className={`relative w-full max-w-md rounded-lg border ${dark ? "border-white/10 bg-[#11141d]" : "bg-white"} p-8 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#1d5fa8]">Invite Team Member</h2>
              <button onClick={() => setIsModalOpen(false)} title="Close" aria-label="Close" className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={onAddUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Full Name</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1d5fa8]" placeholder="e.g. Samuel Kwawu" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Corporate Email</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1d5fa8]" placeholder="skwawu@company.com" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Security Role</label>
                <select value={newRole} title="Select Role" aria-label="Select Role" onChange={e => setNewRole(e.target.value as Role)} className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                  <option value="VIEWER">VIEWER (READ-ONLY)</option>
                  <option value="EDITOR">EDITOR (MANAGEMENT)</option>
                  <option value="ADMIN">ADMINISTRATOR (FULL)</option>
                </select>
              </div>
              <button type="submit" disabled={isPending} className="w-full rounded bg-[#1d5fa8] py-3 text-sm font-bold text-white hover:bg-[#164a82] disabled:opacity-50">
                {isPending ? "Sending..." : "Issue Invitation"}
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
    <div className={`rounded-lg border ${dark ? "border-white/5 bg-[#11141d]" : "border-slate-200 bg-white"} p-5 shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${dark ? "bg-white/5" : "bg-slate-50"}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
          <h3 className="text-xl font-bold">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function roleColor(role: Role) {
  if (role === "ADMIN") return "text-orange-600";
  if (role === "EDITOR") return "text-blue-600";
  return "text-emerald-600";
}