"use server";

import { accessOf, canEditStore } from "@/lib/access";
import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile, isAdminProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";
import {
  CODE_RE, normalizeCode, normalizeName, codeClash, enableAtWarehouse,
} from "@/lib/item-type-registry";

type Result = { ok: boolean; message: string; id?: string };

async function requireTypeAdmin() {
  const me = await getCurrentProfile();
  return isAdminProfile(me) ? me! : null;
}

async function log(actor: string, title: string, details: string) {
  await logActivity({ type: "SYSTEM_EVENT", title, details: `${details} Changed by ${actor}.`, actorEmail: actor, entityType: "ITEM_TYPE" });
}

function refresh() {
  revalidatePath("/admin/item-types");
  revalidatePath("/store", "layout");
}

// Create a main item type (needs a short code) or a sub-type (parentId), switched on for the given warehouses.
export async function createItemType(input: {
  name: string; parentId?: string | null; code?: string | null; tracked?: boolean; warehouseIds: string[];
}): Promise<Result> {
  const me = await requireTypeAdmin();
  if (!me) return { ok: false, message: "Only admins can add item types." };

  const name = normalizeName(String(input.name ?? ""));
  if (!name) return { ok: false, message: "Enter a name." };
  const parentId = input.parentId || null;
  const warehouseIds = [...new Set((input.warehouseIds ?? []).filter((x) => typeof x === "string"))];
  if (warehouseIds.some((w) => !canEditStore(me, w))) return { ok: false, message: "You can only switch types on at warehouses you have full access to." };

  // No duplicates: same name under the same parent (case-insensitive). Offer the existing one instead.
  const same = await prisma.itemType.findFirst({
    where:  { parentId, name: { equals: name, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (same) {
    for (const w of warehouseIds) {
      const r = await enableAtWarehouse(w, same.id, input.code);
      if (!r.ok) return { ok: false, message: r.message };
    }
    refresh();
    return { ok: true, id: same.id, message: `"${same.name}" already exists — switched it on here instead of creating a copy.` };
  }

  let code: string | null = null;
  if (parentId) {
    const parent = await prisma.itemType.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent || parent.parentId) return { ok: false, message: "Sub-types can only be added under a main item type." };
  } else {
    code = normalizeCode(String(input.code ?? ""));
    if (!CODE_RE.test(code)) return { ok: false, message: "Short code must be 1–8 letters/numbers (A–Z, 0–9, /)." };
    for (const w of warehouseIds) {
      const clash = await codeClash(w, code);
      if (clash) return { ok: false, message: `A selected warehouse already uses ${code} for "${clash}". Choose another short code.` };
    }
  }

  const created = await prisma.itemType.create({
    data:   { name, parentId, defaultCode: code, tracked: parentId ? false : !!input.tracked, createdBy: me.email },
    select: { id: true },
  });
  for (const w of warehouseIds) {
    const r = await enableAtWarehouse(w, created.id, code);
    if (!r.ok) return { ok: false, id: created.id, message: r.message };
  }

  await log(me.email, `${parentId ? "Sub-type" : "Item type"} created: ${name}`, `${code ? `Short code ${code}. ` : ""}Warehouses: ${warehouseIds.length}.`);
  refresh();
  return { ok: true, id: created.id, message: `"${name}" created.` };
}

export async function renameItemType(id: string, newName: string): Promise<Result> {
  const me = await requireTypeAdmin();
  if (!me) return { ok: false, message: "Only admins can rename item types." };
  if (!accessOf(me).all) return { ok: false, message: "Item types are shared by every warehouse — only admins with All stores can rename them." };
  const name = normalizeName(String(newName ?? ""));
  if (!name) return { ok: false, message: "Enter a name." };
  const t = await prisma.itemType.findUnique({ where: { id }, select: { name: true, parentId: true } });
  if (!t) return { ok: false, message: "Item type not found." };
  const dup = await prisma.itemType.findFirst({ where: { parentId: t.parentId, name: { equals: name, mode: "insensitive" }, NOT: { id } }, select: { id: true } });
  if (dup) return { ok: false, message: `"${name}" already exists.` };
  await prisma.itemType.update({ where: { id }, data: { name } });
  await log(me.email, `Item type renamed: ${t.name} → ${name}`, "");
  refresh();
  return { ok: true, message: "Renamed." };
}

export async function setTracked(id: string, tracked: boolean): Promise<Result> {
  const me = await requireTypeAdmin();
  if (!me) return { ok: false, message: "Only admins can change item types." };
  if (!accessOf(me).all) return { ok: false, message: "Item types are shared by every warehouse — only admins with All stores can change this." };
  const t = await prisma.itemType.findUnique({ where: { id }, select: { name: true, parentId: true } });
  if (!t || t.parentId) return { ok: false, message: "Only main item types have this setting." };
  await prisma.itemType.update({ where: { id }, data: { tracked } });
  await log(me.email, `Item type ${tracked ? "now tracks units one by one" : "no longer tracks units one by one"}: ${t.name}`, "");
  refresh();
  return { ok: true, message: "Saved." };
}

// Switch a type / sub-type on or off for one warehouse, and/or change a main type's short code there.
export async function setWarehouseType(siteId: string, typeId: string, input: { enabled?: boolean; code?: string }): Promise<Result> {
  const me = await requireTypeAdmin();
  if (!me) return { ok: false, message: "Only admins can change item types." };
  if (!canEditStore(me, siteId)) return { ok: false, message: "You don't have full access to that warehouse." };

  const [type, site] = await Promise.all([
    prisma.itemType.findUnique({ where: { id: typeId }, select: { id: true, name: true, parentId: true, defaultCode: true } }),
    prisma.inventorySite.findUnique({ where: { id: siteId }, select: { name: true } }),
  ]);
  if (!type || !site) return { ok: false, message: "Not found." };

  if (input.enabled === false) {
    await prisma.warehouseItemType.updateMany({ where: { inventorySiteId: siteId, itemTypeId: typeId }, data: { enabled: false } });
    // Switching a main type off also hides its sub-types in that warehouse.
    if (!type.parentId) {
      const subs = await prisma.itemType.findMany({ where: { parentId: typeId }, select: { id: true } });
      await prisma.warehouseItemType.updateMany({ where: { inventorySiteId: siteId, itemTypeId: { in: subs.map((s) => s.id) } }, data: { enabled: false } });
    }
    await log(me.email, `${type.name} switched off for ${site.name}`, "Existing items keep their type.");
    refresh();
    return { ok: true, message: `${type.name} is no longer offered for new items in ${site.name}. Existing items keep it.` };
  }

  if (input.code !== undefined && !type.parentId) {
    const code = normalizeCode(input.code);
    if (!CODE_RE.test(code)) return { ok: false, message: "Short code must be 1–8 letters/numbers (A–Z, 0–9, /)." };
    const clash = await codeClash(siteId, code, typeId);
    if (clash) return { ok: false, message: `${site.name} already uses ${code} for "${clash}".` };
    const before = await prisma.warehouseItemType.findUnique({ where: { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } }, select: { code: true, enabled: true } });
    await prisma.warehouseItemType.upsert({
      where:  { inventorySiteId_itemTypeId: { inventorySiteId: siteId, itemTypeId: typeId } },
      create: { inventorySiteId: siteId, itemTypeId: typeId, code, enabled: input.enabled ?? false },
      update: { code, ...(input.enabled !== undefined ? { enabled: input.enabled } : {}) },
    });
    if (before?.code !== code) await log(me.email, `Short code for ${type.name} in ${site.name}: ${before?.code ?? "—"} → ${code}`, "Only new item codes use it; existing codes and labels are unchanged.");
    refresh();
    return { ok: true, message: `Short code saved. New ${type.name} items in ${site.name} will be ${code}-numbered; existing item codes stay as they are.` };
  }

  if (input.enabled === true) {
    const r = await enableAtWarehouse(siteId, typeId);
    if (!r.ok) return r;
    await log(me.email, `${type.name} switched on for ${site.name}`, "");
    refresh();
    return { ok: true, message: `${type.name} switched on for ${site.name}.` };
  }
  return { ok: true, message: "Nothing to change." };
}

// Only types/sub-types that no item uses (and with no sub-types) can be deleted.
export async function deleteItemType(id: string): Promise<Result> {
  const me = await requireTypeAdmin();
  if (!me) return { ok: false, message: "Only admins can delete item types." };
  if (!accessOf(me).all) return { ok: false, message: "Item types are shared by every warehouse — only admins with All stores can delete them." };
  const t = await prisma.itemType.findUnique({
    where:  { id },
    select: { name: true, legacyKey: true, _count: { select: { children: true, items: true, subItems: true } } },
  });
  if (!t) return { ok: false, message: "Not found." };
  if (t.legacyKey) return { ok: false, message: "The original item types can't be deleted. Switch them off for warehouses that don't use them." };
  if (t._count.children) return { ok: false, message: "Delete its sub-types first." };
  if (t._count.items || t._count.subItems) return { ok: false, message: `${t._count.items + t._count.subItems} item(s) use "${t.name}". Switch it off instead.` };
  await prisma.itemType.delete({ where: { id } });
  await log(me.email, `Item type deleted: ${t.name}`, "");
  refresh();
  return { ok: true, message: `"${t.name}" deleted.` };
}
