import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import GlobalIssueLogClient from "./GlobalIssueLogClient";

type SearchParams = {
  q?:      string;
  status?: "ALL" | "OPEN" | "RETURNED";
  type?:   string;
};

export default async function GlobalIssueLogPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp     = (await searchParams) ?? {};
  const q      = (sp.q      ?? "").trim();
  const status = (sp.status ?? "ALL") as "ALL" | "OPEN" | "RETURNED";
  const typeRaw = sp.type ?? "ALL";

  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  // ✅ Read from WarehouseIssue (not InventoryIssue)
  const rawIssues = await prisma.warehouseIssue.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { takenBy:        { contains: q, mode: "insensitive" } },
            { takenByContact: { contains: q, mode: "insensitive" } },
            { purpose:        { contains: q, mode: "insensitive" } },
            { authorizedBy:   { contains: q, mode: "insensitive" } },
            { inventorySite:  { name: { contains: q, mode: "insensitive" } } },
            { inventoryItem:  { name: { contains: q, mode: "insensitive" } } },
            { inventoryItem:  { itemCode: { contains: q, mode: "insensitive" } } },
            {
              lines: {
                some: {
                  assetInstance: { entityCode: { contains: q, mode: "insensitive" } },
                },
              },
            },
          ],
        } : {},
        status !== "ALL" ? { status } : {},
        typeRaw !== "ALL" ? { inventoryItem: { itemType: typeRaw as any } } : {},
      ],
    },
    orderBy: { takenAt: "desc" },
    select: {
      id:               true,
      groupId:          true,
      quantityTaken:    true,
      takenBy:          true,
      takenByContact:   true,
      authorizedBy:     true,
      purpose:          true,
      takenAt:          true,
      expectedReturnAt: true,
      returnedAt:       true,
      returnedBy:       true,
      returnNote:       true,
      status:           true,
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
          id: true,
          assetInstance: {
            select: { id: true, entityCode: true, condition: true },
          },
        },
      },
    },
  });

  // Group by groupId — same as site-specific log
  const groupMap = new Map<string, typeof rawIssues>();
  for (const issue of rawIssues) {
    const key = issue.groupId ?? issue.id;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(issue);
  }

  const trips = Array.from(groupMap.entries()).map(([groupId, issues]) => ({
    groupId,
    takenBy:        issues[0].takenBy,
    takenByContact: issues[0].takenByContact,
    authorizedBy:   issues[0].authorizedBy,
    purpose:        issues[0].purpose,
    takenAt:        issues[0].takenAt,
    siteName:       issues[0].inventorySite.name,
    siteId:         issues[0].inventorySite.id,
    status:         issues.every((i) => i.status === "RETURNED") ? "RETURNED" : "OPEN",
    items:          issues,
  }));

  const [openCount, returnedCount, equipmentCount, othersCount] = await Promise.all([
    prisma.warehouseIssue.count({ where: { status: "OPEN" } }),
    prisma.warehouseIssue.count({ where: { status: "RETURNED" } }),
    prisma.warehouseIssue.count({ where: { inventoryItem: { itemType: "EQUIPMENT" } } }),
    prisma.warehouseIssue.count({
      where: {
        inventoryItem: {
          itemType: { in: ["ACCESSORIES","TOOLS_AND_PARTS","GENERAL","COOLING_INFRASTRUCTURE","CABLES_AND_ELECTRONICS"] },
        },
      },
    }),
  ]);

  return (
    <GlobalIssueLogClient
      role={role}
      canEdit={canEdit}
      q={q}
      status={status}
      type={typeRaw}
      summary={{ openCount, returnedCount, equipmentCount, othersCount }}
      trips={trips as any}
    />
  );
}
