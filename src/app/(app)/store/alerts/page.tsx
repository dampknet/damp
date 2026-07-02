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
  const q  = (sp.q ?? "").trim();

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";

  const rawItems = await prisma.inventoryItem.findMany({
    where: {
      isDeleted: false,
      OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      ...(q ? {
        AND: [{
          OR: [
            { name:     { contains: q, mode: "insensitive" } },
            { itemCode: { contains: q, mode: "insensitive" } }, // ✅ replaces stockNumber
            {
              instances: {
                some: { entityCode: { contains: q, mode: "insensitive" } }, // ✅ replaces serialNumber
              },
            },
            { inventorySite: { name: { contains: q, mode: "insensitive" } } },
          ],
        }],
      } : {}),
    },
    orderBy: [{ status: "desc" }, { quantity: "asc" }],
    select: {
      id:               true,
      name:             true,
      itemType:         true,
      quantity:         true,
      unit:             true,
      reorderLevel:     true,
      targetStockLevel: true,
      status:           true,
      itemCode:         true, // ✅ replaces stockNumber
      instances: {
        select:  { entityCode: true }, // ✅ replaces serialNumber
        take:    3,
        orderBy: { createdAt: "asc" },
      },
      inventorySite: {
        select: { id: true, name: true },
      },
    },
  });

  const lowStockCount = await prisma.inventoryItem.count({
    where: { status: "LOW_STOCK",   isDeleted: false },
  });
  const outOfStockCount = await prisma.inventoryItem.count({
    where: { status: "OUT_OF_STOCK", isDeleted: false },
  });

  const items = rawItems.map((row) => ({
    id:               row.id,
    name:             row.name,
    itemType:         row.itemType,
    quantity:         row.quantity,
    unit:             row.unit,
    reorderLevel:     row.reorderLevel,
    targetStockLevel: row.targetStockLevel,
    status:           row.status,
    itemCode:         row.itemCode,
    entityCodePreview: row.instances.map((i) => i.entityCode).join(", ") || "-",
    inventorySite:    row.inventorySite,
  }));

  const exportRows = items.map((row, index) => ({
    No:                  index + 1,
    Site:                row.inventorySite.name,
    Item:                row.name,
    Type:                row.itemType,
    Quantity:            `${row.quantity}${row.unit ? ` ${row.unit}` : ""}`,
    "Reorder Level":     row.reorderLevel,
    "Target Stock":      row.targetStockLevel ?? "",
    Status:              row.status,
    "Item Code":         row.itemCode ?? "",
    "Entity Codes":      row.entityCodePreview,
    "Restock Needed":    row.targetStockLevel !== null
                           ? Math.max(0, row.targetStockLevel - row.quantity)
                           : "",
  }));

  const exportCols = [
    { key: "No",             label: "No"            },
    { key: "Site",           label: "Site"          },
    { key: "Item",           label: "Item"          },
    { key: "Type",           label: "Type"          },
    { key: "Quantity",       label: "Quantity"      },
    { key: "Reorder Level",  label: "Reorder Level" },
    { key: "Target Stock",   label: "Target Stock"  },
    { key: "Status",         label: "Status"        },
    { key: "Item Code",      label: "Item Code"     },
    { key: "Entity Codes",   label: "Entity Codes"  },
    { key: "Restock Needed", label: "Restock Needed"},
  ];

  return (
    <AlertsClient
      role={role}
      q={q}
      items={items as any}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
