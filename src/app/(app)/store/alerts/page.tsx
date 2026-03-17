import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import AlertsClient from "./AlertsClient";

type SearchParams = {
  q?: string;
};

export default async function StoreAlertsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const items = await prisma.inventoryItem.findMany({
    where: {
      OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { stockNumber: { contains: q, mode: "insensitive" } },
                  { serialNumber: { contains: q, mode: "insensitive" } },
                  { inventorySite: { name: { contains: q, mode: "insensitive" } } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "desc" }, { quantity: "asc" }],
    select: {
      id: true,
      name: true,
      itemType: true,
      quantity: true,
      unit: true,
      reorderLevel: true,
      targetStockLevel: true,
      status: true,
      stockNumber: true,
      serialNumber: true,
      inventorySite: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const lowStockCount = await prisma.inventoryItem.count({
    where: { status: "LOW_STOCK" },
  });

  const outOfStockCount = await prisma.inventoryItem.count({
    where: { status: "OUT_OF_STOCK" },
  });

  const exportRows = items.map((row, index) => ({
    No: index + 1,
    Site: row.inventorySite.name,
    Item: row.name,
    Type: row.itemType,
    Quantity: `${row.quantity}${row.unit ? ` ${row.unit}` : ""}`,
    "Reorder Level": row.reorderLevel,
    "Target Stock Level": row.targetStockLevel ?? "",
    Status: row.status,
    "Stock No": row.stockNumber ?? "",
    Serial: row.serialNumber ?? "",
    "Restock Needed":
      row.targetStockLevel !== null ? Math.max(0, row.targetStockLevel - row.quantity) : "",
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Site", label: "Site" },
    { key: "Item", label: "Item" },
    { key: "Type", label: "Type" },
    { key: "Quantity", label: "Quantity" },
    { key: "Reorder Level", label: "Reorder Level" },
    { key: "Target Stock Level", label: "Target Stock Level" },
    { key: "Status", label: "Status" },
    { key: "Stock No", label: "Stock No" },
    { key: "Serial", label: "Serial" },
    { key: "Restock Needed", label: "Restock Needed" },
  ];

  return (
    <AlertsClient
      role={role}
      q={q}
      items={items}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}