import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "ITEM_ISSUED"
  | "DELIVERY_CONFIRMED"
  | "ITEM_RETURNED"
  | "LOW_STOCK"
  | "OUT_OF_STOCK";

// Master admins always see notifications; other accounts only when a master admin allows it.
export function canSeeNotifications(
  profile: { isMasterAdmin: boolean; canSeeNotifications?: boolean | null } | null | undefined,
) {
  return !!profile && (profile.isMasterAdmin || !!profile.canSeeNotifications);
}

// Never let a notification failure break the action that triggered it.
export async function notify(input: {
  type:        NotificationType;
  title:       string;
  body?:       string | null;
  link?:       string | null;
  actorEmail?: string | null;
}) {
  try {
    await prisma.notification.create({
      data: {
        type:       input.type,
        title:      input.title.slice(0, 300),
        body:       input.body ? input.body.slice(0, 1000) : null,
        link:       input.link ?? null,
        actorEmail: input.actorEmail ?? null,
      },
    });
  } catch (e) {
    console.error("[NOTIFY]", (e as Error).message);
  }
}

// After stock goes down, notify only when an item *crosses* into low / out of stock,
// so an item that is already low doesn't raise a new alert on every issue.
export async function notifyStockLevels(
  changes: { itemId: string; taken: number }[],
  siteName: string,
  siteId: string,
  actorEmail?: string | null,
) {
  if (!changes.length) return;
  try {
    const items = await prisma.inventoryItem.findMany({
      where:  { id: { in: changes.map((c) => c.itemId) }, uncountable: false },
      select: { id: true, name: true, quantity: true, reorderLevel: true, unit: true },
    });

    for (const item of items) {
      const taken  = changes.find((c) => c.itemId === item.id)?.taken ?? 0;
      const after  = item.quantity;
      const before = after + taken;
      const unit   = item.unit || "pcs";

      if (after <= 0 && before > 0) {
        await notify({
          type:  "OUT_OF_STOCK",
          title: `${item.name} is out of stock at ${siteName}`,
          body:  "Restock needed.",
          link:  `/store/sites/${siteId}`,
          actorEmail,
        });
      } else if (item.reorderLevel > 0 && after > 0 && after <= item.reorderLevel && before > item.reorderLevel) {
        await notify({
          type:  "LOW_STOCK",
          title: `${item.name} is low at ${siteName} (${after} ${unit} left)`,
          body:  `Reorder level is ${item.reorderLevel} ${unit}.`,
          link:  `/store/sites/${siteId}`,
          actorEmail,
        });
      }
    }
  } catch (e) {
    console.error("[NOTIFY STOCK]", (e as Error).message);
  }
}
