import { accessOf, canViewStore } from "@/lib/access";
import { NextResponse } from "next/server";
import { Document, Packer, Paragraph, Table, AlignmentType } from "docx";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, isAdminProfile } from "@/lib/auth";
import { resolvePeriod } from "@/lib/reports/period";
import { PAGE_MARGIN, reportHeader, text, gap, pageBreak } from "@/lib/reports/docx";
import { activitySection, warehouseSection, siteStoresSection } from "@/lib/reports/sections";

export const maxDuration = 60;

const TYPES = {
  FULL:       "Full System Report",
  WAREHOUSES: "Warehouse Report",
  SITES:      "Site Stores Report",
  ACTIVITY:   "Activity & Sign-ins Report",
} as const;
type ReportType = keyof typeof TYPES;

// POST /api/activity/report
// { type, period, from?, to?, warehouseId?: "ALL"|id, siteScope?: "ALL"|"OTHER"|siteId }
export async function POST(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdminProfile(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const type = (Object.keys(TYPES).includes(body.type) ? body.type : "FULL") as ReportType;

    const period = resolvePeriod(String(body.period ?? "THIS_MONTH"), body.from, body.to);
    if ("error" in period) return NextResponse.json({ error: period.error }, { status: 400 });

    const access = accessOf(profile);
    const ctx    = { start: period.start, end: period.end, isMasterAdmin: profile.isMasterAdmin, access };

    // Reports only cover what this user may see.
    if (type === "SITES" && !access.sites)      return NextResponse.json({ error: "You don't have Sites access." }, { status: 403 });
    if (type === "WAREHOUSES" && !access.store) return NextResponse.json({ error: "You don't have Store access." }, { status: 403 });

    // Scope: a single warehouse / site, or everything.
    const warehouseId = type === "WAREHOUSES" && body.warehouseId && body.warehouseId !== "ALL" ? String(body.warehouseId) : null;
    const siteScope   = type === "SITES" && body.siteScope ? String(body.siteScope) : "ALL";

    let scopeLabel = "All warehouses, sites and places";
    if (type === "WAREHOUSES") {
      const w = warehouseId ? await prisma.inventorySite.findUnique({ where: { id: warehouseId }, select: { name: true } }) : null;
      if (warehouseId && !w) return NextResponse.json({ error: "Warehouse not found" }, { status: 400 });
      if (warehouseId && !canViewStore(access, warehouseId)) return NextResponse.json({ error: "You don't have access to that warehouse." }, { status: 403 });
      scopeLabel = w ? `Warehouse: ${w.name}` : "All warehouses";
    } else if (type === "SITES") {
      if (siteScope === "OTHER") scopeLabel = "Other places (not one of the 42 sites)";
      else if (siteScope !== "ALL") {
        const s = await prisma.site.findUnique({ where: { id: siteScope }, select: { name: true } });
        if (!s) return NextResponse.json({ error: "Site not found" }, { status: 400 });
        scopeLabel = `Site: ${s.name}`;
      } else scopeLabel = "All 42 sites and other places";
    } else if (type === "ACTIVITY") {
      scopeLabel = profile.isMasterAdmin ? "Whole system, including sign-ins and security" : "Whole system (sign-ins and security are master-admin only)";
    }

    const blocks: (Paragraph | Table)[] = [];
    if (type === "FULL") {
      if (access.sites) blocks.push(...await siteStoresSection(ctx, "ALL"), pageBreak());
      if (access.store) blocks.push(...await warehouseSection(ctx, null), pageBreak());
      blocks.push(...await activitySection(ctx));
    } else if (type === "SITES") {
      blocks.push(...await siteStoresSection(ctx, siteScope));
    } else if (type === "WAREHOUSES") {
      blocks.push(...await warehouseSection(ctx, warehouseId));
    } else {
      blocks.push(...await activitySection(ctx));
    }

    const generatedAt = new Date().toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" });
    const userName    = profile.fullName || profile.email;

    const doc = new Document({
      creator: "KIMS",
      title:   `${TYPES[type]} — ${period.label}`,
      sections: [{
        properties: { page: { margin: { top: PAGE_MARGIN, bottom: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN } } },
        children: [
          ...reportHeader({
            title: TYPES[type],
            lines: [
              `Period: ${period.label}`,
              `Covers: ${scopeLabel}`,
              `Prepared for ${userName} · Generated ${generatedAt}`,
            ],
          }),
          ...blocks,
          gap(),
          text(`— End of report — KIMS · ${generatedAt}`, { size: 16, color: "999999", align: AlignmentType.CENTER }),
        ],
      }],
    });

    const buffer   = await Packer.toBuffer(doc);
    const filename = `KIMS-${TYPES[type].replace(/[^A-Za-z]+/g, "-").replace(/-+$/, "")}-${period.slug}.docx`;

    await prisma.activityLog.create({
      data: {
        type:       "SYSTEM_EVENT",
        title:      `Report generated: ${TYPES[type]} — ${period.label}`,
        details:    `${scopeLabel}. Downloaded by ${profile.email}. File: ${filename}`,
        actorEmail: profile.email,
        entityType: "SYSTEM",
      },
    }).catch(() => {});

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Report-Filename":   filename,
      },
    });
  } catch (error) {
    console.error("[REPORT_GENERATE]", error);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
