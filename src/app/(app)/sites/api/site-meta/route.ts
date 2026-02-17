import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TowerType = "GBC" | "KNET";

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

    const data: {
      towerType?: TowerType | null;
      towerHeight?: number | null;
      gps?: string | null;
    } = {};

    if ("towerType" in body) {
      const v = body.towerType;
      if (v !== null && v !== "GBC" && v !== "KNET") {
        return NextResponse.json({ error: "Invalid towerType" }, { status: 400 });
      }
      data.towerType = v ?? null;
    }

    if ("towerHeight" in body) {
      const v = body.towerHeight;
      if (v !== null && typeof v !== "number") {
        return NextResponse.json({ error: "towerHeight must be a number or null" }, { status: 400 });
      }
      if (typeof v === "number" && !Number.isFinite(v)) {
        return NextResponse.json({ error: "towerHeight must be a valid number" }, { status: 400 });
      }
      data.towerHeight = v ?? null;
    }

    if ("gps" in body) {
      const v = body.gps;
      if (v !== null && typeof v !== "string") {
        return NextResponse.json({ error: "gps must be a string or null" }, { status: 400 });
      }
      const trimmed = typeof v === "string" ? v.trim() : null;
      data.gps = trimmed ? trimmed : null;
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data,
      select: { id: true, towerType: true, towerHeight: true, gps: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update site meta" }, { status: 500 });
  }
}
