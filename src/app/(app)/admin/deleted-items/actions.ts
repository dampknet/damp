"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

type EntityType = "SITE" | "ASSET" | "INVENTORY_ITEM" | "STORE_ITEM";

async function requireAdmin() {
  const me = await getCurrentProfile();

  if (!me || me.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  return me;
}

export async function restoreDeletedItem(entityType: EntityType, id: string) {
  const me = await requireAdmin();

  if (!id) throw new Error("Item id is required.");

  if (entityType === "SITE") {
    const item = await prisma.site.findUnique({
      where: { id },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!item) throw new Error("Site not found.");
    if (!item.isDeleted) throw new Error("Site is not deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.site.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByEmail: null,
          deleteReason: null,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "SITE_UPDATED",
          title: `${item.name} restored`,
          details: "Soft-deleted site restored by admin",
          entityType: "SITE",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "ASSET") {
    const item = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, assetName: true, isDeleted: true },
    });

    if (!item) throw new Error("Asset not found.");
    if (!item.isDeleted) throw new Error("Asset is not deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByEmail: null,
          deleteReason: null,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "ASSET_UPDATED",
          title: `${item.assetName} restored`,
          details: "Soft-deleted asset restored by admin",
          entityType: "ASSET",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "INVENTORY_ITEM") {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!item) throw new Error("Inventory item not found.");
    if (!item.isDeleted) throw new Error("Inventory item is not deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByEmail: null,
          deleteReason: null,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "INVENTORY_ITEM_UPDATED",
          title: `${item.name} restored`,
          details: "Soft-deleted inventory item restored by admin",
          entityType: "INVENTORY_ITEM",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "STORE_ITEM") {
    const item = await prisma.storeItem.findUnique({
      where: { id },
      select: { id: true, itemNo: true, isDeleted: true },
    });

    if (!item) throw new Error("Store item not found.");
    if (!item.isDeleted) throw new Error("Store item is not deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.storeItem.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByEmail: null,
          deleteReason: null,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "STORE_ITEM_STATUS_CHANGED",
          title: `Store item #${item.itemNo} restored`,
          details: "Soft-deleted store item restored by admin",
          entityType: "STORE_ITEM",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  revalidatePath("/admin/deleted-items");
  revalidatePath("/sites");
  revalidatePath("/assets");
  revalidatePath("/store");
}

export async function permanentlyDeleteItem(entityType: EntityType, id: string) {
  const me = await requireAdmin();

  if (!id) throw new Error("Item id is required.");

  if (entityType === "SITE") {
    const item = await prisma.site.findUnique({
      where: { id },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!item) throw new Error("Site not found.");
    if (!item.isDeleted) throw new Error("Only deleted sites can be permanently deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.asset.deleteMany({
        where: { siteId: id },
      });

      await tx.site.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          type: "SITE_DELETED",
          title: `${item.name} permanently deleted`,
          details: "Deleted forever from recycle bin",
          entityType: "SITE",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "ASSET") {
    const item = await prisma.asset.findUnique({
      where: { id },
      select: { id: true, assetName: true, isDeleted: true },
    });

    if (!item) throw new Error("Asset not found.");
    if (!item.isDeleted) throw new Error("Only deleted assets can be permanently deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.asset.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          type: "ASSET_DELETED",
          title: `${item.assetName} permanently deleted`,
          details: "Deleted forever from recycle bin",
          entityType: "ASSET",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "INVENTORY_ITEM") {
    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!item) throw new Error("Inventory item not found.");
    if (!item.isDeleted) throw new Error("Only deleted inventory items can be permanently deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.inventoryItem.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          type: "INVENTORY_ITEM_DELETED",
          title: `${item.name} permanently deleted`,
          details: "Deleted forever from recycle bin",
          entityType: "INVENTORY_ITEM",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  if (entityType === "STORE_ITEM") {
    const item = await prisma.storeItem.findUnique({
      where: { id },
      select: { id: true, itemNo: true, isDeleted: true },
    });

    if (!item) throw new Error("Store item not found.");
    if (!item.isDeleted) throw new Error("Only deleted store items can be permanently deleted.");

    await prisma.$transaction(async (tx) => {
      await tx.storeItem.delete({
        where: { id },
      });

      await tx.activityLog.create({
        data: {
          type: "STORE_ITEM_DELETED",
          title: `Store item #${item.itemNo} permanently deleted`,
          details: "Deleted forever from recycle bin",
          entityType: "STORE_ITEM",
          entityId: item.id,
          actorEmail: me.email ?? null,
        },
      });
    });
  }

  revalidatePath("/admin/deleted-items");
  revalidatePath("/sites");
  revalidatePath("/assets");
  revalidatePath("/store");
}