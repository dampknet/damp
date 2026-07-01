import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import InventorySiteClient from "./InventorySiteClient";

export default async function InventorySitePage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

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
          description:  true,
          itemCode:     true,
          manufacturer: true,
          model:        true,
          quantity:     true,
          uncountable:  true,
          unit:         true,
          reorderLevel: true,
          status:       true,
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

  const itemsWithCondition = site.items.map((item) => ({
    ...item,
    condition: item.instances[0]?.condition ?? "NEW",
  }));

  const summary = {
    totalItems: String(site.items.length),

    // ✅ Equipment ONLY — matches the store dashboard count exactly
    equipmentCount: String(
      site.items.filter((i) => i.itemType === "EQUIPMENT").length
    ),

    // ✅ Everything else = "Other Items"
    materialCount: String(
      site.items.filter(
        (i) =>
          i.itemType === "ACCESSORIES" ||
          i.itemType === "TOOLS_AND_PARTS" ||
          i.itemType === "GENERAL" ||
          i.itemType === "COOLING_INFRASTRUCTURE" ||
          i.itemType === "CABLES_AND_ELECTRONICS"
      ).length
    ),

    lowStockCount: String(
      site.items.filter(
        (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK"
      ).length
    ),

    checkedOutCount: String(
      site.items.filter((i) => i.status === "CHECKED_OUT").length
    ),
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
