"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

type Stats = {
  sites:              number;
  sitesActive:        number;
  sitesDown:          number;
  airSites:           number;
  liquidSites:        number;
  knetSites:          number;
  gbcSites:           number;
  assets:             number;
  storeTotal:         number;
  received:           number;
  notReceived:        number;
  activePct:          number;
  airPct:             number;
  knetPct:            number;
  receivedPct:        number;
  assetUtilPct:       number;
  totalInventoryItems: number;
};

type InventorySiteCard = {
  id:        string;
  name:      string;
  itemCount: number;
};

type ActivityItem = {
  id:             string;
  title:          string;
  details:        string | null;
  actorEmail:     string | null;
  createdAtLabel: string;
};

function progressWidthClass(width: number) {
  const safe    = Math.max(0, Math.min(100, width));
  const rounded = Math.round(safe / 5) * 5;
  const map: Record<number, string> = {
    0: "w-0", 5: "w-[5%]", 10: "w-[10%]", 15: "w-[15%]",
    20: "w-[20%]", 25: "w-[25%]", 30: "w-[30%]", 35: "w-[35%]",
    40: "w-[40%]", 45: "w-[45%]", 50: "w-[50%]", 55: "w-[55%]",
    60: "w-[60%]", 65: "w-[65%]", 70: "w-[70%]", 75: "w-[75%]",
    80: "w-[80%]", 85: "w-[85%]", 90: "w-[90%]", 95: "w-[95%]",
    100: "w-full",
  };
  return map[rounded] ?? "w-0";
}

