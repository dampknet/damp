import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import WaybillsClient from "./WaybillsClient";

export default async function WaybillsPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  await getCurrentProfile();

  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { id: true, name: true },
  });
  if (!site) return notFound();

  // Fetch all unique trips (grouped by groupId) for this site
  const issues = await prisma.warehouseIssue.findMany({
    where:   { inventorySiteId: siteId, groupId: { not: null } },
    orderBy: { takenAt: "desc" },
    select: {
      id:            true,
      groupId:       true,
      takenBy:       true,
      takenAt:       true,
      quantityTaken: true,
      status:        true,
      inventoryItem: { select: { name: true } },
    },
  });

  // Group by groupId — one trip card per groupId
  const tripMap = new Map<string, {
    groupId:   string;
    takenBy:   string;
    takenAt:   Date;
    status:    string;
    items:     { name: string; qty: number }[];
  }>();

  for (const issue of issues) {
    const key = issue.groupId!;
    if (!tripMap.has(key)) {
      tripMap.set(key, {
        groupId: key,
        takenBy: issue.takenBy,
        takenAt: issue.takenAt,
        status:  issue.status,
        items:   [],
      });
    }
    const trip = tripMap.get(key)!;
    trip.items.push({ name: issue.inventoryItem.name, qty: issue.quantityTaken });
    // if any item is still OPEN, trip is OPEN
    if (issue.status === "OPEN") trip.status = "OPEN";
  }

  const trips = Array.from(tripMap.values());

  return <WaybillsClient site={site} trips={trips as any} />;
}
