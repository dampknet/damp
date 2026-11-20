"use client";

import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import DeliveriesTable from "@/components/DeliveriesTable";
import type { DeliveryRow } from "@/lib/deliveries";

type Summary = { key: string; name: string; items: number; units: number };

export default function PendingDeliveriesClient({
  rows, siteSummary, placeSummary, selectedSite, selectedPlace, canConfirm,
}: {
  rows:          DeliveryRow[];
  siteSummary:   Summary[];
  placeSummary:  Summary[];
  selectedSite:  string;
  selectedPlace: string;
  canConfirm:    boolean;
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  const card  = dark ? "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-3xl border border-[#e0dbd2] bg-white shadow-sm";
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";

  const totalItems = [...siteSummary, ...placeSummary].reduce((s, x) => s + x.items, 0);
  const destCount  = siteSummary.length + placeSummary.length;
  const oldest     = rows.reduce((m, r) => Math.max(m, r.daysWaiting), 0);
  const filtered   = !!(selectedSite || selectedPlace);
  const selSite    = siteSummary.find((s) => s.key === selectedSite);
  const selPlace   = placeSummary.find((p) => p.name.toLowerCase() === selectedPlace.toLowerCase());
  const selected   = selSite ?? selPlace;

  const chip = (href: string, label: string, active: boolean) => (
    <Link key={href} href={href}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? dark ? "border-sky-500/40 bg-sky-500/15 text-sky-300" : "border-[#1a1814] bg-[#1a1814] text-white"
          : dark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-[#e0dbd2] bg-white text-[#4a4740] hover:bg-[#f5f2ed]"
      }`}>
      {label}
    </Link>
  );

  const groupLabel = `text-[11px] font-bold uppercase tracking-[0.14em] ${muted}`;

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className={`${card} p-6`}>
          <Breadcrumbs items={[{ label: "Store", href: "/store" }, { label: "Pending Deliveries" }]} />
          <h1 className={`flex items-center gap-2 text-3xl font-semibold tracking-tight ${txt}`}>
            <Truck size={26} /> Pending Deliveries
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            {totalItems
              ? `${totalItems} item${totalItems === 1 ? "" : "s"} waiting at ${destCount} destination${destCount === 1 ? "" : "s"}.${!filtered ? ` Oldest has waited ${oldest} day${oldest === 1 ? "" : "s"}.` : ""}`
              : "Nothing is waiting — every item sent out has been confirmed."}
            {canConfirm ? " Tick items and click Confirm delivered when the engineers report back." : " Only master admins can confirm deliveries."}
          </p>

          {destCount > 0 && (
            <div className="mt-5 space-y-3">
              <div className="flex flex-wrap gap-2">{chip("/store/deliveries", `Everything (${totalItems})`, !filtered)}</div>
              {siteSummary.length > 0 && (
                <div>
                  <div className={`mb-1.5 ${groupLabel}`}>Sites</div>
                  <div className="flex flex-wrap gap-2">
                    {siteSummary.map((s) => chip(`/store/deliveries?site=${s.key}`, `${s.name} (${s.items})`, s.key === selectedSite))}
                  </div>
                </div>
              )}
              {placeSummary.length > 0 && (
                <div>
                  <div className={`mb-1.5 ${groupLabel}`}>Other places</div>
                  <div className="flex flex-wrap gap-2">
                    {placeSummary.map((p) => chip(`/store/deliveries?place=${encodeURIComponent(p.name)}`, `${p.name} (${p.items})`, p.name.toLowerCase() === selectedPlace.toLowerCase()))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${card} mt-5 p-5`}>
          {selected && (
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className={`text-sm font-semibold ${txt}`}>{selected.name}: {selected.items} item{selected.items === 1 ? "" : "s"} · {selected.units} units</div>
              {selSite && (
                <Link href={`/sites/${selSite.key}/store`} className={`text-xs font-semibold hover:underline ${dark ? "text-sky-400" : "text-[#1d5fa8]"}`}>
                  Open site store →
                </Link>
              )}
            </div>
          )}
          <DeliveriesTable rows={rows} dark={dark} canConfirm={canConfirm} showSite={!filtered}
            emptyText={filtered ? "Nothing pending here." : "No pending deliveries."} />
        </div>
      </div>
    </div>
  );
}
