import { prisma } from "@/lib/prisma";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import type {
  EquipmentCondition,
  InventoryItemStatus,
  InventoryItemType,
} from "@prisma/client";

/* ─── ITEM TYPE HELPERS ────────────────────────────────────────────────────── */

// Maps the display strings in the Excel to Prisma enum values
const ITEM_TYPE_MAP: Record<string, InventoryItemType> = {
  "EQUIPMENT":                "EQUIPMENT",
  "ACCESSORIES":              "ACCESSORIES",
  "TOOLS AND PARTS":          "TOOLS_AND_PARTS",
  "TOOLS_AND_PARTS":          "TOOLS_AND_PARTS",
  "GENERAL":                  "GENERAL",
  "COOLING INFRASTRUCTURE":   "COOLING_INFRASTRUCTURE",
  "COOLING_INFRASTRUCTURE":   "COOLING_INFRASTRUCTURE",
  "CABLES AND ELECTRONICS":   "CABLES_AND_ELECTRONICS",
  "CABLES_AND_ELECTRONICS":   "CABLES_AND_ELECTRONICS",
};

// Item code prefix per type
const ITEM_CODE_PREFIX: Record<InventoryItemType, string> = {
  EQUIPMENT:               "EQUIP",
  ACCESSORIES:             "ACCESS",
  TOOLS_AND_PARTS:         "TO/PA",
  GENERAL:                 "GEN",
  COOLING_INFRASTRUCTURE:  "COOL",
  CABLES_AND_ELECTRONICS:  "CA/EL",
};

/* ─── TYPES ─────────────────────────────────────────────────────────────────── */

export type PreviewRow = {
  rowNumber:       number;
  itemType:        string;
  name:            string;
  itemCode:        string;
  quantity:        string;
  unit:            string;
  condition:       string;
  uncountable:     boolean;
  error:           string | null;
};

export type ValidRow = {
  itemType:        InventoryItemType;
  name:            string;
  description:     string | null;
  manufacturer:    string | null;
  model:           string | null;
  itemCode:        string | null;   // null = auto-generate on confirm
  serialNumber:    string | null;
  quantity:        number;
  uncountable:     boolean;
  unit:            string | null;
  reorderLevel:    number;
  targetStockLevel: number | null;
  status:          InventoryItemStatus;
  condition:       EquipmentCondition;
};

/* ─── HELPERS ────────────────────────────────────────────────────────────────── */

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeUpper(v: unknown) {
  return normalizeText(v).toUpperCase();
}

// Returns true when the quantity cell is N/A or blank (uncountable items like clamps)
function isUncountable(raw: string): boolean {
  const u = raw.toUpperCase();
  return u === "N/A" || u === "NA" || u === "";
}

/* ─── MAIN PARSER ────────────────────────────────────────────────────────────── */

