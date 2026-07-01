import type { InventoryItemStatus, InventoryItemType } from "@prisma/client";

export function getAutoInventoryStatus({
  quantity,
  reorderLevel,
  preferredStatus,
}: {
  quantity:        number;
  reorderLevel:    number;
  preferredStatus?: InventoryItemStatus | null;
}): InventoryItemStatus {
  if (preferredStatus === "CHECKED_OUT" || preferredStatus === "INACTIVE") {
    return preferredStatus;
  }

  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}

// ── Updated to use new 6-category enum ──────────────────────────────────────
// For equipment-like types (things that get borrowed), status goes CHECKED_OUT.
// For everything else (accessories, cables, tools etc.), derive from quantity.
const BORROWED_TYPES: InventoryItemType[] = [
  "EQUIPMENT",
  "COOLING_INFRASTRUCTURE",
];

export function getStatusAfterIssue({
  itemType,
  currentQuantity,
  issueQuantity,
  reorderLevel,
}: {
  itemType:        InventoryItemType;
  currentQuantity: number;
  issueQuantity:   number;
  reorderLevel:    number;
}): InventoryItemStatus {
  if (BORROWED_TYPES.includes(itemType)) {
    return "CHECKED_OUT";
  }

  const nextQty = Math.max(0, currentQuantity - issueQuantity);
  if (nextQty <= 0)            return "OUT_OF_STOCK";
  if (nextQty <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}