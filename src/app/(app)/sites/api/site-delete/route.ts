import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function DELETE(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      siteId?: string;
      reason?: string;
    };

    const siteId = body.siteId?.trim();
    const reason = body.reason?.trim() || null;

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: {
        id: siteId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const now = new Date();
    const actorEmail = profile?.email ?? null;

    await prisma.$transaction([
      prisma.asset.updateMany({
        where: {
          siteId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedByEmail: actorEmail,
          deleteReason: reason ?? `Deleted because parent site "${site.name}" was deleted`,
        },
      }),

      prisma.site.update({
        where: { id: siteId },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedByEmail: actorEmail,
          deleteReason: reason,
        },
      }),

      prisma.activityLog.create({
        data: {
          type: "SITE_DELETED",
          title: `${site.name} deleted`,
          details: reason,
          entityType: "SITE",
          entityId: site.id,
          actorEmail,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete site" },
      { status: 500 }
    );
  }
}