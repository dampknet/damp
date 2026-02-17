import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TowerType } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      siteId?: string;
      towerType?: TowerType;
      towerHeight?: number | null;
      gps?: string | null;
    };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data: {
        ...(body.towerType ? { towerType: body.towerType } : {}),
        ...(body.towerHeight !== undefined ? { towerHeight: body.towerHeight } : {}),
        ...(body.gps !== undefined ? { gps: body.gps } : {}),
      },
      select: { id: true, towerType: true, towerHeight: true, gps: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}
