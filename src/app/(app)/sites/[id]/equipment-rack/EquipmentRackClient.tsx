"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

type RackItem = {
  id: string;
  assetName: string;
  serialNumber: string;
  status: string;
};

type RackCard = {
  id: string;
  name: string;
  items: RackItem[];
};

function SummaryCard({
  dark,
  label,
  value,
  accent,
}: {
  dark: boolean;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)]"
      }
    >
      <div className={`h-1 ${accent}`} />
      <div className="p-4">
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
              ? "mt-2 text-2xl font-semibold tracking-tight text-slate-100"
              : "mt-2 text-2xl font-semibold tracking-tight text-[#1a1814]"
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function EquipmentRackClient({
  siteId,
  siteName,
  system,
  cards,
}: {
  siteId: string;
  siteName: string;
  system: {
    serial: string;
    part: string;
    status: string;
  };
  cards: RackCard[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const totalItems = cards.reduce((sum, card) => sum + card.items.length, 0);

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
                  href={`/sites/${siteId}`}
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                      : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                  }
                >
                  ← Back to {siteName}
                </Link>

                <div
                  className={
                    dark
                      ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                      : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Equipment Rack
                </div>
              </div>

              <h1
                className={
                  dark
                    ? "mt-4 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-4 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                {siteName} — Equipment Rack
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Review the rack system identity, inspect grouped rack components, and
                see the device distribution in a cleaner, easier layout.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip dark={dark} label="Serial" value={system.serial} />
                <Chip dark={dark} label="Part No" value={system.part} />
                <Chip dark={dark} label="Status" value={system.status} />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={
                dark
                  ? "overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
                  : "overflow-hidden rounded-3xl border border-[#e4dbd0] bg-white shadow-[0_10px_30px_rgba(26,24,20,0.05)]"
              }
            >
              <div className="h-1 w-full bg-[linear-gradient(90deg,#c8611a,#f59e0b)]" />

              <div className="flex items-center justify-between px-5 py-4">
                <div
                  className={
                    dark
                      ? "text-base font-semibold tracking-tight text-slate-100"
                      : "text-base font-semibold tracking-tight text-[#1a1814]"
                  }
                >
                  {card.name}
                </div>
                <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                  {card.items.length}
                </div>
              </div>

              <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

              <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                {card.items.length === 0 ? (
                  <div
                    className={
                      dark
                        ? "px-5 py-4 text-sm text-slate-500"
                        : "px-5 py-4 text-sm text-[#7b756d]"
                    }
                  >
                    None
                  </div>
                ) : (
                  card.items.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 px-5 py-3"
                    >
                      <div
                        className={
                          dark
                            ? "text-sm text-slate-300"
                            : "text-sm text-[#4f4a43]"
                        }
                      >
                        {a.assetName}
                      </div>
                      <div
                        className={
                          dark
                            ? "text-xs text-slate-500"
                            : "text-xs text-[#7b756d]"
                        }
                      >
                        {a.serialNumber}
                        <span className={dark ? "mx-2 text-slate-700" : "mx-2 text-gray-300"}>
                          •
                        </span>
                        {a.status}
                      </div>
                    </div>
                  ))
                )}
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

function Pill({
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
          ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
          : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5"
      }
    >
      <span className={dark ? "text-slate-500" : "text-[#8b857c]"}>{label}:</span>{" "}
      <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
        {value}
      </span>
    </span>
  );
}