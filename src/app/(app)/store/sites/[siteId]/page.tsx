import { canEditStore } from "@/lib/access";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { typeLabel } from "@/lib/item-types";
import InventorySiteClient from "./InventorySiteClient";

export default async function InventorySitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = canEditStore(profile, siteId); // editor role + full access here

  const site = await prisma.inventorySite.findFirst({
    where:  { id: siteId, isDeleted: false },
    select: {
      id:          true,
      name:        true,
      location:    true,
      description: true,
      items: {
        where:   { isDeleted: false },
        orderBy: { name: "asc" },
        select: {
          id:           true,
          name:         true,
          itemType:     true,
          typeId:       true,
          subTypeId:    true,
          typeRef:      { select: { name: true, tracked: true } },
          subType:      { select: { name: true } },
          description:  true,
          itemCode:     true,
          manufacturer: true,
          model:        true,
          quantity:     true,
          uncountable:  true,
          unit:         true,
          reorderLevel: true,
          status:       true,
          condition:    true,
          instances: {
            select: {
              id:         true,
              entityCode: true,
              status:     true,
              condition:  true,
            },
          },
        },
      },
    },
  });

  if (!site) return notFound();

  const itemsWithCondition = site.items.map(({ typeRef, subType, ...item }) => ({
    ...item,
    typeName:    typeRef?.name ?? null,
    subTypeName: subType?.name ?? null,
    typeLabel:   typeLabel({ itemType: item.itemType, typeRef, subType }),
    tracked:     typeRef?.tracked ?? item.itemType === "EQUIPMENT",
    condition:   item.condition,
  }));

  const summary = {
    totalItems:      String(site.items.length),
    equipmentCount:  String(itemsWithCondition.filter((i) => i.tracked).length),   // tracked item types (Equipment, …)
    materialCount:   String(itemsWithCondition.filter((i) => !i.tracked).length),
    lowStockCount:   String(site.items.filter((i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK").length),
    checkedOutCount: String(site.items.filter((i) => i.status === "CHECKED_OUT").length),
  };

  return (
    <InventorySiteClient
      role={role}
      canEdit={canEdit}
      site={site}
      summary={summary}
      items={itemsWithCondition as any}
    />
  );
}
