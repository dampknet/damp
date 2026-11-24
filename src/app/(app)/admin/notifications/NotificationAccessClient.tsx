"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Bell, Crown, Loader2, Mail, RotateCcw, AlertTriangle, Pencil, X } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import { setNotificationAccess, setEmailAlerts, retryFailedEmails } from "./actions";

const KINDS = [
  { key: "ISSUED",    label: "Issued" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "RETURNED",  label: "Returned" },
  { key: "STOCK",     label: "Low / out of stock" },
] as const;

type UserRow = {
  id:                  string;
  email:               string;
  fullName:            string | null;
  role:                string;
  isMasterAdmin:       boolean;
  isSuspended:         boolean;
  canSeeNotifications: boolean;
  emailAlerts:         boolean;
  emailAlertKinds:     string[];
  alertEmail:          string | null;
};

type LogRow = {
  id: string; toEmail: string; subject: string; kind: string; status: string; attempts: number;
  lastError: string | null; createdAt: string; sentAt: string | null;
};

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function NotificationAccessClient({
  users, emailReady, log, failedCount, pendingCount,
}: {
  users: UserRow[]; emailReady: boolean; log: LogRow[]; failedCount: number; pendingCount: number;
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  const [rows,    setRows]    = useState(users);
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start]      = useTransition();

  // Email settings window
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [emOn,    setEmOn]    = useState(false);
  const [emKinds, setEmKinds] = useState<string[]>([]);
  const [emTo,    setEmTo]    = useState("");
  const [emError, setEmError] = useState<string | null>(null);

  const toggle = (u: UserRow, allowed: boolean) => {
    setBusyId(u.id);
    setMessage(null);
    start(async () => {
      const res = await setNotificationAccess(u.id, allowed);
      if (res.ok) setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, canSeeNotifications: allowed } : r)));
      setMessage({ ok: res.ok, text: res.message });
      setBusyId(null);
    });
  };

  const openEmail = (u: UserRow, turnOn?: boolean) => {
    setEmOn(turnOn ?? u.emailAlerts);
    // Turning on for the first time: start with every kind ticked.
    setEmKinds(u.emailAlertKinds.length ? u.emailAlertKinds : KINDS.map((k) => k.key));
    setEmTo(u.alertEmail ?? "");
    setEmError(null);
    setEditing(u);
  };

  const saveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const u = editing;
    setEmError(null);
    if (emOn && !emKinds.length) { setEmError("Pick at least one kind of alert, or turn email off."); return; }
    start(async () => {
      const res = await setEmailAlerts(u.id, { enabled: emOn, kinds: emKinds, alertEmail: emTo });
      if (!res.ok) { setEmError(res.message); return; }
      setRows((prev) => prev.map((r) => (r.id === u.id
        ? { ...r, emailAlerts: emOn, emailAlertKinds: emKinds, alertEmail: emTo.trim().toLowerCase() || null }
        : r)));
      setEditing(null);
      setMessage({ ok: true, text: res.message });
    });
  };

  const turnOff = (u: UserRow) => {
    setBusyId(u.id);
    setMessage(null);
    start(async () => {
      const res = await setEmailAlerts(u.id, { enabled: false, kinds: u.emailAlertKinds, alertEmail: u.alertEmail ?? "" });
      if (res.ok) setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, emailAlerts: false } : r)));
      setMessage({ ok: res.ok, text: res.message });
      setBusyId(null);
    });
  };

  const retry = () => {
    setMessage(null);
    start(async () => {
      const res = await retryFailedEmails();
      setMessage({ ok: res.ok, text: res.message });
    });
  };


  const card   = dark ? "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-2xl border border-[#e6ddd1] bg-white shadow-sm";
  const txt    = dark ? "text-slate-100" : "text-[#1a1814]";
  const muted  = dark ? "text-slate-500" : "text-[#8b857c]";
  const border = dark ? "border-white/10" : "border-[#e6ddd1]";
  const input  = dark
    ? "border-white/10 bg-white/5 text-slate-100 placeholder:text-slate-500 focus:border-sky-500/50"
    : "border-[#ddd5c9] bg-white text-[#1a1814] focus:border-[#1a1814]";

  const Switch = ({ on, label, onClick, disabled }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${on ? "bg-emerald-500" : "bg-slate-400/50"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );

  const kindSummary = (u: UserRow) =>
    u.emailAlertKinds.length === KINDS.length ? "All alerts"
      : KINDS.filter((k) => u.emailAlertKinds.includes(k.key)).map((k) => k.label).join(", ");

  const statusPill = (s: string) => {
    const map: Record<string, string> = dark
      ? { SENT: "border-emerald-500/30 text-emerald-300", FAILED: "border-rose-500/30 text-rose-300", PENDING: "border-amber-500/30 text-amber-300", SENDING: "border-sky-500/30 text-sky-300" }
      : { SENT: "border-emerald-200 text-emerald-700", FAILED: "border-rose-200 text-rose-700", PENDING: "border-amber-200 text-amber-700", SENDING: "border-sky-200 text-sky-700" };
    const label: Record<string, string> = { SENT: "Sent", FAILED: "Failed", PENDING: "Waiting", SENDING: "Sending" };
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${map[s] ?? map.PENDING}`}>{label[s] ?? s}</span>;
  };

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <section className={`${card} relative overflow-hidden p-6`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#dc2626,#f59e0b)]" />
          <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Notification Access" }]} />
          <h1 className={`flex items-center gap-2 text-2xl font-semibold tracking-tight ${txt}`}>
            <Bell size={22} /> Notifications &amp; Email Alerts
          </h1>
          <p className={`mt-1 text-sm ${muted}`}>Choose who sees alerts in KIMS and who also gets them by email.</p>
          {!emailReady && (
            <div className={`mt-4 flex gap-2 rounded-xl border px-3 py-2.5 text-xs ${dark ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>
                Email isn&apos;t set up yet, so alert emails will wait in the queue. Enter the settings in{" "}
                <Link href="/admin/sign-in-settings" className="font-semibold underline">Sign-in &amp; Email Settings</Link> and send a test email.
              </span>
            </div>
          )}
        </section>

        {message && (
          <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? dark ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
              : dark ? "border-red-500/20 bg-red-500/10 text-red-300"             : "border-red-200 bg-red-50 text-red-700"
          }`}>{message.text}</div>
        )}

        <section className={`${card} mt-5 overflow-hidden`}>
          <div className={`hidden grid-cols-[1fr_7rem_16rem] gap-4 border-b px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] md:grid ${border} ${muted}`}>
            <span>User</span><span>Bell</span><span>Email alerts</span>
          </div>
          <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {rows.map((u) => {
              const on = u.isMasterAdmin || u.canSeeNotifications;
              return (
                <div key={u.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_7rem_16rem] md:items-center md:gap-4">
                  <div className="min-w-0">
                    <div className={`flex flex-wrap items-center gap-2 text-sm font-semibold ${txt}`}>
                      <span className="[overflow-wrap:anywhere]">{u.fullName || u.email}</span>
                      {u.isMasterAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                          <Crown size={10} /> Master admin
                        </span>
                      )}
                      {u.isSuspended && (
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${dark ? "border-rose-500/30 text-rose-300" : "border-rose-200 text-rose-700"}`}>Suspended</span>
                      )}
                    </div>
                    <div className={`mt-0.5 text-xs [overflow-wrap:anywhere] ${muted}`}>{u.email} · {u.role}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold md:hidden ${muted}`}>Bell</span>
                    {u.isMasterAdmin
                      ? <span className={`text-xs font-semibold ${muted}`}>Always</span>
                      : <Switch on={on} label={`Bell notifications for ${u.email}`} disabled={busyId !== null} onClick={() => toggle(u, !on)} />}
                    {busyId === u.id && <Loader2 size={14} className="animate-spin text-sky-500" />}
                  </div>

                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`pt-1 text-[11px] font-semibold md:hidden ${muted}`}>Email</span>
                    <Switch on={u.emailAlerts} label={`Email alerts for ${u.email}`} disabled={pending}
                      onClick={() => (u.emailAlerts ? turnOff(u) : openEmail(u, true))} />
                    <div className="min-w-0 flex-1">
                      {u.emailAlerts ? (
                        <>
                          <div className={`text-xs font-semibold ${txt}`}>{kindSummary(u)}</div>
                          <div className={`text-[11px] [overflow-wrap:anywhere] ${muted}`}>
                            to {u.alertEmail || u.email}{u.alertEmail ? " (alert email)" : ""}
                          </div>
                        </>
                      ) : (
                        <div className={`pt-1 text-xs ${muted}`}>Off</div>
                      )}
                    </div>
                    <button type="button" onClick={() => openEmail(u)} aria-label={`Email alert settings for ${u.email}`} title="Email alert settings"
                      className={`rounded-lg border p-1.5 transition ${border} ${dark ? "text-slate-400 hover:bg-white/10" : "text-[#8b857c] hover:bg-[#f5f2ed]"}`}>
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Email log */}
        <section className={`${card} mt-5 overflow-hidden`}>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 ${border}`}>
            <div>
              <div className={`flex items-center gap-2 text-sm font-semibold ${txt}`}><Mail size={15} /> Email log</div>
              <div className={`text-xs ${muted}`}>
                Latest alert emails. {pendingCount ? `${pendingCount} waiting to send. ` : ""}Failed emails are retried automatically up to 5 times.
              </div>
            </div>
            {failedCount > 0 && (
              <button type="button" onClick={retry} disabled={pending}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${dark ? "border-rose-500/30 text-rose-300 hover:bg-rose-500/10" : "border-rose-200 text-rose-700 hover:bg-rose-50"}`}>
                {pending ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Retry {failedCount} failed
              </button>
            )}
          </div>
          {log.length === 0 ? (
            <div className={`px-5 py-8 text-center text-sm ${muted}`}>No alert emails yet.</div>
          ) : (
            <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
              {log.map((m) => (
                <div key={m.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm [overflow-wrap:anywhere] ${txt}`}>{m.subject.replace(/^KIMS · /, "")}</div>
                    <div className={`text-[11px] [overflow-wrap:anywhere] ${muted}`}>
                      to {m.toEmail} · {when(m.sentAt ?? m.createdAt)}{m.attempts > 1 ? ` · ${m.attempts} tries` : ""}
                    </div>
                    {m.status !== "SENT" && m.lastError && (
                      <div className={`mt-0.5 text-[11px] [overflow-wrap:anywhere] ${dark ? "text-rose-300" : "text-rose-700"}`}>{m.lastError}</div>
                    )}
                  </div>
                  {statusPill(m.status)}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${border} ${dark ? "bg-[#0f1923]" : "bg-white"}`}>
            <div className="h-1 bg-[linear-gradient(90deg,#dc2626,#f59e0b)]" />
            <form onSubmit={saveEmail} className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={`text-base font-semibold ${txt}`}>Email alerts</h2>
                  <p className={`mt-0.5 text-xs [overflow-wrap:anywhere] ${muted}`}>{editing.fullName || editing.email}</p>
                </div>
                <button type="button" onClick={() => setEditing(null)} aria-label="Close" className={muted}><X size={18} /></button>
              </div>

              <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${border}`}>
                <span className={`text-sm font-semibold ${txt}`}>Send alert emails</span>
                <input type="checkbox" checked={emOn} onChange={(e) => setEmOn(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              </label>

              <fieldset disabled={!emOn} className="space-y-4 disabled:opacity-50">
                <div>
                  <div className={`mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] ${muted}`}>
                    <span>Which alerts</span>
                    <button type="button" onClick={() => setEmKinds(emKinds.length === KINDS.length ? [] : KINDS.map((k) => k.key))} className="normal-case tracking-normal underline">
                      {emKinds.length === KINDS.length ? "Clear" : "All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {KINDS.map((k) => (
                      <label key={k.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${border} ${txt}`}>
                        <input type="checkbox" checked={emKinds.includes(k.key)} className="h-4 w-4 accent-emerald-600"
                          onChange={(e) => setEmKinds((cur) => (e.target.checked ? [...cur, k.key] : cur.filter((x) => x !== k.key)))} />
                        {k.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="alert-email" className={`mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] ${muted}`}>Alert email (optional)</label>
                  <input id="alert-email" type="email" value={emTo} onChange={(e) => setEmTo(e.target.value)} placeholder={editing.email}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition ${input}`} />
                  <p className={`mt-1 text-[11px] ${muted}`}>
                    Leave empty to send to their sign-in email ({editing.email}). Fill in to send alerts somewhere else, e.g. their company mailbox.
                  </p>
                </div>
              </fieldset>

              {emError && (
                <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300" : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"}>{emError}</div>
              )}

              <div className={`flex gap-2 border-t pt-4 ${border}`}>
                <button type="button" onClick={() => setEditing(null)} className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${border} ${txt}`}>Cancel</button>
                <button type="submit" disabled={pending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {pending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
