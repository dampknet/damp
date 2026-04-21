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
  ChevronRight,
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
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
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

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  // ── Exact navbar palette ──────────────────────────────────────────────────
  const bg      = dark ? "bg-[#0d1117]"     : "bg-[#f5f2ed]";
  const surface = dark ? "bg-[#101720]"     : "bg-[#fffdf9]";
  const border  = dark ? "border-white/8"   : "border-[#e7dfd4]";
  const txt     = dark ? "text-slate-100"   : "text-[#1a1814]";
  const muted   = dark ? "text-slate-500"   : "text-[#8b857c]";
  const subtler = dark ? "text-slate-600"   : "text-[#a09890]";
  const hoverBg = dark ? "hover:bg-white/5" : "hover:bg-[#f5f2ed]";
  const divider = dark ? "divide-white/6"   : "divide-[#efe8de]";
  const pill    = dark ? "bg-white/6 border-white/10 text-slate-400"
                       : "bg-[#f5f2ed] border-[#e7dfd4] text-[#6b6560]";
  const input   = dark
    ? "bg-[#0d1117] border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-[#1d5fa8]/60"
    : "bg-white border-[#e7dfd4] text-[#1a1814] placeholder:text-[#a09890] focus:border-[#1d5fa8]/60";
  const accent  = "#1d5fa8";

  const roleStyle = (r: Role) => {
    if (r === "ADMIN")  return { color: "#ef4444" };
    if (r === "EDITOR") return { color: accent };
    return { color: "#10b981" };
  };
  const rolePill = (r: Role) => {
    if (r === "ADMIN")  return dark ? "bg-red-500/10 text-red-400 border-red-500/20"   : "bg-red-50 text-red-600 border-red-200";
    if (r === "EDITOR") return dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-[#1d5fa8] border-blue-200";
    return dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">

        {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
        <nav className={`mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
          <Link href="/dashboard" className={`transition ${hoverBg} rounded px-1 py-0.5 ${muted} hover:${txt}`}>
            Dashboard
          </Link>
          <ChevronRight size={13} className="opacity-40" />
          <span className={txt}>Access Control</span>
        </nav>

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className={`mb-8 flex flex-col gap-4 border-b ${border} pb-6 md:flex-row md:items-end md:justify-between`}>
          <div>
            <h1 className={`text-[26px] font-semibold tracking-tight ${txt}`}>
              Platform Access Control
            </h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Configure user permissions and administrative roles for the DTT ecosystem.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: accent }}
          >
            <UserPlus size={16} />
            Invite Member
          </button>
        </div>

        {/* ── Stat cards ───────────────────────────────────────────────────── */}
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Active Accounts",
              value: totalUsers,
              icon: <Users size={18} style={{ color: accent }} />,
              iconBg: dark ? "bg-blue-500/10" : "bg-blue-50",
            },
            {
              label: "Privileged Admins",
              value: adminCount,
              icon: <ShieldCheck size={18} className={dark ? "text-slate-400" : "text-slate-500"} />,
              iconBg: dark ? "bg-white/5" : "bg-[#f5f2ed]",
            },
            {
              label: "System Integrity",
              value: "Stable",
              icon: <CheckCircle size={18} className="text-emerald-500" />,
              iconBg: dark ? "bg-emerald-500/10" : "bg-emerald-50",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-4 rounded-2xl border ${border} ${surface} px-5 py-4 shadow-sm`}
            >
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.iconBg}`}>
                {s.icon}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                  {s.label}
                </p>
                <p className={`text-xl font-semibold ${txt}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table card ───────────────────────────────────────────────────── */}
        <div className={`overflow-hidden rounded-2xl border ${border} ${surface} shadow-sm`}>

          {/* Search bar */}
          <div className={`border-b ${border} px-5 py-4`}>
            <div className="relative max-w-sm">
              <Search
                size={14}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
              />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-xl border py-2 pl-9 pr-4 text-sm outline-none transition ${input}`}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted} border-b ${border}`}>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {filteredUsers.map((u) => {
                  const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL;
                  const initials = (u.fullName?.charAt(0) || u.email.charAt(0)).toUpperCase();

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${hoverBg}`}
                    >
                      {/* Member */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white"
                            style={{
                              backgroundColor: isSuperAdmin ? "#374151" : accent,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${txt}`}>
                              {u.fullName || "Awaiting Setup"}
                            </p>
                            <p className={`text-[11px] ${muted}`}>{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isSuperAdmin ? (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${pill}`}
                          >
                            Master Admin
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${rolePill(u.role)}`}
                            >
                              {u.role}
                            </span>
                            <select
                              value={u.role}
                              disabled={isPending}
                              title="Change Role"
                              aria-label={`Change role for ${u.email}`}
                              onChange={(e) =>
                                startTransition(() =>
                                  updateUserRole(u.id, e.target.value as Role)
                                )
                              }
                              className={`rounded-lg border ${border} ${dark ? "bg-[#0d1117]" : "bg-[#f5f2ed]"} px-2 py-1 text-[11px] font-semibold ${txt} outline-none cursor-pointer transition`}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="EDITOR">EDITOR</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        {!isSuperAdmin && (
                          <button
                            onClick={() => {
                              if (confirm("Revoke this user's access?"))
                                startTransition(() => removeUser(u.id));
                            }}
                            title="Revoke Access"
                            aria-label="Revoke Access"
                            className={`rounded-lg border ${border} p-2 transition ${hoverBg} text-rose-500 hover:border-rose-300 hover:bg-rose-50 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={3} className={`py-16 text-center text-sm ${muted}`}>
                      No users match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Invite modal ─────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div
            className={`relative w-full max-w-md rounded-2xl border ${border} ${surface} p-7 shadow-2xl`}
          >
            {/* Modal header */}
            <div className={`mb-6 flex items-center justify-between border-b ${border} pb-5`}>
              <div>
                <h2 className={`text-base font-semibold ${txt}`}>Invite Team Member</h2>
                <p className={`text-xs ${muted} mt-0.5`}>
                  They'll be able to log in with their email.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                title="Close"
                aria-label="Close"
                className={`rounded-lg border ${border} p-1.5 transition ${hoverBg} ${muted}`}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={onAddUser} className="space-y-4">
              {[
                {
                  label: "Full Name",
                  type: "text",
                  val: newName,
                  set: setNewName,
                  placeholder: "e.g. Samuel Kwawu",
                  required: false,
                },
                {
                  label: "Email Address",
                  type: "email",
                  val: newEmail,
                  set: setNewEmail,
                  placeholder: "skwawu@company.com",
                  required: true,
                },
              ].map((f) => (
                <div key={f.label}>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className={`w-full rounded-xl border py-2.5 px-3 text-sm outline-none transition ${input}`}
                  />
                </div>
              ))}

              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                  Access Role
                </label>
                <select
                  value={newRole}
                  title="Select Role"
                  aria-label="Select Role"
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className={`w-full rounded-xl border py-2.5 px-3 text-sm outline-none transition ${input}`}
                >
                  <option value="VIEWER">Viewer — Read only</option>
                  <option value="EDITOR">Editor — Can manage content</option>
                  <option value="ADMIN">Administrator — Full access</option>
                </select>
              </div>

              <div className={`flex gap-2 border-t ${border} pt-4`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {isPending ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}