"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Clock, CheckCircle2, Package, Undo2 } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import DeliveriesTable from "@/components/DeliveriesTable";
import type { DeliveryRow } from "@/lib/deliveries";

export default function SiteStoreClient({
  site, pending, delivered, canConfirm, canReceive,
}: {
  site:       { id: string; name: string };
  pending:    DeliveryRow[];
  delivered:  DeliveryRow[];
  canConfirm: boolean;
  canReceive: boolean;
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const [tab, setTab] = useState<"pending" | "delivered">(pending.length || !delivered.length ? "pending" : "delivered");

  const card  = dark ? "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-3xl border border-[#e0dbd2] bg-white shadow-sm";
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";

  // Units actually used at this site (reported at delivery); pending = still on the way.
  const deliveredUnits = delivered.reduce((s, r) => s + (r.quantityUsed ?? r.stillOut), 0);
  const pendingUnits   = pending.reduce((s, r) => s + r.stillOut, 0);
  const awaitingUnits  = delivered.reduce((s, r) => s + r.awaitingReturn, 0);
  const returnedUnits  = [...pending, ...delivered].reduce((s, r) => s + r.quantityReturned, 0);

  const tabBtn = (value: "pending" | "delivered", label: string, count: number) => (
    <button type="button" onClick={() => setTab(value)}
      className={`px-4 py-2 text-xs font-bold transition ${
        tab === value
          ? dark ? "bg-white/10 text-slate-100" : "bg-[#1a1814] text-white"
          : dark ? "text-slate-400 hover:bg-white/5" : "text-[#5b564d] hover:bg-[#f5f2ed]"
      }`}>
      {label} ({count})
    </button>
  );

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className={`${card} p-6`}>
          <Link href={`/sites/${site.id}`} className={`mb-4 inline-flex items-center gap-2 text-sm font-medium ${muted} hover:underline`}>
            <ArrowLeft size={16} /> Back to {site.name}
          </Link>
          <div className={dark ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]" : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"}>
            Site store
          </div>
          <h1 className={`text-3xl font-semibold tracking-tight ${txt}`}>{site.name}</h1>
          <p className={`mt-2 text-sm ${muted}`}>
            Items issued from the warehouses to this site. They stay <b>Pending</b> until a master admin confirms the engineers delivered them.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Clock size={16} className="text-amber-500" />,        label: "Pending delivery", value: `${pending.length} item${pending.length === 1 ? "" : "s"}`,   sub: `${pendingUnits} units on the way` },
              { icon: <CheckCircle2 size={16} className="text-emerald-500" />, label: "Used at this site", value: `${deliveredUnits} units`, sub: `${delivered.length} delivered item${delivered.length === 1 ? "" : "s"}` },
              { icon: <Undo2 size={16} className="text-violet-500" />,       label: "Awaiting return",  value: `${awaitingUnits} units`, sub: "Not used — to come back to the store" },
              { icon: <Package size={16} className="text-sky-500" />,        label: "Returned to store", value: `${returnedUnits} units`, sub: `of ${[...pending, ...delivered].reduce((s, r) => s + r.quantity, 0)} units sent here` },
            ].map((s) => (
              <div key={s.label} className={`rounded-2xl border px-4 py-3 ${dark ? "border-white/10 bg-white/5" : "border-[#e9e2d8] bg-[#fffdfa]"}`}>
                <div className={`flex items-center gap-2 text-xs font-semibold ${muted}`}>{s.icon} {s.label}</div>
                <div className={`mt-1 text-xl font-bold ${txt}`}>{s.value}</div>
                <div className={`text-[11px] ${muted}`}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} mt-5 p-5`}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className={`flex overflow-hidden rounded-xl border ${dark ? "border-white/10" : "border-[#e0dbd2]"}`}>
              {tabBtn("pending", "Pending delivery", pending.length)}
              {tabBtn("delivered", "Delivered", delivered.length)}
            </div>
          </div>

          {tab === "pending" ? (
            <DeliveriesTable rows={pending} dark={dark} canConfirm={canConfirm} showSite={false}
              emptyText="Nothing pending for this site." />
          ) : (
            <DeliveriesTable rows={delivered} dark={dark} canConfirm={false} canReceive={canReceive} showSite={false}
              emptyText="Nothing delivered to this site yet." />
          )}
        </div>
      </div>
    </div>
  );
}
