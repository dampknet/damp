import { prisma } from "@/lib/prisma";
import { getCurrentProfile, getEditorProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { getAwaitingReturns } from "@/lib/deliveries";
import { enableStandardTypes } from "@/lib/item-type-registry";
import { accessOf, storeFilter } from "@/lib/access";
import StoreDashboardClient from "./StoreDashboardClient";

export default async function StoreDashboardPage() {
  const profile = await getCurrentProfile();
  const role    = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  const W       = storeFilter(accessOf(profile)); // only the warehouses this user may see
  const I       = { inventorySiteId: W };          // same, for item/issue/restock rows

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
      where:   { isDeleted: false, id: W },
      orderBy: { name: "asc" },
      select: {
        id:          true,
        name:        true,
        location:    true,
        description: true,
        _count:      { select: { items: { where: { isDeleted: false } } } },
      },
    }),
    prisma.inventoryItem.count({ where: { isDeleted: false, ...I } }),
    prisma.inventoryItem.count({ where: { isDeleted: false, ...I, typeRef: { is: { tracked: true } } } }),   // tracked item types (Equipment, …)
    prisma.inventoryItem.count({ where: { isDeleted: false, ...I, typeRef: { is: { tracked: false } } } }),
    prisma.inventoryItem.count({
      where: {
        isDeleted:   false,
        uncountable: false,
        ...I,
        OR: [{ status: "LOW_STOCK" }, { status: "OUT_OF_STOCK" }],
      },
    }),
    prisma.warehouseIssue.count({ where: { status: "OPEN", expectedReturnAt: { not: null }, ...I } }),
    prisma.storeItem.count(),
    prisma.inventoryRestock.count({ where: I }),
    prisma.warehouseIssue.count({ where: I }),
    prisma.warehouseIssue.count({ where: { deliveryStatus: "PENDING", ...I } }),
  ]);
  const awaitingReturns = (await getAwaitingReturns(I)).reduce((s, r) => s + r.awaitingReturn, 0);

  const isAdmin = !!profile?.isMasterAdmin; // deleting warehouses is master-admin only

  // What stops each warehouse from being deleted (only master admins see the Delete button, so only count for them).
  const usage = isAdmin ? await siteUsage(inventorySites.map((s) => s.id)) : new Map<string, string[]>();

  const siteCards = inventorySites.map((site) => ({
    id:          site.id,
    name:        site.name,
    location:    site.location ?? "-",
    rawLocation: site.location ?? "",
    description: site.description ?? "",
    itemCount:   site._count.items,
    blockers:    usage.get(site.id) ?? [],
  }));

  async function updateInventorySite(formData: FormData) {
    "use server";

    // Master admins only, re-checked on submit.
    const actor = await getCurrentProfile();
    if (!actor?.isMasterAdmin) redirect("/store?siteError=Only+a+master+admin+can+edit+sites");

    const id          = String(formData.get("id")          ?? "");
    const name        = String(formData.get("name")        ?? "").trim().replace(/\s+/g, " ");
    const location    = String(formData.get("location")    ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) redirect("/store?siteError=Site+name+is+required");

    const site = await prisma.inventorySite.findFirst({ where: { id, isDeleted: false } });
    if (!site) redirect("/store?siteError=That+site+no+longer+exists");

    const clash = await prisma.inventorySite.findFirst({
      where: { id: { not: id }, name: { equals: name, mode: "insensitive" }, isDeleted: false },
    });
    if (clash) redirect(`/store?siteError=${encodeURIComponent(`A site named "${name}" already exists`)}`);

    const changes: string[] = [];
    if (site.name !== name)                                 changes.push(`name "${site.name}" → "${name}"`);
    if ((site.location ?? "") !== location)                 changes.push(`location "${site.location ?? "—"}" → "${location || "—"}"`);
    if ((site.description ?? "") !== description)           changes.push("description updated");
    if (!changes.length) redirect("/store?siteSuccess=No+changes+to+save");

    try {
      await prisma.inventorySite.update({
        where: { id },
        data:  { name, location: location || null, description: description || null },
      });
      await logActivity({
        type:       "SITE_UPDATED",
        title:      `Inventory site updated: ${name}`,
        details:    `Changed ${changes.join("; ")}.`,
        actorEmail: actor.email ?? null,
        entityType: "INVENTORY_SITE",
        entityId:   id,
      });
    } catch (e) {
      console.error(e);
      redirect("/store?siteError=Could+not+update+site");
    }

    revalidatePath("/store", "layout");
    redirect(`/store?siteSuccess=${encodeURIComponent(`"${name}" updated`)}`);
  }

  async function deleteInventorySite(formData: FormData) {
    "use server";

    // Master admins only, re-checked on submit.
    const actor = await getCurrentProfile();
    if (!actor?.isMasterAdmin) redirect("/store?siteError=Only+a+master+admin+can+delete+sites");

    const id   = String(formData.get("id") ?? "");
    const site = await prisma.inventorySite.findFirst({ where: { id, isDeleted: false } });
    if (!site) redirect("/store?siteError=That+site+no+longer+exists");

    // Re-check on submit: anything recorded against the site blocks the delete.
    const blockers = (await siteUsage([id])).get(id) ?? [];
    if (blockers.length) {
      redirect(`/store?siteError=${encodeURIComponent(`"${site.name}" can't be deleted — it has ${blockers.join(", ")}.`)}`);
    }

    try {
      // Nothing is recorded against it, so remove it fully (its item-type settings go with it).
      await prisma.inventorySite.delete({ where: { id } });
      await logActivity({
        type:       "SITE_DELETED",
        title:      `Inventory site deleted: ${site.name}`,
        details:    `Location: ${site.location || "—"}. The site had no items or history.`,
        actorEmail: actor!.email ?? null,
        entityType: "INVENTORY_SITE",
        entityId:   id,
      });
    } catch (e) {
      console.error(e);
      // A foreign key refusal lands here if data was added in the meantime.
      redirect(`/store?siteError=${encodeURIComponent(`"${site.name}" could not be deleted — it may have just received data.`)}`);
    }

    revalidatePath("/store", "layout");
    redirect(`/store?siteSuccess=${encodeURIComponent(`"${site.name}" deleted`)}`);
  }

  async function createInventorySite(formData: FormData) {
    "use server";

    // Master admins only, re-checked on submit.
    const creator = await getCurrentProfile();
    if (!creator?.isMasterAdmin) redirect("/store?siteError=Only+a+master+admin+can+create+sites");

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

      // New warehouses start with the standard item types switched on; admins switch off what they don't use.
      await enableStandardTypes(created.id);

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
      isAdmin={isAdmin}
      createSiteAction={isAdmin ? createInventorySite : undefined}
      updateSiteAction={isAdmin ? updateInventorySite : undefined}
      deleteSiteAction={isAdmin ? deleteInventorySite : undefined}
    />
  );
}

