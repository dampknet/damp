"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

export default function NewInventoryItemClient({
  site,
  action,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [itemType, setItemType] = useState<"MATERIAL" | "EQUIPMENT">("MATERIAL");

  const statusOptions = useMemo(
    () => [
      { value: "AVAILABLE", label: "AVAILABLE" },
      { value: "LOW_STOCK", label: "LOW STOCK" },
      { value: "OUT_OF_STOCK", label: "OUT OF STOCK" },
      ...(itemType === "EQUIPMENT"
        ? [{ value: "CHECKED_OUT", label: "CHECKED OUT" }]
        : []),
      { value: "INACTIVE", label: "INACTIVE" },
    ],
    [itemType]
  );

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
                ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#f97316)]"
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
            }
          />

          <div className="flex flex-col gap-3">
            <Link
              href={`/store/sites/${site.id}`}
              className={
                dark
                  ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                  : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
              }
            >
              ← Back to {site.name} Inventory
            </Link>

            <div
              className={
                dark
                  ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                  : "inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfce] bg-[#fcfaf6] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
              }
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              New Inventory Item
            </div>
          </div>

          <h1
            className={
              dark
                ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
            }
          >
            Add Inventory Item
          </h1>

          <p
            className={
              dark
                ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
            }
          >
            Add a new material or equipment item to {site.name}. Equipment can carry
            condition details, while materials stay focused on stock quantity and thresholds.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Chip dark={dark} label="Site" value={site.name} />
            <Chip dark={dark} label="Location" value={site.location ?? "-"} />
            <Chip dark={dark} label="Mode" value={itemType} />
          </div>

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

          <form action={action} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Item Type" dark={dark}>
                <select
                  name="itemType"
                  value={itemType}
                  onChange={(e) =>
                    setItemType(e.target.value as "MATERIAL" | "EQUIPMENT")
                  }
                  aria-label="Select inventory item type"
                  title="Select inventory item type"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                >
                  <option value="MATERIAL">MATERIAL</option>
                  <option value="EQUIPMENT">EQUIPMENT</option>
                </select>
              </Field>

              <Field label="Item Name" dark={dark}>
                <input
                  name="name"
                  placeholder="e.g. RF Cable, Generator, Toolkit"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                  required
                />
              </Field>
            </div>

            <Field label="Description" dark={dark}>
              <textarea
                name="description"
                rows={4}
                placeholder="Enter item description..."
                className={
                  dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                }
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Stock Number" dark={dark}>
                <input
                  name="stockNumber"
                  placeholder="optional"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>

              <Field label="Manufacturer" dark={dark}>
                <input
                  name="manufacturer"
                  placeholder="optional"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>

              <Field label="Model" dark={dark}>
                <input
                  name="model"
                  placeholder="optional"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Serial Number" dark={dark}>
                <input
                  name="serialNumber"
                  placeholder={itemType === "EQUIPMENT" ? "recommended" : "optional"}
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>

              <Field label="Quantity" dark={dark}>
                <input
                  name="quantity"
                  type="number"
                  min="0"
                  defaultValue="0"
                  aria-label="Enter quantity"
                  title="Enter quantity"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                  required
                />
              </Field>

              <Field label="Unit" dark={dark}>
                <input
                  name="unit"
                  placeholder="e.g. pcs, rolls, litres"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Reorder Level" dark={dark}>
                <input
                  name="reorderLevel"
                  type="number"
                  min="0"
                  defaultValue="0"
                  aria-label="Enter reorder level"
                  title="Enter reorder level"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>

              <Field label="Target Stock Level" dark={dark}>
                <input
                  name="targetStockLevel"
                  type="number"
                  min="0"
                  placeholder="optional"
                  aria-label="Enter target stock level"
                  title="Enter target stock level"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                />
              </Field>

              <Field label="Status" dark={dark}>
                <select
                  name="status"
                  defaultValue="AVAILABLE"
                  aria-label="Select inventory item status"
                  title="Select inventory item status"
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-white/20"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                  }
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {itemType === "EQUIPMENT" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Condition" dark={dark}>
                  <select
                    name="condition"
                    defaultValue="GOOD"
                    aria-label="Select equipment condition"
                    title="Select equipment condition"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-white/20"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-gray-400"
                    }
                  >
                    <option value="GOOD">GOOD</option>
                    <option value="FAULTY">FAULTY</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="UNDER_REPAIR">UNDER REPAIR</option>
                  </select>
                </Field>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="submit"
                className={
                  dark
                    ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
                    : "rounded-xl bg-[#1a1814] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2d2924]"
                }
              >
                Create Inventory Item
              </button>

              <Link
                href={`/store/sites/${site.id}`}
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