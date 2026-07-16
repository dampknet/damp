import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import StoreDashboardClient from "./StoreDashboardClient";

export default async function StoreDashboardPage() {
  const profile  = await getCurrentProfile();
  const role     = profile?.role ?? "VIEWER";
  const canEdit  = role === "ADMIN" || role === "EDITOR";

  const [
    inventorySites,
    totalInventoryItems,
    totalEquipment,
    totalAccessories,
    lowStockItems,
    checkedOutEquipment,
    centralStockCount,
    restockCount,
    issueCount,
  ] = await Promise.all([
    prisma.inventorySite.findMany({
      where:   { isDeleted: false },
      orderBy: { name: "asc" },
      select: {
        id:       true,
        name:     true,
        location: true,
        _count:   { select: { items: { where: { isDeleted: false } } } },
      },
    }),
    prisma.inventoryItem.count({ where: { isDeleted: false } }),
    prisma.inventoryItem.count({ where: { isDeleted: false, itemType: "EQUIPMENT" } }),
    prisma.inventoryItem.count({ where: { isDeleted: false, itemType: "ACCESSORIES" } }),
    prisma.inventoryItem.count({
      where: {
        isDeleted: false,
        uncountable: false,   // ✅ never count uncountable items as low stock
        OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      },
    }),
    prisma.warehouseIssue.count({ where: { status: "OPEN", expectedReturnAt: { not: null } } }),
    prisma.storeItem.count(),
    prisma.inventoryRestock.count(),                          // restockCount
    prisma.warehouseIssue.count(),                           // issueCount ✅ was InventoryIssue
  ]);

  const siteCards = inventorySites.map((site) => ({
    id:        site.id,
    name:      site.name,
    location:  site.location ?? "-",
    itemCount: site._count.items,
  }));

  // ── Server action: create a new inventory site ─────────────────────────────
  async function createInventorySite(formData: FormData) {
    "use server";

    if (!canEdit) redirect("/store");

    const name        = String(formData.get("name")        ?? "").trim();
    const location    = String(formData.get("location")    ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) redirect("/store?siteError=Site+name+is+required");

    // Check for duplicate name
    const existing = await prisma.inventorySite.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, isDeleted: false },
    });
    if (existing) redirect(`/store?siteError=${encodeURIComponent(`A site named "${name}" already exists`)}`);

    try {
      const created = await prisma.inventorySite.create({
        data: {
          name,
          location:    location    || null,
          description: description || null,
        },
      });

      await logActivity({
        type:       "SITE_CREATED",
        title:      `Inventory site created: ${created.name}`,
        details:    `Location: ${location || "—"}.`,
        actorEmail: profile?.email ?? null,
        entityType: "INVENTORY_SITE",
        entityId:   created.id,
      });
    } catch (e) {
      console.error(e);
      redirect("/store?siteError=Could+not+create+site");
    }

    revalidatePath("/store");
    redirect("/store?siteSuccess=Site+created+successfully");
  }

  return (
    <StoreDashboardClient
      role={role}
      canEdit={canEdit}
      email={profile?.email ?? null}
      summary={{
        totalInventoryItems,
        totalEquipment,
        totalAccessories,
        lowStockItems,
        checkedOutEquipment,
        centralStockCount,
        restockCount,
        issueCount,
      }}
      siteCards={siteCards}
      createSiteAction={canEdit ? createInventorySite : undefined}
    />
  );
}
