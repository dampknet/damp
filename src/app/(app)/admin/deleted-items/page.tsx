import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import DeletedItemsClient from "./ui";

export default async function DeletedItemsPage() {
  const me = await getCurrentProfile();

  if (!me) redirect("/auth/login");
  if (me.role !== "ADMIN") redirect("/sites");

  const [sites, assets, inventoryItems, storeItems] = await Promise.all([
    prisma.site.findMany({
      where: { isDeleted: true },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id: true,
        name: true,
        deletedAt: true,
        deletedByEmail: true,
        deleteReason: true,
      },
    }),

    prisma.asset.findMany({
      where: { isDeleted: true },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id: true,
        assetName: true,
        serialNumber: true,
        deletedAt: true,
        deletedByEmail: true,
        deleteReason: true,
        site: {
          select: { name: true },
        },
      },
    }),

    prisma.inventoryItem.findMany({
      where: { isDeleted: true },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id: true,
        name: true,
        itemType: true,
        stockNumber: true,
        serialNumber: true,
        deletedAt: true,
        deletedByEmail: true,
        deleteReason: true,
        inventorySite: {
          select: { name: true },
        },
      },
    }),

    prisma.storeItem.findMany({
      where: { isDeleted: true },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id: true,
        itemNo: true,
        description: true,
        deletedAt: true,
        deletedByEmail: true,
        deleteReason: true,
      },
    }),
  ]);

  return (
    <DeletedItemsClient
      sites={sites.map((x) => ({
        id: x.id,
        label: x.name,
        subLabel: "Site",
        deletedAt: x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason: x.deleteReason ?? null,
        entityType: "SITE" as const,
      }))}
      assets={assets.map((x) => ({
        id: x.id,
        label: x.assetName,
        subLabel: x.site?.name
          ? `Asset • ${x.site.name}${x.serialNumber ? ` • ${x.serialNumber}` : ""}`
          : `Asset${x.serialNumber ? ` • ${x.serialNumber}` : ""}`,
        deletedAt: x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason: x.deleteReason ?? null,
        entityType: "ASSET" as const,
      }))}
      inventoryItems={inventoryItems.map((x) => ({
        id: x.id,
        label: x.name,
        subLabel: `${x.itemType} • ${x.inventorySite.name}${
          x.stockNumber ? ` • ${x.stockNumber}` : x.serialNumber ? ` • ${x.serialNumber}` : ""
        }`,
        deletedAt: x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason: x.deleteReason ?? null,
        entityType: "INVENTORY_ITEM" as const,
      }))}
      storeItems={storeItems.map((x) => ({
        id: x.id,
        label: `Item #${x.itemNo}`,
        subLabel: x.description,
        deletedAt: x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason: x.deleteReason ?? null,
        entityType: "STORE_ITEM" as const,
      }))}
    />
  );
}