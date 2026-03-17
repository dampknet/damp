"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

export default function ReturnEquipmentClient({
  site,
  issue,
  action,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  issue: {
    id: string;
    requesterName: string;
    requesterContact: string | null;
    purpose: string;
    authorizedBy: string;
    issuedAt: Date;
    expectedReturnDate: Date | null;
    conditionAtIssue: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
    item: {
      id: string;
      name: string;
      stockNumber: string | null;
      serialNumber: string | null;
      quantity: number;
      unit: string | null;
      status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
      condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
    };
  };
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const nowValue = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
      }
    >
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
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
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#3b82f6)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#2a7d52,#10b981,#1d5fa8)]"
            }
          />

          <div className="flex flex-col gap-3">
            <Link
              href={`/store/sites/${site.id}/issues`}
              className={
                dark
                  ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                  : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
              }
            >
              ← Back to Issue Log
            </Link>

            <div
              className={
                dark
                  ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#10b981]"
                  : "inline-flex w-fit items-center gap-2 rounded-full border border-[#dcecdf] bg-[#f7fcf8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#2a7d52]"
              }
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Return Equipment
            </div>
          </div>

          <h1
            className={
              dark
                ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
            }
          >
            Return {issue.item.name}
          </h1>

          <p
            className={
              dark
                ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
            }
          >
            Complete the return record, update the item condition, and close this equipment issue properly.
          </p>

          {error ? (
            <div
              className={
                dark
                  ? "mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  : "mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }
            >
              {error}
            </div>
          ) : null}

          <div
            className={
              dark
                ? "mt-6 rounded-2xl border border-white/10 bg-white/5 p-5"
                : "mt-6 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
            }
          >
            <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
              Issue Summary
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Info dark={dark} label="Item" value={issue.item.name} />
              <Info dark={dark} label="Requester" value={issue.requesterName} />
              <Info dark={dark} label="Contact" value={issue.requesterContact ?? "-"} />
              <Info dark={dark} label="Authorized By" value={issue.authorizedBy} />
              <Info dark={dark} label="Issued At" value={new Date(issue.issuedAt).toLocaleString()} />
              <Info
                dark={dark}
                label="Expected Return"
                value={
                  issue.expectedReturnDate
                    ? new Date(issue.expectedReturnDate).toLocaleString()
                    : "-"
                }
              />
              <Info dark={dark} label="Condition At Issue" value={issue.conditionAtIssue ?? "-"} />
              <Info dark={dark} label="Current Item Condition" value={issue.item.condition ?? "-"} />
            </div>

            <div className="mt-4">
              <Info dark={dark} label="Purpose" value={issue.purpose} />
            </div>
          </div>

          <form action={action} className="mt-6 space-y-6">
            <section
              className={
                dark
                  ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                  : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
              }
            >
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Return Details
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Returned By" dark={dark}>
                  <input
                    name="returnedBy"
                    placeholder="Enter full name"
                    aria-label="Returned by"
                    title="Returned by"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>

                <Field label="Return Contact" dark={dark}>
                  <input
                    name="returnContact"
                    placeholder="Phone number or contact"
                    aria-label="Return contact"
                    title="Return contact"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Returned At" dark={dark}>
                  <input
                    name="returnedAt"
                    type="datetime-local"
                    defaultValue={nowValue}
                    aria-label="Returned at"
                    title="Returned at"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>

                <Field label="Return Condition" dark={dark}>
                  <select
                    name="returnCondition"
                    defaultValue={issue.item.condition ?? "GOOD"}
                    aria-label="Return condition"
                    title="Return condition"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                  >
                    <option value="GOOD">GOOD</option>
                    <option value="FAULTY">FAULTY</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="UNDER_REPAIR">UNDER REPAIR</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Return Note (optional)" dark={dark}>
                  <textarea
                    name="returnNote"
                    rows={4}
                    placeholder="Add remarks about returned condition or observations..."
                    aria-label="Return note"
                    title="Return note"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                  />
                </Field>
              </div>
            </section>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#2a7d52] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                }
              >
                Complete Return
              </button>

              <Link
                href={`/store/sites/${site.id}/issues`}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2]"
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

function Field({
  label,
  children,
  dark,
}: {
  label: string;
  children: React.ReactNode;
  dark: boolean;
}) {
  return (
    <label className="block">
      <div
        className={
          dark
            ? "mb-1 text-xs font-medium text-slate-400"
            : "mb-1 text-xs font-medium text-gray-600"
        }
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function Info({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark: boolean;
}) {
  return (
    <div>
      <div
        className={
          dark
            ? "text-xs font-medium uppercase tracking-[0.12em] text-slate-500"
            : "text-xs font-medium uppercase tracking-[0.12em] text-[#8b857c]"
        }
      >
        {label}
      </div>
      <div
        className={
          dark
            ? "mt-1 text-sm text-slate-200"
            : "mt-1 text-sm text-[#1a1814]"
        }
      >
        {value}
      </div>
    </div>
  );
}