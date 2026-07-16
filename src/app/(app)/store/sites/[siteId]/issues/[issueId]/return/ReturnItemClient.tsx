"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { ArrowLeft } from "lucide-react";

const CONDITIONS = ["NEW", "UNUSED", "USED", "FAULTY"] as const;

function conditionColor(c: string) {
  if (c === "NEW")    return "border-blue-500/40 bg-blue-500/10 text-blue-400";
  if (c === "UNUSED") return "border-sky-500/40 bg-sky-500/10 text-sky-400";
  if (c === "USED")   return "border-amber-500/40 bg-amber-500/10 text-amber-400";
  return "border-red-500/40 bg-red-500/10 text-red-400";
}

type Unit = {
  key:              string;
  entityCode:       string | null;
  currentCondition: string;
};

export default function ReturnItemClient({
  siteId, issue, units, action,
}: {
  siteId: string;
  issue: {
    id:       string;
    takenBy:  string;
    purpose:  string;
    isTracked: boolean;
    inventoryItem: {
      name:     string;
      itemType: string;
      itemCode: string | null;
      unit:     string | null;
    };
  };
  units:  Unit[];
  action: (formData: FormData) => void;
}) {
  const { mode }     = useThemeMode();
  const dark         = mode === "dark";
  const searchParams = useSearchParams();
  const error        = searchParams.get("error");

  const inputCls = dark
    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-8 shadow-[0_16px_40px_rgba(26,24,20,0.06)]"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#1d5fa8)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981,#1d5fa8)]"
          } />

          <Link href={`/store/sites/${siteId}/issues`}
            className={dark
              ? "mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
              : "mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
            }>
            <ArrowLeft size={16} /> Back to Issue Log
          </Link>

          <div className={dark
            ? "mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400"
            : "mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700"
          }>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Process Return
          </div>

          <h1 className={dark
            ? "mt-4 text-3xl font-semibold tracking-tight text-slate-100"
            : "mt-4 text-3xl font-semibold tracking-tight text-[#1a1814]"
          }>
            Return: {issue.inventoryItem.name}
          </h1>

          <div className={dark ? "mt-2 text-sm text-slate-400" : "mt-2 text-sm text-[#857f76]"}>
            Issued to <span className="font-semibold">{issue.takenBy}</span> · {issue.purpose}
          </div>

          {error && (
            <div className={dark
              ? "mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{error}</div>
          )}

          <form action={action} className="mt-8 space-y-6">

            {/* ── Return Details ── */}
            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "mb-4 text-sm font-semibold text-slate-100" : "mb-4 text-sm font-semibold text-[#1a1814]"}>
                Return Details
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                    Returned By <span className="text-red-500">*</span>
                  </label>
                  <input name="returnedBy" required placeholder="Full name of person returning"
                    className={inputCls} />
                </div>
                <div>
                  <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                    Date Returned
                  </label>
                  <input name="returnedAt" type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className={inputCls} />
                </div>
              </div>
              <div className="mt-4">
                <label className={dark ? "mb-1 block text-xs font-medium text-slate-400" : "mb-1 block text-xs font-medium text-gray-600"}>
                  Note (optional)
                </label>
                <textarea name="returnNote" rows={3}
                  placeholder="Any remarks about the return..."
                  className={inputCls} />
              </div>
            </section>

            {/* ── Per-unit condition ── */}
            <section className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-5"
              : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }>
              <div className={dark ? "mb-1 text-sm font-semibold text-slate-100" : "mb-1 text-sm font-semibold text-[#1a1814]"}>
                Condition on Return
              </div>
              <p className={dark ? "mb-4 text-xs text-slate-500" : "mb-4 text-xs text-[#8b857c]"}>
                {issue.isTracked
                  ? "Set condition per unit. The system will automatically move each unit to the matching item row (or create a new one)."
                  : "Set condition for the returned batch."
                }
              </p>

              <div className="space-y-3">
                {units.map((unit, i) => (
                  <div key={unit.key}
                    className={dark
                      ? "flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                      : "flex flex-wrap items-center gap-4 rounded-xl border border-[#e7dfd4] bg-white px-4 py-3"
                    }
                  >
                    {/* Unit label */}
                    <div className="min-w-0 flex-1">
                      {unit.entityCode ? (
                        <div className="font-mono text-sm font-bold text-sky-500">
                          {unit.entityCode}
                        </div>
                      ) : (
                        <div className={dark ? "text-sm font-semibold text-slate-300" : "text-sm font-semibold text-[#5d584f]"}>
                          Unit {i + 1} of {units.length}
                        </div>
                      )}
                      {unit.currentCondition && (
                        <div className={dark ? "mt-0.5 text-xs text-slate-500" : "mt-0.5 text-xs text-[#8b857c]"}>
                          Was issued as: <span className="font-semibold">{unit.currentCondition}</span>
                        </div>
                      )}
                    </div>

                    {/* Condition picker */}
                    <div className="flex flex-wrap gap-2">
                      {CONDITIONS.map((cond) => (
                        <label key={cond} className="cursor-pointer">
                          <input
                            type="radio"
                            name={`condition_${unit.key}`}
                            value={cond}
                            defaultChecked={cond === "USED"}
                            className="sr-only"
                          />
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold transition-all has-[:checked]:ring-2 has-[:checked]:ring-offset-1 ${conditionColor(cond)}`}>
                            {cond}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Info box for tracked items ── */}
            {issue.isTracked && (
              <div className={dark
                ? "rounded-2xl border border-sky-500/20 bg-sky-500/5 px-4 py-3 text-xs text-sky-300"
                : "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700"
              }>
                <span className="font-bold">What happens next:</span> Each unit will be moved to an existing inventory row matching its new condition, or a new row will be created automatically with the next available item code. The unit keeps its original entity code.
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button type="submit"
                className={dark
                  ? "rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-8 py-3 text-sm font-bold text-white hover:opacity-90"
                  : "rounded-xl bg-[#2a7d52] px-8 py-3 text-sm font-bold text-white hover:opacity-95"
                }
              >
                Confirm Return ({units.length} unit{units.length !== 1 ? "s" : ""})
              </button>
              <Link href={`/store/sites/${siteId}/issues`}
                className={dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
                  : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2]"
                }
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
