import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all tables in parallel
    const [
      inventorySites,
      inventoryItems,
      assetInstances,
      inventoryRestocks,
      warehouseIssues,
      warehouseIssueLines,
      sites,
      assets,
      userProfiles,
      activityLogs,
      storeItems,
    ] = await Promise.all([
      prisma.inventorySite.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.inventoryItem.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.assetInstance.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.inventoryRestock.findMany({ orderBy: { dateReceived: "asc" } }),
      prisma.warehouseIssue.findMany({ orderBy: { takenAt: "asc" } }),
      prisma.warehouseIssueLine.findMany(),
      prisma.site.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.asset.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.userProfile.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take:    10000, // cap at 10k to keep file size reasonable
      }),
      prisma.storeItem.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const backup = {
      _meta: {
        version:    "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: profile.email,
        counts: {
          inventorySites:      inventorySites.length,
          inventoryItems:      inventoryItems.length,
          assetInstances:      assetInstances.length,
          inventoryRestocks:   inventoryRestocks.length,
          warehouseIssues:     warehouseIssues.length,
          warehouseIssueLines: warehouseIssueLines.length,
          sites:               sites.length,
          assets:              assets.length,
          userProfiles:        userProfiles.length,
          activityLogs:        activityLogs.length,
          storeItems:          storeItems.length,
        },
      },
      inventorySites,
      inventoryItems,
      assetInstances,
      inventoryRestocks,
      warehouseIssues,
      warehouseIssueLines,
      sites,
      assets,
      userProfiles,
      activityLogs,
      storeItems,
    };

    const json     = JSON.stringify(backup, null, 2);
    const filename = `damp-backup-${new Date().toISOString().split("T")[0]}.json`;

    return new NextResponse(json, {
      headers: {
        "Content-Type":        "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[BACKUP_EXPORT]", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}