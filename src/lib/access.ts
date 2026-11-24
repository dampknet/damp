import { redirect } from "next/navigation";
import { getCurrentProfile, isEditorProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Per-user access, set by a master admin in User Management → Access.
//   • Sites switch  – broadcast sites, their assets, racks, transmitters, site stores, /assets.
//   • Store switch  – warehouses and everything done in them.
//   • Warehouses    – "All stores", or a list where each warehouse is FULL (role decides) or VIEW (read-only).
// Master admins always have everything. Every page, action and API below checks on the server.

type Profile = NonNullable<Awaited<ReturnType<typeof getCurrentProfile>>>;
type AccessFields = {
  role:             string;
  isMasterAdmin:    boolean;
  siteAccess?:      boolean;
  storeAccess?:     boolean;
  allStores?:       boolean;
  storeAccessList?: { inventorySiteId: string; level: "FULL" | "VIEW" }[];
};

export type Access = {
  master: boolean;
  sites:  boolean;
  store:  boolean;
  all:    boolean;                          // every warehouse at full level
  levels: Map<string, "FULL" | "VIEW">;    // when not `all`
};

export function accessOf(p: AccessFields | null | undefined): Access {
  if (!p) return { master: false, sites: false, store: false, all: false, levels: new Map() };
  const master = !!p.isMasterAdmin;
  const store  = master || p.storeAccess !== false;
  return {
    master,
    sites:  master || p.siteAccess !== false,
    store,
    all:    master || (store && p.allStores !== false),
    levels: new Map((p.storeAccessList ?? []).map((a) => [a.inventorySiteId, a.level])),
  };
}

// Warehouse ids the user may see: null = all of them.
export function visibleStoreIds(a: Access): string[] | null {
  if (!a.store) return [];
  if (a.all)    return null;
  return [...a.levels.keys()];
}

// Prisma filter for a warehouse id column: spread into a where, e.g. `{ inventorySiteId: storeFilter(a) }`.
export function storeFilter(a: Access): { in: string[] } | undefined {
  const ids = visibleStoreIds(a);
  return ids === null ? undefined : { in: ids };
}

export function canViewStore(a: Access, siteId: string) {
  return a.store && (a.all || a.levels.has(siteId));
}

// May change things at this warehouse: an editor/admin role AND full level there.
export function canEditStore(p: AccessFields | null | undefined, siteId: string) {
  const a = accessOf(p);
  return !!p && isEditorProfile(p) && canViewStore(a, siteId) && (a.all || a.levels.get(siteId) === "FULL");
}

export function canEditSites(p: AccessFields | null | undefined) {
  return !!p && isEditorProfile(p) && accessOf(p).sites;
}

// ── Pages (redirect when not allowed) ─────────────────────────────────────────

async function signedIn(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!p) redirect("/auth/login");
  return p;
}

export async function requireSitesArea() {
  const p = await signedIn();
  if (!accessOf(p).sites) redirect("/dashboard?denied=sites");
  return p;
}

export async function requireStoreArea() {
  const p = await signedIn();
  if (!accessOf(p).store) redirect("/dashboard?denied=store");
  return p;
}

export async function requireStoreView(siteId: string) {
  const p = await requireStoreArea();
  if (!canViewStore(accessOf(p), siteId)) redirect("/store?siteError=You+don%27t+have+access+to+that+warehouse");
  return p;
}

// ── Actions and API routes (return null when not allowed) ─────────────────────

export async function storeViewer(siteId: string) {
  const p = await getCurrentProfile();
  return p && canViewStore(accessOf(p), siteId) ? p : null;
}

export async function storeEditor(siteId: string) {
  const p = await getCurrentProfile();
  return p && canEditStore(p, siteId) ? p : null;
}

export async function sitesViewer() {
  const p = await getCurrentProfile();
  return p && accessOf(p).sites ? p : null;
}

export async function sitesEditor() {
  const p = await getCurrentProfile();
  return canEditSites(p) ? p : null;
}

// Short summary for logs and the users table, e.g. "Store only · Kanda (Full), NOC (View only)".
export function describeAccess(
  p: { isMasterAdmin: boolean; siteAccess: boolean; storeAccess: boolean; allStores: boolean },
  stores: { name: string; level: "FULL" | "VIEW" }[],
) {
  if (p.isMasterAdmin) return "Everything (master admin)";
  const area = p.siteAccess && p.storeAccess ? "Sites + Store" : p.siteAccess ? "Sites only" : "Store only";
  if (!p.storeAccess) return area;
  if (p.allStores)   return `${area} · All stores`;
  return `${area} · ${stores.length ? stores.map((s) => `${s.name} (${s.level === "FULL" ? "Full" : "View only"})`).join(", ") : "no warehouses"}`;
}

