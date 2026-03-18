"use client";

import { useThemeMode } from "@/context/ThemeContext";

export default function StorePageLoading() {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-[60vh] bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] px-4 py-10 text-slate-200"
          : "min-h-[60vh] bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)] px-4 py-10"
      }
    >
      <div className="mx-auto max-w-7xl animate-pulse">
        <div
          className={
            dark
              ? "rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
              : "rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
          }
        >
          <div
            className={
              dark
                ? "h-4 w-40 rounded bg-white/10"
                : "h-4 w-40 rounded bg-[#ece6dc]"
            }
          />
          <div
            className={
              dark
                ? "mt-5 h-10 w-72 rounded bg-white/10"
                : "mt-5 h-10 w-72 rounded bg-[#ece6dc]"
            }
          />
          <div
            className={
              dark
                ? "mt-4 h-4 w-full max-w-2xl rounded bg-white/10"
                : "mt-4 h-4 w-full max-w-2xl rounded bg-[#ece6dc]"
            }
          />
          <div
            className={
              dark
                ? "mt-2 h-4 w-full max-w-xl rounded bg-white/10"
                : "mt-2 h-4 w-full max-w-xl rounded bg-[#ece6dc]"
            }
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={
                dark
                  ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white"
              }
            >
              <div className={dark ? "h-1 bg-white/10" : "h-1 bg-[#ece6dc]"} />
              <div className="p-4">
                <div
                  className={
                    dark
                      ? "h-3 w-24 rounded bg-white/10"
                      : "h-3 w-24 rounded bg-[#ece6dc]"
                  }
                />
                <div
                  className={
                    dark
                      ? "mt-3 h-8 w-16 rounded bg-white/10"
                      : "mt-3 h-8 w-16 rounded bg-[#ece6dc]"
                  }
                />
                <div
                  className={
                    dark
                      ? "mt-3 h-3 w-28 rounded bg-white/10"
                      : "mt-3 h-3 w-28 rounded bg-[#ece6dc]"
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className={
            dark
              ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white"
          }
        >
          <div className={dark ? "h-1 bg-white/10" : "h-1 bg-[#ece6dc]"} />
          <div className="p-5">
            <div
              className={
                dark
                  ? "h-5 w-40 rounded bg-white/10"
                  : "h-5 w-40 rounded bg-[#ece6dc]"
              }
            />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    dark
                      ? "h-12 rounded-xl bg-white/5"
                      : "h-12 rounded-xl bg-[#f8f4ee]"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
