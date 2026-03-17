import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import GlobalIssueLogClient from "./GlobalIssueLogClient";

type SearchParams = {
  q?: string;
  status?: "ALL" | "ISSUED" | "RETURNED";
  type?: "ALL" | "MATERIAL" | "EQUIPMENT";
};

export default async function GlobalIssueLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "ALL";
  const type = sp.type ?? "ALL";

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const issues = await prisma.inventoryIssue.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { requesterName: { contains: q, mode: "insensitive" } },
                { requesterContact: { contains: q, mode: "insensitive" } },
                { purpose: { contains: q, mode: "insensitive" } },
                { authorizedBy: { contains: q, mode: "insensitive" } },
                { inventorySite: { name: { contains: q, mode: "insensitive" } } },
                { inventoryItem: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        status !== "ALL" ? { status } : {},
        type !== "ALL" ? { itemType: type } : {},
      ],
    },
    orderBy: { issuedAt: "desc" },
    select: {
      id: true,
      itemType: true,
      quantity: true,
      requesterName: true,
      requesterContact: true,
      purpose: true,
      authorizedBy: true,
      issuedAt: true,
      expectedReturnDate: true,
      returnedAt: true,
      status: true,
      inventoryItem: {
        select: {
          id: true,
          name: true,
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

  const [issuedCount, returnedCount, materialCount, equipmentCount] =
    await Promise.all([
      prisma.inventoryIssue.count({ where: { status: "ISSUED" } }),
      prisma.inventoryIssue.count({ where: { status: "RETURNED" } }),
      prisma.inventoryIssue.count({ where: { itemType: "MATERIAL" } }),
      prisma.inventoryIssue.count({ where: { itemType: "EQUIPMENT" } }),
    ]);

  const exportRows = issues.map((row, index) => ({
    No: index + 1,
    Site: row.inventorySite.name,
    Item: row.inventoryItem.name,
    Type: row.itemType,
    Quantity: `${row.quantity}${row.inventoryItem.unit ? ` ${row.inventoryItem.unit}` : ""}`,
    Requester: row.requesterName,
    Contact: row.requesterContact ?? "",
    Purpose: row.purpose,
    "Authorized By": row.authorizedBy,
    "Issued At": row.issuedAt.toISOString(),
    "Expected Return": row.expectedReturnDate?.toISOString() ?? "",
    "Returned At": row.returnedAt?.toISOString() ?? "",
    Status: row.status,
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Site", label: "Site" },
    { key: "Item", label: "Item" },
    { key: "Type", label: "Type" },
    { key: "Quantity", label: "Quantity" },
    { key: "Requester", label: "Requester" },
    { key: "Contact", label: "Contact" },
    { key: "Purpose", label: "Purpose" },
    { key: "Authorized By", label: "Authorized By" },
    { key: "Issued At", label: "Issued At" },
    { key: "Expected Return", label: "Expected Return" },
    { key: "Returned At", label: "Returned At" },
    { key: "Status", label: "Status" },
  ];

  return (
    <GlobalIssueLogClient
      role={role}
      canEdit={canEdit}
      q={q}
      status={status}
      type={type}
      summary={{
        issuedCount,
        returnedCount,
        materialCount,
        equipmentCount,
      }}
      issues={issues}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}