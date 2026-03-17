import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { StoreStatus } from "@prisma/client";
import NewStoreItemClient from "./NewStoreItemClient";

export default async function NewStoreItemPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect("/store/central-stock");

  async function createItem(formData: FormData) {
    "use server";

    const itemNoRaw = String(formData.get("itemNo") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const qtyRaw = String(formData.get("quantity") ?? "").trim();
    const statusRaw = String(formData.get("status") ?? "RECEIVED").trim();

    const itemNo = Number(itemNoRaw);
    const quantity = Number(qtyRaw);

    if (!Number.isFinite(itemNo)) {
      redirect(`/store/central-stock/new?error=${encodeURIComponent("Item number must be a number")}`);
    }

    if (!description) {
      redirect(`/store/central-stock/new?error=${encodeURIComponent("Description is required")}`);
    }

    if (!Number.isFinite(quantity)) {
      redirect(`/store/central-stock/new?error=${encodeURIComponent("Quantity must be a number")}`);
    }

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

      redirect("/store/central-stock");
    } catch {
      redirect(
        `/store/central-stock/new?error=${encodeURIComponent(
          "Could not create item (maybe itemNo already exists)"
        )}`
      );
    }
  }

  return <NewStoreItemClient action={createItem} />;
}