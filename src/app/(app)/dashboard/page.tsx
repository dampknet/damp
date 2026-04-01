import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const [
    sites,
    sitesActive,
    sitesDown,
    airSites,
    liquidSites,
    knetSites,
    gbcSites,
    assets,
    storeTotal,
    received,
    notReceived,
    recentActivityRaw,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "ACTIVE" } }),
    prisma.site.count({ where: { status: "DOWN" } }),
    prisma.site.count({ where: { transmitterType: "AIR" } }),
    prisma.site.count({ where: { transmitterType: "LIQUID" } }),
    prisma.site.count({ where: { towerType: "KNET" } }),
    prisma.site.count({ where: { towerType: "GBC" } }),
    prisma.asset.count(),
    prisma.storeItem.count(),
    prisma.storeItem.count({ where: { status: "RECEIVED" } }),
    prisma.storeItem.count({ where: { status: "NOT_RECEIVED" } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activePct = percent(sitesActive, sites);
  const airPct = percent(airSites, sites);
  const knetPct = percent(knetSites, sites);
  const receivedPct = percent(received, storeTotal);
  const assetUtilPct = assets > 0 ? 100 : 0;

  const displayName =
    profile?.fullName?.trim() || profile?.email?.split("@")[0] || "User";

  const recentActivity = recentActivityRaw.map((item) => ({
    id: item.id,
    title: item.title,
    details: item.details ?? null,
    actorEmail: item.actorEmail ?? null,
    createdAtLabel: formatRelative(item.createdAt),
  }));

  return (
    <DashboardClient
      role={role}
      email={profile?.email ?? null}
      displayName={displayName}
      stats={{
        sites,
        sitesActive,
        sitesDown,
        airSites,
        liquidSites,
        knetSites,
        gbcSites,
        assets,
        storeTotal,
        received,
        notReceived,
        activePct,
        airPct,
        knetPct,
        receivedPct,
        assetUtilPct,
      }}
      recentActivity={recentActivity}
    />
  );
}