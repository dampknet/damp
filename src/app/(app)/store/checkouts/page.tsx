import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import CheckedOutEquipmentClient from "./CheckedOutEquipmentClient";

type SearchParams = { q?: string };

export default async function GlobalCheckedOutEquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q  = (sp.q ?? "").trim();

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";

  // ✅ Read from WarehouseIssue — open issues marked as returnable
  const rawItems = await prisma.warehouseIssue.findMany({
    where: {
      status:           "OPEN",
      expectedReturnAt: { not: null },  // only returnable items
      AND: q ? [{
        OR: [
          { takenBy:       { contains: q, mode: "insensitive" } },
          { takenByContact:{ contains: q, mode: "insensitive" } },
          { authorizedBy:  { contains: q, mode: "insensitive" } },
          { inventorySite: { name: { contains: q, mode: "insensitive" } } },
          { inventoryItem: { name: { contains: q, mode: "insensitive" } } },
          { inventoryItem: { itemCode: { contains: q, mode: "insensitive" } } },
          {
            lines: {
              some: {
                assetInstance: { entityCode: { contains: q, mode: "insensitive" } },
              },
            },
          },
        ],
      }] : undefined,
    },
    orderBy: { takenAt: "desc" },
    select: {
      id:               true,
      quantityTaken:    true,
      takenBy:          true,
      takenByContact:   true,
      authorizedBy:     true,
      purpose:          true,
      takenAt:          true,
      expectedReturnAt: true,
      inventoryItem: {
        select: {
          id:       true,
          name:     true,
          itemType: true,
          itemCode: true,
          unit:     true,
        },
      },
      inventorySite: {
        select: { id: true, name: true },
      },
      lines: {
        select: {
          assetInstance: { select: { entityCode: true, condition: true } },
        },
      },
    },
  });

  const items = rawItems.map((row) => ({
    id:               row.id,
    takenBy:          row.takenBy,
    takenByContact:   row.takenByContact,
    authorizedBy:     row.authorizedBy,
    purpose:          row.purpose,
    takenAt:          row.takenAt,
    expectedReturnAt: row.expectedReturnAt,
    quantityTaken:    row.quantityTaken,
    entityCodePreview:
      row.lines.length > 0
        ? row.lines.map((l) => l.assetInstance.entityCode).join(", ")
        : "N/A",
    inventoryItem: {
      name:     row.inventoryItem.name,
      itemType: row.inventoryItem.itemType,
      itemCode: row.inventoryItem.itemCode,
      unit:     row.inventoryItem.unit,
    },
    inventorySite: row.inventorySite,
  }));

  const exportRows = items.map((row, index) => ({
    No:                index + 1,
    Site:              row.inventorySite.name,
    Item:              row.inventoryItem.name,
    "Item Code":       row.inventoryItem.itemCode ?? "",
    "Entity Codes":    row.entityCodePreview,
    "Type":            row.inventoryItem.itemType,
    Quantity:          `${row.quantityTaken}${row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}`,
    "Taken By":        row.takenBy,
    Contact:           row.takenByContact ?? "",
    "Authorized By":   row.authorizedBy ?? "",
    "Issued At":       row.takenAt.toISOString(),
    "Expected Return": row.expectedReturnAt?.toISOString() ?? "",
  }));

  const exportCols = [
    { key: "No",              label: "No"            },
    { key: "Site",            label: "Site"          },
    { key: "Item",            label: "Item"          },
    { key: "Item Code",       label: "Item Code"     },
    { key: "Entity Codes",    label: "Entity Codes"  },
    { key: "Type",            label: "Type"          },
    { key: "Quantity",        label: "Quantity"      },
    { key: "Taken By",        label: "Taken By"      },
    { key: "Contact",         label: "Contact"       },
    { key: "Authorized By",   label: "Authorized By" },
    { key: "Issued At",       label: "Issued At"     },
    { key: "Expected Return", label: "Expected Return"},
  ];

  return (
    <CheckedOutEquipmentClient
      role={role}
      q={q}
      items={items as any}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
