"use client";

type SelectedItem = {
  id: string;
  name: string;
  stockNumber: string | null;
  itemType: "MATERIAL" | "EQUIPMENT";
};

export default function DeleteInventoryItemsDialog({
  open,
  dark,
  items,
  deleting,
  reason,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  open: boolean;
  dark: boolean;
  items: SelectedItem[];
  deleting: boolean;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close delete dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />

      <div
        className={
          dark
            ? "relative z-101 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0f1722] shadow-2xl"
            : "relative z-101 w-full max-w-2xl overflow-hidden rounded-3xl border border-[#e7ded3] bg-white shadow-[0_24px_80px_rgba(26,24,20,0.18)]"
        }
      >
        <div
          className={
            dark
              ? "h-1 w-full bg-[linear-gradient(90deg,#ef4444,#f97316)]"
              : "h-1 w-full bg-[linear-gradient(90deg,#dc2626,#ea580c)]"
          }
        />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className={
                  dark
                    ? "inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-300"
                    : "inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-red-700"
                }
              >
                Delete Inventory Items
              </div>

              <h3
                className={
                  dark
                    ? "mt-4 text-2xl font-semibold tracking-tight text-slate-100"
                    : "mt-4 text-2xl font-semibold tracking-tight text-[#1a1814]"
                }
              >
                Are you sure?
              </h3>

              <p
                className={
                  dark
                    ? "mt-2 text-sm leading-6 text-slate-400"
                    : "mt-2 text-sm leading-6 text-[#746d64]"
                }
              >
                You are about to delete{" "}
                <span className={dark ? "font-semibold text-slate-100" : "font-semibold text-[#1a1814]"}>
                  {items.length}
                </span>{" "}
                selected item{items.length > 1 ? "s" : ""}.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
                  : "rounded-xl border border-[#ddd5c9] bg-white px-3 py-2 text-sm font-medium text-[#5b564d] hover:bg-[#faf7f2]"
              }
            >
              ✕
            </button>
          </div>

          <div
            className={
              dark
                ? "mt-5 max-h-72 overflow-auto rounded-2xl border border-white/10 bg-white/5"
                : "mt-5 max-h-72 overflow-auto rounded-2xl border border-[#ebe3d8] bg-[#fcfaf7]"
            }
          >
            <div className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div
                      className={
                        dark
                          ? "text-sm font-semibold text-slate-100"
                          : "text-sm font-semibold text-[#1a1814]"
                      }
                    >
                      {index + 1}. {item.name}
                    </div>

                    <div
                      className={
                        dark
                          ? "mt-1 text-xs text-slate-400"
                          : "mt-1 text-xs text-[#746d64]"
                      }
                    >
                      Type: {item.itemType}
                      {item.stockNumber ? ` • Stock No: ${item.stockNumber}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label
              className={
                dark
                  ? "mb-2 block text-sm font-semibold text-slate-200"
                  : "mb-2 block text-sm font-semibold text-[#2c2823]"
              }
            >
              Reason for deletion
            </label>

            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              rows={4}
              placeholder="e.g. Wrong entry, duplicate item, obsolete record..."
              className={
                dark
                  ? "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-2xl border border-[#d9d3c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#1a1814]"
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                  : "rounded-xl border border-[#ddd5c9] bg-white px-4 py-2.5 text-sm font-medium text-[#1a1814] hover:bg-[#faf7f2] disabled:opacity-50"
              }
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className={
                dark
                  ? "rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                  : "rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              }
            >
              {deleting ? "Deleting..." : `Delete ${items.length} Item${items.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}