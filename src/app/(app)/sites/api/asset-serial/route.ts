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

    const current = await prisma.asset.findUnique({
      where: { id: body.assetId },
      select: {
        id: true,
        assetName: true,
        serialNumber: true,
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: body.assetId! },
        data: { serialNumber: serial },
        select: {
          id: true,
          assetName: true,
          serialNumber: true,
        },
      });

      if ((current.serialNumber ?? null) !== serial) {
        await tx.activityLog.create({
          data: {
            type: "ASSET_SERIAL_UPDATED",
            title: `${current.assetName} serial updated`,
            details: `${current.serialNumber ?? "-"} → ${serial ?? "-"}`,
            entityType: "ASSET",
            entityId: asset.id,
            actorEmail: profile?.email ?? null,
          },
        });
      }

      return asset;
    });

    return NextResponse.json({ ok: true, asset: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update serial number" },
      { status: 500 }
    );
  }
}