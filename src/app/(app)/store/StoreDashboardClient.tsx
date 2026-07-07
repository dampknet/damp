"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { X, Plus } from "lucide-react";

const ITEM_TYPE_LABEL: Record<string, string> = {
  EQUIPMENT:              "Equipment",
  ACCESSORIES:            "Accessories",
  TOOLS_AND_PARTS:        "Tools & Parts",
  GENERAL:                "General",
  COOLING_INFRASTRUCTURE: "Cooling",
  CABLES_AND_ELECTRONICS: "Cables & Electronics",
};

const STATUS_STYLE: Record<string, { dark: string; light: string; dot: string }> = {
  AVAILABLE:    { dark: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", light: "border-emerald-200 bg-emerald-50 text-emerald-700",   dot: "bg-emerald-500" },
  LOW_STOCK:    { dark: "border-amber-500/30 bg-amber-500/10 text-amber-300",       light: "border-amber-200 bg-amber-50 text-amber-700",           dot: "bg-amber-500"   },
  OUT_OF_STOCK: { dark: "border-red-500/30 bg-red-500/10 text-red-300",             light: "border-red-200 bg-red-50 text-red-700",                 dot: "bg-red-500"     },
  CHECKED_OUT:  { dark: "border-blue-500/30 bg-blue-500/10 text-blue-300",          light: "border-blue-200 bg-blue-50 text-blue-700",              dot: "bg-blue-500"    },
  INACTIVE:     { dark: "border-slate-500/30 bg-slate-500/10 text-slate-400",       light: "border-slate-200 bg-slate-50 text-slate-600",           dot: "bg-slate-400"   },
};

type SiteCard = { id: string; name: string; location: string; itemCount: number };

type Summary = {
  totalInventoryItems:  number;
  totalEquipment:       number;
  totalAccessories:     number;
  lowStockItems:        number;
  checkedOutEquipment:  number;
  centralStockCount:    number;
  restockCount:         number;
  issueCount:           number;
};

type SearchResult = {
  itemId:      string;
  itemName:    string;
  itemType:    string;
  itemCode:    string | null;
  quantity:    number;
  uncountable: boolean;
  unit:        string | null;
  status:      string;
  condition:   string;
  siteId:      string;
  siteName:    string;
};

function SummaryCard({ dark, label, value, sub, accent, href }: {
  dark: boolean; label: string; value: string; sub: string; accent: string; href?: string;
}) {
  const inner = (
    <div className={dark
      ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5"
      : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)] transition hover:-translate-y-0.5"
    }>
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
        <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>{label}</div>
        <div className={dark ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100" : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"}>{value}</div>
        <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>{sub}</div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export default function StoreDashboardClient({
  role, canEdit, email, summary, siteCards, createSiteAction,
}: {
  role:               string;
  canEdit:            boolean;
  email:              string | null;
  summary:            Summary;
  siteCards:          SiteCard[];
  createSiteAction?:  (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const router       = useRouter();
  const searchParams = useSearchParams();

  const siteError   = searchParams.get("siteError");
  const siteSuccess = searchParams.get("siteSuccess");

  const [q,           setQ]           = useState("");
  const [results,     setResults]     = useState<SearchResult[] | null>(null);
  const [searched,    setSearched]    = useState("");
  const [isPending,   startTransition] = useTransition();
  const [showNewSite, setShowNewSite] = useState(false);

  // Auto-close modal on success
  useEffect(() => {
    if (siteSuccess) setShowNewSite(false);
  }, [siteSuccess]);

  const handleSearch = async () => {
    const query = q.trim();
    if (!query) return;
    setSearched(query);
    setResults(null);
    startTransition(async () => {
      try {
        const res  = await fetch(`/api/store/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      }
    });
  };

  const grouped = results
    ? siteCards.map((site) => ({
        site,
        items: results.filter((r) => r.siteId === site.id),
      })).filter((g) => g.items.length > 0)
    : null;

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/50"
    : "w-full rounded-xl border border-[#e0dbd2] bg-white px-4 py-3 text-sm text-[#1a1814] outline-none focus:border-[#1a1814]";

  const fieldCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-500/50"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1a1814]";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {/* ── HEADER ── */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
          } />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className={dark
                ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }>
                ● Store Dashboard
              </div>
              <h1 className={dark
                ? "text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
              }>
                Inventory & Central Stock
              </h1>
              <p className={dark ? "mt-3 max-w-2xl text-sm font-medium text-slate-400" : "mt-3 max-w-2xl text-sm font-medium text-[#857f76]"}>
                Manage site-based inventory, track equipment and materials, monitor low stock alerts, and monitor Central Stock.
              </p>
              <div className={dark
                ? "mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                : "mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
              }>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role} • {email}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && createSiteAction && (
                <button
                  onClick={() => setShowNewSite(true)}
                  className={dark
                    ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                    : "inline-flex items-center gap-2 rounded-xl bg-[#2a7d52] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                  }
                >
                  <Plus size={16} /> New Inventory Site
                </button>
              )}
              <Link href="/store/alerts" className={dark
                ? "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
                : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              }>
                ⚠ {summary.lowStockItems} Low Stock
              </Link>
            </div>
          </div>

          {/* Success / Error banners */}
          {siteSuccess && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              : "mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            }>
              {siteSuccess}
            </div>
          )}
          {siteError && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>
              {siteError}
            </div>
          )}

          {/* ── GLOBAL SEARCH ── */}
          <div className="relative mt-8">
            <div className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "mb-1 text-sm font-semibold text-slate-100" : "mb-1 text-sm font-semibold text-[#1a1814]"}>
                🔍 Find Item Across All Sites
              </div>
              <p className={dark ? "mb-4 text-xs text-slate-500" : "mb-4 text-xs text-[#8b857c]"}>
                Search any item by name, code, or category to see which sites have it available.
              </p>
              <div className="flex gap-3">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. 5kw pump, RF cable, UHF amplifier, KNET-EQUIP-001…"
                  className={inputCls}
                />
                <button onClick={handleSearch} disabled={isPending || !q.trim()}
                  className={dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
                    : "rounded-xl bg-[#1a1814] px-5 py-3 text-sm font-bold text-white hover:bg-[#2d2924] disabled:opacity-40"
                  }
                >
                  {isPending ? "Searching…" : "Search"}
                </button>
                {results !== null && (
                  <button onClick={() => { setQ(""); setResults(null); setSearched(""); }}
                    className={dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/10"
                      : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-3 text-sm font-semibold text-[#5b564d] hover:bg-[#f5f2ed]"
                    }
                  >
                    Clear
                  </button>
                )}
              </div>

              {isPending && (
                <div className={dark ? "mt-5 text-sm text-slate-500 animate-pulse" : "mt-5 text-sm text-[#8b857c] animate-pulse"}>
                  Searching across all sites…
                </div>
              )}

              {!isPending && results !== null && (
                <div className="mt-5">
                  {grouped!.length === 0 ? (
                    <div className={dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-500"
                      : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-6 text-center text-sm text-[#8b857c]"
                    }>
                      No items found for "<span className="font-semibold">{searched}</span>" across any site.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className={dark ? "text-xs font-semibold text-slate-400" : "text-xs font-semibold text-[#8b857c]"}>
                        Found <span className={dark ? "text-slate-100" : "text-[#1a1814]"}>{results.length}</span> item{results.length !== 1 ? "s" : ""} across{" "}
                        <span className={dark ? "text-slate-100" : "text-[#1a1814]"}>{grouped!.length}</span> site{grouped!.length !== 1 ? "s" : ""} for "
                        <span className={dark ? "text-sky-400" : "text-blue-700"}>{searched}</span>"
                      </div>
                      {grouped!.map(({ site, items }) => (
                        <div key={site.id} className={dark
                          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                          : "overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm"
                        }>
                          <div className={dark
                            ? "flex items-center justify-between border-b border-white/8 bg-white/5 px-4 py-3"
                            : "flex items-center justify-between border-b border-[#eee7dd] bg-[#f8f4ee] px-4 py-3"
                          }>
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              <span className={dark ? "text-sm font-bold text-slate-100" : "text-sm font-bold text-[#1a1814]"}>{site.name}</span>
                              <span className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>— {site.location}</span>
                            </div>
                            <Link href={`/store/sites/${site.id}`}
                              className={dark ? "text-xs font-bold text-sky-400 hover:underline" : "text-xs font-bold text-blue-700 hover:underline"}>
                              View inventory →
                            </Link>
                          </div>
                          <div className="divide-y divide-slate-500/10">
                            {items.map((item) => {
                              const ss = STATUS_STYLE[item.status] ?? STATUS_STYLE.INACTIVE;
                              return (
                                <div key={item.itemId}
                                  onClick={() => router.push(`/store/sites/${item.siteId}/items/${item.itemId}/edit`)}
                                  className={dark
                                    ? "flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-white/5"
                                    : "flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-[#fcfaf7]"
                                  }
                                >
                                  <span className={`h-2 w-2 shrink-0 rounded-full ${ss.dot}`} />
                                  <div className="min-w-0 flex-1">
                                    <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>{item.itemName}</div>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                      {item.itemCode && (
                                        <span className={`font-mono text-[10px] ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>{item.itemCode}</span>
                                      )}
                                      <span className={`text-[10px] font-semibold ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                                        {ITEM_TYPE_LABEL[item.itemType] ?? item.itemType}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={dark ? "text-sm font-bold text-slate-100" : "text-sm font-bold text-[#1a1814]"}>
                                      {item.uncountable ? "N/A" : `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`}
                                    </div>
                                    <div className={dark ? "text-[10px] text-slate-500" : "text-[10px] text-[#8b857c]"}>{item.condition}</div>
                                  </div>
                                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${dark ? ss.dark : ss.light}`}>
                                    {item.status.replace("_", " ")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── SUMMARY CARDS ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard dark={dark} label="Inventory Items" value={String(summary.totalInventoryItems)} sub="all categories"        accent="bg-[#1d5fa8]" />
          <SummaryCard dark={dark} label="Equipment"       value={String(summary.totalEquipment)}      sub="tracked equipment items" accent="bg-[#b08b2c]" />
          <SummaryCard dark={dark} label="Accessories"     value={String(summary.totalAccessories)}    sub="accessories in stock"   accent="bg-[#2a7d52]" />
          <SummaryCard dark={dark} label="Low Stock"       value={String(summary.lowStockItems)}       sub="needs attention"        accent="bg-[#c8611a]" href="/store/alerts" />
        </div>

        {/* ── SITE CARDS ── */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {siteCards.map((site) => (
            <Link key={site.id} href={`/store/sites/${site.id}`} className="block">
              <div className={dark
                ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/20"
                : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              }>
                <div className="h-1 bg-[#1d5fa8]" />
                <div className="p-5">
                  <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>{site.name} Inventory</div>
                  <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>Location: {site.location}</div>
                  <div className="mt-4">
                    <span className={dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300"
                      : "rounded-full border border-[#e0dbd2] bg-[#f5f2ed] px-3 py-1.5 text-xs font-semibold text-[#5b564d]"
                    }>
                      {site.itemCount} items
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── QUICK LINKS ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/store/restocks",  label: "Restock Log",  sub: `${summary.restockCount} restocks`,      accent: "bg-[#2a7d52]" },
            { href: "/store/issues",    label: "Issue Log",    sub: `${summary.issueCount} issues`,          accent: "bg-[#c8611a]" },
            { href: "/store/checkouts", label: "Checked Out",  sub: `${summary.checkedOutEquipment} open`,   accent: "bg-[#1d5fa8]" },
            { href: "/store/alerts",    label: "Stock Alerts", sub: `${summary.lowStockItems} flagged`,      accent: "bg-[#b08b2c]" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="block">
              <div className={dark
                ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-0.5"
                : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              }>
                <div className={`h-1 ${l.accent}`} />
                <div className="p-4">
                  <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>{l.label}</div>
                  <div className={dark ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-[#8b857c]"}>{l.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>

      {/* ── NEW INVENTORY SITE MODAL ── */}
      {showNewSite && createSiteAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewSite(false); }}
        >
          <div className={dark
            ? "w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1923] shadow-2xl"
            : "w-full max-w-md overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white shadow-2xl"
          }>
            {/* Modal top bar */}
            <div className={dark
              ? "flex items-center justify-between border-b border-white/10 px-6 py-4"
              : "flex items-center justify-between border-b border-[#eee7dd] px-6 py-4"
            }>
              <div>
                <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>
                  New Inventory Site
                </div>
                <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                  Add a new warehouse / store location
                </div>
              </div>
              <button onClick={() => setShowNewSite(false)}
                className={dark ? "text-slate-500 hover:text-slate-300" : "text-[#9c9890] hover:text-[#1a1814]"}>
                <X size={20} />
              </button>
            </div>

            {/* Modal form */}
            <form action={createSiteAction} className="p-6 space-y-4">
              <div>
                <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input name="name" required
                  placeholder="e.g. Adjangotey Inventory"
                  className={fieldCls} />
              </div>
              <div>
                <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                  Location
                </label>
                <input name="location"
                  placeholder="e.g. Adjangotey, Accra"
                  className={fieldCls} />
              </div>
              <div>
                <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                  Description (optional)
                </label>
                <textarea name="description" rows={3}
                  placeholder="Brief description of this inventory site…"
                  className={fieldCls} />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className={dark
                    ? "flex-1 rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] py-2.5 text-sm font-bold text-white hover:opacity-95"
                    : "flex-1 rounded-xl bg-[#2a7d52] py-2.5 text-sm font-bold text-white hover:opacity-95"
                  }
                >
                  Create Site
                </button>
                <button type="button" onClick={() => setShowNewSite(false)}
                  className={dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
