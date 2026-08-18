"use client";

import Link from "next/link";
import { useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { Download, ArrowLeft, Loader2 } from "lucide-react";

type Trip = {
  groupId: string;
  takenBy: string;
  takenAt: Date;
  status:  string;
  items:   { name: string; qty: number }[];
};

export default function WaybillsClient({
  site, trips,
}: {
  site:  { id: string; name: string };
  trips: Trip[];
}) {
  const { mode } = useThemeMode();
  const dark      = mode === "dark";
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (groupId: string, takenBy: string, date: string) => {
    setDownloadingId(groupId);
    try {
      const res  = await fetch(`/api/store/waybill?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `waybill-${date}-${takenBy.split(" ")[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download waybill.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">

        {/* Header */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-sm"
        }>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]" />

          <Link href={`/store/sites/${site.id}`}
            className={dark
              ? "mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
              : "mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
            }>
            <ArrowLeft size={16} /> Back to {site.name} Inventory
          </Link>

          <h1 className={dark
            ? "mt-3 text-3xl font-semibold text-slate-100"
            : "mt-3 text-3xl font-semibold text-[#1a1814]"
          }>
            Past Waybills
          </h1>
          <p className={dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-[#857f76]"}>
            All issue trips for {site.name}. Download any waybill at any time.
          </p>
        </section>

        {/* Trip list */}
        <div className="mt-5 space-y-3">
          {trips.length === 0 ? (
            <div className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 px-5 py-12 text-center text-sm text-slate-500"
              : "rounded-2xl border border-[#e0dbd2] bg-white px-5 py-12 text-center text-sm text-[#8b857c]"
            }>
              No waybills yet for {site.name}.
            </div>
          ) : trips.map((trip) => {
            const date = new Date(trip.takenAt).toLocaleDateString("en-GB");
            const time = new Date(trip.takenAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
            const isOpen = trip.status === "OPEN";

            return (
              <div key={trip.groupId} className={dark
                ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                : "overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm"
              }>
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOpen ? "bg-amber-400" : "bg-emerald-500"}`} />

                  {/* Trip info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={dark ? "text-sm font-bold text-slate-100" : "text-sm font-bold text-[#1a1814]"}>
                        {trip.takenBy}
                      </span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                        isOpen
                          ? dark ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
                          : dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}>
                        {isOpen ? "OPEN" : "RETURNED"}
                      </span>
                    </div>
                    <div className={dark ? "mt-0.5 text-xs text-slate-500" : "mt-0.5 text-xs text-[#8b857c]"}>
                      {date} at {time} · {trip.items.length} item type{trip.items.length !== 1 ? "s" : ""} ·{" "}
                      {trip.items.map((i) => `${i.name} (${i.qty})`).join(", ")}
                    </div>
                  </div>

                  {/* Download button */}
                  <button
                    onClick={() => handleDownload(trip.groupId, trip.takenBy, date.replace(/\//g, "-"))}
                    disabled={downloadingId === trip.groupId}
                    className={dark
                      ? "inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-40"
                      : "inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-xs font-semibold text-[#1a1814] hover:bg-[#f5f2ed] disabled:opacity-40"
                    }
                  >
                    {downloadingId === trip.groupId
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Download size={13} />
                    }
                    Waybill
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
