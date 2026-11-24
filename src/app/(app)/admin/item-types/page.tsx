import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { canEditStore } from "@/lib/access";
import ItemTypesClient, { type MainTypeView } from "./ItemTypesClient";

export default async function ItemTypesPage() {
  const me = await requireAdmin();
  // Restricted admins manage only the warehouses they have full access to.
  const editable = (id: string) => canEditStore(me, id);

  const [allWarehouses, types, links, items] = await Promise.all([
    prisma.inventorySite.findMany({ where: { isDeleted: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.itemType.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true, legacyKey: true, defaultCode: true, tracked: true } }),
    prisma.warehouseItemType.findMany({ select: { inventorySiteId: true, itemTypeId: true, code: true, enabled: true } }),
    prisma.inventoryItem.findMany({ where: { isDeleted: false }, select: { inventorySiteId: true, typeId: true, subTypeId: true, itemCode: true } }),
  ]);
  const warehouses = allWarehouses.filter((w) => editable(w.id));

  const linkKey = (w: string, t: string) => `${w}|${t}`;
  const link    = new Map(links.map((l) => [linkKey(l.inventorySiteId, l.itemTypeId), l]));

  const mains: MainTypeView[] = types.filter((t) => !t.parentId).map((t) => {
    const perWarehouse = warehouses.map((w) => {
      const l      = link.get(linkKey(w.id, t.id));
      const code   = l?.code || t.defaultCode || "";
      const mine   = items.filter((i) => i.inventorySiteId === w.id && i.typeId === t.id);
      // Items whose code uses a different short code than the one set here.
      const others = new Map<string, number>();
      for (const i of mine) {
        const seg = /^[^-]+-([^-]+)-\d/.exec((i.itemCode ?? "").toUpperCase())?.[1];
        if (seg && seg !== code.toUpperCase()) others.set(seg, (others.get(seg) ?? 0) + 1);
      }
      const matching = mine.filter((i) => /^[^-]+-([^-]+)-\d/.exec((i.itemCode ?? "").toUpperCase())?.[1] === code.toUpperCase()).length;
      return {
        warehouseId: w.id,
        enabled:     !!l?.enabled,
        code,
        items:       mine.length,
        matching,
        otherCodes:  [...others.entries()].map(([c, n]) => ({ code: c, count: n })),
      };
    });
    const subs = types.filter((s) => s.parentId === t.id).map((s) => ({
      id:    s.id,
      name:  s.name,
      items: items.filter((i) => i.subTypeId === s.id).length,
      warehouses: warehouses.map((w) => ({ warehouseId: w.id, enabled: !!link.get(linkKey(w.id, s.id))?.enabled })),
    }));
    return {
      id: t.id, name: t.name, original: !!t.legacyKey, tracked: t.tracked, defaultCode: t.defaultCode ?? "",
      items: items.filter((i) => i.typeId === t.id).length,
      warehouses: perWarehouse,
      subTypes: subs,
    };
  });

  // Two main types switched on with the same short code in one warehouse.
  const clashes: string[] = [];
  for (const w of warehouses) {
    const seen = new Map<string, string>();
    for (const m of mains) {
      const pw = m.warehouses.find((x) => x.warehouseId === w.id)!;
      if (!pw.enabled || !pw.code) continue;
      const k = pw.code.toUpperCase();
      if (seen.has(k)) clashes.push(`${w.name}: ${seen.get(k)} and ${m.name} both use ${pw.code}`);
      else seen.set(k, m.name);
    }
  }

  return <ItemTypesClient warehouses={warehouses} mains={mains} clashes={clashes} />;
}
