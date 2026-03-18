import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import CheckedOutEquipmentClient from "./CheckedOutEquipmentClient";

type SearchParams = {
  q?: string;
};

export default async function GlobalCheckedOutEquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const items = await prisma.inventoryIssue.findMany({
    where: {
      itemType: "EQUIPMENT",
      status: "ISSUED",
      ...(q
        ? {
            OR: [
              { requesterName: { contains: q, mode: "insensitive" } },
              { requesterContact: { contains: q, mode: "insensitive" } },
              { inventorySite: { name: { contains: q, mode: "insensitive" } } },
              { inventoryItem: { name: { contains: q, mode: "insensitive" } } },
              { authorizedBy: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      requesterName: true,
      requesterContact: true,
      purpose: true,
      authorizedBy: true,
      issuedAt: true,
      expectedReturnDate: true,
      inventoryItem: {
        select: {
          name: true,
          serialNumber: true,
          stockNumber: true,
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

  const exportRows = items.map((row, index) => ({
    No: index + 1,
    Site: row.inventorySite.name,
    Item: row.inventoryItem.name,
    Serial: row.inventoryItem.serialNumber ?? "",
    "Stock No": row.inventoryItem.stockNumber ?? "",
    Requester: row.requesterName,
    Contact: row.requesterContact ?? "",
    Purpose: row.purpose,
    "Authorized By": row.authorizedBy,
    "Issued At": row.issuedAt.toISOString(),
    "Expected Return": row.expectedReturnDate?.toISOString() ?? "",
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Site", label: "Site" },
    { key: "Item", label: "Item" },
    { key: "Serial", label: "Serial" },
    { key: "Stock No", label: "Stock No" },
    { key: "Requester", label: "Requester" },
    { key: "Contact", label: "Contact" },
    { key: "Purpose", label: "Purpose" },
    { key: "Authorized By", label: "Authorized By" },
    { key: "Issued At", label: "Issued At" },
    { key: "Expected Return", label: "Expected Return" },
  ];

  return (
    <CheckedOutEquipmentClient
      role={role}
      q={q}
      items={items}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}