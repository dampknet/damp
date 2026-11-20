"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { useFormStatus } from "react-dom";
import type { MissingType, CodeHint } from "@/lib/inventory-upload";
import { createItemType, setWarehouseType } from "@/app/(app)/admin/item-types/actions";

type PreviewRow = {
  rowNumber:   number;
  itemType:    string;
  name:        string;
  itemCode:    string;
  quantity:    string;
  unit:        string;
  condition:   string;
  uncountable: boolean;
  error:       string | null;
};

type ValidRow = {
  itemType:         string;
  typeId:           string;
  subTypeId:        string | null;
  name:             string;
  description:      string | null;
  manufacturer:     string | null;
  model:            string | null;
  itemCode:         string | null;
  serialNumber:     string | null;
  quantity:         number;
  uncountable:      boolean;
  unit:             string | null;
  reorderLevel:     number;
  targetStockLevel: number | null;
  status:           string;
  condition:        string;
  createEntities?:  boolean;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CONDITION_COLOR: Record<string, string> = {
  NEW:    "text-emerald-500",
  UNUSED: "text-blue-400",
  USED:   "text-amber-400",
  FAULTY: "text-red-400",
};

function Spinner({ dark }: { dark: boolean }) {
  return (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
      dark ? "border-white/30 border-t-white" : "border-white/40 border-t-white"
    }`} />
  );
}

function ConfirmSubmitButton({ dark }: { dark: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={dark
        ? "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        : "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {pending ? <><Spinner dark={dark} /> Importing...</> : "Confirm Import"}
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
  canManageTypes,
  typesHere,
}: {
  site:             { id: string; name: string; location: string | null };
  confirmAction:    (formData: FormData) => void;
  templateHref:     string;
  templateFileName: string;
  serverError:      string | null;
  serverSuccess:    string | null;
  canManageTypes:   boolean;
  typesHere:        { name: string; code: string; subTypes: string[] }[];
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  // Types / sub-types the file needs that aren't set up here, and item-code hints (admins can fix them here).
  const [missing,   setMissing]   = useState<MissingType[]>([]);
  const [codeHints, setCodeHints] = useState<CodeHint[]>([]);
  const [lastFile,  setLastFile]  = useState<File | null>(null);
  const [fixMsg,    setFixMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [fixing,    startFix]     = useTransition();
  const [newCodes,  setNewCodes]  = useState<Record<string, string>>({});
  const [newTracked, setNewTracked] = useState<Record<string, boolean>>({});

  const [clientFileError, setClientFileError] = useState<string | null>(null);
  const [previewError,    setPreviewError]     = useState<string | null>(null);
  const [previewLoading,  setPreviewLoading]   = useState(false);
  const [previewRows,     setPreviewRows]       = useState<PreviewRow[]>([]);
  const [validRows,       setValidRows]         = useState<ValidRow[]>([]);
  const [entityRows,      setEntityRows]        = useState<Set<number>>(new Set());

  const toggleEntity = (idx: number) => {
    setEntityRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const validCount   = useMemo(() => previewRows.filter((r) => !r.error).length, [previewRows]);
  const invalidCount = useMemo(() => previewRows.filter((r) =>  r.error).length, [previewRows]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setClientFileError(null);
    setPreviewError(null);
    if (!file) return;

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setClientFileError("Only .xlsx or .xls files are allowed");
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

  async function runPreview(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("siteId", site.id);
    setPreviewLoading(true);
    setPreviewError(null);

    try {
      const res  = await fetch("/store/api/inventory-upload-preview", { method: "POST", body: formData });
      const data = await res.json().catch(() => null) as {
        ok?: boolean; error?: string; preview?: PreviewRow[]; validRows?: ValidRow[];
        missing?: MissingType[]; codeHints?: CodeHint[];
      } | null;

      if (!res.ok || !data?.ok) {
        setPreviewRows([]); setValidRows([]); setMissing([]); setCodeHints([]);
        setPreviewError(data?.error ?? "Failed to preview uploaded file");
        return;
      }

      setPreviewRows(data.preview ?? []);
      setValidRows(data.validRows ?? []);
      setMissing(data.missing ?? []);
      setCodeHints(data.codeHints ?? []);
      setEntityRows(new Set());

      if ((data.validRows ?? []).length === 0) {
        setPreviewError("No valid rows found to import");
      }
    } catch {
      setPreviewRows([]); setValidRows([]);
      setPreviewError("Failed to preview uploaded file");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handlePreviewSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPreviewError(null);
    setFixMsg(null);

    const file = new FormData(e.currentTarget).get("file");
    if (!(file instanceof File)) { setPreviewError("Please choose an Excel file"); return; }
    if (clientFileError) return;

    setLastFile(file);
    await runPreview(file);
  }

  // Admin fixes (create / switch on a type or sub-type, adopt a short code), then check the same file again.
  const fix = (fn: () => Promise<{ ok: boolean; message: string }>) => startFix(async () => {
    const r = await fn();
    setFixMsg({ ok: r.ok, text: r.message });
    if (r.ok && lastFile) await runPreview(lastFile);
  });

  const suggestCode = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "NEW";

  const enrichedValidRows: ValidRow[] = validRows.map((row, idx) => ({
    ...row,
    createEntities: entityRows.has(idx),
  }));

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-sm"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#3b82f6)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#10b981,#34d399,#1d5fa8)]"
          } />

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-col items-start gap-3">
                <Link href={`/store/sites/${site.id}`}
                  className={dark
                    ? "inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
                    : "inline-flex w-fit items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
                  }
                >
                  ← Back to {site.name} Inventory
                </Link>

                <div className={dark
                  ? "inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300"
                  : "inline-flex w-fit items-center gap-2 rounded-full border border-[#dcecdf] bg-[#f7fcf8] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700"
                }>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Upload Inventory Excel
                </div>
              </div>

              <h1 className={dark
                ? "mt-5 text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl"
                : "mt-5 text-3xl font-semibold tracking-tight text-[#1a1814] md:text-4xl"
              }>
                Import into {site.name}
              </h1>

              <p className={dark
                ? "mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400"
                : "mt-3 max-w-2xl text-sm font-medium leading-6 text-[#857f76]"
              }>
                Upload your Excel sheet, review the preview, tick which items should have individual entities auto-generated, then confirm.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip dark={dark} label="Site"          value={site.name} />
                <Chip dark={dark} label="Location"      value={site.location ?? "-"} />
                <Chip dark={dark} label="Allowed Files" value=".xlsx, .xls" />
                <Chip dark={dark} label="Max Size"      value="5MB" />
              </div>
            </div>

            <div className="w-full lg:w-80">
              <div className="flex justify-start lg:justify-end">
                <a href={templateHref} download={templateFileName}
                  className={dark
                    ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
                    : "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                  }
                >
                  Download Template
                </a>
              </div>

              <div className={dark
                ? "mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300"
                : "mt-4 rounded-2xl border border-[#e7dfd4] bg-[#fffdfa] p-4 text-sm text-[#5b564d]"
              }>
                <div className="font-semibold">Required columns</div>
                <div className="mt-2 font-mono text-xs leading-6 italic opacity-70">
                  itemtype, name, description, manufacturer,
                  item code, serial number, quantity, unit,
                  reorderlevel, targetstock level, condition
                </div>
                <div className={`mt-3 text-xs ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                  <span className="font-semibold">itemtype</span> (and optional <span className="font-semibold">subtype</span>) used in {site.name}:{" "}
                  {typesHere.length ? typesHere.map((t) => `${t.name}${t.subTypes.length ? ` (${t.subTypes.join(", ")})` : ""}`).join(" · ") : "none yet"}
                  {canManageTypes && <> — new ones can be set up from the preview.</>}
                </div>
                <div className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                  <span className="font-semibold">condition:</span> NEW · UNUSED · USED · FAULTY
                </div>
                <div className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-[#8b857c]"}`}>
                  <span className="font-semibold">quantity:</span> number or N/A for uncountable items
                </div>
              </div>
            </div>
          </div>

          {serverError && (
            <div className={dark
              ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{serverError}</div>
          )}
          {clientFileError && (
            <div className={dark
              ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{clientFileError}</div>
          )}
          {previewError && (
            <div className={dark
              ? "mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              : "mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }>{previewError}</div>
          )}
          {serverSuccess && (
            <div className={dark
              ? "mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
              : "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            }>{serverSuccess}</div>
          )}

          <form onSubmit={handlePreviewSubmit} className={dark
            ? "mt-6 rounded-3xl border border-white/10 bg-white/5 p-5"
            : "mt-6 rounded-3xl border border-[#e0dbd2] bg-white p-5 shadow-sm"
          }>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label htmlFor="inventory-excel-file" className={dark
                  ? "mb-2 block text-sm font-medium text-slate-300"
                  : "mb-2 block text-sm font-medium text-[#5b564d]"
                }>
                  Excel file
                </label>
                <input
                  id="inventory-excel-file"
                  type="file"
                  name="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  title="Choose file"
                  className={dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-100"
                    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#f5f2ed] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1a1814]"
                  }
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!!clientFileError || previewLoading}
                className={dark
                  ? "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  : "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {previewLoading ? <><Spinner dark={dark} /> Preparing Preview...</> : "Preview Import"}
              </button>
            </div>
          </form>

          {validRows.length > 0 && (
            <form action={confirmAction} className={dark
              ? "mt-4 rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5"
              : "mt-4 rounded-3xl border border-[#d6e9d8] bg-[#f7fcf8] p-5"
            }>
              <input type="hidden" name="validRowsPayload" value={JSON.stringify(enrichedValidRows)} />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className={dark ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-emerald-700"}>
                    Preview ready
                  </div>
                  <div className={dark ? "mt-1 text-xs text-slate-300" : "mt-1 text-xs text-[#5b564d]"}>
                    {validCount} valid · {invalidCount} invalid / skipped
                    {entityRows.size > 0 && ` · ${entityRows.size} item${entityRows.size > 1 ? "s" : ""} will have entities generated`}
                  </div>
                </div>
                <ConfirmSubmitButton dark={dark} />
              </div>
            </form>
          )}
        </section>

        {(missing.length > 0 || codeHints.length > 0 || fixMsg) && (
          <section className={dark ? "mt-6 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5" : "mt-6 rounded-3xl border border-amber-200 bg-amber-50/60 p-5"}>
            <div className={dark ? "text-sm font-bold text-amber-200" : "text-sm font-bold text-amber-900"}>Item types in this file that need setting up for {site.name}</div>
            {!canManageTypes && missing.length > 0 && (
              <p className={dark ? "mt-1 text-xs text-amber-200/80" : "mt-1 text-xs text-amber-800"}>Those rows are skipped. Ask an admin to set these up (Admin → Item Types), then preview again.</p>
            )}
            {fixMsg && <div className={`mt-2 text-xs font-semibold ${fixMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{fixMsg.text}</div>}
            <div className="mt-3 space-y-2">
              {missing.map((m) => (
                <div key={m.key} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5 text-slate-200" : "border-[#e7dfd4] bg-white text-[#1a1814]"}`}>
                  {m.kind === "type" && (<>
                    <span>New item type <b>{m.name}</b></span>
                    {canManageTypes && (<>
                      <input value={newCodes[m.key] ?? suggestCode(m.name)} maxLength={8} aria-label={`Short code for ${m.name}`}
                        onChange={(e) => setNewCodes((p) => ({ ...p, [m.key]: e.target.value.toUpperCase() }))}
                        className={`w-24 rounded-lg border px-2 py-1 font-mono text-xs ${dark ? "border-white/10 bg-white/5" : "border-[#ddd5c9] bg-white"}`} />
                      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!newTracked[m.key]} onChange={(e) => setNewTracked((p) => ({ ...p, [m.key]: e.target.checked }))} className="h-3.5 w-3.5" /> track units one by one</label>
                      <button type="button" disabled={fixing} className="rounded-lg bg-[#1d5fa8] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                        onClick={() => fix(() => createItemType({ name: m.name, code: newCodes[m.key] ?? suggestCode(m.name), tracked: !!newTracked[m.key], warehouseIds: [site.id] }))}>Create for {site.name}</button>
                    </>)}
                  </>)}
                  {m.kind === "include-type" && (<>
                    <span><b>{m.name}</b> exists but isn&apos;t used in {site.name} yet</span>
                    {canManageTypes && <button type="button" disabled={fixing} className="rounded-lg bg-[#1d5fa8] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => fix(() => setWarehouseType(site.id, m.id, { enabled: true }))}>Switch on here (code {m.code})</button>}
                  </>)}
                  {m.kind === "subtype" && (<>
                    <span>New sub-type <b>{m.name}</b> under {m.parentName}</span>
                    {canManageTypes && <button type="button" disabled={fixing} className="rounded-lg bg-[#1d5fa8] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => fix(() => createItemType({ name: m.name, parentId: m.parentId, warehouseIds: [site.id] }))}>Create for {site.name}</button>}
                  </>)}
                  {m.kind === "include-subtype" && (<>
                    <span>Sub-type <b>{m.name}</b> ({m.parentName}) exists but isn&apos;t used in {site.name} yet</span>
                    {canManageTypes && <button type="button" disabled={fixing} className="rounded-lg bg-[#1d5fa8] px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                      onClick={() => fix(() => setWarehouseType(site.id, m.id, { enabled: true }))}>Switch on here</button>}
                  </>)}
                </div>
              ))}
              {codeHints.map((h) => (
                <div key={`${h.typeId}:${h.used}`} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${dark ? "border-white/10 bg-white/5 text-slate-200" : "border-[#e7dfd4] bg-white text-[#1a1814]"}`}>
                  <span>{h.count} row{h.count === 1 ? "" : "s"} use <b className="font-mono">{h.used}</b> for {h.typeName}; {site.name} is set to <b className="font-mono">{h.current}</b> (rows still import with the codes in the file).</span>
                  {canManageTypes && <button type="button" disabled={fixing} className="rounded-lg border border-[#1d5fa8] px-2.5 py-1 text-xs font-bold text-[#1d5fa8] disabled:opacity-50"
                    onClick={() => fix(() => setWarehouseType(site.id, h.typeId, { code: h.used }))}>Use {h.used} for new {h.typeName} items here</button>}
                </div>
              ))}
            </div>
            {fixing && <div className="mt-2 text-xs opacity-70">Updating and checking the file again…</div>}
          </section>
        )}

        {previewRows.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard dark={dark} label="Rows Read"          value={String(previewRows.length)} />
            <StatCard dark={dark} label="Valid"              value={String(validCount)} />
            <StatCard dark={dark} label="Invalid / Skipped"  value={String(invalidCount)} />
          </div>
        )}

        {previewRows.length > 0 && (
          <section className={dark
            ? "mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5"
            : "mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          }>
            <div className={`flex items-center gap-6 px-5 py-3 text-xs ${dark ? "border-b border-white/10 text-slate-400" : "border-b border-slate-100 text-[#5b564d]"}`}>
              <span className="font-semibold">Create Entities column:</span>
              <span>Tick to auto-generate individual sub-codes per quantity. Leave unticked for bulk items like clamps.</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={dark ? "bg-white/5 text-slate-400" : "bg-slate-50 text-slate-600"}>
                  <tr>
                    <th className="px-5 py-3 font-medium">Row</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Item Code</th>
                    <th className="px-5 py-3 font-medium text-center">Qty</th>
                    <th className="px-5 py-3 font-medium">Condition</th>
                    <th className="px-5 py-3 font-medium text-center">Create Entities</th>
                    <th className="px-5 py-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {previewRows.map((row, idx) => {
                    const canHaveEntities = !row.error && !row.uncountable && Number(row.quantity) > 0;

                    return (
                      <tr
                        key={row.rowNumber}
                        className={row.error
                          ? (dark ? "bg-red-500/5" : "bg-red-50")
                          : entityRows.has(idx)
                          ? (dark ? "bg-emerald-500/5" : "bg-emerald-50/60")
                          : ""
                        }
                      >
                        <td className="px-5 py-3 opacity-50 font-mono text-xs">{row.rowNumber}</td>
                        <td className="px-5 py-3 text-xs font-bold uppercase opacity-60">
                          {row.itemType}
                        </td>
                        <td className={`px-5 py-3 font-semibold ${dark ? "text-slate-100" : "text-[#1a1814]"}`}>
                          {row.name || "-"}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs opacity-70">{row.itemCode}</td>
                        <td className="px-5 py-3 text-center">
                          {row.uncountable
                            ? <span className="text-xs italic opacity-50">N/A</span>
                            : row.quantity
                          }
                          {row.unit && <span className="ml-1 text-xs opacity-40">{row.unit}</span>}
                        </td>
                        <td className={`px-5 py-3 text-xs font-bold ${CONDITION_COLOR[row.condition] ?? "opacity-50"}`}>
                          {row.condition || "-"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          {canHaveEntities ? (
                            <label className="inline-flex cursor-pointer items-center gap-2">
                              <input
                                type="checkbox"
                                checked={entityRows.has(idx)}
                                onChange={() => toggleEntity(idx)}
                                title={`Create entities for ${row.name}`}
                                className="h-4 w-4 cursor-pointer accent-emerald-500"
                              />
                              {entityRows.has(idx) && (
                                <span className="text-[10px] font-bold text-emerald-500">
                                  ×{row.quantity}
                                </span>
                              )}
                            </label>
                          ) : (
                            <span className="text-xs opacity-25">—</span>
                          )}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold ${row.error ? "text-red-500" : "text-emerald-500"}`}>
                          {row.error ?? "OK"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

function Chip({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <span className={dark
      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300"
      : "rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
    }>
      {label}: <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>{value}</span>
    </span>
  );
}

function StatCard({ dark, label, value }: { dark: boolean; label: string; value: string }) {
  return (
    <div className={dark
      ? "rounded-2xl border border-white/10 bg-white/5 p-4"
      : "rounded-2xl border border-[#e6ddd1] bg-white shadow-sm p-4"
    }>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}
