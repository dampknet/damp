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

    const body = (await req.json()) as { siteId?: string };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: { id: true, name: true },
    });

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.asset.deleteMany({ where: { siteId: body.siteId } }),
      prisma.site.delete({ where: { id: body.siteId } }),
      prisma.activityLog.create({
        data: {
          type: "SITE_DELETED",
          title: `${site.name} deleted`,
          details: null,
          entityType: "SITE",
          entityId: site.id,
          actorEmail: profile?.email ?? null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 });
  }
}