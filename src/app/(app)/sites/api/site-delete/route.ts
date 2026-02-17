import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { siteId?: string };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // delete dependent assets first (prevents FK errors)
    await prisma.$transaction([
      prisma.asset.deleteMany({ where: { siteId: body.siteId } }),
      prisma.site.delete({ where: { id: body.siteId } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete site" }, { status: 500 });
  }
}
