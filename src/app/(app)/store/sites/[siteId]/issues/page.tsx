import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import IssueLogClient from "./IssueLogClient";

type SearchParams = {
  q?:      string;
  status?: "ALL" | "OPEN" | "RETURNED";
};

export default async function SiteIssueLogPage({
  params,
  searchParams,
}: {
  params:        Promise<{ siteId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { siteId } = await params;
  const sp         = (await searchParams) ?? {};
  const profile    = await getCurrentProfile();
  const role       = profile?.role ?? "VIEWER";
  const canEdit    = role === "ADMIN" || role === "EDITOR";
  const q          = (sp.q ?? "").trim();
  const status     = sp.status ?? "ALL";

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true, location: true, description: true },
  });
  if (!site) return notFound();

  // Fetch all warehouse issues for this site
  const rawIssues = await prisma.warehouseIssue.findMany({
    where: {
      inventorySiteId: siteId,
      AND: [
        q ? {
          OR: [
            { takenBy:        { contains: q, mode: "insensitive" } },
            { takenByContact: { contains: q, mode: "insensitive" } },
            { purpose:        { contains: q, mode: "insensitive" } },
            { authorizedBy:   { contains: q, mode: "insensitive" } },
            { groupId:        { contains: q, mode: "insensitive" } },
            { inventoryItem:  { name:     { contains: q, mode: "insensitive" } } },
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

  // ✅ Group by groupId — each trip is one card
  const groupMap = new Map<string, typeof rawIssues>();
  for (const issue of rawIssues) {
    const key = issue.groupId ?? issue.id; // fallback to id if no groupId (old records)
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
    // A trip is RETURNED only if ALL items are returned
    status: issues.every((i) => i.status === "RETURNED") ? "RETURNED" : "OPEN",
    items:  issues,
  }));

  const [openCount, returnedCount] = await Promise.all([
    prisma.warehouseIssue.count({ where: { inventorySiteId: siteId, status: "OPEN" } }),
    prisma.warehouseIssue.count({ where: { inventorySiteId: siteId, status: "RETURNED" } }),
  ]);

  return (
    <IssueLogClient
      role={role}
      canEdit={canEdit}
      site={site}
      q={q}
      status={status}
      summary={{ openCount, returnedCount }}
      trips={trips as any}
    />
  );
}
