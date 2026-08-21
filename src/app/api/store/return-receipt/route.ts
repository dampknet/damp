import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, ImageRun, WidthType, AlignmentType,
  ShadingType, HeightRule, VerticalAlign,
} from "docx";
import fs from "fs";
import path from "path";

function getLogo(): Buffer | null {
  try {
    const p = path.join(process.cwd(), "public", "knet-logo.jpg");
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {}
  return null;
}

function mkCell(text: string, opts: {
  width?: number; bold?: boolean; fill?: string; size?: number;
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
} = {}) {
  return new TableCell({
    width:   opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: opts.align ?? AlignmentType.LEFT,
      children: [new TextRun({
        text:  text ?? "",
        bold:  opts.bold ?? false,
        size:  opts.size ?? 18,
        font:  "Arial",
      })],
    })],
  });
}

export async function GET(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const issueId = searchParams.get("issueId");
    if (!issueId) return NextResponse.json({ error: "issueId required" }, { status: 400 });

    const issue = await prisma.warehouseIssue.findUnique({
      where:  { id: issueId },
      select: {
        id:            true,
        takenBy:       true,
        returnedBy:    true,
        returnedAt:    true,
        returnNote:    true,
        takenAt:       true,
        status:        true,
        inventoryItem: { select: { name: true, itemCode: true } },
        inventorySite: { select: { name: true } },
        lines: {
          select: {
            assetInstance: { select: { entityCode: true, condition: true } },
          },
        },
      },
    });

    if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

    const logo = getLogo();
    const returnDate = issue.returnedAt
      ? new Date(issue.returnedAt).toLocaleDateString("en-GB")
      : new Date().toLocaleDateString("en-GB");

    // Build item rows
    const COL = [500, 2500, 2000, 1500, 2860];
    const itemRows = issue.lines.length > 0
      ? issue.lines.map((line, i) =>
          new TableRow({
            height: { value: 440, rule: HeightRule.ATLEAST },
            children: [
              mkCell(String(i + 1), { width: COL[0] }),
              mkCell(issue.inventoryItem.name, { width: COL[1] }),
              mkCell(line.assetInstance.entityCode, { width: COL[2] }),
              mkCell(line.assetInstance.condition, { width: COL[3] }),
              mkCell("", { width: COL[4] }),
            ],
          })
        )
      : [new TableRow({
          height: { value: 440, rule: HeightRule.ATLEAST },
          children: [
            mkCell("1", { width: COL[0] }),
            mkCell(issue.inventoryItem.name, { width: COL[1] }),
            mkCell(issue.inventoryItem.itemCode ?? "", { width: COL[2] }),
            mkCell("", { width: COL[3] }),
            mkCell("", { width: COL[4] }),
          ],
        })];

    // Pad to minimum 8 rows
    while (itemRows.length < 8) {
      itemRows.push(new TableRow({
        height: { value: 440, rule: HeightRule.ATLEAST },
        children: COL.map((w) => mkCell("", { width: w })),
      }));
    }

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: logo
              ? [new ImageRun({ data: logo, type: "jpg", transformation: { width: 80, height: 65 } })]
              : [new TextRun({ text: "KNET", bold: true, size: 36, font: "Arial" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "KNET — RETURN RECEIPT", bold: true, size: 28, font: "Arial" })],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // Info table
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [2400, 6960],
            rows: [
              new TableRow({ children: [mkCell("RETURNED BY", { width: 2400, bold: true }), mkCell(issue.returnedBy ?? "", { width: 6960 })] }),
              new TableRow({ children: [mkCell("RETURN DATE", { width: 2400, bold: true }), mkCell(returnDate, { width: 6960 })] }),
              new TableRow({ children: [mkCell("ORIGINALLY TAKEN BY", { width: 2400, bold: true }), mkCell(issue.takenBy, { width: 6960 })] }),
              new TableRow({ children: [mkCell("SITE", { width: 2400, bold: true }), mkCell(issue.inventorySite.name, { width: 6960 })] }),
              ...(issue.returnNote ? [
                new TableRow({ children: [mkCell("NOTE", { width: 2400, bold: true }), mkCell(issue.returnNote, { width: 6960 })] }),
              ] : []),
            ],
          }),

          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // Items table
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: COL,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  mkCell("No",          { width: COL[0], bold: true, fill: "D9D9D9" }),
                  mkCell("Item",        { width: COL[1], bold: true, fill: "D9D9D9" }),
                  mkCell("Entity Code", { width: COL[2], bold: true, fill: "D9D9D9" }),
                  mkCell("Condition",   { width: COL[3], bold: true, fill: "D9D9D9" }),
                  mkCell("Notes",       { width: COL[4], bold: true, fill: "D9D9D9" }),
                ],
              }),
              ...itemRows,
            ],
          }),

          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // Footer signatures
          new Paragraph({ children: [new TextRun({ text: "RECEIVED BY (STORE):", bold: true, size: 20, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({ children: [new TextRun({ text: "DATE:", bold: true, size: 20, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({ children: [new TextRun({ text: "SIGNATURE:", bold: true, size: 20, font: "Arial" })] }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `— Generated by DAMP on ${new Date().toLocaleString("en-GB")} —`, size: 16, font: "Arial", color: "999999" })],
          }),
        ],
      }],
    });

    const buffer   = await Packer.toBuffer(doc);
    const filename = `return-receipt-${issue.takenBy.split(" ")[0]}-${returnDate.replace(/\//g, "-")}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[RETURN_RECEIPT]", error);
    return NextResponse.json({ error: "Failed to generate return receipt" }, { status: 500 });
  }
}