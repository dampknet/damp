"use client";

import { useThemeMode } from "@/context/ThemeContext";

export default function StorePageLoading() {
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
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 animate-pulse">
        {/* Main Content Container */}
        <div
          className={
            dark
              ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl"
              : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
          }
        >
          {/* Top Animated Loader Bar (Sync with PageLoader style) */}
          <div
            className={
              dark
                ? "relative h-1 w-full overflow-hidden bg-white/10"
                : "relative h-1 w-full overflow-hidden bg-[#efe7dc]"
            }
          >
            <div 
              className="absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" 
              style={{ animation: "loader 1.2s ease-in-out infinite" }}
            />
          </div>

          <div className="px-6 py-8">
            {/* Header with Spinning Icon */}
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-white shadow-sm">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </div>

              <div>
                <div
                  className={
                    dark ? "h-5 w-40 rounded bg-white/10" : "h-5 w-40 rounded bg-[#ece6dc]"
                  }
                />
                <div
                  className={
                    dark ? "mt-3 h-4 w-72 rounded bg-white/10" : "mt-3 h-4 w-72 rounded bg-[#ece6dc]"
                  }
                />
              </div>
            </div>

            {/* Sub-text lines */}
            <div className="mt-6 space-y-2">
              <div
                className={
                  dark ? "h-3 w-full max-w-2xl rounded bg-white/10" : "h-3 w-full max-w-2xl rounded bg-[#ece6dc]"
                }
              />
              <div
                className={
                  dark ? "h-3 w-full max-w-xl rounded bg-white/10" : "h-3 w-full max-w-xl rounded bg-[#ece6dc]"
                }
              />
            </div>
          </div>
        </div>

        {/* Summary Stats Cards Skeleton */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={
                dark
                  ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                  : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm"
              }
            >
              <div className={dark ? "h-1 bg-white/10" : "h-1 bg-[#ece6dc]"} />
              <div className="p-4">
                <div className={dark ? "h-3 w-20 rounded bg-white/10" : "h-3 w-20 rounded bg-[#ece6dc]"} />
                <div className={dark ? "mt-4 h-8 w-16 rounded bg-white/10" : "mt-4 h-8 w-16 rounded bg-[#eee6db]"} />
                <div className={dark ? "mt-3 h-3 w-24 rounded bg-white/10" : "mt-3 h-3 w-24 rounded bg-[#f0e9df]"} />
              </div>
            </div>
          ))}
        </div>

        {/* Table/List Skeleton */}
        <div
          className={
            dark
              ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
              : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
          }
        >
          <div className={dark ? "h-1 bg-white/10" : "h-1 bg-[#ece6dc]"} />
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div className={dark ? "h-5 w-48 rounded bg-white/10" : "h-5 w-48 rounded bg-[#ece6dc]"} />
              <div className={dark ? "h-4 w-24 rounded bg-white/10" : "h-4 w-24 rounded bg-[#ece6dc]"} />
            </div>
            
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    dark
                      ? "h-12 rounded-xl border border-white/5 bg-white/5"
                      : "h-12 rounded-xl border border-[#f0e9df] bg-[#f8f4ee]"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loader {
          0% {
            transform: translateX(-120%);
          }
          100% {
            transform: translateX(320%);
          }
        }
      `}</style>
    </div>
  );
}