"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { ChevronDown, ChevronUp, Download } from "lucide-react";

const ITEM_TYPE_LABEL: Record<string, string> = {
  EQUIPMENT:              "Equipment",
  ACCESSORIES:            "Accessories",
  TOOLS_AND_PARTS:        "Tools & Parts",
  GENERAL:                "General",
  COOLING_INFRASTRUCTURE: "Cooling",
  CABLES_AND_ELECTRONICS: "Cables & Electronics",
};

type IssueItem = {
  id:               string;
  quantityTaken:    number;
  expectedReturnAt: Date | null;
  returnedAt:       Date | null;
  status:           "OPEN" | "RETURNED";
  inventoryItem: {
    id:       string;
    name:     string;
    itemType: string;
    itemCode: string | null;
    unit:     string | null;
  };
  lines: {
    id:            string;
    assetInstance: { id: string; entityCode: string; condition: string };
  }[];
};

type Trip = {
  groupId:        string;
  takenBy:        string;
  takenByContact: string | null;
  authorizedBy:   string | null;
  purpose:        string;
  takenAt:        Date;
  status:         string;
  items:          IssueItem[];
};

function conditionBadge(c: string, dark: boolean) {
  const base = "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold";
  if (c === "NEW")    return `${base} ${dark ? "bg-blue-500/20 text-blue-300"   : "bg-blue-50 text-blue-700"}`;
  if (c === "UNUSED") return `${base} ${dark ? "bg-sky-500/20 text-sky-300"     : "bg-sky-50 text-sky-700"}`;
  if (c === "USED")   return `${base} ${dark ? "bg-amber-500/20 text-amber-300" : "bg-amber-50 text-amber-700"}`;
  if (c === "FAULTY") return `${base} ${dark ? "bg-red-500/20 text-red-300"     : "bg-red-50 text-red-700"}`;
  return `${base} ${dark ? "bg-slate-500/20 text-slate-400" : "bg-slate-50 text-slate-600"}`;
}

