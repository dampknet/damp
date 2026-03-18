"use client";

import { useThemeMode } from "@/context/ThemeContext";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function PageLoader({
  title = "Loading page",
  subtitle = "Please wait while we prepare your data...",
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-[70vh] w-full bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-[70vh] w-full bg-[#f5f2ed]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div
          className={
            dark
              ? "overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
              : "overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
          }
        >
          {/* top loader bar */}
          <div
            className={
              dark
                ? "relative h-1 w-full overflow-hidden bg-white/10"
                : "relative h-1 w-full overflow-hidden bg-[#efe7dc]"
            }
          >
            <div className="absolute inset-y-0 left-0 w-1/3 animate-[loader_1.2s_ease-in-out_infinite] bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
          </div>

          <div className="px-6 py-8">
            {/* header */}
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-white shadow-sm">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </div>

              <div>
                <h2
                  className={
                    dark
                      ? "text-lg font-semibold tracking-tight text-slate-100"
                      : "text-lg font-semibold tracking-tight text-[#1a1814]"
                  }
                >
                  {title}
                </h2>
                <p
                  className={
                    dark
                      ? "mt-1 text-sm text-slate-400"
                      : "mt-1 text-sm text-[#7a746a]"
                  }
                >
                  {subtitle}
                </p>
              </div>
            </div>

            {/* cards skeleton */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={
                    dark
                      ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                      : "rounded-2xl border border-[#ece4d8] bg-[#fcfaf7] p-5"
                  }
                >
                  <div
                    className={
                      dark
                        ? "h-3 w-24 animate-pulse rounded bg-white/10"
                        : "h-3 w-24 animate-pulse rounded bg-[#e8e0d4]"
                    }
                  />
                  <div
                    className={
                      dark
                        ? "mt-4 h-8 w-20 animate-pulse rounded bg-white/10"
                        : "mt-4 h-8 w-20 animate-pulse rounded bg-[#eee6db]"
                    }
                  />
                  <div
                    className={
                      dark ? "mt-4 h-px w-full bg-white/10" : "mt-4 h-px w-full bg-[#efe7dc]"
                    }
                  />
                  <div
                    className={
                      dark
                        ? "mt-4 h-5 w-28 animate-pulse rounded-full bg-white/10"
                        : "mt-4 h-5 w-28 animate-pulse rounded-full bg-[#eee6db]"
                    }
                  />
                </div>
              ))}
            </div>

            {/* table skeleton */}
            <div
              className={
                dark
                  ? "mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"
                  : "mt-6 rounded-3xl border border-[#ece4d8] bg-[#fcfaf7] p-5"
              }
            >
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={
                    dark
                      ? "h-4 w-36 animate-pulse rounded bg-white/10"
                      : "h-4 w-36 animate-pulse rounded bg-[#e8e0d4]"
                  }
                />
                <div
                  className={
                    dark
                      ? "h-3 w-16 animate-pulse rounded bg-white/10"
                      : "h-3 w-16 animate-pulse rounded bg-[#eee6db]"
                  }
                />
              </div>

              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={
                      dark
                        ? "grid grid-cols-12 gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                        : "grid grid-cols-12 gap-3 rounded-xl border border-[#f0e9df] bg-white px-4 py-3"
                    }
                  >
                    {[...Array(6)].map((__, j) => (
                      <div
                        key={j}
                        className={
                          dark
                            ? "h-4 animate-pulse rounded bg-white/10"
                            : "h-4 animate-pulse rounded bg-[#efe7dc]"
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
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