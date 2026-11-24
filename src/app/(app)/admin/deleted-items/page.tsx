import { accessOf, storeFilter } from "@/lib/access";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import DeletedItemsClient from "./ui";
import { TYPE_NAMES, typeLabel } from "@/lib/item-types";

export default async function DeletedItemsPage() {
  const me = await getCurrentProfile();

  if (!me) redirect("/auth/login");
  if (me.role !== "ADMIN") redirect("/sites");
  const access = accessOf(me);   // restricted admins only see their own areas and warehouses
  const NONE   = { in: [] as string[] };

  const [sites, assets, inventoryItems, storeItems] = await Promise.all([
    prisma.site.findMany({
      where:   { isDeleted: true, ...(access.sites ? {} : { id: NONE }) },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id:             true,
        name:           true,
        deletedAt:      true,
        deletedByEmail: true,
        deleteReason:   true,
      },
    }),

    prisma.asset.findMany({
      where:   { isDeleted: true, ...(access.sites ? {} : { id: NONE }) },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id:             true,
        assetName:      true,
        serialNumber:   true,
        deletedAt:      true,
        deletedByEmail: true,
        deleteReason:   true,
        site: { select: { name: true } },
      },
    }),

    prisma.inventoryItem.findMany({
      where:   { isDeleted: true, inventorySiteId: storeFilter(access) },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id:             true,
        name:           true,
        itemType:       true,
        ...TYPE_NAMES,
        itemCode:       true,   // ✅ replaces stockNumber
        deletedAt:      true,
        deletedByEmail: true,
        deleteReason:   true,
        instances: {
          select: { id: true },
        },
        inventorySite: { select: { name: true } },
      },
    }),

    prisma.storeItem.findMany({
      where:   { isDeleted: true, ...(access.master ? {} : { id: NONE }) },
      orderBy: [{ deletedAt: "desc" }],
      select: {
        id:             true,
        itemNo:         true,
        description:    true,
        deletedAt:      true,
        deletedByEmail: true,
        deleteReason:   true,
      },
    }),
  ]);

  return (
    <DeletedItemsClient
      sites={sites.map((x) => ({
        id:             x.id,
        label:          x.name,
        subLabel:       "Site",
        deletedAt:      x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason:   x.deleteReason  ?? null,
        entityType:     "SITE" as const,
      }))}

      assets={assets.map((x) => ({
        id:    x.id,
        label: x.assetName,
        subLabel: x.site?.name
          ? `Asset • ${x.site.name}${x.serialNumber ? ` • ${x.serialNumber}` : ""}`
          : `Asset${x.serialNumber ? ` • ${x.serialNumber}` : ""}`,
        deletedAt:      x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason:   x.deleteReason  ?? null,
        entityType:     "ASSET" as const,
      }))}

      inventoryItems={inventoryItems.map((x) => {
        const unitCount    = x.instances?.length ?? 0;
        const unitSuffix   = unitCount > 0 ? ` • ${unitCount} unit${unitCount !== 1 ? "s" : ""}` : "";
        const codeSuffix   = x.itemCode ? ` • ${x.itemCode}` : unitSuffix;

        return {
          id:    x.id,
          label: x.name,
          subLabel: `${typeLabel(x)} • ${x.inventorySite.name}${codeSuffix}`,
          deletedAt:      x.deletedAt?.toISOString() ?? null,
          deletedByEmail: x.deletedByEmail ?? null,
          deleteReason:   x.deleteReason  ?? null,
          entityType:     "INVENTORY_ITEM" as const,
        };
      })}

      storeItems={storeItems.map((x) => ({
        id:             x.id,
        label:          `Item #${x.itemNo}`,
        subLabel:       x.description,
        deletedAt:      x.deletedAt?.toISOString() ?? null,
        deletedByEmail: x.deletedByEmail ?? null,
        deleteReason:   x.deleteReason  ?? null,
        entityType:     "STORE_ITEM" as const,
      }))}
    />
  );
}
