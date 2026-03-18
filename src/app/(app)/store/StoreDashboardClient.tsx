"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

type SiteCard = {
  id: string;
  name: string;
  location: string;
  itemCount: number;
};

type Summary = {
  totalInventoryItems: number;
  totalMaterials: number;
  totalEquipment: number;
  lowStockItems: number;
  checkedOutEquipment: number;
  centralStockCount: number;
  restockCount: number;
  issueCount: number;
};

function SummaryCard({
  dark,
  label,
  value,
  sub,
  accent,
  href,
}: {
  dark: boolean;
  label: string;
  value: string;
  sub: string;
  accent: string;
  href?: string;
}) {
  const content = (
    <div
      className={
        dark
          ? "overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-1"
          : "overflow-hidden rounded-3xl border border-[#e6ddd1] bg-white shadow-[0_10px_30px_rgba(26,24,20,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(26,24,20,0.08)]"
      }
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-5">
        <div
          className={
            dark
              ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
              : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"
          }
        >
          {label}
        </div>
        <div
          className={
            dark
              ? "mt-3 text-3xl font-semibold tracking-tight text-slate-100"
              : "mt-3 text-3xl font-semibold tracking-tight text-[#1a1814]"
          }
        >
          {value}
        </div>
        <div className={dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-[#7b756d]"}>
          {sub}
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
    >
      {content}
    </Link>
  );
}

export default function StoreDashboardClient({
  role,
  email,
  summary,
  siteCards,
}: {
  role: string;
  email: string | null;
  summary: Summary;
  siteCards: SiteCard[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <section
          className={
            dark
              ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
              : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
          }
        >
          <div
            className={
              dark
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
            }
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div
                className={
                  dark
                    ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                    : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Store Dashboard
              </div>

              <h1
                className={
                  dark
                    ? "mt-4 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                Inventory & Central Stock
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Manage site-based inventory, track equipment and materials, monitor low
                stock alerts, and keep the old stock register safely under Central Stock.
              </p>

              <div
                className={
                  dark
                    ? "mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                    : "mt-5 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {email ? <> • {email}</> : null}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            dark={dark}
            label="Inventory Items"
            value={String(summary.totalInventoryItems)}
            sub="materials and equipment"
            accent={dark ? "bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" : "bg-[#1d5fa8]"}
          />
          <SummaryCard
            dark={dark}
            label="Materials"
            value={String(summary.totalMaterials)}
            sub="tracked consumables"
            accent={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
          />
          <SummaryCard
            dark={dark}
            label="Equipment"
            value={String(summary.totalEquipment)}
            sub="tracked equipment items"
            accent={dark ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]" : "bg-[#b08b2c]"}
          />
          <SummaryCard
            dark={dark}
            label="Low Stock"
            value={String(summary.lowStockItems)}
            sub="needs attention"
            accent={dark ? "bg-[linear-gradient(90deg,#f97316,#fb923c)]" : "bg-[#c8611a]"}
            href="/store/alerts"
          />
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {siteCards.map((site) => (
            <Link
              key={site.id}
              href={`/store/sites/${site.id}`}
              onClick={()=> window.scrollTo({ top: 0, behavior: "auto"})}
              className={
                dark
                  ? "group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-1"
                  : "group overflow-hidden rounded-3xl border border-[#e4dbd0] bg-white shadow-[0_10px_30px_rgba(26,24,20,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(26,24,20,0.08)]"
              }
            >
              <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" />
              <div className="p-5">
                <div
                  className={
                    dark
                      ? "text-lg font-semibold tracking-tight text-slate-100"
                      : "text-lg font-semibold tracking-tight text-[#1a1814]"
                  }
                >
                  {site.name} Inventory
                </div>
                <div
                  className={
                    dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-[#7b756d]"
                  }
                >
                  Location: {site.location}
                </div>
                <div
                  className={
                    dark
                      ? "mt-4 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300"
                      : "mt-4 inline-flex rounded-full bg-[#f5f2ed] px-3 py-1 text-xs font-semibold text-[#5b564d]"
                  }
                >
                  {site.itemCount} items
                </div>
              </div>
            </Link>
          ))}

          <SummaryCard
            dark={dark}
            label="Central Stock"
            value={String(summary.centralStockCount)}
            sub="legacy stock register"
            accent={dark ? "bg-[linear-gradient(90deg,#1a1814,#4a4740)]" : "bg-[#1a1814]"}
            href="/store/central-stock"
          />
          <SummaryCard
            dark={dark}
            label="Restock Log"
            value={String(summary.restockCount)}
            sub="all restocking records"
            accent={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
            href="/store/restocks"
          />
          <SummaryCard
            dark={dark}
            label="Issue Log"
            value={String(summary.issueCount)}
            sub="all issue records"
            accent={dark ? "bg-[linear-gradient(90deg,#f97316,#fb923c)]" : "bg-[#c8611a]"}
            href="/store/issues"
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SummaryCard
            dark={dark}
            label="Checked Out Equipment"
            value={String(summary.checkedOutEquipment)}
            sub="currently out in the field"
            accent={dark ? "bg-[linear-gradient(90deg,#ef4444,#f87171)]" : "bg-[#c0392b]"}
            href="/store/checkouts"
          />
          <SummaryCard
            dark={dark}
            label="Alerts"
            value={String(summary.lowStockItems)}
            sub="low stock and shortages"
            accent={dark ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]" : "bg-[#b08b2c]"}
            href="/store/alerts"
          />
        </div>
      </div>
    </div>
  );
}