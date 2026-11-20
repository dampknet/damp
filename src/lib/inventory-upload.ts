import { prisma } from "@/lib/prisma";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import {
  ITEM_TYPE_ALIASES,
  ITEM_CODE_SEGMENT,
  ITEM_TYPE_UPLOAD_HINT,
  SITE_CODE_PREFIX,
} from "@/lib/item-types";
import type {
  EquipmentCondition,
  InventoryItemStatus,
  InventoryItemType,
} from "@prisma/client";

// Types / sub-types an upload needs that aren't available in this warehouse yet (admins can fix in the preview).
export type MissingType =
  | { kind: "type";            key: string; name: string }
  | { kind: "include-type";    key: string; id: string; name: string; code: string }
  | { kind: "subtype";         key: string; name: string; parentId: string; parentName: string }
  | { kind: "include-subtype"; key: string; id: string; name: string; parentName: string };

// Item codes in the file that use a different short code than this warehouse's setting for that type.
export type CodeHint = { typeId: string; typeName: string; used: string; current: string; count: number };

export type PreviewRow = {
  rowNumber:   number;
  itemType:    string;
  name:        string;
  itemCode:    string;
  quantity:    string;
  unit:        string;
  condition:   string;
  uncountable: boolean;
  error:       string | null;
};

export type ValidRow = {
  itemType:         InventoryItemType;   // legacy category (kept filled)
  typeId:           string;
  subTypeId:        string | null;
  name:             string;
  description:      string | null;
  manufacturer:     string | null;
  model:            string | null;
  itemCode:         string | null;
  serialNumber:     string | null;
  quantity:         number;
  uncountable:      boolean;
  unit:             string | null;
  reorderLevel:     number;
  targetStockLevel: number | null;
  status:           InventoryItemStatus;
  condition:        EquipmentCondition;
};

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeUpper(v: unknown) {
  return normalizeText(v).toUpperCase();
}

function isUncountable(raw: string): boolean {
  const u = raw.toUpperCase();
  return u === "N/A" || u === "NA" || u === "";
}

function resolveItemType(raw: string): InventoryItemType | null {
  const key = raw.replace(/\s+/g, " ").trim();
  return (ITEM_TYPE_ALIASES[key] as InventoryItemType | undefined) ?? null;
}

export async function getSitePrefix(siteId: string): Promise<string> {
  const site = await prisma.inventorySite.findUnique({
    where:  { id: siteId },
    select: { name: true },
  });

  const override = site ? SITE_CODE_PREFIX[site.name.trim().toUpperCase()] : undefined;
  if (override) return override;

  const sample = await prisma.inventoryItem.findFirst({
    where:  { inventorySiteId: siteId, itemCode: { not: null } },
    select: { itemCode: true },
  });

  if (sample?.itemCode) {
    const parts = sample.itemCode.split("-");
    if (parts.length >= 1 && parts[0]) return parts[0];
  }

  return (site?.name ?? "SITE").replace(/\s+/g, "").toUpperCase().slice(0, 4);
}