// ── Which warehouse a record belongs to (for APIs that receive only a record id) ──

export async function warehouseOfItem(itemId: string): Promise<string | null> {
  if (!itemId) return null;
  const r = await prisma.inventoryItem.findUnique({ where: { id: itemId }, select: { inventorySiteId: true } });
  return r?.inventorySiteId ?? null;
}

export async function warehouseOfInstance(instanceId: string): Promise<string | null> {
  if (!instanceId) return null;
  const r = await prisma.assetInstance.findUnique({ where: { id: instanceId }, select: { inventoryItem: { select: { inventorySiteId: true } } } });
  return r?.inventoryItem?.inventorySiteId ?? null;
}

export async function warehouseOfIssue(issueId: string): Promise<string | null> {
  if (!issueId) return null;
  const r = await prisma.warehouseIssue.findUnique({ where: { id: issueId }, select: { inventorySiteId: true } });
  return r?.inventorySiteId ?? null;
}

// Editor at the warehouse that owns this item / unit (null = not allowed or not found).
export async function editorForItem(itemId: string) {
  const site = await warehouseOfItem(itemId);
  return site ? storeEditor(site) : null;
}
export async function editorForInstance(instanceId: string) {
  const site = await warehouseOfInstance(instanceId);
  return site ? storeEditor(site) : null;
}

// ── Activity log and notifications: only what this user's access covers ───────
// (ActivityLog/Notification.inventorySiteId is filled by a database trigger — see part8.sql.)

const STORE_ENTITIES = ["INVENTORY_ITEM", "INVENTORY_SITE"];
const AREA_ENTITIES  = [...STORE_ENTITIES, "STORE_ITEM", "SITE", "ASSET"];
const STORE_TYPES = [
  "INVENTORY_ITEM_CREATED", "INVENTORY_ITEM_UPDATED", "INVENTORY_ITEM_DELETED", "INVENTORY_RESTOCK_ADDED",
  "INVENTORY_ITEM_ISSUED", "INVENTORY_EQUIPMENT_RETURNED", "INVENTORY_LOW_STOCK", "INVENTORY_OUT_OF_STOCK",
  "INVENTORY_IMPORT", "WAREHOUSE_ISSUE_CREATED", "WAREHOUSE_ISSUE_RETURNED", "INVENTORY_DELIVERY_CONFIRMED",
  "STORE_ITEM_STATUS_CHANGED", "STORE_ITEM_DELETED",
] as const;
const SITE_TYPES = [
  "SITE_CREATED", "SITE_UPDATED", "SITE_STATUS_CHANGED", "SITE_TOWER_UPDATED", "SITE_HEIGHT_UPDATED",
  "SITE_GPS_UPDATED", "SITE_DELETED", "ASSET_CREATED", "ASSET_UPDATED", "ASSET_DELETED",
  "ASSET_STATUS_CHANGED", "ASSET_SERIAL_UPDATED",
] as const;

// Built only from positive matches, so rows with empty columns are never hidden by accident.
export function activityScope(a: Access): Prisma.ActivityLogWhereInput {
  if (a.master) return {};
  const ids   = visibleStoreIds(a);
  const allow: Prisma.ActivityLogWhereInput[] = [
    { entityType: null, type: { notIn: [...STORE_TYPES, ...SITE_TYPES] } }, // general entries
    { entityType: { notIn: AREA_ENTITIES } },                              // users, item types, system …
  ];
  if (a.sites) {
    allow.push({ entityType: { in: ["SITE", "ASSET"] } });
    allow.push({ entityType: null, type: { in: [...SITE_TYPES] } });
  }
  if (a.store) {
    const where = ids === null ? {} : { inventorySiteId: { in: ids } };
    allow.push({ entityType: { in: STORE_ENTITIES }, ...where });
    allow.push({ entityType: null, type: { in: STORE_TYPES.filter((t) => !t.startsWith("STORE_ITEM")) }, ...where });
  }
  return { OR: allow };
}

export function notificationScope(a: Access): Prisma.NotificationWhereInput {
  if (a.master)           return {};
  if (!a.store)           return { inventorySiteId: null };
  const ids = visibleStoreIds(a);
  if (ids === null)       return {};
  return { OR: [{ inventorySiteId: null }, { inventorySiteId: { in: ids } }] };
}
