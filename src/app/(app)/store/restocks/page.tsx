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

  const restocks = await prisma.inventoryRestock.findMany({
    where: q
      ? {
          OR: [
            { supplier: { contains: q, mode: "insensitive" } },
            { receivedBy: { contains: q, mode: "insensitive" } },
            { note: { contains: q, mode: "insensitive" } },
            {
              inventoryItem: {
                name: { contains: q, mode: "insensitive" },
              },
            },
            {
              inventorySite: {
                name: { contains: q, mode: "insensitive" },
              },
            },
          ],
        }
      : {},
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
          name: true,
          itemType: true,
          stockNumber: true,
          serialNumber: true,
          unit: true,
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
    Note: row.note ?? "",
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
    { key: "Note", label: "Note" },
  ];

  return (
    <GlobalRestockLogClient
      role={role}
      canEdit={canEdit}
      q={q}
      totalRestocks={totalRestocks}
      totalQuantityAdded={totalQuantityAdded}
      restocks={restocks}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}