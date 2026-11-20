import { prisma } from "@/lib/prisma";
import type { InventoryItemType } from "@prisma/client";

// Managed item types (Admin → Item Types):
//   • main types and optional sub-types (parentId)
//   • switched on per warehouse; each warehouse has its own short code for a main type
//   • the short code goes into item codes: PREFIX-CODE-001 (sub-types are not part of the code)

export type SubTypeOption  = { id: string; name: string };
export type TypeOption = {
  id:            string;
  name:          string;
  code:          string;           // this warehouse's short code
  tracked:       boolean;          // units tracked one by one (like Equipment)
  enabledHere:   boolean;
  subTypes:      SubTypeOption[];  // sub-types switched on for this warehouse
  otherSubTypes: SubTypeOption[];  // sub-types of this type not used here yet (admins can include)
};

export const CODE_RE = /^[A-Z0-9/]{1,8}$/;
export const normalizeCode = (c: string) => c.trim().toUpperCase().replace(/\s+/g, "");
export const normalizeName = (n: string) => n.trim().replace(/\s+/g, " ").slice(0, 60);

// Legacy category value kept on each item (older screens and rollbacks rely on it).
export function legacyKeyFor(type: { legacyKey: InventoryItemType | null }): InventoryItemType {
  return type.legacyKey ?? "GENERAL";
}

// Types for one warehouse. With includeOther, also main types / sub-types not switched on here yet.
export async function getWarehouseTypeOptions(siteId: string, includeOther = false): Promise<TypeOption[]> {
  const [types, links] = await Promise.all([
    prisma.itemType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true, defaultCode: true, tracked: true } }),
    prisma.warehouseItemType.findMany({ where: { inventorySiteId: siteId }, select: { itemTypeId: true, code: true, enabled: true } }),
  ]);
  const link = new Map(links.map((l) => [l.itemTypeId, l]));
  const on   = (id: string) => !!link.get(id)?.enabled;

  return types
    .filter((t) => !t.parentId && (includeOther || on(t.id)))
    .map((t) => {
      const subs = types.filter((s) => s.parentId === t.id);
      return {
        id:            t.id,
        name:          t.name,
        code:          link.get(t.id)?.code || t.defaultCode || "GEN",
        tracked:       t.tracked,
        enabledHere:   on(t.id),
        subTypes:      subs.filter((s) => on(s.id)).map((s) => ({ id: s.id, name: s.name })),
        otherSubTypes: includeOther ? subs.filter((s) => !on(s.id)).map((s) => ({ id: s.id, name: s.name })) : [],
      };
    })
    .sort((a, b) => Number(b.enabledHere) - Number(a.enabledHere) || a.name.localeCompare(b.name));
}

// This warehouse's short code for a main type (falls back to the type's default code).
export async function warehouseCode(siteId: string, typeId: string): Promise<string> {
  const [link, type] = await Promise.all([
    prisma.warehouseItemType.findUnique({ where: { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } }, select: { code: true } }),
    prisma.itemType.findUnique({ where: { id: typeId }, select: { defaultCode: true } }),
  ]);
  return link?.code || type?.defaultCode || "GEN";
}

// Every short code a scanned label from this warehouse might contain (its codes + all standard codes).
export async function codeSegmentsFor(siteId: string): Promise<string[]> {
  const [links, types] = await Promise.all([
    prisma.warehouseItemType.findMany({ where: { inventorySiteId: siteId, code: { not: null } }, select: { code: true } }),
    prisma.itemType.findMany({ where: { defaultCode: { not: null } }, select: { defaultCode: true } }),
  ]);
  return [...new Set([...links.map((l) => l.code!), ...types.map((t) => t.defaultCode!)])]
    .map((c) => `${c}-`)
    .sort((a, b) => b.length - a.length);
}

// A short code must be unique among the main types switched on in a warehouse.
export async function codeClash(siteId: string, code: string, exceptTypeId?: string) {
  const links = await prisma.warehouseItemType.findMany({
    where:  { inventorySiteId: siteId, enabled: true, itemType: { parentId: null }, ...(exceptTypeId ? { NOT: { itemTypeId: exceptTypeId } } : {}) },
    select: { code: true, itemType: { select: { name: true, defaultCode: true } } },
  });
  const hit = links.find((l) => (l.code || l.itemType.defaultCode || "").toUpperCase() === code.toUpperCase());
  return hit ? hit.itemType.name : null;
}

