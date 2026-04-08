import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import GlobalRestockLogClient from "./GlobalRestockLogClient";

type SearchParams = {
  q?: string;
};

export default async function GlobalRestockLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const rawRestocks = await prisma.inventoryRestock.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { supplier: { contains: q, mode: "insensitive" } },
              { receivedBy: { contains: q, mode: "insensitive" } },
              { note: { contains: q, mode: "insensitive" } },
              { inventoryItem: { name: { contains: q, mode: "insensitive" } } },
              { inventoryItem: { stockNumber: { contains: q, mode: "insensitive" } } },
              // ✅ Correct way to search by serial number through the relation
              { 
                inventoryItem: { 
                  instances: { 
                    some: { serialNumber: { contains: q, mode: "insensitive" } } 
                  } 
                } 
              },
            ],
          }
        : {}),
    },
    orderBy: { dateReceived: "desc" },
    select: {
      id: true,
      quantityAdded: true,
      dateBought: true,
      dateReceived: true,
      supplier: true,
      receivedBy: true,
      note: true,
      inventoryItem: {
        select: {
          id: true,
          name: true,
          itemType: true,
          stockNumber: true,
          unit: true,
          // ✅ FIXED: Fetch instances instead of deleted serialNumber column
          instances: {
            select: { serialNumber: true }
          }
        },
      },
      inventorySite: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // ✅ Flatten the serial numbers into a string for the Client UI
  const restocks = rawRestocks.map(row => ({
    ...row,
    inventoryItem: {
      ...row.inventoryItem,
      serialNumber: row.inventoryItem.instances.map(i => i.serialNumber).join(", ") || "-"
    }
  }));

  const totalRestocks = await prisma.inventoryRestock.count();
  const totalQuantityAdded = restocks.reduce((sum, row) => sum + row.quantityAdded, 0);

  const exportRows = restocks.map((row, index) => ({
    No: index + 1,
    Site: row.inventorySite.name,
    Item: row.inventoryItem.name,
    Type: row.inventoryItem.itemType,
    "Stock No": row.inventoryItem.stockNumber ?? "",
    "Quantity Added": `${row.quantityAdded}${row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}`,
    "Date Bought": row.dateBought?.toISOString() ?? "",
    "Date Received": row.dateReceived.toISOString(),
    Supplier: row.supplier ?? "",
    "Received By": row.receivedBy ?? "",
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Site", label: "Site" },
    { key: "Item", label: "Item" },
    { key: "Type", label: "Type" },
    { key: "Stock No", label: "Stock No" },
    { key: "Quantity Added", label: "Quantity Added" },
    { key: "Date Bought", label: "Date Bought" },
    { key: "Date Received", label: "Date Received" },
    { key: "Supplier", label: "Supplier" },
    { key: "Received By", label: "Received By" },
  ];

  return (
    <GlobalRestockLogClient
      role={role}
      canEdit={canEdit}
      q={q}
      totalRestocks={totalRestocks}
      totalQuantityAdded={totalQuantityAdded}
      restocks={restocks as any}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}