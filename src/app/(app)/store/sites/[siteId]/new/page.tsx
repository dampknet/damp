import { canEditStore, storeEditor } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, getEditorProfile, isAdminProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import { generateItemCode, getSitePrefix } from "@/lib/inventory-upload";
import { getWarehouseTypeOptions, resolveItemTypeForSave, legacyKeyFor } from "@/lib/item-type-registry";
import type { EquipmentCondition } from "@prisma/client";
import NewInventoryItemClient from "./NewInventoryItemClient";

export default async function NewInventoryItemPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = canEditStore(profile, siteId); // editor role + full access here

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true },
  });
  if (!site) return notFound();

  const siteName = site.name;
  const canManageTypes = isAdminProfile(profile);
  const typeOptions    = await getWarehouseTypeOptions(siteId, canManageTypes);

  async function createInventoryItem(formData: FormData) {
    "use server";

    // Re-check the caller on submit (role or suspension may have changed since the page loaded).
    const actor = await storeEditor(siteId);
    if (!actor) redirect(`/store/sites/${siteId}`);

    const typeIdRaw      = String(formData.get("typeId")           ?? "").trim();
    const subTypeIdRaw   = String(formData.get("subTypeId")        ?? "").trim();
    const name           = String(formData.get("name")             ?? "").trim();
    const description    = String(formData.get("description")      ?? "").trim();
    const itemCodeRaw    = String(formData.get("itemCode")         ?? "").trim();
    const manufacturer   = String(formData.get("manufacturer")     ?? "").trim();
    const model          = String(formData.get("model")            ?? "").trim();
    const quantityRaw    = String(formData.get("quantity")         ?? "").trim();
    const unit           = String(formData.get("unit")             ?? "").trim();
    const reorderRaw     = String(formData.get("reorderLevel")     ?? "").trim();
    const targetRaw      = String(formData.get("targetStockLevel") ?? "").trim();
    const conditionRaw   = String(formData.get("condition")        ?? "NEW").trim();
    const uncountable    = formData.get("uncountable")    === "on";
    const createEntities = formData.get("createEntities") === "on";

    if (!name) {
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Item name is required")}`);
    }

    // Item type + optional sub-type. Admins may pick ones not used here yet — they get switched on.
    const resolved = await resolveItemTypeForSave(siteId, typeIdRaw, subTypeIdRaw || null, isAdminProfile(actor));
    if (!resolved.ok) redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent(resolved.message)}`);
    const itemType = legacyKeyFor(resolved.type);

    const quantity    = uncountable ? 0 : (quantityRaw === "" ? 0 : Number(quantityRaw));
    const reorder     = uncountable ? 0 : (reorderRaw  === "" ? 0 : Number(reorderRaw));
    const targetStock = uncountable ? null : (targetRaw === "" ? null : Number(targetRaw));

    const finalStatus = getAutoInventoryStatus({
      quantity:     Math.trunc(quantity),
      reorderLevel: Math.trunc(reorder),
      uncountable,
    });

    const condition = (["NEW","UNUSED","USED","FAULTY"].includes(conditionRaw)
      ? conditionRaw : "NEW") as EquipmentCondition;

    let itemCode = itemCodeRaw || null;
    if (!itemCode) {
      const prefix = await getSitePrefix(siteId);
      itemCode = await generateItemCode({ code: resolved.code, sitePrefix: prefix });
    } else {
      const existing = await prisma.inventoryItem.findFirst({
        where: { itemCode }, select: { id: true },
      });
      if (existing) {
        redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent(`Item code ${itemCode} already exists`)}`);
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const created = await tx.inventoryItem.create({
          data: {
            inventorySiteId:  siteId,
            itemType,
            typeId:           resolved.type.id,
            subTypeId:        resolved.subTypeId,
            itemCode,
            name,
            description:      description  || null,
            manufacturer:     manufacturer || null,
            model:            model        || null,
            quantity:         Math.trunc(quantity),
            uncountable,
            unit:             unit         || null,
            reorderLevel:     Math.trunc(reorder),
            targetStockLevel: targetStock === null ? null : Math.trunc(targetStock),
            status:           finalStatus,
            condition,
          },
        });

        if (createEntities && !uncountable && quantity > 0) {
          await tx.assetInstance.createMany({
            data: Array.from({ length: Math.trunc(quantity) }).map((_, i) => ({
              inventoryItemId: created.id,
              entityCode:      `${itemCode}-${String(i + 1).padStart(2, "0")}`,
              status:          "AVAILABLE" as const,
              condition,
            })),
          });
        }

        await logActivity({
          type:       "INVENTORY_ITEM_CREATED",
          title:      `Created: ${created.name}`,
          details:    `Code: ${itemCode}. Site: ${siteName}. ${uncountable ? "Qty: N/A." : `Qty: ${created.quantity}.`} Condition: ${condition}. Entities: ${createEntities && !uncountable && quantity > 0 ? `${Math.trunc(quantity)} created` : "none"}.`,
          actorEmail: profile?.email ?? null,
          entityType: "INVENTORY_ITEM",
          entityId:   created.id,
        });
      });
    } catch (e) {
      console.error(e);
      redirect(`/store/sites/${siteId}/new?error=${encodeURIComponent("Could not create inventory item")}`);
    }

    redirect(`/store/sites/${siteId}`);
  }

  return <NewInventoryItemClient site={site} action={createInventoryItem} typeOptions={typeOptions} canManageTypes={canManageTypes} />;
}
