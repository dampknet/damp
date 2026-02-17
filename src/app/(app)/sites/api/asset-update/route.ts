import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AssetStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      assetId?: string;
      serialNumber?: string | null;
      manufacturer?: string | null;
      model?: string | null;
      partNumber?: string | null;
      status?: AssetStatus;
    };

    if (!body.assetId) {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 });
    }

    const updated = await prisma.asset.update({
      where: { id: body.assetId },
      data: {
        ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber?.trim() || null } : {}),
        ...(body.manufacturer !== undefined ? { manufacturer: body.manufacturer?.trim() || null } : {}),
        ...(body.model !== undefined ? { model: body.model?.trim() || null } : {}),
        ...(body.partNumber !== undefined ? { partNumber: body.partNumber?.trim() || null } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
      select: { id: true, serialNumber: true, manufacturer: true, model: true, partNumber: true, status: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
