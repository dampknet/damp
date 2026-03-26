import { prisma } from "@/lib/prisma";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import type {
  EquipmentCondition,
  InventoryItemStatus,
  InventoryItemType,
} from "@prisma/client";

/* ================= TYPES ================= */

export type PreviewRow = {
  rowNumber: number;
  itemType: string;
  name: string;
  stockNumber: string;
  serialNumber: string;
  quantity: string;
  unit: string;
  reorderLevel: string;
  targetStockLevel: string;
  status: string;
  condition: string;
  error: string | null;
};

export type ValidRow = {
  itemType: InventoryItemType;
  name: string;
  description: string | null;
  stockNumber: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  quantity: number;
  unit: string | null;
  reorderLevel: number;
  targetStockLevel: number | null;
  status: InventoryItemStatus;
  condition: EquipmentCondition | null;
};

/* ================= HELPERS ================= */

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeUpper(v: unknown) {
  return normalizeText(v).toUpperCase();
}

/* ================= MAIN PARSER ================= */

export async function parseInventoryFile({
  file,
  siteId,
}: {
  file: File;
  siteId: string;
}): Promise<{
  preview: PreviewRow[];
  validRows: ValidRow[];
}> {
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_ROWS = 5000;

  if (file.size <= 0) throw new Error("Uploaded file is empty");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("File too large. Maximum allowed size is 5MB");

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    throw new Error("Only .xlsx or .xls files are allowed");
  }

  const XLSX = await import("xlsx");
  const bytes = await file.arrayBuffer();

  const workbook = XLSX.read(bytes, { type: "array" });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("The uploaded file has no sheets");

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rows.length === 0) throw new Error("The uploaded sheet is empty");
  if (rows.length > MAX_ROWS)
    throw new Error(`Too many rows. Maximum allowed is ${MAX_ROWS}`);

  /* ===== Fetch existing once (performance boost) ===== */
  const existingItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      isDeleted: false,
    },
    select: {
      stockNumber: true,
      serialNumber: true,
    },
  });

  const existingStockNumbers = new Set(
    existingItems.map((x) => normalizeUpper(x.stockNumber)).filter(Boolean)
  );

  const existingSerialNumbers = new Set(
    existingItems.map((x) => normalizeUpper(x.serialNumber)).filter(Boolean)
  );

  const seenUploadStockNumbers = new Set<string>();
  const seenUploadSerialNumbers = new Set<string>();

  const preview: PreviewRow[] = [];
  const validRows: ValidRow[] = [];

  /* ================= LOOP ================= */

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNumber = i + 2;

    const itemTypeRaw = normalizeUpper(r.itemType);
    const name = normalizeText(r.name);
    const description = normalizeText(r.description);
    const stockNumber = normalizeText(r.stockNumber);
    const manufacturer = normalizeText(r.manufacturer);
    const model = normalizeText(r.model);
    const serialNumber = normalizeText(r.serialNumber);
    const quantityRaw = normalizeText(r.quantity);
    const unit = normalizeText(r.unit);
    const reorderLevelRaw = normalizeText(r.reorderLevel);
    const targetStockLevelRaw = normalizeText(r.targetStockLevel);
    const statusRaw = normalizeUpper(r.status);
    const conditionRaw = normalizeUpper(r.condition);

    let error: string | null = null;

    const itemType =
      itemTypeRaw === "EQUIPMENT"
        ? "EQUIPMENT"
        : itemTypeRaw === "MATERIAL"
        ? "MATERIAL"
        : null;

    if (!itemType) error = "itemType must be MATERIAL or EQUIPMENT";
    else if (!name) error = "name is required";

    const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
    if (!error && (!Number.isFinite(quantity) || quantity < 0)) {
      error = "quantity must be 0 or more";
    }

    const reorderLevel = reorderLevelRaw === "" ? 0 : Number(reorderLevelRaw);
    if (!error && (!Number.isFinite(reorderLevel) || reorderLevel < 0)) {
      error = "reorderLevel must be 0 or more";
    }

    const stockNumberKey = normalizeUpper(stockNumber);
    if (!error && stockNumberKey) {
      if (existingStockNumbers.has(stockNumberKey)) {
        error = "duplicate stockNumber already exists";
      } else if (seenUploadStockNumbers.has(stockNumberKey)) {
        error = "duplicate stockNumber in upload file";
      }
    }

    const serialNumberKey = normalizeUpper(serialNumber);
    if (!error && serialNumberKey) {
      if (existingSerialNumbers.has(serialNumberKey)) {
        error = "duplicate serialNumber already exists";
      } else if (seenUploadSerialNumbers.has(serialNumberKey)) {
        error = "duplicate serialNumber in upload file";
      }
    }

    const finalStatus = getAutoInventoryStatus({
      quantity: Math.trunc(quantity || 0),
      reorderLevel: Math.trunc(reorderLevel || 0),
      preferredStatus: statusRaw as InventoryItemStatus,
    });

    let condition: EquipmentCondition | null = null;
    if (itemType === "EQUIPMENT") {
      condition =
        conditionRaw === "GOOD" ||
        conditionRaw === "FAULTY" ||
        conditionRaw === "DAMAGED" ||
        conditionRaw === "UNDER_REPAIR"
          ? (conditionRaw as EquipmentCondition)
          : "GOOD";
    }

    preview.push({
      rowNumber,
      itemType: itemTypeRaw,
      name,
      stockNumber,
      serialNumber,
      quantity: quantityRaw,
      unit,
      reorderLevel: reorderLevelRaw,
      targetStockLevel: targetStockLevelRaw,
      status: finalStatus,
      condition: conditionRaw,
      error,
    });

    if (!error && itemType) {
      if (stockNumberKey) seenUploadStockNumbers.add(stockNumberKey);
      if (serialNumberKey) seenUploadSerialNumbers.add(serialNumberKey);

      validRows.push({
        itemType,
        name,
        description: description || null,
        stockNumber: stockNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        serialNumber: serialNumber || null,
        quantity: Math.trunc(quantity),
        unit: unit || null,
        reorderLevel: Math.trunc(reorderLevel),
        targetStockLevel:
          targetStockLevelRaw === ""
            ? null
            : Math.trunc(Number(targetStockLevelRaw)),
        status: finalStatus,
        condition,
      });
    }
  }

  return { preview, validRows };
}