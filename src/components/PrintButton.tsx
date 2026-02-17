"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
      aria-label="Print store items"
    >
      Print
    </button>
  );
}
