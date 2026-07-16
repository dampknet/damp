import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, WidthType, BorderStyle, AlignmentType,
  ShadingType, HeightRule, VerticalAlign,
} from "docx";
import fs from "fs";
import path from "path";

// ── Logo (ship with project at public/knet-logo.jpg) ──────────────────────
function getLogo(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "knet-logo.jpg");
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  return null;
}

function mkCell(text: string, opts: {
  width?: number; bold?: boolean; fill?: string;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  size?: number;
} = {}) {
  return new TableCell({
    width:  opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill ?? "FFFFFF" },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text:  text ?? "",
            bold:  opts.bold ?? false,
            size:  opts.size ?? 20,
            font:  "Arial",
          }),
        ],
      }),
    ],
  });
}

function buildDoc(data: {
  requesterName: string;
  date:          string;
  items: { description: string; itemCode: string; quantity: number; condition: string }[];
}) {
  const logo = getLogo();

  const headerChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: logo
        ? [new ImageRun({ data: logo, type: "jpg", transformation: { width: 80, height: 65 } })]
        : [new TextRun({ text: "KNET", bold: true, size: 36, font: "Arial" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "KNET WAYBILL", bold: true, size: 28, font: "Arial" })],
    }),
    new Paragraph({ children: [new TextRun({ text: "" })] }),
  ];

  const infoTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [2200, 7160],
    rows: [
      new TableRow({
        height: { value: 420, rule: HeightRule.ATLEAST },
        children: [
          mkCell("NAME", { width: 2200, bold: true }),
          mkCell(data.requesterName, { width: 7160 }),
        ],
      }),
      new TableRow({
        height: { value: 420, rule: HeightRule.ATLEAST },
        children: [
          mkCell("DATE", { width: 2200, bold: true }),
          mkCell(data.date, { width: 7160 }),
        ],
      }),
      new TableRow({
        height: { value: 420, rule: HeightRule.ATLEAST },
        children: [
          mkCell("DRIVER'S NAME", { width: 2200, bold: true }),
          mkCell("", { width: 7160 }),
        ],
      }),
    ],
  });

  const COL = [3200, 1400, 2000, 1280, 1480];

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 480, rule: HeightRule.ATLEAST },
    children: [
      mkCell("ITEM DESCRIPTION", { width: COL[0], bold: true, fill: "D9D9D9", align: AlignmentType.CENTER }),
      mkCell("LOCATION",         { width: COL[1], bold: true, fill: "D9D9D9", align: AlignmentType.CENTER }),
      mkCell("ITEM CODE NO.",    { width: COL[2], bold: true, fill: "D9D9D9", align: AlignmentType.CENTER }),
      mkCell("QUANTITY",         { width: COL[3], bold: true, fill: "D9D9D9", align: AlignmentType.CENTER }),
      mkCell("CONDITION",        { width: COL[4], bold: true, fill: "D9D9D9", align: AlignmentType.CENTER }),
    ],
  });

  const MIN_ROWS = 14;
  const dataRows: TableRow[] = [];

  for (let i = 0; i < Math.max(data.items.length, MIN_ROWS); i++) {
    const it = data.items[i];
    dataRows.push(
      new TableRow({
        height: { value: 440, rule: HeightRule.ATLEAST },
        children: [
          mkCell(it?.description ?? "", { width: COL[0] }),
          mkCell("",                     { width: COL[1] }),
          mkCell(it?.itemCode    ?? "", { width: COL[2] }),
          mkCell(it?.quantity != null ? String(it.quantity) : "", { width: COL[3], align: AlignmentType.CENTER }),
          mkCell(it?.condition   ?? "", { width: COL[4] }),
        ],
      })
    );
  }

  const itemsTable = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: COL,
    rows: [headerRow, ...dataRows],
  });

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      children: [
        ...headerChildren,
        infoTable,
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        itemsTable,
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({ text: "RECEIVED BY:", bold: true, size: 20, font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({ text: "DATE:",        bold: true, size: 20, font: "Arial" })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({ text: "SIGNATURE:",   bold: true, size: 20, font: "Arial" })] }),
      ],
    }],
  });
}

export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  // Fetch all warehouse issues in this group
  const issues = await prisma.warehouseIssue.findMany({
    where: { groupId },
    select: {
      id:               true,
      quantityTaken:    true,
      takenBy:          true,
      takenAt:          true,
      conditionAtIssue: true,   // ✅
      inventoryItem: {
        select: { name: true, itemCode: true, unit: true },
      },
      lines: {
        select: {
          assetInstance: { select: { entityCode: true, condition: true } },
        },
      },
    },
  });

  if (!issues.length) {
    return NextResponse.json({ error: "No issues found for this group" }, { status: 404 });
  }

  const first = issues[0];

  // Build one row per entity code (tracked) or one row per issue (bulk)
  const rows: { description: string; itemCode: string; quantity: number; condition: string }[] = [];

  for (const issue of issues) {
    if (issue.lines.length > 0) {
      // Tracked — one row per entity
      for (const line of issue.lines) {
        rows.push({
          description: issue.inventoryItem.name,
          itemCode:    line.assetInstance.entityCode,
          quantity:    1,
          condition:   line.assetInstance.condition,
        });
      }
    } else {
      // Bulk — use conditionAtIssue saved at time of issue
      rows.push({
        description: issue.inventoryItem.name,
        itemCode:    issue.inventoryItem.itemCode ?? "",
        quantity:    issue.quantityTaken,
        condition:   issue.conditionAtIssue ?? "",
      });
    }
  }

  const doc    = buildDoc({
    requesterName: first.takenBy,
    date:          new Date(first.takenAt).toLocaleDateString("en-GB"),
    items:         rows,
  });

  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="waybill-${groupId}.docx"`,
    },
  });
}
