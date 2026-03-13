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
          {siteName} — Equipment Rack
        </h1>

        <div
          className={
            dark
              ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
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
            Equipment Rack
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
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <div
              key={card.id}
              className={
                dark
                  ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
                  : "overflow-hidden rounded-2xl border bg-white shadow-sm"
              }
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div
                  className={
                    dark
                      ? "text-sm font-semibold text-slate-100"
                      : "text-sm font-semibold text-gray-900"
                  }
                >
                  {card.name}
                </div>
                <div
                  className={
                    dark
                      ? "text-xs text-slate-500"
                      : "text-xs text-gray-500"
                  }
                >
                  {card.items.length}
                </div>
              </div>

              <div className={dark ? "h-px bg-white/8" : "h-px bg-gray-100"} />

              <div className={dark ? "divide-y divide-white/8" : "divide-y"}>
                {card.items.length === 0 ? (
                  <div
                    className={
                      dark
                        ? "px-5 py-4 text-sm text-slate-500"
                        : "px-5 py-4 text-sm text-gray-600"
                    }
                  >
                    None
                  </div>
                ) : (
                  card.items.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-5 py-3"
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