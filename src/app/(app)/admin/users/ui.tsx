"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { updateUserRole, addUser, removeUser } from "./actions";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

export default function UsersTable({
  users,
  currentEmail,
}: {
  users: { id: string; email: string; fullName: string | null; role: Role }[];
  currentEmail?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  // Form State
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<Role>("VIEWER");

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    startTransition(async () => {
      try {
        await addUser(newEmail, newName, newRole);
        setNewEmail("");
        setNewName("");
        setNewRole("VIEWER");
        alert("Invitation email sent successfully!");
      } catch (error: any) {
        const errorMessage = error?.message || "An unexpected error occurred while adding the user.";
        alert(errorMessage);
      }
    });
  };

  const onRemoveUser = (id: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email}? This will revoke their access entirely.`)) return;
    
    startTransition(async () => {
      try {
        await removeUser(id);
      } catch (error: any) {
        alert(error?.message || "Failed to remove user");
      }
    });
  };

  const onChangeRole = (id: string, role: Role) => {
    startTransition(async () => {
      try {
        await updateUserRole(id, role);
      } catch (error: any) {
        alert(error?.message || "Failed to update role");
      }
    });
  };

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] text-slate-200" : "min-h-screen bg-gray-50"}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link href="/dashboard" className={dark ? "text-sm text-slate-400 hover:underline" : "text-sm text-gray-600 hover:underline"}>
          ← Back to Dashboard
        </Link>

        <h1 className={dark ? "mt-3 text-2xl font-semibold text-slate-100" : "mt-3 text-2xl font-semibold text-gray-900"}>
          User Management
        </h1>

        {/* ADD USER SECTION */}
        <div className={dark ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl" : "mt-6 rounded-2xl border bg-white p-6 shadow-sm"}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#f97316] mb-4">Add New User</h2>
          <form onSubmit={onAddUser} className="grid grid-cols-1 gap-4 md:grid-cols-4 items-end">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-500">Email Address</label>
              <input 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)}
                className={dark ? "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" : "w-full rounded-lg border px-3 py-2 text-sm"}
                placeholder="email@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-500">Full Name</label>
              <input 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className={dark ? "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" : "w-full rounded-lg border px-3 py-2 text-sm"}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-slate-500">Assign Role</label>
              <select 
                value={newRole} 
                onChange={e => setNewRole(e.target.value as Role)}
                title="Select role for new user"
                aria-label="New user role"
                className={dark ? "w-full rounded-lg border border-white/10 bg-[#101720] px-3 py-2 text-sm text-white" : "w-full rounded-lg border px-3 py-2 text-sm"}
              >
                <option value="VIEWER">VIEWER</option>
                <option value="EDITOR">EDITOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={isPending}
              className="bg-[#1d5fa8] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#3b82f6] disabled:opacity-50 h-9.5"
            >
              {isPending ? "Inviting..." : "Add User"}
            </button>
          </form>
        </div>

        {/* USERS LIST TABLE */}
        <div className={dark ? "mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-xl" : "mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm"}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={dark ? "bg-white/5 text-slate-400" : "bg-gray-50 text-gray-700"}>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Role</th>
                  <th className="px-4 py-3 text-left font-semibold">Change Role</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className={dark ? "divide-y divide-white/8" : "divide-y"}>
                {users.map((u) => {
                  const isMe = currentEmail === u.email;
                  return (
                    <tr key={u.id} className={dark ? "hover:bg-white/5" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-100">{u.fullName || "Unnamed User"}</div>
                        <div className="text-xs text-slate-500">{u.email} {isMe && "(You)"}</div>
                      </td>
                      <td className="px-4 py-3">
                         <span className={roleBadge(u.role, dark)}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={isPending || isMe}
                          title={`Change role for ${u.email}`}
                          aria-label="Change user role"
                          onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                          className={dark ? "rounded-lg bg-[#101720] border border-white/10 text-xs p-1.5 text-slate-100" : "rounded border text-xs p-1.5"}
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isMe && (
                          <button
                            onClick={() => onRemoveUser(u.id, u.email)}
                            disabled={isPending}
                            className="text-red-500 hover:text-red-400 text-xs font-bold px-2 py-1 transition-colors"
                          >
                            Remove
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
      </div>
    </div>
  );
}

function roleBadge(role: Role, dark: boolean) {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold";
    if (role === "ADMIN") return dark ? `${base} border-red-500/30 text-red-400 bg-red-500/5` : `${base} border-red-200 text-red-700 bg-red-50`;
    if (role === "EDITOR") return dark ? `${base} border-blue-500/30 text-blue-400 bg-blue-500/5` : `${base} border-blue-200 text-blue-700 bg-blue-50`;
    return dark ? `${base} border-emerald-500/30 text-emerald-400 bg-emerald-500/5` : `${base} border-emerald-200 text-emerald-700 bg-emerald-50`;
}