import { prisma } from "@/lib/prisma";
import { getCurrentProfile, getEditorProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { getAwaitingReturns } from "@/lib/deliveries";
import StoreDashboardClient from "./StoreDashboardClient";

export default async function StoreDashboardPage() {
  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const [
    inventorySites,
    totalInventoryItems,
    totalEquipment,
    totalOtherItems,
    lowStockItems,
    checkedOutEquipment,
    centralStockCount,
    restockCount,
    issueCount,
    pendingDeliveries,
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
    prisma.inventoryItem.count({ where: { isDeleted: false, itemType: { not: "EQUIPMENT" } } }),
    prisma.inventoryItem.count({
      where: {
        isDeleted:   false,
        uncountable: false,
        OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      },
    }),
    prisma.warehouseIssue.count({ where: { status: "OPEN", expectedReturnAt: { not: null } } }),
    prisma.storeItem.count(),
    prisma.inventoryRestock.count(),
    prisma.warehouseIssue.count(),
    prisma.warehouseIssue.count({ where: { deliveryStatus: "PENDING" } }),
  ]);
  const awaitingReturns = (await getAwaitingReturns()).reduce((s, r) => s + r.awaitingReturn, 0);

  const siteCards = inventorySites.map((site) => ({
    id:        site.id,
    name:      site.name,
    location:  site.location ?? "-",
    itemCount: site._count.items,
  }));

  async function createInventorySite(formData: FormData) {
    "use server";

    // Re-check the caller on submit (role or suspension may have changed since the page loaded).
    if (!(await getEditorProfile())) redirect("/store");

    if (!canEdit) redirect("/store");

    const name        = String(formData.get("name")        ?? "").trim();
    const location    = String(formData.get("location")    ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) redirect("/store?siteError=Site+name+is+required");

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
        totalOtherItems,
        lowStockItems,
        checkedOutEquipment,
        centralStockCount,
        restockCount,
        pendingDeliveries,
        awaitingReturns,
        issueCount,
      }}
      siteCards={siteCards}
      createSiteAction={canEdit ? createInventorySite : undefined}
    />
  );
}
