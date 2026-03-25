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

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const site = await prisma.inventorySite.findFirst({
    where: {
      id: siteId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      location: true,
      description: true,
      createdAt: true,
      items: {
        where: {
          isDeleted: false,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          itemType: true,
          description: true,
          stockNumber: true,
          manufacturer: true,
          model: true,
          serialNumber: true,
          quantity: true,
          unit: true,
          reorderLevel: true,
          targetStockLevel: true,
          status: true,
          condition: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!site) return notFound();

  const totalItems = site.items.length;
  const materialCount = site.items.filter((item) => item.itemType === "MATERIAL").length;
  const equipmentCount = site.items.filter((item) => item.itemType === "EQUIPMENT").length;
  const lowStockCount = site.items.filter(
    (item) => item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK"
  ).length;
  const checkedOutCount = site.items.filter((item) => item.status === "CHECKED_OUT").length;

  return (
    <InventorySiteClient
      role={role}
      canEdit={canEdit}
      site={{
        id: site.id,
        name: site.name,
        location: site.location,
        description: site.description,
      }}
      summary={{
        totalItems,
        materialCount,
        equipmentCount,
        lowStockCount,
        checkedOutCount,
      }}
      items={site.items}
    />
  );
}