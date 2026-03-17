"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

type ItemRow = {
  id: string;
  name: string;
  itemType: "MATERIAL" | "EQUIPMENT";
  quantity: number;
  unit: string | null;
  stockNumber: string | null;
  serialNumber: string | null;
  reorderLevel: number;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK" | "CHECKED_OUT" | "INACTIVE";
  condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
};

export default function IssueInventoryItemClient({
  site,
  items,
  action,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  items: ItemRow[];
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const [selectedItemId, setSelectedItemId] = useState("");

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  const isEquipment = selectedItem?.itemType === "EQUIPMENT";
  const isMaterial = selectedItem?.itemType === "MATERIAL";

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
              Issue Item
            </div>
          </div>

          <h1
            className={
              dark
                ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
            }
          >
            Issue Inventory Item
          </h1>

          <p
            className={
              dark
                ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
            }
          >
            Record who is taking the item, who authorized it, and track equipment return expectations properly.
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

          <form action={action} className="mt-6 space-y-6">
            <section
              className={
                dark
                  ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                  : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
              }
            >
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Item Details
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Select Item" dark={dark}>
                  <select
                    name="inventoryItemId"
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    aria-label="Select inventory item"
                    title="Select inventory item"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  >
                    <option value="">Choose an item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.itemType} — Qty: {item.quantity}
                        {item.unit ? ` ${item.unit}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Quantity" dark={dark}>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    defaultValue={1}
                    readOnly={isEquipment}
                    aria-label="Quantity"
                    title="Quantity"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none read-only:opacity-70"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none read-only:opacity-70"
                    }
                    required
                  />
                </Field>
              </div>

              {selectedItem ? (
                <div
                  className={
                    dark
                      ? "mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                      : "mt-4 rounded-xl border border-[#ebe3d8] bg-[#fcfaf7] p-4 text-sm text-[#5b564d]"
                  }
                >
                  <div><span className="font-semibold">Type:</span> {selectedItem.itemType}</div>
                  <div><span className="font-semibold">Available:</span> {selectedItem.quantity}{selectedItem.unit ? ` ${selectedItem.unit}` : ""}</div>
                  <div><span className="font-semibold">Stock No:</span> {selectedItem.stockNumber ?? "-"}</div>
                  <div><span className="font-semibold">Serial:</span> {selectedItem.serialNumber ?? "-"}</div>
                  <div><span className="font-semibold">Status:</span> {selectedItem.status}</div>
                </div>
              ) : null}
            </section>

            <section
              className={
                dark
                  ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                  : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
              }
            >
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Requester Details
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Requester Name" dark={dark}>
                  <input
                    name="requesterName"
                    placeholder="Enter full name"
                    aria-label="Requester name"
                    title="Requester name"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>

                <Field label="Contact" dark={dark}>
                  <input
                    name="requesterContact"
                    placeholder="Phone number or contact"
                    aria-label="Requester contact"
                    title="Requester contact"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Department (optional)" dark={dark}>
                  <input
                    name="department"
                    placeholder="Department or team"
                    aria-label="Department"
                    title="Department"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                  />
                </Field>
              </div>
            </section>

            <section
              className={
                dark
                  ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                  : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
              }
            >
              <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                Authorization & Purpose
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="Authorized By" dark={dark}>
                  <input
                    name="authorizedBy"
                    placeholder="Name of approving officer"
                    aria-label="Authorized by"
                    title="Authorized by"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Purpose / Project" dark={dark}>
                  <textarea
                    name="purpose"
                    rows={4}
                    placeholder="Why is this item being issued?"
                    aria-label="Purpose"
                    title="Purpose"
                    className={
                      dark
                        ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                    }
                    required
                  />
                </Field>
              </div>
            </section>

            {isEquipment ? (
              <section
                className={
                  dark
                    ? "rounded-2xl border border-white/10 bg-white/5 p-5"
                    : "rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-5"
                }
              >
                <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
                  Equipment Return Tracking
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Expected Return Date" dark={dark}>
                    <input
                      name="expectedReturnDate"
                      type="datetime-local"
                      aria-label="Expected return date"
                      title="Expected return date"
                      className={
                        dark
                          ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none"
                          : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none"
                      }
                    />
                  </Field>

                  <Field label="Condition At Issue" dark={dark}>
                    <select
                      name="conditionAtIssue"
                      defaultValue={selectedItem?.condition ?? "GOOD"}
                      aria-label="Condition at issue"
                      title="Condition at issue"
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
              </section>
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
                Issue Item
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