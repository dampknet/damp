import type { InventoryItemStatus, InventoryItemType } from "@prisma/client";

export function getAutoInventoryStatus({
  quantity,
  reorderLevel,
  preferredStatus,
  uncountable = false,
}: {
  quantity:         number;
  reorderLevel:     number;
  preferredStatus?: InventoryItemStatus | null;
  uncountable?:     boolean;
}): InventoryItemStatus {
  if (preferredStatus === "CHECKED_OUT" || preferredStatus === "INACTIVE") {
    return preferredStatus;
  }

  // ✅ N/A items are always abundant — never flag as low stock or out of stock
  if (uncountable) return "AVAILABLE";

  if (quantity <= 0) return "OUT_OF_STOCK";

  // ✅ Only flag LOW_STOCK when reorderLevel is actually set (> 0)
  if (reorderLevel > 0 && quantity <= reorderLevel) return "LOW_STOCK";

  return "AVAILABLE";
}

const BORROWED_TYPES: InventoryItemType[] = [
  "EQUIPMENT",
  "COOLING_INFRASTRUCTURE",
];

export function getStatusAfterIssue({
  itemType,
  currentQuantity,
  issueQuantity,
  reorderLevel,
  uncountable = false,
}: {
  itemType:        InventoryItemType;
  currentQuantity: number;
  issueQuantity:   number;
  reorderLevel:    number;
  uncountable?:    boolean;
}): InventoryItemStatus {
  if (BORROWED_TYPES.includes(itemType)) {
    return "CHECKED_OUT";
  }

  // ✅ N/A items stay AVAILABLE regardless of quantity
  if (uncountable) return "AVAILABLE";

  const nextQty = Math.max(0, currentQuantity - issueQuantity);
  if (nextQty <= 0) return "OUT_OF_STOCK";
  if (reorderLevel > 0 && nextQty <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}