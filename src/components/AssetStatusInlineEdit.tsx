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
      assetId?: string;
      serialNumber?: string | null;
    };

    if (!body.assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const serial = body.serialNumber?.trim() || null;

    await prisma.asset.update({
      where: { id: body.assetId },
      data: { serialNumber: serial },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update serial number" },
      { status: 500 }
    );
  }
}
