"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useThemeMode } from "@/context/ThemeContext";
import { Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Loader2, ArrowLeft, Database } from "lucide-react";

export default function BackupPage() {
  const { mode } = useThemeMode();
  const dark      = mode === "dark";

  const [exporting,    setExporting]    = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError,  setImportError]  = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [confirmOpen,  setConfirmOpen]  = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── EXPORT ──────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res  = await fetch("/api/admin/backup/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `damp-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Check console for details.");
    } finally {
      setExporting(false);
    }
  };

  // ── IMPORT ──────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      alert("Please select a .json backup file.");
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
    setImportError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setConfirmOpen(false);
    setImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const text = await selectedFile.text();
      const data = JSON.parse(text);

      const res  = await fetch("/api/admin/backup/import", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setImportError(result.error ?? "Restore failed.");
      } else {
        setImportResult(result);
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch (e: any) {
      setImportError(`Failed to parse backup file: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const cardCls = dark
    ? "overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
    : "overflow-hidden rounded-2xl border border-[#e6ddd1] bg-white shadow-sm";

  const btnPrimary = dark
    ? "inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
    : "inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2d2924] disabled:opacity-40";

  const btnDanger = dark
    ? "inline-flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40"
    : "inline-flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40";

  return (
    <div className={dark
      ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
      : "min-h-screen bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]"
    }>
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">

        {/* Header */}
        <section className={dark
          ? "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
          : "relative overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 p-6 shadow-sm"
        }>
          <div className={dark
            ? "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]"
            : "pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#2a7d52)]"
          } />

          <Link href="/admin" className={dark
            ? "mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:underline"
            : "mb-4 inline-flex items-center gap-2 text-sm font-medium text-[#6f6a62] hover:underline"
          }>
            <ArrowLeft size={16} /> Back to Admin
          </Link>

          <div className="mt-3 flex items-center gap-3">
            <div className={dark
              ? "rounded-2xl border border-white/10 bg-white/5 p-3"
              : "rounded-2xl border border-[#e0dbd2] bg-[#f5f2ed] p-3"
            }>
              <Database size={24} className={dark ? "text-blue-400" : "text-blue-700"} />
            </div>
            <div>
              <h1 className={dark ? "text-2xl font-semibold text-slate-100" : "text-2xl font-semibold text-[#1a1814]"}>
                Data Backup & Recovery
              </h1>
              <p className={dark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-[#857f76]"}>
                Export all system data or restore from a previous backup.
              </p>
            </div>
          </div>

          {/* Warning notice */}
          <div className={dark
            ? "mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
            : "mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
          }>
            <ShieldCheck size={18} className={dark ? "mt-0.5 shrink-0 text-amber-400" : "mt-0.5 shrink-0 text-amber-700"} />
            <div>
              <div className={dark ? "text-sm font-semibold text-amber-300" : "text-sm font-semibold text-amber-800"}>
                Admin only — keep backups safe
              </div>
              <div className={dark ? "mt-0.5 text-xs text-amber-400/80" : "mt-0.5 text-xs text-amber-700/80"}>
                Backup files contain all system data including user records. Store them in a secure location — Google Drive, USB, or a trusted PC. Download a fresh backup regularly.
              </div>
            </div>
          </div>
        </section>

        {/* Export */}
        <section className={`mt-5 ${cardCls}`}>
          <div className={dark ? "border-b border-white/8 px-6 py-4" : "border-b border-[#eee7dd] px-6 py-4"}>
            <div className={dark ? "text-base font-semibold text-slate-100" : "text-base font-semibold text-[#1a1814]"}>
              Export Backup
            </div>
            <div className={dark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-[#8b857c]"}>
              Downloads a complete snapshot of all data as a JSON file. Save it to your PC, Google Drive, or USB.
            </div>
          </div>
          <div className="p-6">
            <div className={dark ? "mb-4 text-sm text-slate-400" : "mb-4 text-sm text-[#5b564d]"}>
              The backup includes:
              <ul className="mt-2 space-y-1 pl-4">
                {[
                  "Inventory sites, items and entity codes",
                  "All issue records and return history",
                  "Restock logs",
                  "Broadcast sites and assets",
                  "Users and roles",
                  "Activity audit trail (last 10,000 entries)",
                ].map((item) => (
                  <li key={item} className="list-disc text-xs">{item}</li>
                ))}
              </ul>
            </div>
            <button onClick={handleExport} disabled={exporting} className={btnPrimary}>
              {exporting
                ? <><Loader2 size={16} className="animate-spin" /> Exporting…</>
                : <><Download size={16} /> Download Full Backup (.json)</>
              }
            </button>
          </div>
        </section>

        {/* Import */}
        <section className={`mt-5 ${cardCls}`}>
          <div className={dark ? "border-b border-white/8 px-6 py-4" : "border-b border-[#eee7dd] px-6 py-4"}>
            <div className={dark ? "text-base font-semibold text-slate-100" : "text-base font-semibold text-[#1a1814]"}>
              Restore from Backup
            </div>
            <div className={dark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-[#8b857c]"}>
              Upload a DAMP backup JSON file to restore data. Existing records are kept — only missing records are added (safe merge, not overwrite).
            </div>
          </div>
          <div className="p-6 space-y-4">

            {/* Danger notice */}
            <div className={dark
              ? "flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3"
              : "flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            }>
              <AlertTriangle size={16} className={dark ? "mt-0.5 shrink-0 text-red-400" : "mt-0.5 shrink-0 text-red-600"} />
              <div className={dark ? "text-xs text-red-300" : "text-xs text-red-700"}>
                Only use this on a fresh or crashed system. Restoring on top of existing data is safe (duplicates are skipped) but may cause confusion if records have changed.
              </div>
            </div>

            {/* File picker */}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file"
              />
              <label htmlFor="backup-file"
                className={dark
                  ? "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-4 hover:border-white/40 transition-colors"
                  : "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c8c0b6] bg-[#f8f4ee] px-4 py-4 hover:border-[#1a1814] transition-colors"
                }
              >
                <Upload size={20} className={dark ? "text-slate-400" : "text-[#8b857c]"} />
                <div>
                  <div className={dark ? "text-sm font-semibold text-slate-200" : "text-sm font-semibold text-[#1a1814]"}>
                    {selectedFile ? selectedFile.name : "Choose backup file (.json)"}
                  </div>
                  <div className={dark ? "text-xs text-slate-500" : "text-xs text-[#8b857c]"}>
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB selected`
                      : "Click to browse for a DAMP backup file"
                    }
                  </div>
                </div>
              </label>
            </div>

            {selectedFile && !importResult && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={importing}
                className={btnDanger}
              >
                {importing
                  ? <><Loader2 size={16} className="animate-spin" /> Restoring…</>
                  : <><Upload size={16} /> Restore This Backup</>
                }
              </button>
            )}

            {/* Success result */}
            {importResult && (
              <div className={dark
                ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                : "rounded-xl border border-emerald-200 bg-emerald-50 p-4"
              }>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className={dark ? "text-emerald-400" : "text-emerald-700"} />
                  <span className={dark ? "font-semibold text-emerald-300" : "font-semibold text-emerald-800"}>
                    Restore complete!
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Object.entries(importResult.results ?? {}).map(([table, count]) => (
                    <div key={table}
                      className={dark
                        ? "rounded-lg bg-emerald-500/10 px-3 py-2 text-xs"
                        : "rounded-lg bg-emerald-100 px-3 py-2 text-xs"
                      }
                    >
                      <div className={dark ? "font-semibold text-emerald-300" : "font-semibold text-emerald-800"}>{table}</div>
                      <div className={dark ? "text-emerald-400" : "text-emerald-700"}>{String(count)} records</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {importError && (
              <div className={dark
                ? "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              }>
                {importError}
              </div>
            )}
          </div>
        </section>

        {/* Backup tips */}
        <section className={`mt-5 ${cardCls}`}>
          <div className="p-5">
            <div className={dark ? "text-sm font-semibold text-slate-300 mb-3" : "text-sm font-semibold text-[#1a1814] mb-3"}>
              💡 Backup Tips
            </div>
            <ul className="space-y-2">
              {[
                "Download a backup at the end of each week and save to Google Drive.",
                "Label your files clearly — e.g. damp-backup-2026-07-20.json",
                "Keep at least 3 recent backups in case one is corrupted.",
                "After any major data import or bulk operation, always take a fresh backup.",
                "If the system crashes, restore on a fresh Supabase project then import the backup.",
              ].map((tip) => (
                <li key={tip} className={`flex items-start gap-2 text-xs ${dark ? "text-slate-400" : "text-[#6b655d]"}`}>
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </section>

      </div>

      {/* Confirm restore modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className={dark
            ? "w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1923] shadow-2xl"
            : "w-full max-w-md overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white shadow-2xl"
          }>
            <div className="h-1 bg-red-500" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-red-500 shrink-0" />
                <div>
                  <div className={dark ? "text-base font-bold text-slate-100" : "text-base font-bold text-[#1a1814]"}>
                    Confirm Data Restore
                  </div>
                  <div className={dark ? "text-xs text-slate-400" : "text-xs text-[#8b857c]"}>
                    This will import all records from the backup file.
                  </div>
                </div>
              </div>
              <div className={dark
                ? "rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 mb-5"
                : "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-5"
              }>
                File: <span className="font-semibold">{selectedFile?.name}</span><br />
                Existing records will NOT be overwritten. Only missing records will be added.
              </div>
              <div className="flex gap-3">
                <button onClick={handleImport}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600">
                  Yes, Restore
                </button>
                <button onClick={() => setConfirmOpen(false)}
                  className={dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    : "rounded-xl border border-[#ddd5c9] bg-white px-5 py-2.5 text-sm font-semibold text-[#1a1814] hover:bg-[#faf7f2]"
                  }>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
