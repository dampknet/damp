import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type DeliveryRow = {
  id:              string;
  groupId:         string | null;
  itemName:        string;
  itemCode:        string | null;
  entityCodes:     string[];
  quantity:        number;          // issued
  quantityUsed:    number | null;   // reported at delivery (null = not reported)
  quantityReturned: number;
  stillOut:        number;          // issued − returned (what is at / on its way to the destination)
  awaitingReturn:  number;          // reported unused but not yet received back
  unit:            string | null;
  tracked:         boolean;
  openUnits:       { lineId: string; entityCode: string }[];   // tracked units not returned/installed yet
  warehouseId:     string;
  warehouseName:   string;
  takenBy:         string;
  purpose:         string;
  takenAt:         string;
  siteId:          string | null;
  siteName:        string;
  status:          "PENDING" | "DELIVERED" | "RETURNED";
  deliveredAt:     string | null;
  deliveredBy:     string | null;
  deliveryNote:    string | null;
  daysWaiting:     number;
};

// Items sent to a site or other place (delivery tracked).
export async function getDeliveries(where: Prisma.WarehouseIssueWhereInput, take = 500): Promise<DeliveryRow[]> {
  const rows = await prisma.warehouseIssue.findMany({
    where:   { deliveryStatus: { not: null }, ...where },
    orderBy: { takenAt: "desc" },
    take,
    select: {
      id: true, groupId: true, quantityTaken: true, quantityUsed: true, quantityReturned: true,
      takenBy: true, purpose: true, takenAt: true,
      destinationSiteId: true, destinationName: true, deliveryStatus: true,
      deliveredAt: true, deliveredBy: true, deliveryNote: true,
      inventoryItem: { select: { name: true, itemCode: true, unit: true } },
      inventorySite: { select: { id: true, name: true } },
      lines:         { select: { id: true, usedAt: true, returnedAt: true, assetInstance: { select: { entityCode: true } } } },
    },
  });

  const now = Date.now();
  return rows.map((r) => {
    const tracked  = r.lines.length > 0;
    const stillOut = r.quantityTaken - r.quantityReturned;
    const awaiting = r.quantityUsed == null ? 0
      : tracked ? r.lines.filter((l) => !l.usedAt && !l.returnedAt).length
      : Math.max(0, r.quantityTaken - r.quantityUsed - r.quantityReturned);
    return {
      id:               r.id,
      groupId:          r.groupId,
      itemName:         r.inventoryItem.name,
      itemCode:         r.inventoryItem.itemCode,
      entityCodes:      r.lines.map((l) => l.assetInstance.entityCode),
      quantity:         r.quantityTaken,
      quantityUsed:     r.quantityUsed,
      quantityReturned: r.quantityReturned,
      stillOut,
      awaitingReturn:   awaiting,
      unit:             r.inventoryItem.unit,
      tracked,
      openUnits:        r.lines.filter((l) => !l.usedAt && !l.returnedAt).map((l) => ({ lineId: l.id, entityCode: l.assetInstance.entityCode })),
      warehouseId:      r.inventorySite.id,
      warehouseName:    r.inventorySite.name,
      takenBy:          r.takenBy,
      purpose:          r.purpose,
      takenAt:          r.takenAt.toISOString(),
      siteId:           r.destinationSiteId,
      siteName:         r.destinationName ?? "—",
      status:           r.deliveryStatus as DeliveryRow["status"],
      deliveredAt:      r.deliveredAt?.toISOString() ?? null,
      deliveredBy:      r.deliveredBy,
      deliveryNote:     r.deliveryNote,
      daysWaiting:      Math.max(0, Math.floor(((r.deliveredAt?.getTime() ?? now) - r.takenAt.getTime()) / 86_400_000)),
    };
  });
}

// Everything reported unused at delivery and not yet received back (all warehouses, or one).
export async function getAwaitingReturns(where: Prisma.WarehouseIssueWhereInput = {}): Promise<DeliveryRow[]> {
  const rows = await getDeliveries({ quantityUsed: { not: null }, ...where }, 2000);
  return rows.filter((r) => r.awaitingReturn > 0).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}
