"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, PackageMinus, Truck, Undo2, AlertTriangle, PackageX } from "lucide-react";

export type NotificationItem = {
  id:        string;
  type:      string;
  title:     string;
  body:      string | null;
  link:      string | null;
  createdAt: string;
  read:      boolean;
};

const POLL_MS = 30_000;

export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function NotificationIcon({ type, size = 15 }: { type: string; size?: number }) {
  if (type === "ITEM_ISSUED")        return <PackageMinus  size={size} className="text-amber-500" />;
  if (type === "DELIVERY_CONFIRMED") return <Truck         size={size} className="text-emerald-500" />;
  if (type === "ITEM_RETURNED")      return <Undo2         size={size} className="text-sky-500" />;
  if (type === "LOW_STOCK")          return <AlertTriangle size={size} className="text-orange-500" />;
  if (type === "OUT_OF_STOCK")       return <PackageX      size={size} className="text-red-500" />;
  return <Bell size={size} className="text-slate-400" />;
}

export async function markRead(body: { id: string } | { all: true }) {
  await fetch("/api/notifications/read", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  }).catch(() => {});
}

export default function NotificationBell({ isDark }: { isDark: boolean }) {
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const [unread, setUnread] = useState(0);
  const [items,  setItems]  = useState<NotificationItem[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=8", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread ?? 0);
      setItems(data.items ?? []);
    } catch {}
  }, []);

  // Poll while the tab is visible; refresh straight away when the user comes back to the tab.
  useEffect(() => {
    load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") load(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      await markRead({ id: n.id });
    }
    setOpen(false);
    router.push(n.link || "/notifications");
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await markRead({ all: true });
  };

  const panel  = isDark ? "border-white/10 bg-[#101720] text-slate-200" : "border-[#e7dfd4] bg-white text-[#1a1814]";
  const muted  = isDark ? "text-slate-500" : "text-[#8b857c]";
  const divide = isDark ? "divide-white/8" : "divide-[#efe8de]";

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        title="Notifications"
        className={`relative grid h-[54px] w-[54px] place-items-center rounded-2xl border shadow-sm transition ${
          isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-[#e7dfd4] bg-white text-[#4a4740] hover:bg-[#f5f2ed]"
        }`}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white shadow">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border shadow-2xl ${panel}`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? "border-white/8" : "border-[#efe8de]"}`}>
            <div className="text-sm font-bold">
              Notifications {unread > 0 && <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">{unread}</span>}
            </div>
            {unread > 0 && (
              <button type="button" onClick={markAll}
                className={`inline-flex items-center gap-1 text-xs font-semibold hover:underline ${isDark ? "text-sky-400" : "text-[#1d5fa8]"}`}>
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className={`max-h-[60vh] divide-y overflow-y-auto ${divide}`}>
            {items.length === 0 ? (
              <div className={`px-4 py-10 text-center text-sm ${muted}`}>No notifications yet.</div>
            ) : items.map((n) => (
              <button key={n.id} type="button" onClick={() => openItem(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                  n.read
                    ? isDark ? "hover:bg-white/5" : "hover:bg-[#faf7f2]"
                    : isDark ? "bg-sky-500/8 hover:bg-sky-500/12" : "bg-[#f1f6fd] hover:bg-[#e8f0fb]"
                }`}>
                <span className="mt-0.5 shrink-0"><NotificationIcon type={n.type} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm [overflow-wrap:anywhere] ${n.read ? "font-medium" : "font-bold"}`}>{n.title}</span>
                  {n.body && <span className={`mt-0.5 line-clamp-2 block text-xs [overflow-wrap:anywhere] ${muted}`}>{n.body}</span>}
                  <span className={`mt-1 block text-[11px] ${muted}`}>{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Unread" />}
              </button>
            ))}
          </div>

          <Link href="/notifications" onClick={() => setOpen(false)}
            className={`block border-t px-4 py-2.5 text-center text-xs font-bold hover:underline ${
              isDark ? "border-white/8 text-sky-400" : "border-[#efe8de] text-[#1d5fa8]"
            }`}>
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
