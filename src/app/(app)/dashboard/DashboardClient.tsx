"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useThemeMode } from "@/context/ThemeContext";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

type Stats = {
  sites: number;
  sitesActive: number;
  sitesDown: number;
  airSites: number;
  liquidSites: number;
  knetSites: number;
  gbcSites: number;
  assets: number;
  storeTotal: number;
  whMain: number;
  whRegional: number;
  whTransit: number;
  activePct: number;
  airPct: number;
  knetPct: number;
  receivedPct: number; // Added to fix TypeScript error
  assetUtilPct: number;
};

type ActivityItem = {
  id: string;
  title: string;
  details: string | null;
  actorEmail: string | null;
  createdAtLabel: string;
};

function progressWidthClass(width: number) {
  const safe = Math.max(0, Math.min(100, width));
  const rounded = Math.round(safe / 5) * 5;

  switch (rounded) {
    case 0: return "w-0";
    case 5: return "w-[5%]";
    case 10: return "w-[10%]";
    case 15: return "w-[15%]";
    case 20: return "w-[20%]";
    case 25: return "w-[25%]";
    case 30: return "w-[30%]";
    case 35: return "w-[35%]";
    case 40: return "w-[40%]";
    case 45: return "w-[45%]";
    case 50: return "w-[50%]";
    case 55: return "w-[55%]";
    case 60: return "w-[60%]";
    case 65: return "w-[65%]";
    case 70: return "w-[70%]";
    case 75: return "w-[75%]";
    case 80: return "w-[80%]";
    case 85: return "w-[85%]";
    case 90: return "w-[90%]";
    case 95: return "w-[95%]";
    case 100: return "w-full";
    default: return "w-0";
  }
}

