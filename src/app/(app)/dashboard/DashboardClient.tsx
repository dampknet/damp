"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
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
  received: number;
  notReceived: number;
  activePct: number;
  airPct: number;
  knetPct: number;
  receivedPct: number;
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

// ── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 2600);
    const t3 = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(135deg, #080c10 0%, #0c1520 50%, #080c10 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        transition: "opacity 0.6s ease",
        opacity: phase === "exit" ? 0 : 1,
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* Decorative grid lines */}
      <div style={{
        position: "absolute", inset: 0, overflow: "hidden", opacity: 0.04,
        backgroundImage: "linear-gradient(#d4a843 1px, transparent 1px), linear-gradient(90deg, #d4a843 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: "linear-gradient(90deg, transparent, #d4a843, #e8c46a, #d4a843, transparent)",
        transform: phase === "enter" ? "scaleX(0)" : "scaleX(1)",
        transition: "transform 1.2s cubic-bezier(0.22,1,0.36,1)",
      }} />

      {/* Logo mark */}
      <div style={{
        transform: phase === "enter" ? "translateY(20px)" : "translateY(0)",
        opacity: phase === "enter" ? 0 : 1,
        transition: "all 0.8s cubic-bezier(0.22,1,0.36,1)",
      }}>
        {/* Hex emblem */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "32px" }}>
          <div style={{
            width: "72px", height: "72px",
            border: "2px solid #d4a843",
            borderRadius: "16px",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            boxShadow: "0 0 40px rgba(212,168,67,0.2), inset 0 0 20px rgba(212,168,67,0.05)",
          }}>
            <div style={{
              position: "absolute", inset: "4px",
              border: "1px solid rgba(212,168,67,0.3)",
              borderRadius: "12px",
            }} />
            <span style={{ fontSize: "28px", fontWeight: 900, color: "#d4a843", letterSpacing: "-1px", fontFamily: "Georgia, serif" }}>K</span>
          </div>
        </div>

        {/* Organisation name */}
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "11px", fontWeight: 700, letterSpacing: "0.35em",
            color: "#d4a843", marginBottom: "16px", textTransform: "uppercase",
            fontFamily: "Georgia, serif",
          }}>
            KNET — GHANA
          </div>
          <div style={{
            fontSize: "clamp(22px, 4vw, 32px)",
            fontWeight: 700,
            color: "#f0ece4",
            letterSpacing: "-0.5px",
            lineHeight: 1.2,
            fontFamily: "Georgia, 'Times New Roman', serif",
            maxWidth: "520px",
            textAlign: "center",
          }}>
            DTT Asset Management
            <br />
            <span style={{ color: "#d4a843" }}>&amp;</span> Inventory Platform
          </div>
          <div style={{
            marginTop: "20px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            <div style={{ height: "1px", width: "48px", background: "linear-gradient(90deg, transparent, #d4a843)" }} />
            <span style={{ fontSize: "10px", letterSpacing: "0.25em", color: "rgba(212,168,67,0.6)", textTransform: "uppercase", fontFamily: "Georgia, serif" }}>
              Secure · Live · Integrated
            </span>
            <div style={{ height: "1px", width: "48px", background: "linear-gradient(90deg, #d4a843, transparent)" }} />
          </div>
        </div>
      </div>

      {/* Bottom loading bar */}
      <div style={{
        position: "absolute", bottom: "48px",
        width: "200px", height: "2px",
        background: "rgba(212,168,67,0.15)",
        borderRadius: "2px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          background: "linear-gradient(90deg, #d4a843, #e8c46a)",
          width: phase === "enter" ? "0%" : "100%",
          transition: "width 2s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardClient({
  role, email, displayName, dateLabel, stats, recentActivity,
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
  const [showSplash, setShowSplash] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!showSplash) {
      const t = setTimeout(() => setVisible(true), 60);
      return () => clearTimeout(t);
    }
  }, [showSplash]);

  // ── Light/dark tokens ──────────────────────────────────────────────────────
  const t = dark ? {
    page:       "bg-[#080c10]",
    text:       "text-[#e8e2d8]",
    muted:      "text-[#6b7280]",
    subtle:     "text-[#9ca3af]",
    card:       "bg-[#0d1520] border-[#1e2d3d]",
    cardHover:  "hover:border-[#2a3f55] hover:bg-[#101a27]",
    divider:    "border-[#1e2d3d]",
    tag:        "bg-[#0d1520] border-[#1e2d3d] text-[#6b7280]",
    input:      "bg-[#0d1520] border-[#1e2d3d]",
    accent:     "#d4a843",
    bar:        "bg-[#131f2e]",
  } : {
    page:       "bg-[#f4f1ec]",
    text:       "text-[#1a1610]",
    muted:      "text-[#6b6560]",
    subtle:     "text-[#9c978f]",
    card:       "bg-white border-[#e2dcd4]",
    cardHover:  "hover:border-[#c8bfb0] hover:shadow-md",
    divider:    "border-[#e8e2d8]",
    tag:        "bg-[#f0ebe3] border-[#e2dcd4] text-[#6b6560]",
    input:      "bg-white border-[#e2dcd4]",
    accent:     "#b8891e",
    bar:        "bg-[#ece7df]",
  };

  const gold    = dark ? "#d4a843" : "#b8891e";
  const goldBg  = dark ? "rgba(212,168,67,0.08)" : "rgba(184,137,30,0.08)";
  const goldBdr = dark ? "border-[rgba(212,168,67,0.2)]" : "border-[rgba(184,137,30,0.2)]";

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <div className={`min-h-screen ${t.page} ${t.text} transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

        {/* Top rule */}
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

        <div className="mx-auto max-w-7xl px-5 py-7 md:px-8">

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <header className={`mb-8 flex flex-col gap-5 border-b ${t.divider} pb-7 lg:flex-row lg:items-end lg:justify-between`}>
            <div>
              {/* Eyebrow */}
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex items-center gap-2 rounded-full border ${goldBdr} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]`}
                  style={{ color: gold, background: goldBg }}>
                  <span className="inline-block h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: gold }} />
                  Live System · {dateLabel}
                </div>
                <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${t.muted}`}>
                  {role}
                </span>
              </div>

              {/* Title block */}
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-1`} style={{ color: gold }}>
                  KNET — GHANA
                </div>
                <h1 className={`text-3xl font-bold tracking-tight ${t.text}`} style={{ fontFamily: "Georgia, serif" }}>
                  DTT Asset Management
                </h1>
                <p className={`mt-1 text-sm ${t.muted}`}>
                  Welcome back, <span className={`font-semibold ${t.text}`}>{displayName}</span>. Live summary of sites, assets &amp; store.
                </p>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-2.5">
              <Link href="/sites"
                className={`rounded-lg border ${t.input} px-5 py-2.5 text-sm font-semibold ${t.text} transition ${t.cardHover}`}>
                ← Sites
              </Link>
              <Link href="/store"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-[#0d1520] transition hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${gold}, #e8c46a)` }}>
                Store →
              </Link>
            </div>
          </header>

          {/* ── KPI Row ────────────────────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard t={t} dark={dark} gold={gold} goldBg={goldBg} goldBdr={goldBdr}
              href="/sites" label="Total Sites" value={String(stats.sites)}
              sub="registered" delta={`${stats.sitesActive} online`} deltaOk />

            <KpiCard t={t} dark={dark} gold={gold} goldBg={goldBg} goldBdr={goldBdr}
              href="/sites?group=status" label="Active / Down"
              value={`${stats.sitesActive} / ${stats.sitesDown}`}
              sub="site status" delta={`${stats.sitesDown} offline`} deltaOk={stats.sitesDown === 0} />

            <KpiCard t={t} dark={dark} gold={gold} goldBg={goldBg} goldBdr={goldBdr}
              href="/sites?group=tt" label="Air / Liquid"
              value={`${stats.airSites} / ${stats.liquidSites}`}
              sub="cooling type" delta={`${stats.airPct}% air-cooled`} deltaOk />

            <KpiCard t={t} dark={dark} gold={gold} goldBg={goldBg} goldBdr={goldBdr}
              href="/sites?group=tower" label="KNET / GBC"
              value={`${stats.knetSites} / ${stats.gbcSites}`}
              sub="tower group" delta={`${stats.knetPct}% KNET`} deltaOk />
          </div>

          {/* ── Middle row ─────────────────────────────────────────────────── */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">

            {/* Assets */}
            <SectionCard t={t} dark={dark} gold={gold} title="Assets" badge={`${stats.assets} total`} href="/assets">
              <ProgressBar t={t} dark={dark} gold={gold} label="Utilisation" value={`${stats.assetUtilPct}%`} pct={stats.assetUtilPct} color={gold} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniStat t={t} dark={dark} label="Assets" value={String(stats.assets)} color="#10b981" />
                <MiniStat t={t} dark={dark} label="Sites" value={String(stats.sites)} color={gold} />
              </div>
            </SectionCard>

            {/* Store */}
            <SectionCard t={t} dark={dark} gold={gold} title="Store" badge={`${stats.storeTotal} items`}>
              <StoreRow t={t} dark={dark} label="Received" value={String(stats.received)} color="#10b981" icon="✓" />
              <StoreRow t={t} dark={dark} label="Pending" value={String(stats.notReceived)} color="#f97316" icon="⏳" />
              <div className="mt-4">
                <ProgressBar t={t} dark={dark} gold={gold} label="Fulfilment" value={`${stats.receivedPct}%`} pct={stats.receivedPct} color="#10b981" />
              </div>
            </SectionCard>

            {/* Site Health */}
            <SectionCard t={t} dark={dark} gold={gold} title="Site Health" badge={`${stats.activePct}% up`}>
              <ProgressBar t={t} dark={dark} gold={gold} label="Active" value={`${stats.sitesActive}/${stats.sites}`} pct={stats.activePct} color="#10b981" />
              <ProgressBar t={t} dark={dark} gold={gold} label="Air-cooled" value={`${stats.airSites}/${stats.sites}`} pct={stats.airPct} color="#3b82f6" />
              <ProgressBar t={t} dark={dark} gold={gold} label="KNET" value={`${stats.knetSites}/${stats.sites}`} pct={stats.knetPct} color={gold} />
            </SectionCard>
          </div>

          {/* ── Bottom row ─────────────────────────────────────────────────── */}
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.8fr_1fr]">

            {/* Activity */}
            <SectionCard t={t} dark={dark} gold={gold} title="Recent Activity"
              action={
                <Link href="/activity" className="text-[11px] font-bold uppercase tracking-widest transition hover:opacity-70"
                  style={{ color: gold }}>View all →</Link>
              }>
              <div className="space-y-0">
                {recentActivity.length === 0 ? (
                  <p className={`py-8 text-sm ${t.muted}`}>No recent activity yet.</p>
                ) : recentActivity.map((item, i) => (
                  <div key={item.id}
                    className={`flex items-start gap-3 border-b ${t.divider} py-3.5 last:border-b-0`}
                    style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="mt-2 flex-shrink-0">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: gold }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-semibold ${t.text}`}>{item.title}</div>
                      {item.details && <div className={`mt-0.5 text-xs ${t.muted}`}>{item.details}</div>}
                      {item.actorEmail && <div className={`mt-0.5 text-[11px] ${t.muted} opacity-70`}>by {item.actorEmail}</div>}
                    </div>
                    <div className={`flex-shrink-0 rounded-md border ${t.tag} px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap`}>
                      {item.createdAtLabel}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Quick Actions */}
            <SectionCard t={t} dark={dark} gold={gold} title="Quick Actions">
              <QuickAction t={t} dark={dark} gold={gold} href="/sites"
                title="Go to Sites" sub={`Manage all ${stats.sites} sites`} icon="🗺" />
              <QuickAction t={t} dark={dark} gold={gold} href="/store"
                title="Go to Store" sub={`${stats.storeTotal} items · ${stats.notReceived} pending`} icon="📦" />
              <QuickAction t={t} dark={dark} gold={gold} href="/sites?group=status"
                title="Down Sites" sub={`${stats.sitesDown} currently offline`} icon="⚠️" />
            </SectionCard>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <footer className={`mt-8 flex items-center justify-between border-t ${t.divider} pt-5`}>
            <div className={`text-[11px] ${t.muted}`}>
              Signed in as <span className={`font-bold ${t.text}`}>{role}</span>
              {email ? <span className="opacity-60"> · {email}</span> : null}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: gold, opacity: 0.6 }}>
              KNET — Ghana DTT
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ t, dark, gold, goldBg, goldBdr, href, label, value, sub, delta, deltaOk }: any) {
  const inner = (
    <div className={`group overflow-hidden rounded-xl border ${t.card} ${t.cardHover} p-5 transition-all duration-200 cursor-pointer`}>
      {/* Gold top rule on hover */}
      <div className="h-[2px] -mx-5 -mt-5 mb-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />

      <div className={`text-[10px] font-bold uppercase tracking-[0.18em] ${t.muted} mb-3`}>{label}</div>
      <div className={`text-3xl font-bold tracking-tight ${t.text} mb-4`} style={{ fontFamily: "Georgia, serif" }}>
        {value}
      </div>
      <div className={`flex items-center justify-between border-t ${t.divider} pt-3`}>
        <span className={`text-[11px] ${t.muted}`}>{sub}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border`}
          style={{
            color: deltaOk ? "#10b981" : "#f87171",
            borderColor: deltaOk ? "rgba(16,185,129,0.25)" : "rgba(248,113,113,0.25)",
            background: deltaOk ? "rgba(16,185,129,0.08)" : "rgba(248,113,113,0.08)",
          }}>
          {delta}
        </span>
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function SectionCard({ t, dark, gold, title, badge, action, children, href }: any) {
  const inner = (
    <div className={`rounded-xl border ${t.card} p-5 transition-all duration-200 h-full`}>
      <div className={`mb-5 flex items-center justify-between border-b ${t.divider} pb-4`}>
        <h2 className={`text-sm font-bold uppercase tracking-[0.12em] ${t.text}`}>{title}</h2>
        {action ?? (badge
          ? <span className={`rounded-full border ${t.tag} px-2.5 py-0.5 text-[10px] font-semibold`}>{badge}</span>
          : null)}
      </div>
      {children}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}

function ProgressBar({ t, dark, gold, label, value, pct, color }: any) {
  return (
    <div className="mb-4 last:mb-0">
      <div className={`mb-1.5 flex justify-between text-xs`}>
        <span className={t.muted}>{label}</span>
        <span className={`font-semibold ${t.text}`}>{value}</span>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${t.bar}`}>
        <div className={`h-full rounded-full ${progressWidthClass(pct)} transition-all duration-1000`}
          style={{ background: color }} />
      </div>
    </div>
  );
}

function MiniStat({ t, dark, label, value, color }: any) {
  return (
    <div className={`rounded-lg border ${t.card} px-4 py-3`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.1em] ${t.muted} mb-1`}>{label}</div>
      <div className="text-2xl font-bold" style={{ color, fontFamily: "Georgia, serif" }}>{value}</div>
    </div>
  );
}

function StoreRow({ t, dark, label, value, color, icon }: any) {
  return (
    <div className={`flex items-center justify-between border-b ${t.divider} py-3.5 last:border-b-0`}>
      <div>
        <div className={`text-[11px] font-bold uppercase tracking-[0.1em] ${t.muted}`}>{label}</div>
        <div className="text-2xl font-bold mt-0.5" style={{ color, fontFamily: "Georgia, serif" }}>{value}</div>
      </div>
      <div className="text-xl opacity-60">{icon}</div>
    </div>
  );
}

function QuickAction({ t, dark, gold, href, title, sub, icon }: any) {
  return (
    <Link href={href}
      className={`group mb-2.5 flex items-center gap-3 rounded-lg border ${t.card} ${t.cardHover} p-3.5 transition-all duration-200 last:mb-0`}>
      <div className="text-lg w-8 text-center flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${t.text}`}>{title}</div>
        <div className={`text-[11px] ${t.muted} mt-0.5`}>{sub}</div>
      </div>
      <span className={`text-lg ${t.muted} group-hover:translate-x-0.5 transition-transform`}>›</span>
    </Link>
  );
}