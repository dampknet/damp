"use client";

type SelectedItem = {
  id:   string;
  name: string;
};

export default function DeleteInventoryItemsDialog({
  open, dark, items, deleting, reason,
  onReasonChange, onClose, onConfirm,
}: {
  open:           boolean;
  dark:           boolean;
  items:          SelectedItem[];
  deleting:       boolean;
  reason:         string;
  onReasonChange: (value: string) => void;
  onClose:        () => void;
  onConfirm:      () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <div className={dark
        ? "relative z-50 w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0f1722] shadow-2xl"
        : "relative z-50 w-full max-w-lg overflow-hidden rounded-3xl border border-[#e7ded3] bg-white shadow-2xl"
      }>
        <div className={dark
          ? "h-1 w-full bg-[linear-gradient(90deg,#ef4444,#f97316)]"
          : "h-1 w-full bg-[linear-gradient(90deg,#dc2626,#ea580c)]"
        } />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={dark
                ? "inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300"
                : "inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-700"
              }>
                Delete Inventory Items
              </div>
              <h3 className={dark ? "mt-4 text-xl font-semibold text-slate-100" : "mt-4 text-xl font-semibold text-[#1a1814]"}>
                Are you sure?
              </h3>
              <p className={dark ? "mt-1 text-sm text-slate-400" : "mt-1 text-sm text-[#746d64]"}>
                You are about to soft-delete{" "}
                <span className="font-semibold">{items.length}</span>{" "}
                item{items.length > 1 ? "s" : ""}. They can be restored from the admin recycle bin.
              </p>
            </div>
            <button type="button" onClick={onClose}
              className={dark
                ? "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10"
                : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-1.5 text-sm text-[#5b564d] hover:bg-[#faf7f2]"
              }>
              ✕
            </button>
          </div>

          {/* Item list */}
          <div className={dark
            ? "mt-4 max-h-48 overflow-auto rounded-xl border border-white/10 bg-white/5"
            : "mt-4 max-h-48 overflow-auto rounded-xl border border-[#ebe3d8] bg-[#fcfaf7]"
          }>
            {items.map((item, i) => (
              <div key={item.id} className={dark
                ? "border-b border-white/8 px-4 py-2.5 text-sm text-slate-200 last:border-b-0"
                : "border-b border-[#eee7dd] px-4 py-2.5 text-sm text-[#1a1814] last:border-b-0"
              }>
                {i + 1}. {item.name}
              </div>
            ))}
          </div>

          {/* Reason */}
          <div className="mt-4">
            <label className={dark ? "mb-1.5 block text-xs font-semibold text-slate-300" : "mb-1.5 block text-xs font-semibold text-[#2c2823]"}>
              Reason for deletion
            </label>
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={3}
              placeholder="e.g. Wrong entry, duplicate item, obsolete record..."
              className={dark
                ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600"
                : "w-full rounded-xl border border-[#d9d3c8] bg-white px-3 py-2.5 text-sm outline-none"
              }
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={deleting}
              className={dark
                ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2] disabled:opacity-50"
              }>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={deleting}
              className={dark
                ? "rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                : "rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              }>
              {deleting ? "Deleting..." : `Delete ${items.length} Item${items.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
