import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import RestockLogClient from "./RestockLogClient";

type SearchParams = {
  q?: string;
};

export default async function SiteRestockLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ siteId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { siteId } = await params;
  const sp = (await searchParams) ?? {};
  const q  = (sp.q ?? "").trim();

  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true, description: true },
  });
  if (!site) return notFound();

  const rawRestocks = await prisma.inventoryRestock.findMany({
    where: {
      inventorySiteId: siteId,
      ...(q ? {
        OR: [
          { supplier:    { contains: q, mode: "insensitive" } },
          { receivedBy:  { contains: q, mode: "insensitive" } },
          { note:        { contains: q, mode: "insensitive" } },
          { inventoryItem: { name:     { contains: q, mode: "insensitive" } } },
          { inventoryItem: { itemCode: { contains: q, mode: "insensitive" } } },
          {
            inventoryItem: {
              instances: {
                some: { entityCode: { contains: q, mode: "insensitive" } },
              },
            },
          },
        ],
      } : {}),
    },
    orderBy: { dateReceived: "desc" },
    select: {
      id:           true,
      quantityAdded: true,
      dateBought:   true,
      dateReceived: true,
      supplier:     true,
      receivedBy:   true,
      note:         true,
      inventoryItem: {
        select: {
          id:       true,
          name:     true,
          itemType: true,
          itemCode: true,
          unit:     true,
          instances: {
            select:  { entityCode: true },
            take:    3,
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  const restocks = rawRestocks.map((row) => ({
    ...row,
    inventoryItem: {
      ...row.inventoryItem,
      entityCodePreview:
        row.inventoryItem.instances.map((i) => i.entityCode).join(", ") || "-",
    },
  }));

  const totalRestocks      = await prisma.inventoryRestock.count({ where: { inventorySiteId: siteId } });
  const totalQuantityAdded = restocks.reduce((sum, r) => sum + r.quantityAdded, 0);

  const exportRows = restocks.map((row, index) => ({
    No:              index + 1,
    Item:            row.inventoryItem.name,
    Type:            row.inventoryItem.itemType,
    "Item Code":     row.inventoryItem.itemCode ?? "",
    "Quantity Added":`${row.quantityAdded}${row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}`,
    "Date Bought":   row.dateBought?.toISOString() ?? "",
    "Date Received": row.dateReceived.toISOString(),
    Supplier:        row.supplier ?? "",
    "Received By":   row.receivedBy ?? "",
    Note:            row.note ?? "",
  }));

  const exportCols = [
    { key: "No",             label: "No" },
    { key: "Item",           label: "Item" },
    { key: "Type",           label: "Type" },
    { key: "Item Code",      label: "Item Code" },
    { key: "Quantity Added", label: "Quantity Added" },
    { key: "Date Bought",    label: "Date Bought" },
    { key: "Date Received",  label: "Date Received" },
    { key: "Supplier",       label: "Supplier" },
    { key: "Received By",    label: "Received By" },
    { key: "Note",           label: "Note" },
  ];

  return (
    <RestockLogClient
      role={role}
      canEdit={canEdit}
      site={site}
      q={q}
      totalRestocks={totalRestocks}
      totalQuantityAdded={totalQuantityAdded}
      restocks={restocks as any}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
