import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { getAutoInventoryStatus } from "@/lib/inventory-status";
import { logActivity } from "@/lib/activity";
import type {
  EquipmentCondition,
  InventoryItemStatus,
  InventoryItemType,
} from "@prisma/client";
import UploadInventoryExcelClient from "./UploadInventoryExcelClient";

type PreviewRow = {
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

type ValidRow = {
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

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeUpper(v: unknown) {
  return normalizeText(v).toUpperCase();
}

async function buildInventoryTemplateDataUrl() {
  const XLSX = await import("xlsx");

  const rows = [
    [
      "itemType",
      "name",
      "description",
      "stockNumber",
      "manufacturer",
      "model",
      "serialNumber",
      "quantity",
      "unit",
      "reorderLevel",
      "targetStockLevel",
      "status",
      "condition",
    ],
    [
      "MATERIAL",
      "Coaxial Cable",
      "75 ohm cable roll",
      "MAT-001",
      "Belden",
      "RG6",
      "",
      10,
      "rolls",
      2,
      15,
      "AVAILABLE",
      "",
    ],
    [
      "EQUIPMENT",
      "Signal Generator",
      "Portable signal generator",
      "EQ-001",
      "Rohde & Schwarz",
      "SMB100A",
      "SG-2026-001",
      1,
      "pcs",
      0,
      "",
      "AVAILABLE",
      "GOOD",
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "InventoryTemplate");

  const base64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
}

function encodeData(data: unknown) {
  return encodeURIComponent(JSON.stringify(data));
}

function decodeData<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

async function parseInventoryFile({
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

  if (file.size <= 0) {
    throw new Error("Uploaded file is empty");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum allowed size is 5MB");
  }

  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    throw new Error("Only .xlsx or .xls files are allowed");
  }

  const allowedMimeTypes = new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
    "",
  ]);

  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Invalid file type. Please upload a valid Excel file");
  }

  const XLSX = await import("xlsx");
  const bytes = await file.arrayBuffer();

  const header = new Uint8Array(bytes.slice(0, 8));
  const isXlsxZip =
    header.length >= 4 &&
    header[0] === 0x50 &&
    header[1] === 0x4b &&
    header[2] === 0x03 &&
    header[3] === 0x04;

  const isLegacyXls =
    header.length >= 8 &&
    header[0] === 0xd0 &&
    header[1] === 0xcf &&
    header[2] === 0x11 &&
    header[3] === 0xe0 &&
    header[4] === 0xa1 &&
    header[5] === 0xb1 &&
    header[6] === 0x1a &&
    header[7] === 0xe1;

  if (!isXlsxZip && !isLegacyXls) {
    throw new Error("Corrupted or invalid Excel file");
  }

  const workbook = XLSX.read(bytes, {
    type: "array",
    cellFormula: false,
    cellHTML: false,
    cellText: true,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded file has no sheets");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error("The uploaded sheet is empty");
  }

  const MAX_ROWS = 5000;
  if (rows.length > MAX_ROWS) {
    throw new Error(`Too many rows. Maximum allowed is ${MAX_ROWS}`);
  }

  const existingItems = await prisma.inventoryItem.findMany({
    where: {
      inventorySiteId: siteId,
      isDeleted: false,
    },
    select: { stockNumber: true, serialNumber: true },
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

    if (!itemType) {
      error = "itemType must be MATERIAL or EQUIPMENT";
    } else if (!name) {
      error = "name is required";
    } else if (name.length > 150) {
      error = "name is too long";
    }

    if (!error && description.length > 1000) error = "description is too long";
    if (!error && stockNumber.length > 100) error = "stockNumber is too long";
    if (!error && serialNumber.length > 100) error = "serialNumber is too long";
    if (!error && manufacturer.length > 100) error = "manufacturer is too long";
    if (!error && model.length > 100) error = "model is too long";
    if (!error && unit.length > 40) error = "unit is too long";

    const quantity = quantityRaw === "" ? 0 : Number(quantityRaw);
    if (!error && (!Number.isFinite(quantity) || quantity < 0)) {
      error = "quantity must be 0 or more";
    }

    const reorderLevel = reorderLevelRaw === "" ? 0 : Number(reorderLevelRaw);
    if (!error && (!Number.isFinite(reorderLevel) || reorderLevel < 0)) {
      error = "reorderLevel must be 0 or more";
    }

    const targetStockLevel =
      targetStockLevelRaw === "" ? null : Number(targetStockLevelRaw);
    if (
      !error &&
      targetStockLevelRaw !== "" &&
      (!Number.isFinite(targetStockLevel) || Number(targetStockLevel) < 0)
    ) {
      error = "targetStockLevel must be 0 or more";
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

    let preferredStatus: InventoryItemStatus | null = null;
    if (
      statusRaw === "AVAILABLE" ||
      statusRaw === "LOW_STOCK" ||
      statusRaw === "OUT_OF_STOCK" ||
      statusRaw === "CHECKED_OUT" ||
      statusRaw === "INACTIVE"
    ) {
      preferredStatus = statusRaw as InventoryItemStatus;
    }

    const finalStatus = getAutoInventoryStatus({
      quantity: Math.trunc(quantity || 0),
      reorderLevel: Math.trunc(reorderLevel || 0),
      preferredStatus,
    });

    let condition: EquipmentCondition | null = null;
    if (itemType === "EQUIPMENT") {
      if (
        conditionRaw === "GOOD" ||
        conditionRaw === "FAULTY" ||
        conditionRaw === "DAMAGED" ||
        conditionRaw === "UNDER_REPAIR"
      ) {
        condition = conditionRaw as EquipmentCondition;
      } else {
        condition = "GOOD";
      }
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
      status: preferredStatus ?? finalStatus,
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
          targetStockLevel === null ? null : Math.trunc(targetStockLevel),
        status: finalStatus,
        condition,
      });
    }
  }

  return { preview, validRows };
}

export default async function UploadInventoryExcelPage({
  params,
}: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect(`/store/sites/${siteId}`);

  const site = await prisma.inventorySite.findFirst({
    where: { id: siteId, isDeleted: false },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  async function previewInventoryExcel(formData: FormData) {
    "use server";

    const freshProfile = await getCurrentProfile();
    const freshRole = freshProfile?.role ?? "VIEWER";
    const freshCanEdit = freshRole === "ADMIN" || freshRole === "EDITOR";

    if (!freshCanEdit) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("You are not allowed to upload inventory files")}`
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("Please choose an Excel file")}`
      );
    }

    try {
      const { preview, validRows } = await parseInventoryFile({ file, siteId });

      if (validRows.length === 0) {
        redirect(
          `/store/sites/${siteId}/upload?preview=${encodeData(preview)}&error=${encodeURIComponent(
            "No valid rows found to import"
          )}`
        );
      }

      redirect(
        `/store/sites/${siteId}/upload?preview=${encodeData(preview)}&validRows=${encodeData(
          validRows
        )}&ready=yes`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to preview uploaded file";
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent(message)}`
      );
    }
  }

  async function confirmInventoryExcelImport(formData: FormData) {
    "use server";

    const freshProfile = await getCurrentProfile();
    const freshRole = freshProfile?.role ?? "VIEWER";
    const freshCanEdit = freshRole === "ADMIN" || freshRole === "EDITOR";

    if (!freshCanEdit) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("You are not allowed to import inventory files")}`
      );
    }

    const previewPayload = normalizeText(formData.get("previewPayload"));
    const validRowsPayload = normalizeText(formData.get("validRowsPayload"));

    const preview = decodeData<PreviewRow[]>(previewPayload) ?? [];
    const validRows = decodeData<ValidRow[]>(validRowsPayload) ?? [];

    if (validRows.length === 0) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("No valid rows available to import")}`
      );
    }

    const existingSite = await prisma.inventorySite.findFirst({
      where: { id: siteId, isDeleted: false },
      select: { id: true, name: true },
    });

    if (!existingSite) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("Inventory site not found")}`
      );
    }

    const created = await prisma.inventoryItem.createMany({
      data: validRows.map((row) => ({
        inventorySiteId: siteId,
        ...row,
      })),
    });

    await logActivity({
      type: "INVENTORY_IMPORT",
      title: `Inventory Excel import completed for ${safeSite.name}`,
      details: `Imported ${created.count} valid row(s) into ${safeSite.name}. Total rows read: ${preview.length}. Invalid/skipped rows: ${preview.filter((row) => !!row.error).length}.`,
      actorEmail: freshProfile?.email ?? null,
      entityType: "INVENTORY_SITE",
      entityId: safeSite.id,
    });

    redirect(
      `/store/sites/${siteId}/upload?preview=${encodeData(preview)}&success=${encodeURIComponent(
        `${validRows.length} row(s) imported successfully`
      )}`
    );
  }

  const templateHref = await buildInventoryTemplateDataUrl();

  return (
    <UploadInventoryExcelClient
      site={safeSite}
      previewAction={previewInventoryExcel}
      confirmAction={confirmInventoryExcelImport}
      templateHref={templateHref}
      templateFileName="inventory-import-template.xlsx"
    />
  );
}