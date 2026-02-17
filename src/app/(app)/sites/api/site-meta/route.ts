import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { TowerType } from "@prisma/client";

type Body = {
  siteId?: string;

  // send only what you want to change
  towerType?: TowerType | "";     // "" means "don't change" (or treat as not provided)
  towerHeight?: number | "";      // "" means clear
  gps?: string | "";              // "" means clear
};

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const data: {
      towerType?: TowerType;
      towerHeight?: number | null;
      gps?: string | null;
    } = {};

    // towerType (enum) — NEVER set null
    if (body.towerType === "GBC" || body.towerType === "KNET") {
      data.towerType = body.towerType;
    }

    // towerHeight — allow clear
    if (typeof body.towerHeight === "number") {
      data.towerHeight = Number.isFinite(body.towerHeight)
        ? Math.trunc(body.towerHeight)
        : null;
    } else if (body.towerHeight === "") {
      data.towerHeight = null;
    }

    // gps — allow clear
    if (typeof body.gps === "string") {
      const v = body.gps.trim();
      data.gps = v ? v : null;
    }

    // If nothing to update
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data,
      select: { id: true, towerType: true, towerHeight: true, gps: true },
    });

    return NextResponse.json({ ok: true, site: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update site meta" },
      { status: 500 }
    );
  }
}
