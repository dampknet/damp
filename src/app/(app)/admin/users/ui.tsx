"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import {
  updateUserRole, addUser, removeUser,
  setMasterAdmin, suspendUser, reinstateUser, unlockUser,
  createEmergencyAccount, setLocalPassword, removeLocalPassword, setAccessExpiry,
} from "./actions";
import {
  UserPlus, Users, ShieldCheck, X, Trash2, Search, CheckCircle,
  ChevronRight, Loader2, Crown, Lock, Unlock, Ban, RotateCcw,
  Key, Clock, Copy, RefreshCw,
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
  lastLoginMethod:    string | null;
  isEmergency:        boolean;
  accessExpiresAt:    string | null;
  mustChangePassword: boolean;
  hasLocalPassword:   boolean;
}

type Handover = { email: string; password: string; mustChange: boolean };

type Confirm = {
  title:   string;
  body:    string;
  label:   string;
  danger?: boolean;
  reason?: boolean;
  run:     (reason: string) => Promise<void>;
};

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 14): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  let out = Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
  if (!/[0-9]/.test(out))    out = out.slice(0, -1) + "7";
  if (!/[A-Za-z]/.test(out)) out = "K" + out.slice(1);
  return out;
}

function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

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

  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emName,        setEmName]        = useState("");
  const [emEmail,       setEmEmail]       = useState("");
  const [emRole,        setEmRole]        = useState<Role>("EDITOR");
  const [emPassword,    setEmPassword]    = useState("");
  const [emExpiry,      setEmExpiry]      = useState("");
  const [emMustChange,  setEmMustChange]  = useState(true);
  const [emNeverExpire, setEmNeverExpire] = useState(false);

  const [passwordFor,   setPasswordFor]   = useState<UserRow | null>(null);
  const [pwValue,       setPwValue]       = useState("");
  const [pwMustChange,  setPwMustChange]  = useState(true);

  const [expiryFor,     setExpiryFor]     = useState<UserRow | null>(null);
  const [expiryValue,   setExpiryValue]   = useState("");

  const [handover,      setHandover]      = useState<Handover | null>(null);
  const [copied,        setCopied]        = useState(false);
  const [formError,     setFormError]     = useState<string | null>(null);

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

  const openEmergency = () => {
    setEmName("");
    setEmEmail("");
    setEmRole("EDITOR");
    setEmPassword(generatePassword());
    setEmExpiry(toLocalInput(new Date(Date.now() + 48 * 60 * 60 * 1000)));
    setEmMustChange(true);
    setEmNeverExpire(false);
    setFormError(null);
    setEmergencyOpen(true);
  };

  const submitEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const payload = {
      email:      emEmail,
      fullName:   emName,
      role:       emRole,
      password:   emPassword,
      expiresAt:  emNeverExpire ? null : localInputToIso(emExpiry),
      mustChange: emMustChange,
    };
    startTransition(async () => {
      try {
        await createEmergencyAccount(payload);
        setEmergencyOpen(false);
        setCopied(false);
        setHandover({ email: payload.email.toLowerCase().trim(), password: payload.password, mustChange: payload.mustChange });
      } catch (error: any) {
        setFormError(error?.message || "Could not create the account");
      }
    });
  };

  const openPassword = (u: UserRow) => {
    setPwValue(generatePassword());
    setPwMustChange(u.id !== currentUserId);
    setFormError(null);
    setPasswordFor(u);
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordFor) return;
    setFormError(null);
    const target     = passwordFor;
    const password   = pwValue;
    const mustChange = target.id !== currentUserId && pwMustChange;
    startTransition(async () => {
      try {
        await setLocalPassword(target.id, password, mustChange);
        setPasswordFor(null);
        setCopied(false);
        setHandover({ email: target.email, password, mustChange });
      } catch (error: any) {
        setFormError(error?.message || "Could not set the password");
      }
    });
  };

  const openExpiry = (u: UserRow) => {
    setExpiryValue(u.accessExpiresAt
      ? toLocalInput(new Date(u.accessExpiresAt))
      : toLocalInput(new Date(Date.now() + 48 * 60 * 60 * 1000)));
    setFormError(null);
    setExpiryFor(u);
  };

  const submitExpiry = (clear: boolean) => {
    if (!expiryFor) return;
    setFormError(null);
    const target = expiryFor;
    const iso    = clear ? null : localInputToIso(expiryValue);
    if (!clear && !iso) { setFormError("Pick a valid date and time."); return; }
    startTransition(async () => {
      try {
        await setAccessExpiry(target.id, iso);
        setExpiryFor(null);
        showToast("success", clear ? `Expiry removed for ${target.email}` : `Access for ${target.email} now expires ${formatWhen(iso)}`);
      } catch (error: any) {
        setFormError(error?.message || "Could not update expiry");
      }
    });
  };

  const copyHandover = async () => {
    if (!handover) return;
    try {
      await navigator.clipboard.writeText(`Email: ${handover.email}\nPassword: ${handover.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const isExpired = (u: UserRow) => !!u.accessExpiresAt && now !== null && new Date(u.accessExpiresAt).getTime() <= now;

  const isLocked = (u: UserRow) => !!u.lockedUntil && now !== null && new Date(u.lockedUntil).getTime() > now;

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.fullName?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const masterCount    = users.filter((u) => u.isMasterAdmin).length;
  const emergencyCount = users.filter((u) => u.isEmergency).length;
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
          <div className="flex flex-wrap gap-2">
            <button
              onClick={openEmergency}
              className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm transition ${
                dark ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" : "border-[#e7dfd4] bg-white text-[#1a1814] hover:bg-[#f5f2ed]"
              }`}
            >
              <Key size={16} /> Create Account
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <UserPlus size={16} /> Invite Member
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Active Accounts", value: users.length - suspendedCount, icon: <Users size={18} style={{ color: accent }} />,          iconBg: dark ? "bg-blue-500/10"  : "bg-blue-50"  },
            { label: "Master Admins",   value: masterCount,                  icon: <Crown size={18} className="text-amber-500" />,           iconBg: dark ? "bg-amber-500/10" : "bg-amber-50" },
            { label: "Suspended / Created", value: `${suspendedCount} / ${emergencyCount}`, icon: <ShieldCheck size={18} className="text-rose-500" />, iconBg: dark ? "bg-rose-500/10" : "bg-rose-50" },
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
                              {u.isEmergency && (
                                <span className={badge(dark ? "border-blue-500/30 bg-blue-500/10 text-blue-300" : "border-blue-200 bg-blue-50 text-[#1d5fa8]")}>
                                  <Key size={10} /> Created Account
                                </span>
                              )}
                              {u.accessExpiresAt && (
                                isExpired(u) ? (
                                  <span className={badge(dark ? "border-slate-500/30 bg-slate-500/10 text-slate-300" : "border-slate-300 bg-slate-100 text-slate-600")}>
                                    <Clock size={10} /> Expired
                                  </span>
                                ) : (
                                  <span suppressHydrationWarning className={badge(dark ? "border-sky-500/30 bg-sky-500/10 text-sky-300" : "border-sky-200 bg-sky-50 text-sky-700")}>
                                    <Clock size={10} /> Until {formatWhen(u.accessExpiresAt)}
                                  </span>
                                )
                              )}
                              {u.hasLocalPassword && (
                                <span title={u.mustChangePassword ? "Must change password at next sign-in" : "Can sign in with a local password"}
                                  className={badge(dark ? "border-white/10 bg-white/5 text-slate-300" : "border-[#e7dfd4] bg-[#f5f2ed] text-[#5b564d]")}>
                                  <Key size={10} /> {u.mustChangePassword ? "Temp password" : "Password"}
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

                          <button disabled={isPending} className={actionBtn("neutral")} onClick={() => openPassword(u)}>
                            <Key size={12} /> {u.hasLocalPassword ? "Reset Password" : "Set Password"}
                          </button>

                          {!isMe && u.hasLocalPassword && !u.isEmergency && (
                            <button disabled={isPending} className={actionBtn("neutral")}
                              onClick={() => openConfirm({
                                title: "Remove local password",
                                body:  `${u.email} will no longer be able to sign in with a password — only through Microsoft or Google. Do this once the identity provider is working again.`,
                                label: "Remove Password",
                                run:   async () => { await removeLocalPassword(u.id); showToast("success", `Local password removed for ${u.email}`); },
                              })}>
                              Remove Password
                            </button>
                          )}

                          {!isMe && (
                            <button disabled={isPending} className={actionBtn("neutral")} onClick={() => openExpiry(u)}>
                              <Clock size={12} /> Expiry
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

      {emergencyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#60a5fa)]" />
            <form onSubmit={submitEmergency} className="space-y-4 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className={`text-base font-semibold ${txt}`}>Create Account</h2>
                  <p className={`mt-1 text-xs ${muted}`}>
                    A local account for when Microsoft or Google sign-in is down. No email is sent — you hand the details over yourself.
                  </p>
                </div>
                <button type="button" onClick={() => setEmergencyOpen(false)} aria-label="Close"
                  className={`rounded-lg border ${border} p-1.5 transition ${hoverBg} ${muted}`}>
                  <X size={16} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Full Name</label>
                  <input value={emName} onChange={(e) => setEmName(e.target.value)} placeholder="e.g. Store Manager"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`} />
                </div>
                <div>
                  <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Role</label>
                  <select value={emRole} onChange={(e) => setEmRole(e.target.value as Role)} aria-label="Role"
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`}>
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Sign-in Email</label>
                <input type="email" required value={emEmail} onChange={(e) => setEmEmail(e.target.value)}
                  placeholder="e.g. store1@knetgh.com"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`} />
              </div>

              <PasswordField dark={dark} value={emPassword} onChange={setEmPassword} input={input} border={border} muted={muted} hoverBg={hoverBg} />

              <div>
                <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Access Expires</label>
                <input type="datetime-local" value={emExpiry} onChange={(e) => setEmExpiry(e.target.value)} aria-label="Access expires"
                  disabled={emNeverExpire} required={!emNeverExpire}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition disabled:opacity-40 ${input}`} />
                <label className={`mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium ${txt}`}>
                  <input type="checkbox" checked={emNeverExpire} onChange={(e) => setEmNeverExpire(e.target.checked)} className="h-4 w-4 accent-[#1d5fa8]" />
                  Never expire
                </label>
                <p className={`mt-1 text-[11px] ${muted}`}>
                  {emNeverExpire ? "The account keeps working until you suspend or remove it." : "The account stops working automatically at this time."}
                </p>
              </div>

              <label className={`flex cursor-pointer items-center gap-2 text-xs font-medium ${txt}`}>
                <input type="checkbox" checked={emMustChange} onChange={(e) => setEmMustChange(e.target.checked)} className="h-4 w-4 accent-[#1d5fa8]" />
                Require a new password at first sign-in
              </label>

              {formError && (
                <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>
                  {formError}
                </div>
              )}

              <div className={`flex gap-2 border-t ${border} pt-4`}>
                <button type="button" onClick={() => setEmergencyOpen(false)}
                  className={`flex-1 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}>
                  {isPending ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" />
            <form onSubmit={submitPassword} className="space-y-4 p-6">
              <div>
                <h2 className={`text-base font-semibold ${txt}`}>
                  {passwordFor.hasLocalPassword ? "Reset Local Password" : "Set Local Password"}
                </h2>
                <p className={`mt-1 text-xs ${muted}`}>
                  {passwordFor.email} will be able to sign in with this password even when Microsoft or Google is unavailable.
                </p>
              </div>

              <PasswordField dark={dark} value={pwValue} onChange={setPwValue} input={input} border={border} muted={muted} hoverBg={hoverBg} />

              {passwordFor.id !== currentUserId && (
                <label className={`flex cursor-pointer items-center gap-2 text-xs font-medium ${txt}`}>
                  <input type="checkbox" checked={pwMustChange} onChange={(e) => setPwMustChange(e.target.checked)} className="h-4 w-4 accent-[#1d5fa8]" />
                  Require a new password at next sign-in
                </label>
              )}

              {formError && (
                <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>
                  {formError}
                </div>
              )}

              <div className={`flex gap-2 border-t ${border} pt-4`}>
                <button type="button" onClick={() => setPasswordFor(null)}
                  className={`flex-1 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}>
                  {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {expiryFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className="h-1 bg-[linear-gradient(90deg,#0ea5e9,#3b82f6)]" />
            <div className="space-y-4 p-6">
              <div>
                <h2 className={`text-base font-semibold ${txt}`}>Access Expiry</h2>
                <p className={`mt-1 text-xs ${muted}`}>
                  {expiryFor.email} will be signed out and blocked automatically at this time.
                </p>
              </div>
              <input type="datetime-local" value={expiryValue} onChange={(e) => setExpiryValue(e.target.value)} aria-label="Expiry"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`} />

              {formError && (
                <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>
                  {formError}
                </div>
              )}

              <div className={`flex flex-wrap gap-2 border-t ${border} pt-4`}>
                <button type="button" onClick={() => setExpiryFor(null)}
                  className={`rounded-xl border ${border} px-4 py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                  Cancel
                </button>
                {expiryFor.accessExpiresAt && (
                  <button type="button" disabled={isPending} onClick={() => submitExpiry(true)}
                    className={`rounded-xl border ${border} px-4 py-2.5 text-sm font-semibold ${txt} transition ${hoverBg} disabled:opacity-50`}>
                    Remove Expiry
                  </button>
                )}
                <button type="button" disabled={isPending} onClick={() => submitExpiry(false)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: accent }}>
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : "Save Expiry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {handover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border ${border} ${surface} shadow-2xl`}>
            <div className="h-1 bg-[linear-gradient(90deg,#10b981,#34d399)]" />
            <div className="space-y-4 p-6">
              <div>
                <h2 className={`text-base font-semibold ${txt}`}>Copy these details now</h2>
                <p className={`mt-1 text-xs ${muted}`}>
                  The password is not stored in readable form, so this is the only time it can be shown.
                </p>
              </div>

              <div className={`space-y-2 rounded-xl border ${border} ${dark ? "bg-[#0d1117]" : "bg-[#f5f2ed]"} p-4 font-mono text-sm ${txt}`}>
                <div><span className={muted}>Email:</span> {handover.email}</div>
                <div><span className={muted}>Password:</span> {handover.password}</div>
              </div>

              {handover.mustChange && (
                <p className={`text-xs ${muted}`}>They will be asked to choose their own password the first time they sign in.</p>
              )}

              <div className={`flex gap-2 border-t ${border} pt-4`}>
                <button type="button" onClick={copyHandover}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border ${border} py-2.5 text-sm font-semibold ${txt} transition ${hoverBg}`}>
                  <Copy size={14} /> {copied ? "Copied" : "Copy"}
                </button>
                <button type="button" onClick={() => setHandover(null)}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">
                  Done
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

function PasswordField({
  dark, value, onChange, input, border, muted, hoverBg,
}: {
  dark:     boolean;
  value:    string;
  onChange: (v: string) => void;
  input:    string;
  border:   string;
  muted:    string;
  hoverBg:  string;
}) {
  return (
    <div>
      <label className={`mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Password</label>
      <div className="flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} required minLength={8}
          autoComplete="off" spellCheck={false}
          className={`w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none transition ${input}`} />
        <button type="button" onClick={() => onChange(generatePassword())} title="Generate a strong password"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border ${border} px-3 text-xs font-semibold transition ${hoverBg} ${dark ? "text-slate-300" : "text-[#5b564d]"}`}>
          <RefreshCw size={12} /> Generate
        </button>
      </div>
      <p className={`mt-1 text-[11px] ${muted}`}>At least 8 characters with a letter and a number.</p>
    </div>
  );
}
