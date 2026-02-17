"use client";

export default function PrintSitesButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
    >
      Print
    </button>
  );
}
