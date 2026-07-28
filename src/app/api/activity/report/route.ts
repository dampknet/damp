import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, WidthType, AlignmentType, HeadingLevel,
  ShadingType, HeightRule, VerticalAlign, BorderStyle,
} from "docx";

type Period = "TODAY" | "THIS_WEEK" | "LAST_WEEK" | "THIS_MONTH" | "THIS_YEAR";

function getPeriodRange(period: Period): { start: Date; end: Date; label: string } {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "TODAY") {
    return {
      start: today,
      end:   new Date(today.getTime() + 86400000 - 1),
      label: `Today (${today.toLocaleDateString("en-GB")})`,
    };
  }
  if (period === "THIS_WEEK") {
    const day  = today.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const mon  = new Date(today.getTime() - diff * 86400000);
    const sun  = new Date(mon.getTime() + 6 * 86400000 + 86400000 - 1);
    return { start: mon, end: sun, label: `This Week (${mon.toLocaleDateString("en-GB")} – ${sun.toLocaleDateString("en-GB")})` };
  }
  if (period === "LAST_WEEK") {
    const day     = today.getDay();
    const diff    = day === 0 ? 6 : day - 1;
    const thisMon = new Date(today.getTime() - diff * 86400000);
    const lastMon = new Date(thisMon.getTime() - 7 * 86400000);
    const lastSun = new Date(thisMon.getTime() - 1);
    return { start: lastMon, end: lastSun, label: `Last Week (${lastMon.toLocaleDateString("en-GB")} – ${lastSun.toLocaleDateString("en-GB")})` };
  }
  if (period === "THIS_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end, label: start.toLocaleString("en-GB", { month: "long", year: "numeric" }) };
  }
  // THIS_YEAR
  const start = new Date(now.getFullYear(), 0, 1);
  const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  return { start, end, label: `Year ${now.getFullYear()}` };
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