// Switch a type / sub-type on for a warehouse (sub-types need their main type on there first).
export async function enableAtWarehouse(siteId: string, typeId: string, code?: string | null): Promise<{ ok: true } | { ok: false; message: string }> {
  const type = await prisma.itemType.findUnique({ where: { id: typeId }, select: { id: true, name: true, parentId: true, defaultCode: true } });
  if (!type) return { ok: false, message: "Item type not found." };

  if (type.parentId) {
    const parentOn = await prisma.warehouseItemType.findUnique({
      where: { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: type.parentId } }, select: { enabled: true },
    });
    if (!parentOn?.enabled) return { ok: false, message: `Switch on the main item type for this warehouse before "${type.name}".` };
    await prisma.warehouseItemType.upsert({
      where:  { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } },
      create: { inventorySiteId: siteId, itemTypeId: typeId, enabled: true },
      update: { enabled: true },
    });
    return { ok: true };
  }

  const existing = await prisma.warehouseItemType.findUnique({
    where: { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } }, select: { code: true },
  });
  const finalCode = normalizeCode(code || existing?.code || type.defaultCode || "");
  if (!CODE_RE.test(finalCode)) return { ok: false, message: "Short code must be 1–8 letters/numbers (A–Z, 0–9, /)." };
  const clash = await codeClash(siteId, finalCode, typeId);
  if (clash) return { ok: false, message: `This warehouse already uses ${finalCode} for "${clash}". Choose another short code.` };

  await prisma.warehouseItemType.upsert({
    where:  { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } },
    create: { inventorySiteId: siteId, itemTypeId: typeId, enabled: true, code: finalCode },
    update: { enabled: true, code: finalCode },
  });
  return { ok: true };
}

// New warehouses start with the standard types switched on (as before); admins switch off what they don't use.
export async function enableStandardTypes(siteId: string) {
  const types = await prisma.itemType.findMany({ where: { parentId: null, legacyKey: { not: null } }, select: { id: true, defaultCode: true } });
  await prisma.warehouseItemType.createMany({
    data: types.map((t) => ({ inventorySiteId: siteId, itemTypeId: t.id, code: t.defaultCode, enabled: true })),
    skipDuplicates: true,
  });
}

// Validate a chosen type + sub-type for saving an item in a warehouse. Admins can use types not
// switched on here yet — they are switched on automatically.
export async function resolveItemTypeForSave(
  siteId: string, typeId: string, subTypeId: string | null, isAdmin: boolean,
): Promise<{ ok: true; type: { id: string; legacyKey: InventoryItemType | null; tracked: boolean }; subTypeId: string | null; code: string } | { ok: false; message: string }> {
  const type = await prisma.itemType.findUnique({ where: { id: typeId }, select: { id: true, name: true, parentId: true, legacyKey: true, tracked: true } });
  if (!type || type.parentId) return { ok: false, message: "Choose an item type." };

  const onHere = async (id: string) =>
    !!(await prisma.warehouseItemType.findUnique({ where: { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: id } }, select: { enabled: true } }))?.enabled;

  if (!(await onHere(type.id))) {
    if (!isAdmin) return { ok: false, message: `"${type.name}" isn't used in this warehouse. Ask an admin to switch it on.` };
    const r = await enableAtWarehouse(siteId, type.id);
    if (!r.ok) return r;
  }

  let sub: string | null = null;
  if (subTypeId) {
    const s = await prisma.itemType.findUnique({ where: { id: subTypeId }, select: { id: true, name: true, parentId: true } });
    if (!s || s.parentId !== type.id) return { ok: false, message: "That sub-type doesn't belong to the chosen item type." };
    if (!(await onHere(s.id))) {
      if (!isAdmin) return { ok: false, message: `"${s.name}" isn't used in this warehouse. Ask an admin to switch it on.` };
      const r = await enableAtWarehouse(siteId, s.id);
      if (!r.ok) return r;
    }
    sub = s.id;
  }

  return { ok: true, type, subTypeId: sub, code: await warehouseCode(siteId, type.id) };
}
