"use client";

import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";

type MuxRow = {
  label: string;
  serial: string;
  status: string;
};

type MuxBlockItem = {
  id: string;
  assetName: string;
  serialNumber: string;
  status: string;
};

type MuxBlock = {
  compName: string;
  list: MuxBlockItem[];
};

type MuxCard = {
  key: "TX_MUX_1_2" | "TX_MUX_3";
  title: string;
  blocks: MuxBlock[];
  totalItems: number;
  serialRows: MuxRow[];
};

export default function TransmitterClient({
  siteId,
  siteName,
  role,
  system,
  muxPairs,
}: {
  siteId: string;
  siteName: string;
  role: string;
  system: {
    serial: string;
    part: string;
    status: string;
  };
  muxPairs: MuxCard[];
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
        <Link
          href={`/sites/${siteId}`}
          className={
            dark
              ? "text-sm text-slate-400 hover:underline"
              : "text-sm text-gray-600 hover:underline"
          }
        >
          ← Back to {siteName}
        </Link>

        <h1
          className={
            dark
              ? "mt-3 text-2xl font-semibold text-slate-100"
              : "mt-3 text-2xl font-semibold text-gray-900"
          }
        >
          {siteName} — Transmitter
        </h1>

        <div
          className={
            dark
              ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-none backdrop-blur-xl"
              : "mt-6 rounded-2xl border bg-white p-6 shadow-sm"
          }
        >
          <div
            className={
              dark
                ? "text-base font-semibold text-slate-100"
                : "text-base font-semibold text-gray-900"
            }
          >
            Transmitter System
          </div>

          <div
            className={
              dark
                ? "mt-2 text-sm text-slate-400"
                : "mt-2 text-sm text-gray-700"
            }
          >
            Serial: <span className="font-semibold">{system.serial}</span>
            <span className={dark ? "mx-2 text-slate-700" : "mx-2 text-gray-300"}>•</span>
            Part No: <span className="font-semibold">{system.part}</span>
            <span className={dark ? "mx-2 text-slate-700" : "mx-2 text-gray-300"}>•</span>
            Status: <span className="font-semibold">{system.status}</span>
          </div>

          <div
            className={
              dark
                ? "mt-2 text-xs text-slate-500"
                : "mt-2 text-xs text-gray-500"
            }
          >
            Role: <span className="font-semibold">{role}</span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {muxPairs.map((mux) => (
            <div
              key={mux.key}
              className={
                dark
                  ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
                  : "overflow-hidden rounded-2xl border bg-white shadow-sm"
              }
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={
                      dark
                        ? "text-sm font-semibold text-slate-100"
                        : "text-sm font-semibold text-gray-900"
                    }
                  >
                    {mux.title}
                  </div>
                  <div
                    className={
                      dark
                        ? "text-xs text-slate-500"
                        : "text-xs text-gray-500"
                    }
                  >
                    {mux.totalItems} items
                  </div>
                </div>

                <div className={dark ? "mt-2 space-y-2 text-xs text-slate-400" : "mt-2 space-y-2 text-xs text-gray-700"}>
                  {mux.serialRows.map((row) => (
                    <div key={row.label}>
                      <span className={dark ? "text-slate-500" : "text-gray-500"}>
                        {row.label}:
                      </span>{" "}
                      <span className="font-medium">{row.serial}</span>
                      <span className={dark ? "mx-2 text-slate-700" : "mx-2 text-gray-300"}>•</span>
                      <span className="font-medium">{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={dark ? "h-px bg-white/8" : "h-px bg-gray-100"} />

              <div className="space-y-4 p-5">
                {mux.blocks.length === 0 ? (
                  <div
                    className={
                      dark
                        ? "text-sm text-slate-500"
                        : "text-sm text-gray-600"
                    }
                  >
                    No components yet.
                  </div>
                ) : (
                  mux.blocks.map((block) => (
                    <div
                      key={block.compName}
                      className={
                        dark
                          ? "overflow-hidden rounded-xl border border-white/10"
                          : "overflow-hidden rounded-xl border"
                      }
                    >
                      <div className="flex items-center justify-between px-4 py-3">
                        <div
                          className={
                            dark
                              ? "text-sm font-semibold text-slate-100"
                              : "text-sm font-semibold text-gray-900"
                          }
                        >
                          {block.compName}
                        </div>
                        <div
                          className={
                            dark
                              ? "text-xs text-slate-500"
                              : "text-xs text-gray-500"
                          }
                        >
                          {block.list.length}
                        </div>
                      </div>

                      <div className={dark ? "h-px bg-white/8" : "h-px bg-gray-100"} />

                      <div className={dark ? "divide-y divide-white/8" : "divide-y"}>
                        {block.list.map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-between px-4 py-2"
                          >
                            <div
                              className={
                                dark
                                  ? "text-sm text-slate-300"
                                  : "text-sm text-gray-800"
                              }
                            >
                              {a.assetName}
                            </div>
                            <div
                              className={
                                dark
                                  ? "text-xs text-slate-500"
                                  : "text-xs text-gray-600"
                              }
                            >
                              {a.serialNumber}
                              <span className={dark ? "mx-2 text-slate-700" : "mx-2 text-gray-300"}>•</span>
                              {a.status}
                            </div>
                          </div>
                        ))}
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