export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body     = await req.json();
    const period   = (body.period ?? "THIS_MONTH") as Period;
    const siteId   = (body.siteId ?? "ALL") as string;

    const { start, end, label: periodLabel } = getPeriodRange(period);

    // Fetch inventory sites for name resolution
    const inventorySites = await prisma.inventorySite.findMany({
      select: { id: true, name: true },
    });
    const siteMap = Object.fromEntries(inventorySites.map((s) => [s.id, s.name]));
    const siteName = siteId === "ALL" ? "All Sites" : (siteMap[siteId] ?? siteId);

    // Fetch activity logs for the period
    const logs = await prisma.activityLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: "asc" },
    });

    // Fetch warehouse issues for the period (issued items)
    const issues = await prisma.warehouseIssue.findMany({
      where: {
        takenAt: { gte: start, lte: end },
        ...(siteId !== "ALL" ? { inventorySiteId: siteId } : {}),
      },
      select: {
        id:            true,
        takenBy:       true,
        takenAt:       true,
        quantityTaken: true,
        status:        true,
        authorizedBy:  true,
        purpose:       true,
        inventoryItem: { select: { name: true, itemType: true } },
        inventorySite: { select: { name: true } },
      },
      orderBy: { takenAt: "asc" },
    });

    // Fetch restocks for the period
    const restocks = await prisma.inventoryRestock.findMany({
      where: {
        dateReceived: { gte: start, lte: end },
        ...(siteId !== "ALL" ? { inventorySiteId: siteId } : {}),
      },
      select: {
        quantityAdded: true,
        dateReceived:  true,
        supplier:      true,
        receivedBy:    true,
        inventoryItem: { select: { name: true } },
        inventorySite: { select: { name: true } },
      },
      orderBy: { dateReceived: "asc" },
    });

    // Per-user login count
    const loginLogs = logs.filter((l) => l.type === "USER_LOGIN");
    const loginsByUser: Record<string, number> = {};
    for (const l of loginLogs) {
      const email = l.actorEmail ?? "Unknown";
      loginsByUser[email] = (loginsByUser[email] ?? 0) + 1;
    }

    // Build summary stats
    const totalIssued    = issues.length;
    const totalReturned  = issues.filter((i) => i.status === "RETURNED").length;
    const totalRestocks  = restocks.length;
    const totalLogins    = loginLogs.length;
    const totalActivities = logs.length;

    const generatedAt = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    const userName    = profile.fullName ?? profile.email ?? "Admin";

    // ── BUILD DOCUMENT ────────────────────────────────────────────────────────

    const COL = [500, 2200, 1800, 1500, 3360]; // No, Item, Site, Qty, Purpose
    const COL2 = [500, 3000, 2000, 3860]; // No, User, Count, Notes

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
        children: [

          // ── HEADER ──────────────────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "KNET — GHANA DTT ASSET MANAGEMENT PLATFORM", bold: true, size: 28, font: "Arial" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "ACTIVITY REPORT", bold: true, size: 32, font: "Arial" })],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // Greeting
          new Paragraph({
            children: [new TextRun({ text: `Hello, ${userName}`, size: 22, font: "Arial" })],
          }),
          new Paragraph({
            children: [new TextRun({
              text: `This is the ${periodLabel} report for ${siteName}.`,
              size: 22, font: "Arial",
            })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Generated: ${generatedAt}`, size: 18, font: "Arial", color: "666666" })],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // ── SUMMARY ─────────────────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Summary", bold: true, size: 26, font: "Arial" })],
          }),
          new Table({
            width: { size: 9360, type: WidthType.DXA },
            columnWidths: [3120, 3120, 3120],
            rows: [
              new TableRow({ children: [
                mkCell("Metric", { width: 3120, bold: true, fill: "1D5FA8", size: 20 }),
                mkCell("Count",  { width: 3120, bold: true, fill: "1D5FA8", size: 20 }),
                mkCell("Notes",  { width: 3120, bold: true, fill: "1D5FA8", size: 20 }),
              ]}),
              ...[
                ["Total System Activity",   String(totalActivities), "All logged events"],
                ["User Logins",             String(totalLogins),     "Unique login events"],
                ["Items Issued",            String(totalIssued),     "Warehouse issues created"],
                ["Items Returned",          String(totalReturned),   "Warehouse returns processed"],
                ["Restock Operations",      String(totalRestocks),   "Items restocked to inventory"],
              ].map(([metric, count, note]) =>
                new TableRow({ children: [
                  mkCell(metric, { width: 3120 }),
                  mkCell(count,  { width: 3120, bold: true }),
                  mkCell(note,   { width: 3120, size: 16 }),
                ]})
              ),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // ── USER LOGIN SUMMARY ───────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "User Login Summary", bold: true, size: 26, font: "Arial" })],
          }),
          ...(Object.keys(loginsByUser).length === 0
            ? [new Paragraph({ children: [new TextRun({ text: "No logins recorded in this period.", size: 18, font: "Arial", color: "666666" })] })]
            : [new Table({
                width: { size: 9360, type: WidthType.DXA },
                columnWidths: COL2,
                rows: [
                  new TableRow({ children: [
                    mkCell("No",    { width: COL2[0], bold: true, fill: "D9D9D9" }),
                    mkCell("User",  { width: COL2[1], bold: true, fill: "D9D9D9" }),
                    mkCell("Logins",{ width: COL2[2], bold: true, fill: "D9D9D9" }),
                    mkCell("",      { width: COL2[3], fill: "D9D9D9" }),
                  ]}),
                  ...Object.entries(loginsByUser).map(([email, count], i) =>
                    new TableRow({ children: [
                      mkCell(String(i + 1), { width: COL2[0] }),
                      mkCell(email,         { width: COL2[1] }),
                      mkCell(String(count), { width: COL2[2], bold: true }),
                      mkCell("",            { width: COL2[3] }),
                    ]})
                  ),
                ],
              })]),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // ── ITEMS ISSUED ─────────────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Items Issued", bold: true, size: 26, font: "Arial" })],
          }),
          ...(issues.length === 0
            ? [new Paragraph({ children: [new TextRun({ text: "No items were issued in this period.", size: 18, font: "Arial", color: "666666" })] })]
            : [new Table({
                width: { size: 9360, type: WidthType.DXA },
                columnWidths: COL,
                rows: [
                  new TableRow({ children: [
                    mkCell("No",       { width: COL[0], bold: true, fill: "D9D9D9" }),
                    mkCell("Item",     { width: COL[1], bold: true, fill: "D9D9D9" }),
                    mkCell("Site",     { width: COL[2], bold: true, fill: "D9D9D9" }),
                    mkCell("Qty",      { width: COL[3], bold: true, fill: "D9D9D9" }),
                    mkCell("Taken By / Purpose", { width: COL[4], bold: true, fill: "D9D9D9" }),
                  ]}),
                  ...issues.map((issue, i) =>
                    new TableRow({
                      height: { value: 400, rule: HeightRule.ATLEAST },
                      children: [
                        mkCell(String(i + 1), { width: COL[0] }),
                        mkCell(issue.inventoryItem.name, { width: COL[1] }),
                        mkCell(issue.inventorySite.name, { width: COL[2] }),
                        mkCell(String(issue.quantityTaken), { width: COL[3] }),
                        mkCell(`${issue.takenBy} — ${issue.purpose}`, { width: COL[4], size: 16 }),
                      ],
                    })
                  ),
                ],
              })]),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // ── RESTOCKS ─────────────────────────────────────────────────────────
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            children: [new TextRun({ text: "Restock Operations", bold: true, size: 26, font: "Arial" })],
          }),
          ...(restocks.length === 0
            ? [new Paragraph({ children: [new TextRun({ text: "No restock operations in this period.", size: 18, font: "Arial", color: "666666" })] })]
            : [new Table({
                width: { size: 9360, type: WidthType.DXA },
                columnWidths: [500, 2800, 1800, 1200, 3060],
                rows: [
                  new TableRow({ children: [
                    mkCell("No",       { width: 500,  bold: true, fill: "D9D9D9" }),
                    mkCell("Item",     { width: 2800, bold: true, fill: "D9D9D9" }),
                    mkCell("Site",     { width: 1800, bold: true, fill: "D9D9D9" }),
                    mkCell("Qty",      { width: 1200, bold: true, fill: "D9D9D9" }),
                    mkCell("Supplier / Received By", { width: 3060, bold: true, fill: "D9D9D9" }),
                  ]}),
                  ...restocks.map((r, i) =>
                    new TableRow({
                      height: { value: 400, rule: HeightRule.ATLEAST },
                      children: [
                        mkCell(String(i + 1), { width: 500 }),
                        mkCell(r.inventoryItem.name, { width: 2800 }),
                        mkCell(r.inventorySite.name, { width: 1800 }),
                        mkCell(String(r.quantityAdded), { width: 1200 }),
                        mkCell(`${r.supplier ?? "—"} / ${r.receivedBy ?? "—"}`, { width: 3060, size: 16 }),
                      ],
                    })
                  ),
                ],
              })]),
          new Paragraph({ children: [new TextRun({ text: "" })] }),

          // ── FOOTER ───────────────────────────────────────────────────────────
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: `— End of Report — Generated by DAMP on ${generatedAt}`, size: 16, font: "Arial", color: "999999" })],
          }),
        ],
      }],
    });

    const buffer   = await Packer.toBuffer(doc);
    const filename = `DAMP-Report-${period}-${siteName.replace(/\s+/g, "-")}.docx`;

    // ✅ Log the report generation to audit trail
    await prisma.activityLog.create({
      data: {
        type:       "SYSTEM_EVENT",
        title:      `Report generated: ${periodLabel} — ${siteName}`,
        details:    `Downloaded by ${profile.email}. File: ${filename}`,
        actorEmail: profile.email,
        entityType: "SYSTEM",
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[REPORT_GENERATE]", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}