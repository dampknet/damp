"use client";

import Link from "next/link";
import { ArrowLeft, Undo2 } from "lucide-react";
import { useThemeMode } from "@/context/ThemeContext";
import DeliveriesTable from "@/components/DeliveriesTable";
import type { DeliveryRow } from "@/lib/deliveries";

export default function AwaitingReturnsClient({ rows, canReceive }: { rows: DeliveryRow[]; canReceive: boolean }) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";

  const card  = dark ? "rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl" : "rounded-3xl border border-[#e0dbd2] bg-white shadow-sm";
  const muted = dark ? "text-slate-500" : "text-[#8b857c]";
  const txt   = dark ? "text-slate-100" : "text-[#1a1814]";
  const units = rows.reduce((s, r) => s + r.awaitingReturn, 0);

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className={`${card} p-6`}>
          <Link href="/store" className={`mb-4 inline-flex items-center gap-2 text-sm font-medium ${muted} hover:underline`}>
            <ArrowLeft size={16} /> Back to Store
          </Link>
          <h1 className={`flex items-center gap-2 text-3xl font-semibold tracking-tight ${txt}`}>
            <Undo2 size={26} /> Awaiting Return
          </h1>
          <p className={`mt-2 text-sm ${muted}`}>
            {rows.length
              ? `${units} unused unit${units === 1 ? "" : "s"} (${rows.length} item${rows.length === 1 ? "" : "s"}) reported not used at the destination and not yet back in the store.`
              : "Nothing is waiting — every unused item has come back."}
            {canReceive ? " When they arrive, click Receive to put them back into stock." : " Store staff (admins/editors) receive them back into stock."}
          </p>
        </div>

        <div className={`${card} mt-5 p-5`}>
          <DeliveriesTable rows={rows} dark={dark} canConfirm={false} canReceive={canReceive} showSite
            emptyText="No unused items are waiting to come back." />
        </div>
      </div>
    </div>
  );
}
