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
          : "min-h-screen bg-gray-50"
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link
              href="/sites"
              className={
                dark
                  ? "text-sm text-slate-400 hover:underline"
                  : "text-sm text-gray-600 hover:underline"
              }
            >
              ← Back to Sites
            </Link>

            <h1
              className={
                dark
                  ? "mt-2 text-2xl font-semibold text-slate-100"
                  : "mt-2 text-2xl font-semibold text-gray-900"
              }
            >
              {site.name}
            </h1>

            <p
              className={
                dark
                  ? "mt-1 text-sm text-slate-400"
                  : "mt-1 text-sm text-gray-600"
              }
            >
              REG M FREQ: <span className="font-medium">{site.regMFreq ?? "-"}</span>{" "}
              • Power: <span className="font-medium">{site.power ?? "-"}</span>{" "}
              • Tx Type: <span className="font-medium">{site.transmitterTypeLabel}</span>{" "}
              • Status: <span className="font-medium">{site.status}</span>{" "}
              • Total devices: <span className="font-medium">{site.totalAssets}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/sites/${site.id}/assets`}
              className={
                dark
                  ? "rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/10"
                  : "rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              }
            >
              View All Devices
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {categoryCards.map((c) => (
            <div
              key={c.id}
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl"
                  : "rounded-xl border bg-white p-4"
              }
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className={
                      dark
                        ? "text-base font-semibold text-slate-100"
                        : "text-base font-semibold text-gray-900"
                    }
                  >
                    {c.name}
                  </div>

                  <div
                    className={
                      dark
                        ? "mt-1 text-sm text-slate-400"
                        : "mt-1 text-sm text-gray-600"
                    }
                  >
                    Items: <span className="font-medium">{c.count}</span>
                  </div>

                  {c.isTransmitter ? (
                    <p
                      className={
                        dark
                          ? "mt-2 text-xs text-slate-500"
                          : "mt-2 text-xs text-gray-500"
                      }
                    >
                      TX MUX 1/2 and TX MUX 3 components (amps, exciters, pumps, etc.).
                    </p>
                  ) : null}

                  {c.isRack ? (
                    <p
                      className={
                        dark
                          ? "mt-2 text-xs text-slate-500"
                          : "mt-2 text-xs text-gray-500"
                      }
                    >
                      Harmonic(PVR), Modem, Mikrotik Routerboard (and Enensys for some sites).
                    </p>
                  ) : null}
                </div>

                <Link
                  href={c.href}
                  className={
                    dark
                      ? "rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/10"
                      : "rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  }
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}