"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { Download, ArrowLeft, Printer } from "lucide-react";

type ReceiptRow = {
  description: string;
  itemCode:    string;
  quantity:    number;
  condition:   string;
  returnable:  boolean;
};

export default function ReceiptClient({
  site, groupId, requesterName, requesterContact,
  authorizedBy, purpose, date, rows,
}: {
  site:             { id: string; name: string };
  groupId:          string;
  requesterName:    string;
  requesterContact: string;
  authorizedBy:     string;
  purpose:          string;
  date:             string;
  rows:             ReceiptRow[];
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/store/waybill?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to generate waybill");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `waybill-${date.replace(/\//g, "-")}-${requesterName.split(" ")[0]}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Could not download waybill. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => window.print();

  const conditionBadge = (c: string) => {
    if (c === "NEW")    return dark ? "bg-blue-500/10 text-blue-300"    : "bg-blue-50 text-blue-700";
    if (c === "UNUSED") return dark ? "bg-sky-500/10 text-sky-300"      : "bg-sky-50 text-sky-700";
    if (c === "USED")   return dark ? "bg-amber-500/10 text-amber-300"  : "bg-amber-50 text-amber-700";
    if (c === "FAULTY") return dark ? "bg-red-500/10 text-red-300"      : "bg-red-50 text-red-700";
    return dark ? "bg-slate-500/10 text-slate-400" : "bg-slate-50 text-slate-600";
  };

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">

        {/* ── ACTION BAR ── */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => router.push(`/store/sites/${site.id}`)}
            className={dark
              ? "inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200"
              : "inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:text-[#1a1814]"
            }
          >
            <ArrowLeft size={16} /> Back to {site.name} Inventory
          </button>

          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className={dark
                ? "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                : "inline-flex items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:bg-[#f5f2ed]"
              }
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className={dark
                ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2a7d52,#10b981)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                : "inline-flex items-center gap-2 rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
              }
            >
              <Download size={16} />
              {downloading ? "Generating…" : "Download Waybill (.docx)"}
            </button>
          </div>
        </div>

        {/* ── RECEIPT PREVIEW ── */}
        <div className={`print-area overflow-hidden rounded-[28px] border shadow-lg ${
          dark ? "border-white/10 bg-white/5" : "border-[#e0dbd2] bg-white"
        }`}>
          {/* Top accent */}
          <div className="h-1.5 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]" />

          <div className="p-8">
            {/* Header */}
            <div className="mb-6 flex flex-col items-center gap-1 text-center">
              <div className={dark ? "text-2xl font-bold tracking-tight text-slate-100" : "text-2xl font-bold tracking-tight text-[#1a1814]"}>
                KNET WAYBILL
              </div>
              <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                Issue Receipt — {site.name}
              </div>
            </div>

            {/* Info grid */}
            <div className={`mb-6 grid grid-cols-2 gap-4 rounded-2xl border p-4 ${
              dark ? "border-white/10 bg-white/5" : "border-[#e7dfd4] bg-[#fffdf9]"
            }`}>
              <InfoRow dark={dark} label="NAME"            value={requesterName} />
              <InfoRow dark={dark} label="DATE"            value={date} />
              <InfoRow dark={dark} label="CONTACT"         value={requesterContact || "—"} />
              <InfoRow dark={dark} label="AUTHORIZED BY"   value={authorizedBy || "—"} />
              <div className="col-span-2">
                <InfoRow dark={dark} label="PURPOSE" value={purpose} />
              </div>
              <div className="col-span-2">
                <InfoRow dark={dark} label="DRIVER'S NAME" value="________________________________" />
              </div>
            </div>

            {/* Items table */}
            <div className={`overflow-hidden rounded-2xl border ${
              dark ? "border-white/10" : "border-[#e0dbd2]"
            }`}>
              <table className="w-full text-sm">
                <thead className={dark ? "bg-[#101720] text-slate-400" : "bg-[#f8f4ee] text-[#5b564d]"}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Description</th>
                    <th className="px-4 py-3 text-left font-semibold">Item Code</th>
                    <th className="px-4 py-3 text-center font-semibold">Qty</th>
                    <th className="px-4 py-3 text-center font-semibold">Condition</th>
                    <th className="px-4 py-3 text-center font-semibold">Returnable</th>
                    <th className="px-4 py-3 text-left font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                  {rows.map((row, i) => (
                    <tr key={i} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                      <td className={dark ? "px-4 py-3 text-slate-500" : "px-4 py-3 text-[#6b655d]"}>{i + 1}</td>
                      <td className={dark ? "px-4 py-3 font-medium text-slate-100" : "px-4 py-3 font-medium text-[#1a1814]"}>
                        {row.description}
                      </td>
                      <td className={dark ? "px-4 py-3 font-mono text-xs text-slate-400" : "px-4 py-3 font-mono text-xs text-[#5d584f]"}>
                        {row.itemCode || "—"}
                      </td>
                      <td className={dark ? "px-4 py-3 text-center font-bold text-slate-200" : "px-4 py-3 text-center font-bold text-[#1a1814]"}>
                        {row.quantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.condition ? (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${conditionBadge(row.condition)}`}>
                            {row.condition}
                          </span>
                        ) : <span className={dark ? "text-slate-600" : "text-[#b0a79b]"}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-semibold ${row.returnable
                          ? dark ? "text-emerald-400" : "text-emerald-700"
                          : dark ? "text-slate-600"   : "text-[#b0a79b]"
                        }`}>
                          {row.returnable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className={dark ? "px-4 py-3 text-slate-600" : "px-4 py-3 text-[#b0a79b]"}>
                        ___________
                      </td>
                    </tr>
                  ))}
                  {/* blank rows to fill page */}
                  {Array.from({ length: Math.max(0, 10 - rows.length) }).map((_, i) => (
                    <tr key={`blank-${i}`}>
                      <td className="px-4 py-3">&nbsp;</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className={`mt-6 grid grid-cols-3 gap-6 rounded-2xl border p-4 text-sm ${
              dark ? "border-white/10 bg-white/5" : "border-[#e7dfd4] bg-[#fffdf9]"
            }`}>
              <FooterField dark={dark} label="RECEIVED BY" />
              <FooterField dark={dark} label="DATE" />
              <FooterField dark={dark} label="SIGNATURE" />
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="no-print mt-6 flex justify-center">
          <button
            onClick={() => router.push(`/store/sites/${site.id}/issues`)}
            className={dark
              ? "text-sm font-medium text-slate-400 hover:underline"
              : "text-sm font-medium text-[#6f6a62] hover:underline"
            }
          >
            View Issue Log →
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <div>
      <div className={dark ? "text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500" : "text-[10px] font-bold uppercase tracking-[0.1em] text-[#9c9890]"}>
        {label}
      </div>
      <div className={dark ? "mt-0.5 text-sm font-semibold text-slate-100" : "mt-0.5 text-sm font-semibold text-[#1a1814]"}>
        {value}
      </div>
    </div>
  );
}

function FooterField({ dark, label }: { dark: boolean; label: string }) {
  return (
    <div>
      <div className={dark ? "text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500" : "text-[10px] font-bold uppercase tracking-[0.1em] text-[#9c9890]"}>
        {label}
      </div>
      <div className={dark ? "mt-3 border-b border-white/20 pb-1" : "mt-3 border-b border-[#c8c0b6] pb-1"} />
    </div>
  );
}
