import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      siteId?: string;
      status?: "ACTIVE" | "DOWN";
      reason?: string | null;
    };

    if (!body.siteId || !body.status) {
      return NextResponse.json(
        { error: "siteId and status are required" },
        { status: 400 }
      );
    }

    if (body.status !== "ACTIVE" && body.status !== "DOWN") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const reason = String(body.reason ?? "").trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const currentSite = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, name: true, status: true },
    });

    if (!currentSite) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const site = await tx.site.update({
        where: { id: body.siteId! },
        data: {
          status: body.status,
          statusReason: reason,
          statusChangedAt: now,
        },
        select: {
          id: true,
          name: true,
          status: true,
          statusReason: true,
          statusChangedAt: true,
        },
      });

      await tx.activityLog.create({
        data: {
          type: "SITE_STATUS_CHANGED",
          title: `${site.name} marked ${body.status}`,
          details: `Reason: ${reason}`,
          entityType: "SITE",
          entityId: site.id,
          actorEmail: profile?.email ?? null,
        },
      });

      return site;
    });

    return NextResponse.json({ ok: true, site: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update site status" },
      { status: 500 }
    );
  }
}