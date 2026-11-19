"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Bell, ArrowLeft } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import { NotificationIcon, markRead, timeAgo } from "@/components/NotificationBell";

type Item = {
  id:         string;
  type:       string;
  title:      string;
  body:       string | null;
  link:       string | null;
  actorEmail: string | null;
  createdAt:  string;
  read:       boolean;
  readAt:     string | null;
};

const TYPE_LABEL: Record<string, string> = {
  ITEM_ISSUED:        "Issued",
  DELIVERY_CONFIRMED: "Delivered",
  ITEM_RETURNED:      "Returned",
  LOW_STOCK:          "Low stock",
  OUT_OF_STOCK:       "Out of stock",
};

export default function NotificationsClient({
  filter, page, pageCount, total, unread, items,
}: {
  filter:    "all" | "unread";
  page:      number;
  pageCount: number;
  total:     number;
  unread:    number;
  items:     Item[];
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();
  const [busy, setBusy] = useState(false);

  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const card  = dark ? "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-3xl border border-[#e0dbd2] bg-white shadow-sm";

  const open = async (n: Item) => {
    if (!n.read) await markRead({ id: n.id });
    if (n.link) router.push(n.link);
    else router.refresh();
  };

  const markAll = async () => {
    setBusy(true);
    await markRead({ all: true });
    router.refresh();
    setBusy(false);
  };

  const tab = (value: "all" | "unread", label: string) => (
    <Link href={value === "all" ? "/notifications" : "/notifications?filter=unread"}
      className={`px-3 py-2 text-xs font-bold transition ${
        filter === value
          ? dark ? "bg-white/10 text-slate-100" : "bg-[#1a1814] text-white"
          : dark ? "text-slate-400 hover:bg-white/5" : "text-[#5b564d] hover:bg-[#f5f2ed]"
      }`}>
      {label}
    </Link>
  );

  const pageHref = (p: number) => `/notifications?${filter === "unread" ? "filter=unread&" : ""}page=${p}`;

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className={`${card} p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className={dark ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]" : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"}>
                Alerts & history
              </div>
              <h1 className={dark ? "text-3xl font-semibold tracking-tight text-slate-100" : "text-3xl font-semibold tracking-tight text-[#1a1814]"}>
                Notifications
              </h1>
              <p className={`mt-2 text-sm font-medium ${muted}`}>
                {unread > 0 ? `${unread} unread. ` : "All caught up. "}Opened notifications stay here as history.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className={`flex overflow-hidden rounded-xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
                {tab("all", "All")}
                {tab("unread", `Unread${unread ? ` (${unread})` : ""}`)}
              </div>
              {unread > 0 && (
                <button type="button" onClick={markAll} disabled={busy}
                  className={dark
                    ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                    : "inline-flex items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2] disabled:opacity-50"
                  }>
                  <CheckCheck size={15} /> Mark all read
                </button>
              )}
              <Link href="/dashboard" className={dark
                ? "inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/25"
                : "inline-flex items-center gap-1.5 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
              }>
                <ArrowLeft size={15} /> Dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className={`${card} mt-5 overflow-hidden`}>
          {items.length === 0 ? (
            <div className={`flex flex-col items-center gap-2 px-6 py-16 text-center text-sm ${muted}`}>
              <Bell size={28} className="opacity-40" />
              {filter === "unread" ? "No unread notifications." : "No notifications yet. They appear here when items are issued, returned, delivered or run low."}
            </div>
          ) : (
            <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
              {items.map((n) => (
                <button key={n.id} type="button" onClick={() => open(n)}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-left transition ${
                    n.read
                      ? dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"
                      : dark ? "bg-sky-500/8 hover:bg-sky-500/12" : "bg-[#f1f6fd] hover:bg-[#e8f0fb]"
                  }`}>
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${dark ? "bg-white/5" : "bg-[#f5f2ed]"}`}>
                    <NotificationIcon type={n.type} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm [overflow-wrap:anywhere] ${n.read ? "font-medium" : "font-bold"} ${dark ? "text-slate-100" : "text-[#1a1814]"}`}>
                        {n.title}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${dark ? "border-white/10 text-slate-400" : "border-[#e0dbd2] text-[#6b655d]"}`}>
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                    </span>
                    {n.body && <span className={`mt-1 block text-sm [overflow-wrap:anywhere] ${muted}`}>{n.body}</span>}
                    <span className={`mt-1.5 block text-[11px] ${muted}`} suppressHydrationWarning>
                      {timeAgo(n.createdAt)}
                      {n.actorEmail ? ` · by ${n.actorEmail}` : ""}
                      {n.read ? " · read" : ""}
                    </span>
                  </span>
                  {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red-600" aria-label="Unread" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {pageCount > 1 && (
          <div className={`mt-4 flex items-center justify-between text-sm ${muted}`}>
            <span>Page {page} of {pageCount} · {total} notifications</span>
            <span className="flex gap-2">
              {page > 1 && <Link href={pageHref(page - 1)} className="font-semibold hover:underline">← Newer</Link>}
              {page < pageCount && <Link href={pageHref(page + 1)} className="font-semibold hover:underline">Older →</Link>}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
