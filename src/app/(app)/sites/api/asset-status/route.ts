import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

type AssetStatus = "ACTIVE" | "FAULTY" | "DECOMMISSIONED";

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
      status?: AssetStatus;
    };

    if (!body.assetId || !body.status) {
      return NextResponse.json(
        { error: "assetId and status are required" },
        { status: 400 }
      );
    }

    if (
      body.status !== "ACTIVE" &&
      body.status !== "FAULTY" &&
      body.status !== "DECOMMISSIONED"
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const current = await prisma.asset.findUnique({
      where: { id: body.assetId },
      select: {
        id: true,
        assetName: true,
        status: true,
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: body.assetId! },
        data: { status: body.status },
        select: {
          id: true,
          assetName: true,
          status: true,
        },
      });

      if (current.status !== body.status) {
        await tx.activityLog.create({
          data: {
            type: "ASSET_STATUS_CHANGED",
            title: `${current.assetName} status changed`,
            details: `${current.status} → ${body.status}`,
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
      { error: "Failed to update asset status" },
      { status: 500 }
    );
  }
}