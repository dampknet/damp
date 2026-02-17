"use client";

import React from "react";

type Props = {
  title: string; // used for printing + file name
  filename?: string; // optional override
  rows: Array<Record<string, string | number | null | undefined>>;
  columns: Array<{ key: string; label: string }>;
};

function toCSV(
  rows: Array<Record<string, string | number | null | undefined>>,
  columns: Array<{ key: string; label: string }>
) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return `"${s.replaceAll(`"`, `""`)}"`;
  };

  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => columns.map((c) => esc(r[c.key])).join(","))
    .join("\n");

  return `${header}\n${body}`;
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

export default function PrintExportButton({
  title,
  filename,
  rows,
  columns,
}: Props) {
  const safeName =
    (filename ?? title)
      .trim()
      .replaceAll(/[\\/:*?"<>|]/g, "-")
      .replaceAll(/\s+/g, " ")
      .slice(0, 80) || "export";

  function handlePrint(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const el = document.getElementById("print-title");
    if (el) el.textContent = title;

    window.print();
  }

  function handleExport(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const csv = toCSV(rows, columns);
    downloadTextFile(`${safeName}.csv`, csv);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        aria-label="Print table"
        title="Print"
      >
        Print
      </button>

      <button
        type="button"
        onClick={handleExport}
        className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        aria-label="Export table as CSV"
        title="Export CSV"
      >
        Export
      </button>
    </div>
  );
}
