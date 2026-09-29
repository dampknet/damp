"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import {
  updateUserRole, addUser, removeUser,
  setMasterAdmin, suspendUser, reinstateUser, unlockUser,
} from "./actions";
import {
  UserPlus, Users, ShieldCheck, X, Trash2, Search, CheckCircle,
  ChevronRight, Loader2, Crown, Lock, Unlock, Ban, RotateCcw,
} from "lucide-react";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

interface UserRow {
  id:              string;
  email:           string;
  fullName:        string | null;
  role:            Role;
  isMasterAdmin:   boolean;
  isSuspended:     boolean;
  suspendReason:   string | null;
  suspendedBy:     string | null;
  lockedUntil:     string | null;
  lastLoginAt:     string | null;
  lastLoginIp:     string | null;
  lastLoginMethod: string | null;
}

type Confirm = {
  title:   string;
  body:    string;
  label:   string;
  danger?: boolean;
  reason?: boolean;
  run:     (reason: string) => Promise<void>;
};

function formatWhen(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function UsersTable({
  users, currentUserId,
}: {
  users:         UserRow[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [newEmail,    setNewEmail]    = useState("");
  const [newName,     setNewName]     = useState("");
  const [newRole,     setNewRole]     = useState<Role>("VIEWER");
  const [confirm,     setConfirm]     = useState<Confirm | null>(null);
  const [reason,      setReason]      = useState("");
  const [busyId,      setBusyId]      = useState<string | null>(null);
  const [now,         setNow]         = useState<number | null>(null);
  const [toast,       setToast]       = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const run = (id: string, fn: () => Promise<void>, success: string) => {
    setBusyId(id);
    startTransition(async () => {
      try {
        await fn();
        showToast("success", success);
      } catch (error: any) {
        showToast("error", error?.message || "Something went wrong");
      } finally {
        setBusyId(null);
      }
    });
  };

  const onAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    const email = newEmail;
    startTransition(async () => {
      try {
        await addUser(email, newName, newRole);
        setNewEmail("");
        setNewName("");
        setNewRole("VIEWER");
        setIsModalOpen(false);
        showToast("success", `Invitation sent to ${email}`);
      } catch (error: any) {
        showToast("error", error?.message || "Failed to add user");
      }
    });
  };

  const openConfirm = (c: Confirm) => {
    setReason("");
    setConfirm(c);
  };

  const submitConfirm = () => {
    if (!confirm) return;
    if (confirm.reason && !reason.trim()) return;
    const c = confirm;
    const r = reason;
    setConfirm(null);
    startTransition(async () => {
      try {
        await c.run(r);
      } catch (error: any) {
        showToast("error", error?.message || "Something went wrong");
      }
    });
  };

  const isLocked = (u: UserRow) => !!u.lockedUntil && now !== null && new Date(u.lockedUntil).getTime() > now;

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const masterCount    = users.filter((u) => u.isMasterAdmin).length;
  const suspendedCount = users.filter((u) => u.isSuspended).length;

  const bg      = dark ? "bg-[#0d1117]"     : "bg-[#f5f2ed]";
  const surface = dark ? "bg-[#101720]"     : "bg-[#fffdf9]";
  const border  = dark ? "border-white/8"   : "border-[#e7dfd4]";
  const txt     = dark ? "text-slate-100"   : "text-[#1a1814]";
  const muted   = dark ? "text-slate-500"   : "text-[#8b857c]";
  const hoverBg = dark ? "hover:bg-white/5" : "hover:bg-[#f5f2ed]";
  const divider = dark ? "divide-white/6"   : "divide-[#efe8de]";
  const input   = dark
    ? "bg-[#0d1117] border-white/10 text-slate-100 placeholder:text-slate-600 focus:border-[#1d5fa8]/60"
    : "bg-white border-[#e7dfd4] text-[#1a1814] placeholder:text-[#a09890] focus:border-[#1d5fa8]/60";
  const accent  = "#1d5fa8";

  const rolePill = (r: Role) => {
    if (r === "ADMIN")  return dark ? "bg-red-500/10 text-red-400 border-red-500/20"    : "bg-red-50 text-red-600 border-red-200";
    if (r === "EDITOR") return dark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-[#1d5fa8] border-blue-200";
    return dark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  const badge = (cls: string) => `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cls}`;

  const actionBtn = (tone: "neutral" | "danger" | "good" | "gold") => {
    const tones = {
      neutral: dark ? "border-white/10 text-slate-300 hover:bg-white/5"                         : "border-[#e7dfd4] text-[#5b564d] hover:bg-[#f5f2ed]",
      danger:  dark ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"                   : "border-rose-200 text-rose-600 hover:bg-rose-50",
      good:    dark ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
      gold:    dark ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10"                : "border-amber-200 text-amber-700 hover:bg-amber-50",
    };
    return `inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-40 ${tones[tone]}`;
  };

  return (
    <div className={`min-h-screen ${bg}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {toast && (
          <div className={`fixed top-5 right-5 z-[200] flex items-center gap-3 rounded-2xl border px-5 py-3.5 shadow-2xl ${
            toast.type === "success"
              ? dark ? "border-emerald-500/30 bg-emerald-950 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-800"
              : dark ? "border-red-500/30 bg-red-950 text-red-300"             : "border-red-200 bg-red-50 text-red-800"
          }`}>
            {toast.type === "success" ? <CheckCircle size={16} className="shrink-0" /> : <X size={16} className="shrink-0" />}
            <span className="text-sm font-semibold">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100" aria-label="Close">
              <X size={14} />
            </button>
          </div>
        )}

        <nav className={`mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] ${muted}`}>
          <Link href="/admin" className={`rounded px-1 py-0.5 transition ${hoverBg} ${muted}`}>Admin</Link>
          <ChevronRight size={13} className="opacity-40" />
          <span className={txt}>Access Control</span>
        </nav>

        <div className={`mb-8 flex flex-col gap-4 border-b ${border} pb-6 md:flex-row md:items-end md:justify-between`}>
          <div>
            <h1 className={`text-[26px] font-semibold tracking-tight ${txt}`}>Platform Access Control</h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Manage who can sign in, their roles, master admin access, suspensions and lockouts.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <UserPlus size={16} /> Invite Member
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active Accounts", value: users.length - suspendedCount, icon: <Users size={18} style={{ color: accent }} />,          iconBg: dark ? "bg-blue-500/10"  : "bg-blue-50"  },
            { label: "Master Admins",   value: masterCount,                  icon: <Crown size={18} className="text-amber-500" />,           iconBg: dark ? "bg-amber-500/10" : "bg-amber-50" },
            { label: "Suspended",       value: suspendedCount,               icon: <ShieldCheck size={18} className="text-rose-500" />,      iconBg: dark ? "bg-rose-500/10"  : "bg-rose-50"  },
          ].map((s) => (
            <div key={s.label} className={`flex items-center gap-4 rounded-2xl border ${border} ${surface} px-5 py-4 shadow-sm`}>
              <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.iconBg}`}>{s.icon}</div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>{s.label}</p>
                <p className={`text-xl font-semibold ${txt}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`overflow-hidden rounded-2xl border ${border} ${surface} shadow-sm`}>
          <div className={`border-b ${border} px-5 py-4`}>
            <div className="relative max-w-sm">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full rounded-xl border py-2 pl-9 pr-4 text-sm outline-none transition ${input}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`text-[10px] font-bold uppercase tracking-[0.14em] ${muted} border-b ${border}`}>
                  <th className="px-6 py-3.5">Member</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Last Sign-in</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divider}`}>
                {filteredUsers.map((u) => {
                  const isMe     = u.id === currentUserId;
                  const locked   = isLocked(u);
                  const busy     = busyId === u.id && isPending;
                  const initials = (u.fullName?.charAt(0) || u.email.charAt(0)).toUpperCase();

                  return (
                    <tr key={u.id} className={`transition-colors ${hoverBg} ${u.isSuspended ? "opacity-70" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[13px] font-bold text-white"
                            style={{ backgroundColor: u.isMasterAdmin ? "#b08b2c" : u.isSuspended ? "#6b7280" : accent }}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className={`flex flex-wrap items-center gap-1.5 text-sm font-semibold ${txt}`}>
                              {u.fullName || "Awaiting Setup"}
                              {isMe && <span className={`text-[10px] font-medium ${muted}`}>(you)</span>}
                            </p>
                            <p className={`text-[11px] ${muted}`}>{u.email}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.isMasterAdmin && (
                                <span className={badge(dark ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700")}>
                                  <Crown size={10} /> Master Admin
                                </span>
                              )}
                              {u.isSuspended && (
                                <span title={u.suspendReason ? `Reason: ${u.suspendReason}${u.suspendedBy ? ` — by ${u.suspendedBy}` : ""}` : undefined}
                                  className={badge(dark ? "border-rose-500/30 bg-rose-500/10 text-rose-300" : "border-rose-200 bg-rose-50 text-rose-700")}>
                                  <Ban size={10} /> Suspended
                                </span>
                              )}
                              {locked && (
                                <span className={badge(dark ? "border-orange-500/30 bg-orange-500/10 text-orange-300" : "border-orange-200 bg-orange-50 text-orange-700")}>
                                  <Lock size={10} /> Locked until {new Date(u.lockedUntil!).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${rolePill(u.role)}`}>{u.role}</span>
                          <select
                            value={u.role}
                            disabled={isPending || u.isMasterAdmin}
                            title={u.isMasterAdmin ? "Remove master admin access to change this role" : "Change role"}
                            aria-label={`Change role for ${u.email}`}
                            onChange={(e) => {
                              const role = e.target.value as Role;
                              run(u.id, () => updateUserRole(u.id, role), `${u.email} is now ${role}`);
                            }}
                            className={`cursor-pointer rounded-lg border ${border} ${dark ? "bg-[#0d1117]" : "bg-[#f5f2ed]"} px-2 py-1 text-[11px] font-semibold ${txt} outline-none transition disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className={`text-xs font-medium ${txt}`} suppressHydrationWarning>{formatWhen(u.lastLoginAt)}</div>
                        {u.lastLoginMethod && (
                          <div className={`text-[11px] ${muted}`}>
                            {u.lastLoginMethod}{u.lastLoginIp ? ` · ${u.lastLoginIp}` : ""}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {busy && <Loader2 size={14} className={`animate-spin ${muted}`} />}

                          {locked && (
                            <button disabled={isPending} className={actionBtn("good")}
                              onClick={() => run(u.id, () => unlockUser(u.id), `${u.email} unlocked`)}>
                              <Unlock size={12} /> Unlock
                            </button>
                          )}

                          {!isMe && (
                            u.isMasterAdmin ? (
                              <button disabled={isPending} className={actionBtn("gold")}
                                onClick={() => openConfirm({
                                  title: "Remove master admin access",
                                  body:  `${u.email} will stay an ADMIN but lose access to user management, the security log and system settings.`,
                                  label: "Remove Master Admin",
                                  run:   async () => { await setMasterAdmin(u.id, false); showToast("success", `${u.email} is no longer a master admin`); },
                                })}>
                                <Crown size={12} /> Remove Master
                              </button>
                            ) : !u.isSuspended && (
                              <button disabled={isPending} className={actionBtn("gold")}
                                onClick={() => openConfirm({
                                  title: "Make master admin",
                                  body:  `${u.email} will become an ADMIN with full access — user management, the security log and system settings.`,
                                  label: "Make Master Admin",
                                  run:   async () => { await setMasterAdmin(u.id, true); showToast("success", `${u.email} is now a master admin`); },
                                })}>
                                <Crown size={12} /> Make Master
                              </button>
                            )
                          )}

                          {!isMe && (
                            u.isSuspended ? (
                              <button disabled={isPending} className={actionBtn("good")}
                                onClick={() => run(u.id, () => reinstateUser(u.id), `${u.email} reinstated`)}>
                                <RotateCcw size={12} /> Reinstate
                              </button>
                            ) : (
                              <button disabled={isPending} className={actionBtn("danger")}
                                onClick={() => openConfirm({
                                  title:  "Suspend account",
                                  body:   `${u.email} will be signed out and blocked on every sign-in method until reinstated. Their records are kept.`,
                                  label:  "Suspend",
                                  danger: true,
                                  reason: true,
                                  run:    async (r) => { await suspendUser(u.id, r); showToast("success", `${u.email} suspended`); },
                                })}>
                                <Ban size={12} /> Suspend
                              </button>
                            )
                          )}

                          {!isMe && (
                            <button disabled={isPending} title="Remove user" aria-label="Remove user"
                              className={actionBtn("danger")}
                              onClick={() => openConfirm({
                                title:  "Remove user",
                                body:   `${u.email} will be permanently removed. If you only want to block them for now, use Suspend instead.`,
                                label:  "Remove User",
                                danger: true,
                                run:    async () => { await removeUser(u.id); showToast("success", `${u.email} removed`); },
                              })}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className={`py-16 text-center text-sm ${muted}`}>No users match your search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className={`h-1 ${confirm.danger ? "bg-[linear-gradient(90deg,#dc2626,#f87171)]" : "bg-[linear-gradient(90deg,#b08b2c,#f59e0b)]"}`} />
            <div className="p-6">
              <h2 className={`text-base font-semibold ${txt}`}>{confirm.title}</h2>
              <p className={`mt-2 text-sm ${muted}`}>{confirm.body}</p>

              {confirm.reason && (
                <div className="mt-4">
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>
                    Reason (recorded in the security log)
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="e.g. Left the company, suspicious activity…"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`}
                  />
                </div>
              )}

              <div className={`mt-5 flex gap-2 border-t ${border} pt-4`}>
                <button type="button" onClick={() => setConfirm(null)}
                  className={`flex-1 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                  Cancel
                </button>
                <button type="button" onClick={submitConfirm}
                  disabled={confirm.reason && !reason.trim()}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 ${
                    confirm.danger ? "bg-red-600" : "bg-[#b08b2c]"
                  }`}>
                  {confirm.label}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`relative w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" />
            <div className="p-7">
              <div className={`mb-6 flex items-center justify-between border-b ${border} pb-5`}>
                <div>
                  <h2 className={`text-base font-semibold ${txt}`}>Invite Team Member</h2>
                  <p className={`mt-0.5 text-xs ${muted}`}>They'll be able to log in with their email.</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} title="Close" aria-label="Close"
                  className={`rounded-lg border ${border} p-1.5 transition ${hoverBg} ${muted}`}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={onAddUser} className="space-y-4">
                {[
                  { label: "Full Name",     type: "text",  val: newName,  set: setNewName,  placeholder: "e.g. Samuel Kwawu",  required: false },
                  { label: "Email Address", type: "email", val: newEmail, set: setNewEmail, placeholder: "skwawu@company.com", required: true  },
                ].map((f) => (
                  <div key={f.label}>
                    <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>{f.label}</label>
                    <input type={f.type} required={f.required} value={f.val}
                      onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`} />
                  </div>
                ))}

                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Access Role</label>
                  <select value={newRole} title="Select Role" aria-label="Select Role"
                    onChange={(e) => setNewRole(e.target.value as Role)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`}>
                    <option value="VIEWER">Viewer — Read only</option>
                    <option value="EDITOR">Editor — Can manage content</option>
                    <option value="ADMIN">Administrator — Full access</option>
                  </select>
                </div>

                <div className={`flex gap-2 border-t ${border} pt-4`}>
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className={`flex-1 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: accent }}>
                    {isPending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send Invite"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