// Everything recorded against each warehouse, as readable reasons ("3 items", "2 restocks", …).
// Items in Deleted Items count too: they still belong to the site.
async function siteUsage(ids: string[]): Promise<Map<string, string[]>> {
  if (!ids.length) return new Map();
  const [items, binned, restocks, oldIssues, issues] = await Promise.all([
    prisma.inventoryItem.groupBy({ by: ["inventorySiteId"], where: { inventorySiteId: { in: ids }, isDeleted: false }, _count: { _all: true } }),
    prisma.inventoryItem.groupBy({ by: ["inventorySiteId"], where: { inventorySiteId: { in: ids }, isDeleted: true },  _count: { _all: true } }),
    prisma.inventoryRestock.groupBy({ by: ["inventorySiteId"], where: { inventorySiteId: { in: ids } }, _count: { _all: true } }),
    prisma.inventoryIssue.groupBy({ by: ["inventorySiteId"], where: { inventorySiteId: { in: ids } }, _count: { _all: true } }),
    prisma.warehouseIssue.groupBy({ by: ["inventorySiteId"], where: { inventorySiteId: { in: ids } }, _count: { _all: true } }),
  ]);
  const out = new Map<string, string[]>();
  const add = (rows: { inventorySiteId: string; _count: { _all: number } }[], label: (n: number) => string) => {
    for (const r of rows) if (r._count._all) out.set(r.inventorySiteId, [...(out.get(r.inventorySiteId) ?? []), label(r._count._all)]);
  };
  const s = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  add(items,     (n) => s(n, "item", "items"));
  add(binned,    (n) => s(n, "item in Deleted Items", "items in Deleted Items"));
  add(restocks,  (n) => s(n, "restock record", "restock records"));
  add(oldIssues, (n) => s(n, "old issue record", "old issue records"));
  add(issues,    (n) => s(n, "issue record", "issue records"));
  return out;
}
