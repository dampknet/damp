import type { InventoryItemStatus } from "@prisma/client";

export function getAutoInventoryStatus({
  quantity,
  reorderLevel,
  preferredStatus,
}: {
  quantity: number;
  reorderLevel: number;
  preferredStatus?: InventoryItemStatus | null;
}): InventoryItemStatus {
  if (preferredStatus === "CHECKED_OUT" || preferredStatus === "INACTIVE") {
    return preferredStatus;
  }

  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}