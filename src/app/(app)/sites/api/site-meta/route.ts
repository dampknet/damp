import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TowerType } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      siteId?: string;
      towerType?: TowerType | null;
      towerHeight?: number | null;
      gps?: string | null;
    };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    // Build update object safely
    const data: {
      towerType?: TowerType;
      towerHeight?: number | null;
      gps?: string | null;
    } = {};

    // towerType MUST NOT be null (enum field)
    if (body.towerType === "GBC" || body.towerType === "KNET") {
      data.towerType = body.towerType;
    }

    // These can be null (if your schema allows), and Prisma accepts null
    if (body.towerHeight !== undefined) {
      data.towerHeight = body.towerHeight;
    }

    if (body.gps !== undefined) {
      data.gps = body.gps;
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data,
      select: { id: true, towerType: true, towerHeight: true, gps: true },
    });

    return NextResponse.json({ ok: true, site: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}