export default function DashboardClient({
  role,
  email,
  displayName,
  dateLabel,
  stats,
  recentActivity,
}: {
  role: Role;
  email: string | null;
  displayName: string;
  dateLabel: string;
  stats: Stats;
  recentActivity: ActivityItem[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[#0b0e14] text-slate-200"
          : "min-h-screen bg-[#fcfcfc]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div
          className={
            dark
              ? "mb-8 flex flex-col gap-5 border-b border-white/5 pb-7 lg:flex-row lg:items-end lg:justify-between"
              : "mb-8 flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between"
          }
        >
          <div>
            <div
              className={
                dark
                  ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500"
                  : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }
            >
              ● Live · {dateLabel}
            </div>

            <h1
              className={
                dark
                  ? "text-4xl font-semibold tracking-tight text-slate-50"
                  : "text-4xl font-semibold tracking-tight text-slate-900"
              }
            >
              Asset Dashboard
            </h1>

            <p
              className={
                dark
                  ? "mt-2 text-sm font-medium text-slate-500"
                  : "mt-2 text-sm font-medium text-slate-500"
              }
            >
              Welcome back, {displayName}. Here is a live summary of your sites,
              assets and store activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/sites"
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 shadow-sm"
              }
            >
              Go to Sites
            </Link>

            <Link
              href="/store"
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className={
                dark
                  ? "rounded-xl bg-[#1d5fa8] px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#164a82] transition-all"
                  : "rounded-xl bg-[#1d5fa8] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#164a82] shadow-md"
              }
            >
              Go to Store
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            dark={dark}
            href="/sites"
            label="Total Sites"
            value={String(stats.sites)}
            stripe="bg-[#1d5fa8]"
            tag={`${stats.sites} total`}
            tagClass={
              dark
                ? "bg-blue-500/10 text-blue-400"
                : "bg-blue-50 text-[#1d5fa8]"
            }
            meta="registered in system"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=status"
            label="Active / Down"
            value={`${stats.sitesActive} / ${stats.sitesDown}`}
            stripe="bg-emerald-600"
            tag={`${stats.sitesDown} offline`}
            tagClass={
              dark
                ? "bg-red-500/10 text-red-400"
                : "bg-red-50 text-red-700"
            }
            meta="view grouped status"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=tt"
            label="Air / Liquid"
            value={`${stats.airSites} / ${stats.liquidSites}`}
            stripe="bg-amber-600"
            tag={`${stats.airPct}% air`}
            tagClass={
              dark
                ? "bg-amber-500/10 text-amber-400"
                : "bg-amber-50 text-[#b08b2c]"
            }
            meta="view grouped cooling"
          />

          <KpiCard
            dark={dark}
            href="/sites?group=tower"
            label="KNET / GBC"
            value={`${stats.knetSites} / ${stats.gbcSites}`}
            stripe="bg-[#c8611a]"
            tag={`${stats.knetPct}% KNET`}
            tagClass={
              dark
                ? "bg-orange-500/10 text-orange-400"
                : "bg-orange-50 text-[#c8611a]"
            }
            meta="view grouped towers"
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card dark={dark} title="Assets" rightTag={`${stats.assets} total`} href="/assets">
            <ProgressRow
              dark={dark}
              label="Utilization"
              value={`${stats.assetUtilPct}%`}
              width={stats.assetUtilPct}
              fill={
                dark
                  ? "bg-blue-600"
                  : "bg-slate-900"
              }
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat
                dark={dark}
                label="Registered Assets"
                value={String(stats.assets)}
                valueClass="text-emerald-600"
              />
              <MiniStat
                dark={dark}
                label="Site Records"
                value={String(stats.sites)}
                valueClass="text-amber-600"
              />
            </div>
          </Card>

          <Card dark={dark} title="Warehouse Inventory" rightTag={`${stats.storeTotal} items`}>
            <div className="space-y-1">
              <StoreRow
                dark={dark}
                label="Main Warehouse"
                value={String(stats.whMain)}
                valueClass="text-[#1d5fa8]"
                icon="🏢"
                iconBg={dark ? "bg-blue-500/10" : "bg-blue-50"}
              />
              <StoreRow
                dark={dark}
                label="Regional Hub"
                value={String(stats.whRegional)}
                valueClass="text-emerald-600"
                icon="📦"
                iconBg={dark ? "bg-emerald-500/10" : "bg-emerald-50"}
              />
              <StoreRow
                dark={dark}
                label="In Transit"
                value={String(stats.whTransit)}
                valueClass="text-orange-600"
                icon="🚚"
                iconBg={dark ? "bg-orange-500/10" : "bg-orange-50"}
              />
            </div>
          </Card>

          <Card dark={dark} title="Site Health" rightTag={`${stats.activePct}% up`}>
            <ProgressRow
              dark={dark}
              label="Active"
              value={`${stats.sitesActive} / ${stats.sites}`}
              width={stats.activePct}
              fill="bg-emerald-600"
            />
            <ProgressRow
              dark={dark}
              label="Air-cooled"
              value={`${stats.airSites} / ${stats.sites}`}
              width={stats.airPct}
              fill={
                dark
                  ? "bg-blue-600"
                  : "bg-[#1d5fa8]"
              }
            />
            <ProgressRow
              dark={dark}
              label="KNET"
              value={`${stats.knetSites} / ${stats.sites}`}
              width={stats.knetPct}
              fill={
                dark
                  ? "bg-orange-600"
                  : "bg-[#c8611a]"
              }
            />
          </Card>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <Card
            dark={dark}
            title="Recent Activity"
            action={
              <Link
                href="/activity"
                onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
                className={
                  dark
                    ? "text-xs font-bold uppercase tracking-widest text-orange-500 hover:underline"
                    : "text-xs font-bold uppercase tracking-widest text-[#c8611a] hover:underline"
                }
              >
                View all →
              </Link>
            }
            href="/activity"
          >
            <div className="space-y-1">
              {recentActivity.length === 0 ? (
                <div
                  className={
                    dark ? "py-8 text-sm text-slate-500" : "py-8 text-sm text-slate-400"
                  }
                >
                  No recent activity yet.
                </div>
              ) : (
                recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className={
                      dark
                        ? "flex items-start gap-3 border-b border-white/5 py-3 last:border-b-0"
                        : "flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0"
                    }
                  >
                    <span
                      className={
                        dark
                          ? "mt-1.5 h-2 w-2 rounded-full bg-orange-500"
                          : "mt-1.5 h-2 w-2 rounded-full bg-[#c8611a]"
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          dark
                            ? "text-sm font-bold text-slate-200"
                            : "text-sm font-bold text-slate-900"
                        }
                      >
                        {item.title}
                      </div>
                      {item.details ? (
                        <div
                          className="mt-0.5 text-xs text-slate-500"
                        >
                          {item.details}
                        </div>
                      ) : null}
                      {item.actorEmail ? (
                        <div
                          className="mt-1 text-[10px] font-bold uppercase text-slate-400"
                        >
                          By {item.actorEmail}
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="text-[10px] font-bold text-slate-400 uppercase pt-1"
                    >
                      {item.createdAtLabel}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card dark={dark} title="Quick Actions">
            <QuickAction
              dark={dark}
              href="/sites"
              title="Go to Sites"
              subtitle={`Manage all ${stats.sites} sites`}
              iconBg={dark ? "bg-blue-500/10" : "bg-blue-50"}
              iconColor="text-[#1d5fa8]"
              icon="🗺"
            />
            <QuickAction
              dark={dark}
              href="/store"
              title="Go to Store"
              subtitle={`${stats.storeTotal} items total`}
              iconBg={dark ? "bg-amber-500/10" : "bg-amber-50"}
              iconColor="text-[#b08b2c]"
              icon="📦"
            />
            <QuickAction
              dark={dark}
              href="/sites?group=status"
              title="Review Down Sites"
              subtitle={`${stats.sitesDown} offline`}
              iconBg={dark ? "bg-red-500/10" : "bg-red-50"}
              iconColor="text-red-700"
              icon="⚠️"
            />
          </Card>
        </div>

        <div
          className={
            dark ? "mt-6 text-xs font-medium text-slate-600" : "mt-6 text-xs font-medium text-slate-400"
          }
        >
          Signed in as{" "}
          <span
            className={
              dark ? "text-slate-200" : "text-slate-900"
            }
          >
            {role}
          </span>
          {email ? <> • {email}</> : null}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ dark, href, label, value, stripe, tag, tagClass, meta }: any) {
  const content = (
    <div
      className={
        dark
          ? "overflow-hidden rounded-xl border border-white/5 bg-[#11141d] shadow-sm transition hover:-translate-y-0.5"
          : "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      }
    >
      <div className={`h-1 ${stripe}`} />
      <div className="p-5">
        <div
          className="text-[10px] font-bold uppercase tracking-widest text-slate-400"
        >
          {label}
        </div>
        <div
          className={
            dark
              ? "mt-3 text-3xl font-bold text-slate-50"
              : "mt-3 text-3xl font-bold text-slate-900"
          }
        >
          {value}
        </div>
        <div
          className={
            dark
              ? "mt-4 flex items-center gap-2 border-t border-white/5 pt-3"
              : "mt-4 flex items-center gap-2 border-t border-slate-100 pt-3"
          }
        >
          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${tagClass}`}>
            {tag}
          </span>
          <span
            className="text-[9px] font-bold uppercase text-slate-400"
          >
            {meta}
          </span>
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function Card({
  dark,
  title,
  rightTag,
  action,
  children,
  href,
}: {
  dark: boolean;
  title: string;
  rightTag?: string;
  action?: ReactNode;
  children: ReactNode;
  href?: string;
}) {
  const content = (
    <div
      className={
        dark
          ? "rounded-xl border border-white/5 bg-[#11141d] p-5 shadow-sm transition hover:shadow-md"
          : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b pb-3 dark:border-white/5 border-slate-50">
        <div
          className={
            dark
              ? "text-xs font-black uppercase tracking-widest text-slate-200"
              : "text-xs font-black uppercase tracking-widest text-slate-500"
          }
        >
          {title}
        </div>
        {action ? (
          action
        ) : rightTag ? (
          <span
            className={
              dark
                ? "rounded-md bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500"
                : "rounded-md bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500"
            }
          >
            {rightTag}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function ProgressRow({
  dark,
  label,
  value,
  width,
  fill,
}: {
  dark: boolean;
  label: string;
  value: string;
  width: number;
  fill: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-tight">
        <span className="text-slate-400">{label}</span>
        <span
          className={
            dark ? "text-slate-200" : "text-slate-900"
          }
        >
          {value}
        </span>
      </div>
      <div
        className={
          dark ? "h-1.5 overflow-hidden rounded-full bg-white/5" : "h-1.5 overflow-hidden rounded-full bg-slate-100"
        }
      >
        <div className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`} />
      </div>
    </div>
  );
}

function MiniStat({
  dark,
  label,
  value,
  valueClass,
}: {
  dark: boolean;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div
      className={
        dark
          ? "rounded-lg p-3 bg-white/5"
          : "rounded-lg p-3 bg-slate-50"
      }
    >
      <div
        className="text-[9px] font-bold uppercase tracking-widest text-slate-400"
      >
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function StoreRow({
  dark,
  label,
  value,
  valueClass,
  icon,
  iconBg,
}: {
  dark: boolean;
  label: string;
  value: string;
  valueClass?: string;
  icon?: string;
  iconBg?: string;
}) {
  return (
    <div
      className={
        dark
          ? "flex items-center justify-between border-b border-white/5 py-2.5 last:border-b-0"
          : "flex items-center justify-between border-b border-slate-100 py-2.5 last:border-b-0"
      }
    >
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded flex items-center justify-center text-sm ${iconBg}`}>
          {icon}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-tight text-slate-500">
          {label}
        </div>
      </div>
      <div
        className={`text-lg font-bold ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  dark,
  href,
  title,
  subtitle,
  iconBg,
  iconColor,
  icon,
}: {
  dark: boolean;
  href: string;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className={
        dark
          ? "mb-2 flex items-center gap-3 rounded-lg border border-white/5 bg-white/2 p-3 transition hover:bg-white/5 last:mb-0"
          : "mb-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:bg-slate-50 last:mb-0"
      }
    >
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${iconBg}`}>
        <span className={`text-sm ${iconColor}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={
            dark ? "text-xs font-bold text-slate-200" : "text-xs font-bold text-slate-900"
          }
        >
          {title}
        </div>
        <div
          className="text-[10px] font-medium text-slate-500"
        >
          {subtitle}
        </div>
      </div>
      <span className="text-slate-300">›</span>
    </Link>
  );
}