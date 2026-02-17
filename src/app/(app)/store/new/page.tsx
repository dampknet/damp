// src/app/store/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { StoreStatus } from "@prisma/client";

export default async function NewStoreItemPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  if (!canEdit) redirect("/store");

  async function createItem(formData: FormData) {
    "use server";

    const itemNoRaw = String(formData.get("itemNo") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const qtyRaw = String(formData.get("quantity") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "RECEIVED").trim();

    const itemNo = Number(itemNoRaw);
    const quantity = Number(qtyRaw);

    if (!Number.isFinite(itemNo)) redirect(`/store/new?error=${encodeURIComponent("Item number must be a number")}`);
    if (!description) redirect(`/store/new?error=${encodeURIComponent("Description is required")}`);
    if (!Number.isFinite(quantity)) redirect(`/store/new?error=${encodeURIComponent("Quantity must be a number")}`);

    const status = (statusRaw === "NOT_RECEIVED" ? "NOT_RECEIVED" : "RECEIVED") as StoreStatus;

    try {
      await prisma.storeItem.create({
        data: {
          itemNo: Math.trunc(itemNo),
          description,
          quantity: Math.trunc(quantity),
          status,
        },
      });

      redirect("/store");
    } catch {
      redirect(`/store/new?error=${encodeURIComponent("Could not create item (maybe itemNo already exists)")}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link href="/store" className="text-sm text-gray-600 hover:underline">
          ← Back to Store
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Add Store Item</h1>
        <p className="mt-1 text-sm text-gray-600">Create a new store/inventory item.</p>

        <form action={createItem} className="mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <Field label="Item number">
            <input
              name="itemNo"
              placeholder="e.g. 31"
              inputMode="numeric"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              placeholder="Enter description..."
              rows={6}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantity">
              <input
                name="quantity"
                placeholder="e.g. 10"
                inputMode="numeric"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
                required
              />
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue="RECEIVED"
                aria-label="Item status"
                title="Item status"
                className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              >
                <option value="RECEIVED">RECEIVED</option>
                <option value="NOT_RECEIVED">NOT RECEIVED</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Create item
            </button>
            <Link
              href="/store"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </label>
  );
}
