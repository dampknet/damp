"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { updateUserRole, addUser, removeUser } from "./actions";
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  UserCircle, 
  X, 
  MoreVertical, 
  Trash2, 
  ChevronLeft,
  Search,
  CheckCircle
} from "lucide-react";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  lastSignInAt?: string; // Add this to your Prisma schema/fetch if possible
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
        setIsModalOpen(false); // Close modal on success
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

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-[#f8f9fa] text-slate-900"}>
      
      {/* HEADER SECTION */}
      <div className={dark ? "border-b border-white/5 bg-white/2" : "border-b bg-white"}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-500 hover:text-[#1d5fa8] transition-colors">
            <ChevronLeft size={16} /> Back to Dashboard
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-slate-500 text-sm mt-1">Manage platform access and assign security roles.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1d5fa8] px-5 py-3 font-semibold text-white shadow-lg shadow-blue-900/20 hover:bg-[#3b82f6] transition-all active:scale-95"
            >
              <UserPlus size={18} /> Add New User
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-10">
          <StatCard title="Total Users" value={totalUsers} icon={<Users className="text-blue-500" />} dark={dark} />
          <StatCard title="System Admins" value={adminCount} icon={<ShieldCheck className="text-orange-500" />} dark={dark} />
          <StatCard title="Authorized Sites" value="Live" icon={<CheckCircle className="text-emerald-500" />} dark={dark} />
        </div>

        {/* TABLE CONTROLS */}
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500" : "w-full rounded-xl border bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-[#1d5fa8] shadow-sm"}
            />
          </div>
        </div>

        {/* USERS TABLE */}
        <div className={dark ? "overflow-hidden rounded-2xl border border-white/10 bg-white/2 backdrop-blur-xl" : "overflow-hidden rounded-2xl border bg-white shadow-sm"}>
          <table className="w-full text-left">
            <thead>
              <tr className={dark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-500"}>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">User Profile</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={dark ? "divide-y divide-white/5" : "divide-y"}>
              {filteredUsers.map((u) => {
                const isMe = currentEmail === u.email;
                return (
                  <tr key={u.id} className="group hover:bg-white/2 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] flex items-center justify-center text-white font-bold">
                          {u.fullName?.charAt(0) || u.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold">{u.fullName || "Pending Activation"}</div>
                          <div className="text-xs text-slate-500">{u.email} {isMe && "(You)"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <select
                        value={u.role}
                        disabled={isMe || isPending}
                        title="Change user role" 
                        aria-label={`Change role for ${u.email}`} 
                        onChange={(e) => startTransition(() => updateUserRole(u.id, e.target.value as Role))}
                        className={dark 
                          ? `rounded-lg bg-white/5 border-none text-xs px-3 py-1.5 focus:ring-1 focus:ring-blue-500 ${roleColor(u.role)}` 
                          : `rounded-lg border text-xs px-3 py-1.5 ${roleColor(u.role)}`
                        }
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="EDITOR">EDITOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                    <td className="px-6 py-5 text-right">
                      {!isMe && (
                        <button 
                          onClick={() => startTransition(() => removeUser(u.id))}
                          title="Remove user" 
                          aria-label={`Remove user ${u.email}`} 
                          className="text-slate-400 hover:text-red-500 transition-colors p-2"
                        >
                          <Trash2 size={18} />
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className={dark ? "relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d1117] p-8 shadow-2xl" : "relative w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button onClick={() => setIsModalOpen(false)} 
              title="Close modal" 
              aria-label="Close add user modal" 
              className="text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={onAddUser} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Full Name</label>
                <input 
                  type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm" : "w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm"}
                  placeholder="Enter user's name"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Email Address</label>
                <input 
                  type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm" : "w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm"}
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Permission Level</label>
                <select 
                  value={newRole} onChange={e => setNewRole(e.target.value as Role)}
                  title="Select permission level" 
                  aria-label="Assign role to new user" 
                  className={dark ? "w-full rounded-xl border border-white/10 bg-[#161b22] px-4 py-3 text-sm" : "w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm"}
                >
                  <option value="VIEWER">Viewer (Read Only)</option>
                  <option value="EDITOR">Editor (Edit Content)</option>
                  <option value="ADMIN">Administrator (Full Control)</option>
                </select>
              </div>

              <button 
                type="submit" disabled={isPending}
                className="w-full rounded-xl bg-[#1d5fa8] py-4 font-bold text-white shadow-lg transition hover:bg-[#3b82f6] disabled:opacity-50"
              >
                {isPending ? "Sending Invitation..." : "Send Invitation"}
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
    <div className={dark ? "rounded-2xl border border-white/10 bg-white/2 p-6 backdrop-blur-xl" : "rounded-2xl border bg-white p-6 shadow-sm"}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold">{value}</h3>
        </div>
        <div className="h-12 w-12 rounded-xl bg-slate-100/10 flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function roleColor(role: Role) {
  if (role === "ADMIN") return "text-orange-500 font-bold";
  if (role === "EDITOR") return "text-blue-500 font-bold";
  return "text-emerald-500 font-bold";
}