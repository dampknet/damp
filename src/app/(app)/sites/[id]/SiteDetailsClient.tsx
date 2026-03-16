"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

type SiteInfo = {
  id: string;
  name: string;
  regMFreq: string | null;
  power: number | null;
  transmitterTypeLabel: string;
  status: string;
  totalAssets: number;
};

type CategoryCard = {
  id: string;
  name: string;
  count: number;
  href: string;
  isTransmitter: boolean;
  isRack: boolean;
};

function accentForCard(name: string) {
  if (name === "Transmitter") return "bg-[linear-gradient(90deg,#1d5fa8,#3b82f6)]";
  if (name === "Equipment Rack") return "bg-[linear-gradient(90deg,#c8611a,#f59e0b)]";
  if (name === "Solar") return "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]";
  return "bg-[linear-gradient(90deg,#1a1814,#4a4740)]";
}

export default function SiteDetailsClient({
  site,
  categoryCards,
}: {
  site: SiteInfo;
  categoryCards: CategoryCard[];
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

          {!dark ? (
            <>
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#1d5fa8]/8 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#c8611a]/8 blur-3xl" />
            </>
          ) : null}

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-col gap-3">
                <Link
                  href="/sites"
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                      : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                  }
                >
                  ← Back to Sites
                </Link>

                <div
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                      : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Site Overview
                </div>
              </div>

              <h1
                className={
                  dark
                    ? "mt-4 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                {site.name}
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Review this site’s device categories, open transmitter and equipment rack
                details quickly, and inspect the complete inventory from one place.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip dark={dark} label="REG M FREQ" value={site.regMFreq ?? "-"} />
                <Chip dark={dark} label="Power" value={String(site.power ?? "-")} />
                <Chip dark={dark} label="Tx Type" value={site.transmitterTypeLabel} />
                <Chip dark={dark} label="Status" value={site.status} />
                <Chip dark={dark} label="Total devices" value={String(site.totalAssets)} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/sites/${site.id}/assets`}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd4c7] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] shadow-sm hover:bg-[#faf7f2]"
                }
              >
                View All Devices
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {categoryCards.map((c) => (
            <div
              key={c.id}
              className={
                dark
                  ? "group overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:-translate-y-1"
                  : "group overflow-hidden rounded-3xl border border-[#e4dbd0] bg-white shadow-[0_10px_30px_rgba(26,24,20,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(26,24,20,0.08)]"
              }
            >
              <div className={`h-1 ${accentForCard(c.name)}`} />

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className={
                        dark
                          ? "text-lg font-semibold tracking-tight text-slate-100"
                          : "text-lg font-semibold tracking-tight text-[#1a1814]"
                      }
                    >
                      {c.name}
                    </div>

                    <div
                      className={
                        dark
                          ? "mt-2 inline-flex rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300"
                          : "mt-2 inline-flex rounded-full bg-[#f5f2ed] px-3 py-1 text-xs font-semibold text-[#5b564d]"
                      }
                    >
                      Items: {c.count}
                    </div>

                    {c.isTransmitter ? (
                      <p
                        className={
                          dark
                            ? "mt-3 text-sm leading-6 text-slate-400"
                            : "mt-3 text-sm leading-6 text-[#7b756d]"
                        }
                      >
                        TX MUX 1/2 and TX MUX 3 components such as amps, exciters,
                        pumps, and related system units.
                      </p>
                    ) : null}

                    {c.isRack ? (
                      <p
                        className={
                          dark
                            ? "mt-3 text-sm leading-6 text-slate-400"
                            : "mt-3 text-sm leading-6 text-[#7b756d]"
                        }
                      >
                        Harmonic (PVR), Modem, Mikrotik Routerboard, and Enensys for
                        some sites.
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={c.href}
                    className={
                      dark
                        ? "shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/10"
                        : "shrink-0 rounded-xl border border-[#ddd4c7] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] shadow-sm transition hover:bg-[#faf7f2]"
                    }
                  >
                    Open
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Chip({
  dark,
  label,
  value,
}: {
  dark: boolean;
  label: string;
  value: string;
}) {
  return (
    <span
      className={
        dark
          ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
          : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
      }
    >
      {label}:{" "}
      <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
        {value}
      </span>
    </span>
  );
}