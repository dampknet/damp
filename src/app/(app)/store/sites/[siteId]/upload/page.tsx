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

  const site = await prisma.inventorySite.findUnique({
    where: { id: siteId },
    select: { id: true, name: true, location: true },
  });

  if (!site) return notFound();
  const safeSite = site;

  async function uploadInventoryExcel(formData: FormData) {
    "use server";

    const file = formData.get("file");

    if (!(file instanceof File)) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("Please choose an Excel file")}`
      );
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("Only .xlsx or .xls files are allowed")}`
      );
    }

    let XLSX: typeof import("xlsx");
    try {
      XLSX = await import("xlsx");
    } catch {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("Excel reader is not installed. Run npm install xlsx")}`
      );
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("The uploaded file has no sheets")}`
      );
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });

    if (rows.length === 0) {
      redirect(
        `/store/sites/${siteId}/upload?error=${encodeURIComponent("The uploaded sheet is empty")}`
      );
    }

    const existingItems = await prisma.inventoryItem.findMany({
      where: { inventorySiteId: siteId },
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
    const validRows: Array<{
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
    }> = [];

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
      }

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

    if (validRows.length === 0) {
      const payload = encodeURIComponent(JSON.stringify(preview));
      redirect(
        `/store/sites/${siteId}/upload?preview=${payload}&error=${encodeURIComponent("No valid rows found to import")}`
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
      actorEmail: profile?.email ?? null,
      entityType: "INVENTORY_SITE",
      entityId: safeSite.id,
    });

    const payload = encodeURIComponent(JSON.stringify(preview));
    redirect(
      `/store/sites/${siteId}/upload?preview=${payload}&success=${encodeURIComponent(
        `${validRows.length} row(s) imported successfully`
      )}`
    );
  }

  const templateHref = await buildInventoryTemplateDataUrl();

  return (
    <UploadInventoryExcelClient
      site={safeSite}
      action={uploadInventoryExcel}
      templateHref={templateHref}
      templateFileName="inventory-import-template.xlsx"
    />
  );
}