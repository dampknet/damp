import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { SiteStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as { siteId?: string; status?: SiteStatus };

    if (!body.siteId || !body.status) {
      return NextResponse.json({ error: "siteId and status are required" }, { status: 400 });
    }

    const profile = await getCurrentProfile();
    const actorEmail = profile?.email ?? "Unknown";

    const existing = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, status: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data: { status: body.status },
    });

    // 🔥 AUDIT LOG
    await prisma.auditLog.create({
      data: {
        actorEmail,
        action: "UPDATE_SITE_STATUS",
        entityType: "Site",
        entityId: existing.id,
        before: { status: existing.status },
        after: { status: updated.status },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update site status" }, { status: 500 });
  }
}
