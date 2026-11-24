import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function GET() {
  try {
    const profile = await getCurrentProfile();
    // Master admins only: the file holds every account and all inventory.
    if (!profile?.isMasterAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      categories,
      subcategories,
      issueReturns,
      itemTypes,
      warehouseItemTypes,
      userStoreAccess,
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
      // Site assets need their categories, so a restore into an empty database works in one go.
      prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.subcategory.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.issueReturn.findMany({ orderBy: { receivedAt: "asc" } }),
      // Main types first, then sub-types, so a restore can insert parents before children.
      prisma.itemType.findMany({ orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { createdAt: "asc" }] }),
      prisma.warehouseItemType.findMany(),
      prisma.userStoreAccess.findMany(),
    ]);

    const includeHashes = profile.isMasterAdmin;
    const safeProfiles  = includeHashes
      ? userProfiles
      : userProfiles.map(({ passwordHash, ...rest }) => rest);

    const backup = {
      _meta: {
        version:    "1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: profile.email,
        includesPasswordHashes: includeHashes,
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
          categories:          categories.length,
          subcategories:       subcategories.length,
          issueReturns:        issueReturns.length,
          itemTypes:           itemTypes.length,
          warehouseItemTypes:  warehouseItemTypes.length,
          userStoreAccess:     userStoreAccess.length,
        },
      },
      categories,
      subcategories,
      itemTypes,
      warehouseItemTypes,
      inventorySites,
      inventoryItems,
      assetInstances,
      inventoryRestocks,
      warehouseIssues,
      warehouseIssueLines,
      sites,
      assets,
      userProfiles: safeProfiles,
      userStoreAccess,
      activityLogs,
      storeItems,
      issueReturns,
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