export async function parseInventoryFile({
  file,
  siteId,
}: {
  file:   File;
  siteId: string;
}): Promise<{ preview: PreviewRow[]; validRows: ValidRow[]; missing: MissingType[]; codeHints: CodeHint[] }> {
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const MAX_ROWS      = 5000;

  if (file.size <= 0)                     throw new Error("Uploaded file is empty");
  if (file.size > MAX_FILE_SIZE)          throw new Error("File too large. Maximum allowed size is 5MB");
  if (!file.name.match(/\.(xlsx|xls)$/i)) throw new Error("Only .xlsx or .xls files are allowed");

  const XLSX  = await import("xlsx");
  const bytes = await file.arrayBuffer();
  const wb    = XLSX.read(bytes, { type: "array" });

  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("The uploaded file has no sheets");

  const sheet = wb.Sheets[firstSheetName];
  const rows  = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0)      throw new Error("The uploaded sheet is empty");
  if (rows.length > MAX_ROWS) throw new Error(`Too many rows. Maximum allowed is ${MAX_ROWS}`);

  const existingItems = await prisma.inventoryItem.findMany({
    where:  { inventorySiteId: siteId, isDeleted: false },
    select: { itemCode: true },
  });

  const existingItemCodes = new Set(
    existingItems.map((x) => normalizeUpper(x.itemCode ?? "")).filter(Boolean)
  );

  const seenUploadItemCodes = new Set<string>();

  // Managed item types: match by name (or the old fixed names), and check what this warehouse uses.
  const [allTypes, links] = await Promise.all([
    prisma.itemType.findMany({ select: { id: true, name: true, parentId: true, legacyKey: true, defaultCode: true } }),
    prisma.warehouseItemType.findMany({ where: { inventorySiteId: siteId }, select: { itemTypeId: true, enabled: true, code: true } }),
  ]);
  const linkOf   = new Map(links.map((l) => [l.itemTypeId, l]));
  const isOn     = (id: string) => !!linkOf.get(id)?.enabled;
  const mains    = allTypes.filter((t) => !t.parentId);
  const mainByName = new Map(mains.map((t) => [t.name.trim().toUpperCase(), t]));
  const findMain = (raw: string) => {
    const key    = raw.replace(/\s+/g, " ").trim();
    const legacy = resolveItemType(key);
    return mainByName.get(key) ?? (legacy ? mains.find((t) => t.legacyKey === legacy) : undefined);
  };
  const codeFor  = (t: { id: string; defaultCode: string | null }) => linkOf.get(t.id)?.code || t.defaultCode || "GEN";

  const missing   = new Map<string, MissingType>();
  const hints     = new Map<string, CodeHint>();

  const preview:   PreviewRow[] = [];
  const validRows: ValidRow[]   = [];

  for (let i = 0; i < rows.length; i++) {
    const r         = rows[i];
    const rowNumber = i + 2;

    const allEmpty = Object.values(r).every((v) => String(v ?? "").trim() === "");
    if (allEmpty) continue;

    const itemTypeText = normalizeText(r["itemtype"] ?? r["itemType"] ?? r["item type"] ?? r["Item Type"] ?? "").replace(/\s+/g, " ");
    const itemTypeRaw  = itemTypeText.toUpperCase();
    const subTypeText  = normalizeText(r["subtype"] ?? r["subType"] ?? r["sub type"] ?? r["Sub Type"] ?? r["sub-type"] ?? r["Sub-type"] ?? "").replace(/\s+/g, " ");
    const name         = normalizeText(r["name"] ?? r["Name"] ?? "");
    const description  = normalizeText(r["description"] ?? r["Description"] ?? "");
    const manufacturer = normalizeText(r["manufacturer"] ?? r["Manufacturer"] ?? "");
    const model        = normalizeText(r["model"] ?? r["Model"] ?? "");
    const itemCodeRaw  = normalizeText(r["item code"] ?? r["itemcode"] ?? r["itemCode"] ?? r["Item Code"] ?? "");
    const serialNumber = normalizeText(r["serial number"] ?? r["serialnumber"] ?? r["serialNumber"] ?? "");
    const quantityRaw  = normalizeText(r["quantity"] ?? r["Quantity"] ?? "");
    const unit         = normalizeText(r["unit"] ?? r["Unit"] ?? "");
    const reorderRaw   = normalizeText(r["reorderlevel"] ?? r["reorderLevel"] ?? r["reorder level"] ?? "");
    const targetRaw    = normalizeText(r["targetstock level"] ?? r["targetStockLevel"] ?? r["target stock level"] ?? "");
    const conditionRaw = normalizeUpper(r["condition"] ?? r["Condition"] ?? "");

    let error: string | null = null;

    // Item type (main) and optional sub-type.
    const main = itemTypeRaw ? findMain(itemTypeRaw) : undefined;
    let subId: string | null = null;
    let typeDisplay = itemTypeText;
    if (!itemTypeRaw) {
      error = `itemtype is required. Types used here: ${mains.filter((t) => isOn(t.id)).map((t) => t.name).join(" · ") || ITEM_TYPE_UPLOAD_HINT}`;
    } else if (!main) {
      error = `Item type "${itemTypeText}" doesn't exist yet`;
      missing.set(`type:${itemTypeRaw}`, { kind: "type", key: `type:${itemTypeRaw}`, name: itemTypeText });
    } else {
      typeDisplay = main.name;
      if (!isOn(main.id)) {
        error = `"${main.name}" isn't used in this warehouse yet`;
        missing.set(`inc:${main.id}`, { kind: "include-type", key: `inc:${main.id}`, id: main.id, name: main.name, code: codeFor(main) });
      }
      if (subTypeText) {
        const sub = allTypes.find((t) => t.parentId === main.id && t.name.trim().toUpperCase() === subTypeText.toUpperCase());
        typeDisplay = `${main.name} › ${sub?.name ?? subTypeText}`;
        if (!sub) {
          error = error ?? `Sub-type "${subTypeText}" doesn't exist under ${main.name} yet`;
          missing.set(`sub:${main.id}:${subTypeText.toUpperCase()}`, { kind: "subtype", key: `sub:${main.id}:${subTypeText.toUpperCase()}`, name: subTypeText, parentId: main.id, parentName: main.name });
        } else {
          subId = sub.id;
          if (!isOn(sub.id)) {
            error = error ?? `Sub-type "${sub.name}" isn't used in this warehouse yet`;
            missing.set(`incsub:${sub.id}`, { kind: "include-subtype", key: `incsub:${sub.id}`, id: sub.id, name: sub.name, parentName: main.name });
          }
        }
      }
    }
    const itemType: InventoryItemType | null = main ? (main.legacyKey ?? "GENERAL") : null;

    if (!error && !name) error = "name is required";

    const uncountable = isUncountable(quantityRaw);
    let quantity      = 0;
    if (!uncountable) {
      quantity = Number(quantityRaw);
      if (!error && (!Number.isFinite(quantity) || quantity < 0)) {
        error = "quantity must be a number, 0 or more, or N/A for uncountable items";
      }
    }

    const reorderLevel     = reorderRaw === "" ? 0    : Number(reorderRaw);
    const targetStockLevel = targetRaw  === "" ? null : Number(targetRaw);

    const itemCodeKey = normalizeUpper(itemCodeRaw);
    if (!error && itemCodeKey) {
      if (existingItemCodes.has(itemCodeKey)) {
        error = `Item code ${itemCodeRaw} already exists in this site — use Restock instead`;
      } else if (seenUploadItemCodes.has(itemCodeKey)) {
        error = `Duplicate item code ${itemCodeRaw} in upload file`;
      }
    }

    const validConditions = ["NEW", "UNUSED", "USED", "FAULTY"];
    const condition = (validConditions.includes(conditionRaw) ? conditionRaw : "NEW") as EquipmentCondition;

    const status = getAutoInventoryStatus({
      quantity:        Math.trunc(uncountable ? 0 : quantity),
      reorderLevel:    Math.trunc(isNaN(reorderLevel) ? 0 : reorderLevel),
      preferredStatus: null,
      uncountable,
    });

    preview.push({
      rowNumber,
      itemType:    typeDisplay,
      name,
      itemCode:    itemCodeRaw || "(auto)",
      quantity:    uncountable ? "N/A" : String(quantity),
      unit,
      condition:   conditionRaw || "NEW",
      uncountable,
      error,
    });

    if (!error && itemType && main) {
      if (itemCodeKey) seenUploadItemCodes.add(itemCodeKey);

      // Item code given in the file with a different short code than this warehouse uses for the type?
      const seg = /^[^-]+-([^-]+)-\d/.exec(itemCodeKey)?.[1];
      if (seg && seg !== codeFor(main).toUpperCase()) {
        const k = `${main.id}:${seg}`;
        const h = hints.get(k) ?? { typeId: main.id, typeName: main.name, used: seg, current: codeFor(main), count: 0 };
        h.count++;
        hints.set(k, h);
      }

      validRows.push({
        itemType,
        typeId:    main.id,
        subTypeId: subId,
        name,
        description:      description  || null,
        manufacturer:     manufacturer || null,
        model:            model        || null,
        itemCode:         itemCodeRaw  || null,
        serialNumber:     serialNumber || null,
        quantity:         Math.trunc(uncountable ? 0 : quantity),
        uncountable,
        unit:             unit || null,
        reorderLevel:     Math.trunc(isNaN(reorderLevel) ? 0 : reorderLevel),
        targetStockLevel: (targetStockLevel === null || isNaN(targetStockLevel))
                            ? null
                            : Math.trunc(targetStockLevel),
        status,
        condition,
      });
    }
  }

  return { preview, validRows, missing: [...missing.values()], codeHints: [...hints.values()] };
}

// Next free item code: PREFIX-CODE-001. Pass the warehouse's short code for the item type
// (from item-type-registry), or a legacy itemType to use its standard code.
export async function generateItemCode({
  itemType,
  code,
  sitePrefix,
}: {
  itemType?:  InventoryItemType;
  code?:      string;
  sitePrefix: string;
}): Promise<string> {
  const typeCode = code || (itemType ? ITEM_CODE_SEGMENT[itemType] : undefined) || "GEN";
  const pattern  = `${sitePrefix}-${typeCode}-`;

  const existing = await prisma.inventoryItem.findMany({
    where:  { itemCode: { startsWith: pattern } },
    select: { itemCode: true },
  });

  let max = 0;
  for (const { itemCode } of existing) {
    if (!itemCode) continue;
    const suffix = itemCode.slice(pattern.length).split("-")[0];
    const num    = parseInt(suffix, 10);
    if (!isNaN(num) && num > max) max = num;
  }

  return `${pattern}${String(max + 1).padStart(3, "0")}`;
}

export function generateEntityCodes(itemCode: string, quantity: number): string[] {
  return Array.from({ length: quantity }, (_, i) =>
    `${itemCode}-${String(i + 1).padStart(2, "0")}`
  );
}