export async function parseInventoryFile({
  file,
  siteId,
}: {
  file:   File;
  siteId: string;
}): Promise<{ preview: PreviewRow[]; validRows: ValidRow[] }> {
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_ROWS      = 5000;

  if (file.size <= 0)              throw new Error("Uploaded file is empty");
  if (file.size > MAX_FILE_SIZE)   throw new Error("File too large. Maximum allowed size is 5MB");
  if (!file.name.match(/\.(xlsx|xls)$/i)) throw new Error("Only .xlsx or .xls files are allowed");

  const XLSX  = await import("xlsx");
  const bytes = await file.arrayBuffer();
  const wb    = XLSX.read(bytes, { type: "array" });

  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("The uploaded file has no sheets");

  const sheet = wb.Sheets[firstSheetName];
  const rows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0)        throw new Error("The uploaded sheet is empty");
  if (rows.length > MAX_ROWS)   throw new Error(`Too many rows. Maximum allowed is ${MAX_ROWS}`);

  /* ── Fetch existing data for duplicate checks ── */
  const existingItems = await prisma.inventoryItem.findMany({
    where:  { inventorySiteId: siteId, isDeleted: false },
    select: { itemCode: true },
  });

  const existingItemCodes = new Set(
    existingItems.map((x) => normalizeUpper(x.itemCode ?? "")).filter(Boolean)
  );

  const seenUploadItemCodes = new Set<string>();

  const preview:   PreviewRow[] = [];
  const validRows: ValidRow[]   = [];

  /* ── Row loop ── */
  for (let i = 0; i < rows.length; i++) {
    const r         = rows[i];
    const rowNumber = i + 2;

    // Skip completely empty rows (happens at bottom of Excel files)
    const allEmpty = Object.values(r).every((v) => String(v ?? "").trim() === "");
    if (allEmpty) continue;

    const itemTypeRaw    = normalizeUpper(r["itemtype"] ?? r["itemType"] ?? r["item type"] ?? r["Item Type"] ?? "");
    const name           = normalizeText(r["name"] ?? r["Name"] ?? "");
    const description    = normalizeText(r["description"] ?? r["Description"] ?? "");
    const manufacturer   = normalizeText(r["manufacturer"] ?? r["Manufacturer"] ?? "");
    const model          = normalizeText(r["model"] ?? r["Model"] ?? "");
    const itemCodeRaw    = normalizeText(r["item code"] ?? r["itemcode"] ?? r["itemCode"] ?? r["Item Code"] ?? "");
    const serialNumber   = normalizeText(r["serial number"] ?? r["serialnumber"] ?? r["serialNumber"] ?? "");
    const quantityRaw    = normalizeText(r["quantity"] ?? r["Quantity"] ?? "");
    const unit           = normalizeText(r["unit"] ?? r["Unit"] ?? "");
    const reorderRaw     = normalizeText(r["reorderlevel"] ?? r["reorderLevel"] ?? r["reorder level"] ?? "");
    const targetRaw      = normalizeText(r["targetstock level"] ?? r["targetStockLevel"] ?? r["target stock level"] ?? "");
    const conditionRaw   = normalizeUpper(r["condition"] ?? r["Condition"] ?? "");

    let error: string | null = null;

    /* ── Validate itemType ── */
    const itemType = ITEM_TYPE_MAP[itemTypeRaw] ?? null;
    if (!itemType) {
      error = `itemtype must be one of: EQUIPMENT, ACCESSORIES, TOOLS AND PARTS, GENERAL, COOLING INFRASTRUCTURE, CABLES AND ELECTRONICS`;
    }

    /* ── Validate name ── */
    if (!error && !name) error = "name is required";

    /* ── Quantity ── */
    const uncountable = isUncountable(quantityRaw);
    let quantity      = 0;
    if (!uncountable) {
      quantity = Number(quantityRaw);
      if (!error && (!Number.isFinite(quantity) || quantity < 0)) {
        error = "quantity must be a number, 0 or more, or N/A for uncountable items";
      }
    }

    /* ── Reorder / target ── */
    const reorderLevel    = reorderRaw === ""  ? 0    : Number(reorderRaw);
    const targetStockLevel = targetRaw === "" ? null : Number(targetRaw);

    /* ── Item code duplicate check ── */
    const itemCodeKey = normalizeUpper(itemCodeRaw);
    if (!error && itemCodeKey) {
      if (existingItemCodes.has(itemCodeKey)) {
        error = `Item code ${itemCodeRaw} already exists in this site — use Restock instead`;
      } else if (seenUploadItemCodes.has(itemCodeKey)) {
        error = `Duplicate item code ${itemCodeRaw} in upload file`;
      }
    }

    /* ── Condition ── */
    const validConditions = ["NEW", "UNUSED", "USED", "FAULTY"];
    const condition = (validConditions.includes(conditionRaw) ? conditionRaw : "NEW") as EquipmentCondition;

    /* ── Status (derived from quantity) ── */
    const status = getAutoInventoryStatus({
      quantity:        Math.trunc(uncountable ? 0 : quantity),
      reorderLevel:    Math.trunc(isNaN(reorderLevel) ? 0 : reorderLevel),
      preferredStatus: null,
    });

    preview.push({
      rowNumber,
      itemType:    itemTypeRaw,
      name,
      itemCode:    itemCodeRaw || "(auto)",
      quantity:    uncountable ? "N/A" : String(quantity),
      unit,
      condition:   conditionRaw || "NEW",
      uncountable,
      error,
    });

    if (!error && itemType) {
      if (itemCodeKey) seenUploadItemCodes.add(itemCodeKey);

      validRows.push({
        itemType,
        name,
        description:     description  || null,
        manufacturer:    manufacturer || null,
        model:           model        || null,
        itemCode:        itemCodeRaw  || null,
        serialNumber:    serialNumber || null,
        quantity:        Math.trunc(uncountable ? 0 : quantity),
        uncountable,
        unit:            unit || null,
        reorderLevel:    Math.trunc(isNaN(reorderLevel) ? 0 : reorderLevel),
        targetStockLevel: (targetStockLevel === null || isNaN(targetStockLevel as number))
                          ? null
                          : Math.trunc(targetStockLevel as number),
        status,
        condition,
      });
    }
  }

  return { preview, validRows };
}

/* ─── AUTO ITEM CODE GENERATOR ───────────────────────────────────────────────
 * Called during confirm-import when a row has no item code.
 * Finds the highest existing number for that prefix and increments.
 * e.g. if KNET-EQUIP-042 exists, next is KNET-EQUIP-043
 */
export async function generateItemCode({
  itemType,
  sitePrefix,
}: {
  itemType:   InventoryItemType;
  sitePrefix: string; // e.g. "KNET" or "BAAT"
}): Promise<string> {
  const typeCode = ITEM_CODE_PREFIX[itemType]; // e.g. "EQUIP"
  const pattern  = `${sitePrefix}-${typeCode}-`;

  // Find all existing codes with this prefix
  const existing = await prisma.inventoryItem.findMany({
    where: { itemCode: { startsWith: pattern } },
    select: { itemCode: true },
  });

  let max = 0;
  for (const { itemCode } of existing) {
    if (!itemCode) continue;
    const suffix = itemCode.replace(pattern, "");
    const num    = parseInt(suffix, 10);
    if (!isNaN(num) && num > max) max = num;
  }

  const next = String(max + 1).padStart(3, "0");
  return `${pattern}${next}`;
}

/* ─── ENTITY CODE GENERATOR ──────────────────────────────────────────────────
 * Generates sub-entity codes like KNET-EQUIP-004-01 ... KNET-EQUIP-004-34
 */
export function generateEntityCodes(itemCode: string, quantity: number): string[] {
  return Array.from({ length: quantity }, (_, i) =>
    `${itemCode}-${String(i + 1).padStart(2, "0")}`
  );
}