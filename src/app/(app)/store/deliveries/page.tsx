import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/lib/auth";
import { getDeliveries } from "@/lib/deliveries";
import PendingDeliveriesClient from "./PendingDeliveriesClient";

export default async function PendingDeliveriesPage({
  searchParams,
}: {
  searchParams?: Promise<{ site?: string; place?: string }>;
}) {
  const profile = await requireCurrentProfile();
  const sp      = (await searchParams) ?? {};
  const site    = (sp.site  ?? "").trim();
  const place   = site ? "" : (sp.place ?? "").trim();

  const scope = site
    ? { destinationSiteId: site }
    : place
    ? { destinationSiteId: null, destinationName: { equals: place, mode: "insensitive" as const } }
    : {};

  const [rows, groups] = await Promise.all([
    getDeliveries({ deliveryStatus: "PENDING", ...scope }, 1000),
    prisma.warehouseIssue.groupBy({
      by:     ["destinationSiteId", "destinationName"],
      where:  { deliveryStatus: "PENDING" },
      _count: { _all: true },
      _sum:   { quantityTaken: true },
    }),
  ]);

  const siteSummary = groups
    .filter((g) => g.destinationSiteId)
    .map((g) => ({ key: g.destinationSiteId as string, name: g.destinationName ?? "—", items: g._count._all, units: g._sum.quantityTaken ?? 0 }))
    .sort((a, b) => b.items - a.items || a.name.localeCompare(b.name));

  // "Other" places: merge spellings that differ only by capitals.
  const placeMap = new Map<string, { key: string; name: string; items: number; units: number }>();
  for (const g of groups) {
    if (g.destinationSiteId || !g.destinationName) continue;
    const k = g.destinationName.trim().toLowerCase();
    const cur = placeMap.get(k) ?? { key: g.destinationName, name: g.destinationName, items: 0, units: 0 };
    cur.items += g._count._all;
    cur.units += g._sum.quantityTaken ?? 0;
    placeMap.set(k, cur);
  }
  const placeSummary = [...placeMap.values()].sort((a, b) => b.items - a.items || a.name.localeCompare(b.name));

  return (
    <PendingDeliveriesClient
      rows={rows}
      siteSummary={siteSummary}
      placeSummary={placeSummary}
      selectedSite={site}
      selectedPlace={place}
      canConfirm={profile.isMasterAdmin}
    />
  );
}