function TripCard({
  dark, trip, siteId, canEdit,
}: {
  dark:    boolean;
  trip:    Trip;
  siteId:  string;
  canEdit: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isOpen       = trip.status === "OPEN";
  const itemCount    = trip.items.length;
  const totalUnits   = trip.items.reduce((sum, i) => sum + i.quantityTaken, 0);
  const allReturned  = trip.items.every((i) => i.status === "RETURNED");
  const someReturned = trip.items.some((i) => i.status === "RETURNED");

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res  = await fetch(`/api/store/waybill?groupId=${trip.groupId}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `waybill-${trip.takenBy.replace(/\s+/g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download waybill.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={dark
      ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
      : "overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm"
    }>
      {/* Trip header */}
      <div
        className={`flex cursor-pointer items-center gap-4 px-5 py-4 ${dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}`}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status dot */}
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          allReturned ? "bg-emerald-500" : someReturned ? "bg-amber-500" : "bg-red-400"
        }`} />

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={dark ? "text-sm font-bold text-slate-100" : "text-sm font-bold text-[#1a1814]"}>
              {trip.takenBy}
            </span>
            {trip.takenByContact && (
              <span className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                {trip.takenByContact}
              </span>
            )}
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              allReturned
                ? dark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-200 bg-emerald-50 text-emerald-700"
                : dark ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-amber-200 bg-amber-50 text-amber-700"
            }`}>
              {allReturned ? "RETURNED" : someReturned ? "PARTIAL" : "OPEN"}
            </span>
          </div>
          <div className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
            {itemCount} item type{itemCount !== 1 ? "s" : ""} · {totalUnits} unit{totalUnits !== 1 ? "s" : ""} · {new Date(trip.takenAt).toLocaleString()} · {trip.purpose}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            title="Download Waybill"
            className={dark
              ? "rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-slate-200"
              : "rounded-lg border border-[#e0dbd2] bg-white p-2 text-[#8b857c] hover:text-[#1a1814]"
            }
          >
            <Download size={14} />
          </button>
        </div>

        <span className={dark ? "text-slate-500" : "text-[#9c9890]"}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className={dark ? "border-t border-white/8" : "border-t border-[#eee7dd]"}>
          {trip.items.map((item, idx) => {
            const isItemReturned = item.status === "RETURNED";
            const isReturnable   = !!item.expectedReturnAt;

            return (
              <div key={item.id}
                className={`flex items-start gap-4 px-5 py-3 ${
                  idx < trip.items.length - 1
                    ? dark ? "border-b border-white/5" : "border-b border-[#f0e9df]"
                    : ""
                }`}
              >
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isItemReturned ? "bg-emerald-500" : "bg-amber-400"}`} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                      {item.inventoryItem.name}
                    </span>
                    <span className={dark ? "text-[10px] text-slate-500" : "text-[10px] text-[#8b857c]"}>
                      {ITEM_TYPE_LABEL[item.inventoryItem.itemType] ?? item.inventoryItem.itemType}
                    </span>
                    {item.inventoryItem.itemCode && (
                      <span className={`font-mono text-[10px] ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                        {item.inventoryItem.itemCode}
                      </span>
                    )}
                  </div>

                  {/* Entity codes with conditions */}
                  {item.lines.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {item.lines.map((line) => (
                        <span key={line.id} className={conditionBadge(line.assetInstance.condition, dark)}>
                          {line.assetInstance.entityCode}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                    Qty: {item.quantityTaken}{item.inventoryItem.unit ? ` ${item.inventoryItem.unit}` : ""}
                    {isReturnable
                      ? ` · Returnable`
                      : ` · Non-returnable`}
                    {item.returnedAt && ` · Returned ${new Date(item.returnedAt).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Return button per item */}
                {canEdit && !isItemReturned && isReturnable && (
                  <Link
                    href={`/store/sites/${siteId}/issues/${item.id}/return`}
                    className={dark
                      ? "shrink-0 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                      : "shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    }
                  >
                    Return
                  </Link>
                )}
                {!isItemReturned && !isReturnable && (
                  <span className={dark ? "shrink-0 text-xs text-slate-600" : "shrink-0 text-xs text-[#b0a79b]"}>
                    Non-returnable
                  </span>
                )}
                {isItemReturned && (
                  <span className={dark ? "shrink-0 text-xs font-semibold text-emerald-400" : "shrink-0 text-xs font-semibold text-emerald-700"}>
                    ✓ Returned
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function IssueLogClient({
  role, canEdit, site, q, status, summary, trips,
}: {
  role:     string;
  canEdit:  boolean;
  site:     { id: string; name: string; location: string | null; description: string | null };
  q:        string;
  status:   string;
  summary:  { openCount: number; returnedCount: number };
  trips:    Trip[];
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const success      = searchParams.get("success");

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">

        {/* Header */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-sm"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
          } />

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href={`/store/sites/${site.id}`}
                className={dark ? "mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline" : "mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"}>
                ← Back to {site.name} Inventory
              </Link>
              <h1 className={dark ? "mt-3 text-3xl font-semibold text-slate-100 md:text-4xl" : "mt-3 text-3xl font-semibold text-[#1a1814] md:text-4xl"}>
                {site.name} Issue Log
              </h1>
              <p className={dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-[#857f76]"}>
                Grouped by issue trip — click any trip to expand and see items. Return button appears per item.
              </p>
            </div>
            {canEdit && (
              <Link href={`/store/sites/${site.id}/issue`}
                className={dark
                  ? "self-start rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white"
                  : "self-start rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white"
                }
              >
                + Issue Items
              </Link>
            )}
          </div>

          {success && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              : "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            }>{success}</div>
          )}

          {/* Search */}
          <div className={dark ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-4" : "mt-6 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-4"}>
            <form className="flex flex-wrap gap-3">
              <input name="q" defaultValue={q}
                placeholder="Search requester, item, entity code, purpose..."
                className={dark
                  ? "flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none"
                  : "flex-1 rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm outline-none"
                }
              />
              <select name="status" defaultValue={status} title="Filter"
                className={dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                  : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm"
                }
              >
                <option value="ALL">All</option>
                <option value="OPEN">Open</option>
                <option value="RETURNED">Returned</option>
              </select>
              <button type="submit" className={dark
                ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white"
                : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white"
              }>Search</button>
              {(q || status !== "ALL") && (
                <Link href={`/store/sites/${site.id}/issues`}
                  className={dark ? "self-center text-sm text-slate-400 hover:underline" : "self-center text-sm text-[#6f6a62] hover:underline"}>
                  Clear
                </Link>
              )}
            </form>
          </div>
        </section>

        {/* Summary */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            { label: "Open Issues",  value: summary.openCount,     sub: "items currently out",  accent: dark ? "bg-amber-500" : "bg-[#b08b2c]" },
            { label: "Returned",     value: summary.returnedCount, sub: "items brought back",    accent: dark ? "bg-emerald-500" : "bg-[#2a7d52]" },
          ].map((c) => (
            <div key={c.label} className={dark
              ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm"
            }>
              <div className={`h-1 ${c.accent}`} />
              <div className="p-4">
                <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>{c.label}</div>
                <div className={dark ? "mt-1 text-2xl font-semibold text-slate-100" : "mt-1 text-2xl font-semibold text-[#1a1814]"}>{c.value}</div>
                <div className={dark ? "mt-0.5 text-xs text-slate-500" : "mt-0.5 text-xs text-[#8b857c]"}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Trip cards */}
        <div className="mt-5 space-y-3">
          {trips.length === 0 ? (
            <div className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 px-5 py-12 text-center text-sm text-slate-500"
              : "rounded-2xl border border-[#e0dbd2] bg-white px-5 py-12 text-center text-sm text-[#8b857c]"
            }>
              No issue records found.
            </div>
          ) : trips.map((trip) => (
            <TripCard
              key={trip.groupId}
              dark={dark}
              trip={trip}
              siteId={site.id}
              canEdit={canEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
