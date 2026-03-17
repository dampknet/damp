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

export function getStatusAfterIssue({
  itemType,
  currentQuantity,
  issueQuantity,
  reorderLevel,
}: {
  itemType: "MATERIAL" | "EQUIPMENT";
  currentQuantity: number;
  issueQuantity: number;
  reorderLevel: number;
}): InventoryItemStatus {
  if (itemType === "EQUIPMENT") {
    return "CHECKED_OUT";
  }

  const nextQty = Math.max(0, currentQuantity - issueQuantity);

  if (nextQty <= 0) return "OUT_OF_STOCK";
  if (nextQty <= reorderLevel) return "LOW_STOCK";
  return "AVAILABLE";
}