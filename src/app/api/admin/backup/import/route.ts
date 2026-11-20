import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    // Validate backup structure
    if (!body._meta || !body._meta.version) {
      return NextResponse.json(
        { error: "Invalid backup file. Not a DAMP backup." },
        { status: 400 }
      );
    }

    const results: Record<string, number> = {};
    const skipped: string[] = [];

    // Accounts and audit history can only be restored by a master admin.
    // Otherwise an ADMIN could restore a file that adds a master-admin account
    // with a password they know, or insert fake audit-trail entries.
    if (!profile.isMasterAdmin) {
      if (body.userProfiles?.length) skipped.push("user accounts");
      if (body.activityLogs?.length) skipped.push("activity history");
      body.userProfiles = [];
      body.activityLogs = [];
    }

    // ── Restore in dependency order (parents before children) ────────────────

    // 0. Asset categories (site assets point to them; older backups don't include them)
    if (body.categories?.length) {
      await prisma.category.createMany({ data: body.categories, skipDuplicates: true });
      results.categories = body.categories.length;
    }
    if (body.subcategories?.length) {
      await prisma.subcategory.createMany({ data: body.subcategories, skipDuplicates: true });
      results.subcategories = body.subcategories.length;
    }

    // 0b. Item types (main types before sub-types)
    if (body.itemTypes?.length) {
      const mains = body.itemTypes.filter((t: any) => !t.parentId);
      const subs  = body.itemTypes.filter((t: any) =>  t.parentId);
      await prisma.itemType.createMany({ data: mains, skipDuplicates: true });
      if (subs.length) await prisma.itemType.createMany({ data: subs, skipDuplicates: true });
      results.itemTypes = body.itemTypes.length;
    }

    // 1. Sites (broadcast)
    if (body.sites?.length) {
      await prisma.site.createMany({
        data:           body.sites,
        skipDuplicates: true,
      });
      results.sites = body.sites.length;
    }

    // 2. Assets
    if (body.assets?.length) {
      await prisma.asset.createMany({
        data:           body.assets,
        skipDuplicates: true,
      });
      results.assets = body.assets.length;
    }

    // 3. UserProfiles
    if (body.userProfiles?.length) {
      await prisma.userProfile.createMany({
        data:           body.userProfiles,
        skipDuplicates: true,
      });
      results.userProfiles = body.userProfiles.length;
    }

    // 4. InventorySites
    if (body.inventorySites?.length) {
      await prisma.inventorySite.createMany({
        data:           body.inventorySites,
        skipDuplicates: true,
      });
      results.inventorySites = body.inventorySites.length;
    }

    // 4b. Which warehouses use which item types (depends on InventorySite + ItemType)
    if (body.warehouseItemTypes?.length) {
      await prisma.warehouseItemType.createMany({ data: body.warehouseItemTypes, skipDuplicates: true });
      results.warehouseItemTypes = body.warehouseItemTypes.length;
    }

    // 5. InventoryItems (depends on InventorySite)
    if (body.inventoryItems?.length) {
      await prisma.inventoryItem.createMany({
        data:           body.inventoryItems,
        skipDuplicates: true,
      });
      results.inventoryItems = body.inventoryItems.length;

      // Older backups have no item types: link those items to their type (same as the upgrade did).
      const legacyTypes = await prisma.itemType.findMany({ where: { legacyKey: { not: null } }, select: { id: true, legacyKey: true } });
      for (const t of legacyTypes) {
        await prisma.inventoryItem.updateMany({ where: { typeId: null, itemType: t.legacyKey! }, data: { typeId: t.id } });
      }
    }

    // 6. AssetInstances (depends on InventoryItem)
    if (body.assetInstances?.length) {
      await prisma.assetInstance.createMany({
        data:           body.assetInstances,
        skipDuplicates: true,
      });
      results.assetInstances = body.assetInstances.length;
    }

    // 7. InventoryRestocks (depends on InventoryItem + InventorySite)
    if (body.inventoryRestocks?.length) {
      await prisma.inventoryRestock.createMany({
        data:           body.inventoryRestocks,
        skipDuplicates: true,
      });
      results.inventoryRestocks = body.inventoryRestocks.length;
    }

    // 8. WarehouseIssues (depends on InventoryItem + InventorySite)
    if (body.warehouseIssues?.length) {
      await prisma.warehouseIssue.createMany({
        data:           body.warehouseIssues,
        skipDuplicates: true,
      });
      results.warehouseIssues = body.warehouseIssues.length;
    }

    // 9. WarehouseIssueLines (depends on WarehouseIssue + AssetInstance)
    if (body.warehouseIssueLines?.length) {
      await prisma.warehouseIssueLine.createMany({
        data:           body.warehouseIssueLines,
        skipDuplicates: true,
      });
      results.warehouseIssueLines = body.warehouseIssueLines.length;
    }

    // 9b. Returns received at the store (depends on WarehouseIssue)
    if (body.issueReturns?.length) {
      await prisma.issueReturn.createMany({ data: body.issueReturns, skipDuplicates: true });
      results.issueReturns = body.issueReturns.length;
    }

    // 10. StoreItems
    if (body.storeItems?.length) {
      await prisma.storeItem.createMany({
        data:           body.storeItems,
        skipDuplicates: true,
      });
      results.storeItems = body.storeItems.length;
    }

    // 11. ActivityLogs (last — no FK dependencies)
    if (body.activityLogs?.length) {
      await prisma.activityLog.createMany({
        data:           body.activityLogs,
        skipDuplicates: true,
      });
      results.activityLogs = body.activityLogs.length;
    }

    // Log the restore
    await prisma.activityLog.create({
      data: {
        type:       "SYSTEM_EVENT",
        title:      "Data recovery performed",
        details:    `Backup from ${body._meta.exportedAt} restored by ${profile.email}. Records: ${JSON.stringify(results)}${skipped.length ? `. Skipped (master admin only): ${skipped.join(", ")}` : ""}`,
        actorEmail: profile.email,
        entityType: "SYSTEM",
      },
    });

    return NextResponse.json({
      ok:      true,
      message: skipped.length
        ? `Backup restored. Skipped ${skipped.join(" and ")} — only a master admin can restore those.`
        : "Backup restored successfully",
      results,
    });

  } catch (error) {
    console.error("[BACKUP_IMPORT]", error);
    return NextResponse.json(
      { error: "Restore failed. Check the backup file format." },
      { status: 500 }
    );
  }
}