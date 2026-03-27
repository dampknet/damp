"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useFormStatus } from "react-dom";

type PreviewRow = {
  rowNumber: number;
  itemType: string;
  name: string;
  stockNumber: string;
  serialNumber: string;
  quantity: string;
  unit: string;
  reorderLevel: string;
  targetStockLevel: string;
  status: string;
  condition: string;
  error: string | null;
};

type ValidRow = {
  itemType: "MATERIAL" | "EQUIPMENT";
  name: string;
  description: string | null;
  stockNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  unit: string | null;
  reorderLevel: number;
  targetStockLevel: number | null;
  status:
    | "AVAILABLE"
    | "LOW_STOCK"
    | "OUT_OF_STOCK"
    | "CHECKED_OUT"
    | "INACTIVE";
  condition: "GOOD" | "FAULTY" | "DAMAGED" | "UNDER_REPAIR" | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function Spinner({ dark }: { dark: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        dark ? "border-white/30 border-t-white" : "border-white/40 border-t-white"
      }`}
    />
  );
}

function ConfirmSubmitButton({ dark }: { dark: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        dark
          ? "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          : "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending ? (
        <>
          <Spinner dark={dark} />
          Importing...
        </>
      ) : (
        "Confirm Import"
      )}
    </button>
  );
}

export default function UploadInventoryExcelClient({
  site,
  confirmAction,
  templateHref,
  templateFileName,
  serverError,
  serverSuccess,
}: {
  site: {
    id: string;
    name: string;
    location: string | null;
  };
  confirmAction: (formData: FormData) => void;
  templateHref: string;
  templateFileName: string;
  serverError: string | null;
  serverSuccess: string | null;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [validRows, setValidRows] = useState<ValidRow[]>([]);

  const validCount = useMemo(
    () => previewRows.filter((r) => !r.error).length,
    [previewRows]
  );
  const invalidCount = useMemo(
    () => previewRows.filter((r) => !!r.error).length,
    [previewRows]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setClientFileError(null);
    setPreviewError(null);

    if (!file) return;

    const allowedExtensions = /\.(xlsx|xls)$/i.test(file.name);
    const allowedMimeTypes = new Set([
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "",
    ]);

    if (!allowedExtensions) {
      setClientFileError("Only .xlsx or .xls files are allowed");
      e.target.value = "";
      return;
    }

    if (!allowedMimeTypes.has(file.type)) {
      setClientFileError("Invalid file type");
      e.target.value = "";
      return;
    }

    if (file.size <= 0) {
      setClientFileError("Uploaded file is empty");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setClientFileError("File too large. Maximum allowed size is 5MB");
      e.target.value = "";
    }
  }

  async function handlePreviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setPreviewError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      setPreviewError("Please choose an Excel file");
      return;
    }

    if (clientFileError) return;

    formData.append("siteId", site.id);

    setPreviewLoading(true);
    try {
      const res = await fetch("/store/api/inventory-upload-preview", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            preview?: PreviewRow[];
            validRows?: ValidRow[];
          }
        | null;

      if (!res.ok || !data?.ok) {
        setPreviewRows([]);
        setValidRows([]);
        setPreviewError(data?.error ?? "Failed to preview uploaded file");
        return;
      }

      setPreviewRows(data.preview ?? []);
      setValidRows(data.validRows ?? []);

      if ((data.validRows ?? []).length === 0) {
        setPreviewError("No valid rows found to import");
      }
    } catch {
      setPreviewRows([]);
      setValidRows([]);
      setPreviewError("Failed to preview uploaded file");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
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
                : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#1d5fa8)]"
            }
          />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-col items-start gap-3">
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
                      ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300"
                      : "inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700"
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Upload Inventory Excel
                </div>
              </div>

              <h1
                className={
                  dark
                    ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                    : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
                }
              >
                Import into {site.name}
              </h1>

              <p
                className={
                  dark
                    ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                    : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
                }
              >
                Upload an Excel sheet, review the preview, then confirm before anything is imported.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip dark={dark} label="Site" value={site.name} />
                <Chip dark={dark} label="Location" value={site.location ?? "-"} />
                <Chip dark={dark} label="Allowed Files" value=".xlsx, .xls" />
                <Chip dark={dark} label="Max Size" value="5MB" />
              </div>
            </div>

            <div className="w-full lg:w-97.5">
              <div className="flex justify-start lg:justify-end">
                <a
                  href={templateHref}
                  download={templateFileName}
                  className={
                    dark
                      ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
                      : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  }
                >
                  Download Template
                </a>
              </div>

              <div
                className={
                  dark
                    ? "mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                    : "mt-4 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-4 text-sm text-[#5b564d]"
                }
              >
                <div className="font-semibold">Expected columns</div>
                <div className="mt-2 leading-6">
                  itemType, name, description, stockNumber, manufacturer, model,
                  serialNumber, quantity, unit, reorderLevel, targetStockLevel,
                  status, condition
                </div>
              </div>
            </div>
          </div>

          {serverError ? (
            <div
              className={
                dark
                  ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }
            >
              {serverError}
            </div>
          ) : null}

          {clientFileError ? (
            <div
              className={
                dark
                  ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }
            >
              {clientFileError}
            </div>
          ) : null}

          {previewError ? (
            <div
              className={
                dark
                  ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }
            >
              {previewError}
            </div>
          ) : null}

          {serverSuccess ? (
            <div
              className={
                dark
                  ? "mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                  : "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
              }
            >
              {serverSuccess}
            </div>
          ) : null}

          <form
            onSubmit={handlePreviewSubmit}
            className={
              dark
                ? "mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"
                : "mt-6 rounded-3xl border border-[#e0dbd2] bg-white p-5 shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
            }
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label
                  htmlFor="inventory-excel-file"
                  className={
                    dark
                      ? "mb-2 block text-sm font-medium text-slate-300"
                      : "mb-2 block text-sm font-medium text-[#5b564d]"
                  }
                >
                  Excel file
                </label>
                <input
                  id="inventory-excel-file"
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className={
                    dark
                      ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100"
                      : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#f5f2ed] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1a1814]"
                  }
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!!clientFileError || previewLoading}
                className={
                  dark
                    ? "inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#10b981,#34d399)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    : "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {previewLoading ? (
                  <>
                    <Spinner dark={dark} />
                    Preparing Preview...
                  </>
                ) : (
                  "Preview Import"
                )}
              </button>
            </div>
          </form>

          {validRows.length > 0 ? (
            <form
              action={confirmAction}
              className={
                dark
                  ? "mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5"
                  : "mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5"
              }
            >
              <input
                type="hidden"
                name="previewPayload"
                value={JSON.stringify(previewRows)}
              />
              <input
                type="hidden"
                name="validRowsPayload"
                value={JSON.stringify(validRows)}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div
                    className={
                      dark
                        ? "text-sm font-semibold text-emerald-300"
                        : "text-sm font-semibold text-emerald-700"
                    }
                  >
                    Preview ready
                  </div>
                  <div
                    className={
                      dark
                        ? "mt-1 text-xs text-slate-300"
                        : "mt-1 text-xs text-[#5b564d]"
                    }
                  >
                    {validCount} valid row(s) will be imported. {invalidCount} row(s) will be skipped.
                  </div>
                </div>

                <ConfirmSubmitButton dark={dark} />
              </div>
            </form>
          ) : null}
        </section>

        {previewRows.length > 0 ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <StatCard dark={dark} label="Rows Read" value={String(previewRows.length)} />
              <StatCard dark={dark} label="Valid" value={String(validCount)} />
              <StatCard dark={dark} label="Invalid / Skipped" value={String(invalidCount)} />
            </div>

            <section
              className={
                dark
                  ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl"
                  : "mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-[0_12px_34px_rgba(26,24,20,0.055)]"
              }
            >
              <div
                className={
                  dark
                    ? "h-1 w-full bg-[linear-gradient(90deg,#10b981,#34d399,#3b82f6)] opacity-80"
                    : "h-1 w-full bg-[linear-gradient(90deg,#10b981,#34d399,#1d5fa8)]"
                }
              />

              <div className="flex items-center justify-between px-5 py-4">
                <div
                  className={
                    dark
                      ? "text-sm font-semibold text-slate-100"
                      : "text-sm font-semibold text-[#1a1814]"
                  }
                >
                  Import Preview
                </div>
                <div
                  className={
                    dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"
                  }
                >
                  Review imported and skipped rows
                </div>
              </div>

              <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead
                    className={
                      dark
                        ? "bg-[#101720] text-left text-slate-400"
                        : "bg-[#f8f4ee] text-left text-[#5b564d]"
                    }
                  >
                    <tr>
                      <th className="px-5 py-3 font-medium">Row</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Stock No</th>
                      <th className="px-5 py-3 font-medium">Serial</th>
                      <th className="px-5 py-3 font-medium">Qty</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Error</th>
                    </tr>
                  </thead>

                  <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
                    {previewRows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          row.error
                            ? dark
                              ? "bg-red-500/5"
                              : "bg-red-50/60"
                            : ""
                        }
                      >
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.rowNumber}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.itemType || "-"}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-100" : "px-5 py-3 text-[#1a1814]"}>
                          {row.name || "-"}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.stockNumber || "-"}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.serialNumber || "-"}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.quantity || "0"} {row.unit}
                        </td>
                        <td className={dark ? "px-5 py-3 text-slate-300" : "px-5 py-3 text-[#5d584f]"}>
                          {row.status || "-"}
                        </td>
                        <td
                          className={
                            row.error
                              ? dark
                                ? "px-5 py-3 text-red-300"
                                : "px-5 py-3 text-red-700"
                              : dark
                              ? "px-5 py-3 text-emerald-300"
                              : "px-5 py-3 text-emerald-700"
                          }
                        >
                          {row.error ?? "OK"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
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

function StatCard({
  dark,
  label,
  value,
}: {
  dark: boolean;
  label: string;
  value: string;
}) {
  return (
    <div
      className={
        dark
          ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5"
          : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-[0_10px_25px_rgba(26,24,20,0.045)]"
      }
    >
      <div className="h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#1d5fa8)]" />
      <div className="p-4">
        <div
          className={
            dark
              ? "text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500"
              : "text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]"
          }
        >
          {label}
        </div>
        <div
          className={
            dark
              ? "mt-2 text-2xl font-semibold tex4t-slate-100"
              : "mt-2 text-2xl font-semibold text-[#1a1814]"
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}