export default function DashboardClient({
  role,
  email,
  displayName,
  dateLabel,
  stats,
  inventorySiteCards,
  recentActivity,
}: {
  role:               Role;
  email:              string | null;
  displayName:        string;
  dateLabel:          string;
  stats:              Stats;
  inventorySiteCards: InventorySiteCard[];
  recentActivity:     ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark     = mode === "dark";
  const router   = useRouter();

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[#f5f2ed]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">

        {/* ── HEADER ── */}
        <div className={dark
          ? "mb-8 flex flex-col gap-5 pb-7 lg:flex-row lg:items-end lg:justify-between"
          : "mb-8 flex flex-col gap-5 border-b border-[#e0dbd2] pb-7 lg:flex-row lg:items-end lg:justify-between"
        }>
          <div>
            <div className={dark
              ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
              : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
            }>
              ● Live · {dateLabel}
            </div>
            <h1 className={dark
              ? "text-4xl font-semibold tracking-tight text-slate-50"
              : "text-4xl font-semibold tracking-tight text-[#1a1814]"
            }>
              Asset Dashboard
            </h1>
            <p className={dark
              ? "mt-2 text-sm font-medium text-slate-500"
              : "mt-2 text-sm font-medium text-[#8b857c]"
            }>
              Welcome back, {displayName}. Here is a live summary of sites, assets and store activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/sites"
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className={dark
                ? "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/25"
                : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] transition hover:border-[#4a4740]"
              }
            >
              Go to Sites
            </Link>
            <Link href="/store"
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className={dark
                ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] transition hover:opacity-95"
                : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2c2823]"
              }
            >
              Go to Store
            </Link>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard dark={dark} href="/sites" label="Total Sites" value={String(stats.sites)}
            stripe={dark ? "bg-[linear-gradient(90deg,#3b82f6,#60a5fa)]" : "bg-[#1d5fa8]"}
            tag={`${stats.sites} total`}
            tagClass={dark ? "bg-[rgba(59,130,246,0.12)] text-[#60a5fa]" : "bg-[#e8f0fb] text-[#1d5fa8]"}
            meta="registered in system"
          />
          <KpiCard dark={dark} href="/sites?group=status" label="Active / Down"
            value={`${stats.sitesActive} / ${stats.sitesDown}`}
            stripe={dark ? "bg-[linear-gradient(90deg,#10b981,#34d399)]" : "bg-[#2a7d52]"}
            tag={`${stats.sitesDown} offline`}
            tagClass={dark ? "bg-[rgba(248,113,113,0.12)] text-[#f87171]" : "bg-[#fdecea] text-[#c0392b]"}
            meta="view grouped status"
          />
          <KpiCard dark={dark} href="/sites?group=tt" label="Air / Liquid"
            value={`${stats.airSites} / ${stats.liquidSites}`}
            stripe={dark ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]" : "bg-[#b08b2c]"}
            tag={`${stats.airPct}% air`}
            tagClass={dark ? "bg-[rgba(251,191,36,0.12)] text-[#fbbf24]" : "bg-[#fdf6e3] text-[#b08b2c]"}
            meta="view grouped cooling"
          />
          <KpiCard dark={dark} href="/sites?group=tower" label="KNET / GBC"
            value={`${stats.knetSites} / ${stats.gbcSites}`}
            stripe={dark ? "bg-[linear-gradient(90deg,#f97316,#fb923c)]" : "bg-[#c8611a]"}
            tag={`${stats.knetPct}% KNET`}
            tagClass={dark ? "bg-[rgba(249,115,22,0.12)] text-[#fb923c]" : "bg-[#fdf0e6] text-[#c8611a]"}
            meta="view grouped towers"
          />
        </div>

        {/* ── MIDDLE ROW ── */}
        <div className="mt-5 grid gap-4 lg:grid-cols-3">

          {/* Assets card */}
          <Link href="/assets" className="block">
          <Card dark={dark} title="Assets" rightTag={`${stats.assets} total`}>
            <ProgressRow dark={dark} label="Utilization" value={`${stats.assetUtilPct}%`}
              width={stats.assetUtilPct}
              fill={dark ? "bg-[linear-gradient(90deg,#1d5fa8,#60a5fa)]" : "bg-[#1a1814]"}
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat dark={dark} label="Registered Assets" value={String(stats.assets)} valueClass="text-[#10b981]" />
              <MiniStat dark={dark} label="Site Records"      value={String(stats.sites)}  valueClass="text-[#f59e0b]" />
            </div>
          </Card>
          </Link>

          {/* ✅ NEW: Inventory Sites card — replaces old Store card */}
          <div className={dark
            ? "rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm backdrop-blur-xl"
            : "rounded-2xl border border-[#e0dbd2] bg-white p-5 shadow-sm"
          }>
            <div className="mb-4 flex items-center justify-between">
              <div className={dark ? "text-lg font-semibold tracking-tight text-slate-100" : "text-lg font-semibold tracking-tight text-[#1a1814]"}>
                Inventory
              </div>
              <span className={dark
                ? "rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-bold text-slate-500"
                : "rounded-full bg-[#f1ece4] px-2.5 py-1 text-[11px] font-bold text-[#5b564d]"
              }>
                {stats.totalInventoryItems} items total
              </span>
            </div>
            <div className="space-y-2">
              {inventorySiteCards.map((site) => (
                <button
                  key={site.id}
                  onClick={() => router.push(`/store/sites/${site.id}`)}
                  className={dark
                    ? "flex w-full items-center justify-between rounded-xl border border-white/7 bg-white/4 px-4 py-3 text-left transition hover:border-white/14 hover:bg-white/8"
                    : "flex w-full items-center justify-between rounded-xl border border-[#e0dbd2] bg-[#faf8f5] px-4 py-3 text-left transition hover:border-[#6b655d] hover:bg-[#f5f2ed]"
                  }
                >
                  <div>
                    <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                      {site.name}
                    </div>
                    <div className={dark ? "mt-0.5 text-xs text-slate-500" : "mt-0.5 text-xs text-[#8b857c]"}>
                      Inventory
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={dark
                      ? "rounded-full bg-[rgba(59,130,246,0.12)] px-2.5 py-1 text-[11px] font-bold text-[#60a5fa]"
                      : "rounded-full bg-[#e8f0fb] px-2.5 py-1 text-[11px] font-bold text-[#1d5fa8]"
                    }>
                      {site.itemCount} items
                    </span>
                    <span className={dark ? "text-slate-600" : "text-[#9c9890]"}>›</span>
                  </div>
                </button>
              ))}
              {inventorySiteCards.length === 0 && (
                <div className={dark ? "py-6 text-center text-sm text-slate-500" : "py-6 text-center text-sm text-[#8b857c]"}>
                  No inventory sites yet.
                </div>
              )}
            </div>
          </div>

          {/* Site Health card */}
          <Card dark={dark} title="Site Health" rightTag={`${stats.activePct}% up`}>
            <ProgressRow dark={dark} label="Active"
              value={`${stats.sitesActive} / ${stats.sites}`} width={stats.activePct}
              fill={dark ? "bg-[linear-gradient(90deg,#059669,#10b981)]" : "bg-[#2a7d52]"}
            />
            <ProgressRow dark={dark} label="Air-cooled"
              value={`${stats.airSites} / ${stats.sites}`} width={stats.airPct}
              fill={dark ? "bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]" : "bg-[#1d5fa8]"}
            />
            <ProgressRow dark={dark} label="KNET"
              value={`${stats.knetSites} / ${stats.sites}`} width={stats.knetPct}
              fill={dark ? "bg-[linear-gradient(90deg,#ea6c00,#f97316)]" : "bg-[#c8611a]"}
            />
          </Card>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">

          {/* ✅ Recent Activity — no href on Card to avoid nested <a> */}
          <div className={dark
            ? "rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm backdrop-blur-xl"
            : "rounded-2xl border border-[#e0dbd2] bg-white p-5 shadow-sm"
          }>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className={dark ? "text-lg font-semibold tracking-tight text-slate-100" : "text-lg font-semibold tracking-tight text-[#1a1814]"}>
                Recent Activity
              </div>
              {/* ✅ button instead of Link to avoid nested <a> inside <a> */}
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: "auto" }); router.push("/activity"); }}
                className={dark
                  ? "text-xs font-bold text-[#f97316] hover:underline"
                  : "text-xs font-bold text-[#c8611a] hover:underline"
                }
              >
                View all →
              </button>
            </div>
            <div className="space-y-1">
              {recentActivity.length === 0 ? (
                <div className={dark ? "py-8 text-sm text-slate-500" : "py-8 text-sm text-[#8b857c]"}>
                  No recent activity yet.
                </div>
              ) : recentActivity.map((item) => (
                <div key={item.id} className={dark
                  ? "flex items-start gap-3 border-b border-white/6 py-3 last:border-b-0"
                  : "flex items-start gap-3 border-b border-[#e9e2d8] py-3 last:border-b-0"
                }>
                  <span className={dark
                    ? "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f97316]"
                    : "mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#c8611a]"
                  } />
                  <div className="min-w-0 flex-1">
                    <div className={dark ? "text-sm font-semibold text-slate-200" : "text-sm font-semibold text-[#1a1814]"}>
                      {item.title}
                    </div>
                    {item.details && (
                      <div className={dark ? "mt-1 text-sm text-slate-500" : "mt-1 text-sm text-[#6f6a62]"}>
                        {item.details}
                      </div>
                    )}
                    {item.actorEmail && (
                      <div className={dark ? "mt-1 text-xs font-medium text-slate-600" : "mt-1 text-xs font-medium text-[#9c9890]"}>
                        By {item.actorEmail}
                      </div>
                    )}
                  </div>
                  <div className={dark
                    ? "whitespace-nowrap rounded-md bg-white/5 px-2 py-1 text-xs font-semibold text-slate-500"
                    : "whitespace-nowrap pt-0.5 text-xs font-semibold text-[#9c9890]"
                  }>
                    {item.createdAtLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <Card dark={dark} title="Quick Actions">
            <QuickAction dark={dark} href="/sites" title="Go to Sites"
              subtitle={`Manage all ${stats.sites} sites`}
              iconBg={dark ? "bg-[rgba(59,130,246,0.12)]" : "bg-[#e8f0fb]"}
              iconColor="text-[#1d5fa8]" icon="🗺"
            />
            <QuickAction dark={dark} href="/store" title="Go to Store"
              subtitle={`${stats.totalInventoryItems} inventory items`}
              iconBg={dark ? "bg-[rgba(245,158,11,0.12)]" : "bg-[#fdf6e3]"}
              iconColor="text-[#b08b2c]" icon="📦"
            />
            <QuickAction dark={dark} href="/sites?group=status" title="Review Down Sites"
              subtitle={`${stats.sitesDown} currently offline`}
              iconBg={dark ? "bg-[rgba(248,113,113,0.12)]" : "bg-[#fdecea]"}
              iconColor="text-[#c0392b]" icon="⚠️"
            />
          </Card>
        </div>

        <div className={dark ? "mt-6 text-xs font-medium text-slate-600" : "mt-6 text-xs font-medium text-[#9c9890]"}>
          Signed in as{" "}
          <span className={dark ? "font-semibold text-slate-200" : "font-semibold text-[#1a1814]"}>
            {role}
          </span>
          {email ? <> • {email}</> : null}
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function KpiCard({ dark, href, label, value, stripe, tag, tagClass, meta }: any) {
  const content = (
    <div className={dark
      ? "overflow-hidden rounded-2xl border border-white/8 bg-white/5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/6"
      : "overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    }>
      <div className={`h-1 ${stripe}`} />
      <div className="p-5">
        <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600" : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"}>
          {label}
        </div>
        <div className={dark ? "mt-3 text-3xl font-semibold tracking-tight text-slate-100" : "mt-3 text-3xl font-semibold tracking-tight text-[#1a1814]"}>
          {value}
        </div>
        <div className={dark ? "mt-4 flex items-center gap-2 border-t border-white/6 pt-3" : "mt-4 flex items-center gap-2 border-t border-[#eee7dd] pt-3"}>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tagClass}`}>{tag}</span>
          <span className={dark ? "text-xs font-medium text-slate-600" : "text-xs font-medium text-[#9c9890]"}>{meta}</span>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{content}</Link> : content;
}

// ✅ Card no longer accepts href — callers that need clickable cards use KpiCard or plain buttons
function Card({ dark, title, rightTag, action, children }: {
  dark: boolean;
  title: string;
  rightTag?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={dark
      ? "rounded-2xl border border-white/8 bg-white/5 p-5 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/6"
      : "rounded-2xl border border-[#e0dbd2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    }>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className={dark ? "text-lg font-semibold tracking-tight text-slate-100" : "text-lg font-semibold tracking-tight text-[#1a1814]"}>
          {title}
        </div>
        {action
          ? action
          : rightTag
          ? <span className={dark
              ? "rounded-full border border-white/8 bg-white/6 px-2.5 py-1 text-[11px] font-bold text-slate-500"
              : "rounded-full bg-[#f1ece4] px-2.5 py-1 text-[11px] font-bold text-[#5b564d]"
            }>{rightTag}</span>
          : null
        }
      </div>
      {children}
    </div>
  );
}

function ProgressRow({ dark, label, value, width, fill }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={dark ? "text-sm font-medium text-slate-500" : "text-sm font-medium text-[#5d584f]"}>{label}</span>
        <span className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>{value}</span>
      </div>
      <div className={dark ? "h-2 overflow-hidden rounded-full bg-white/8" : "h-2 overflow-hidden rounded-full bg-[#eee7dd]"}>
        <div className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`} />
      </div>
    </div>
  );
}

function MiniStat({ dark, label, value, valueClass }: any) {
  return (
    <div className={dark ? "rounded-xl border border-white/6 bg-white/3 px-4 py-3" : "rounded-xl bg-[#f5f2ed] px-4 py-3"}>
      <div className={dark ? "text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600" : "text-[11px] font-bold uppercase tracking-[0.08em] text-[#9c9890]"}>
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight ${valueClass ?? (dark ? "text-slate-100" : "text-[#1a1814]")}`}>
        {value}
      </div>
    </div>
  );
}

function QuickAction({ dark, href, title, subtitle, iconBg, iconColor, icon }: any) {
  return (
    <Link href={href} className={dark
      ? "mb-3 flex items-center gap-3 rounded-xl border border-white/7 bg-white/4 p-4 transition hover:border-white/14 hover:bg-white/8 last:mb-0"
      : "mb-3 flex items-center gap-3 rounded-xl border border-[#e0dbd2] bg-white p-4 transition hover:border-[#6b655d] hover:bg-[#faf8f4] last:mb-0"
    }>
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}>
        <span className={`text-base ${iconColor}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>{title}</div>
        <div className={dark ? "mt-0.5 text-xs font-medium text-slate-600" : "mt-0.5 text-xs font-medium text-[#8b857c]"}>{subtitle}</div>
      </div>
      <span className={dark ? "text-lg text-slate-600" : "text-lg text-[#9c9890]"}>›</span>
    </Link>
  );
}
