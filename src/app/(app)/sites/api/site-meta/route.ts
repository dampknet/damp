import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { TowerType } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      siteId?: string;
      towerType?: TowerType | null;
      towerHeight?: number | null;
      gps?: string | null;
    };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const current = await prisma.site.findUnique({
      where: { id: body.siteId },
      select: {
        id: true,
        name: true,
        towerType: true,
        towerHeight: true,
        gps: true,
      },
    });

    if (!current) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const data: {
      towerType?: TowerType;
      towerHeight?: number | null;
      gps?: string | null;
    } = {};

    if (body.towerType === "GBC" || body.towerType === "KNET") {
      data.towerType = body.towerType;
    }

    if (body.towerHeight !== undefined) {
      data.towerHeight = body.towerHeight;
    }

    if (body.gps !== undefined) {
      data.gps = body.gps;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const site = await tx.site.update({
        where: { id: body.siteId! },
        data,
        select: {
          id: true,
          name: true,
          towerType: true,
          towerHeight: true,
          gps: true,
        },
      });

      if (data.towerType !== undefined && data.towerType !== current.towerType) {
        await tx.activityLog.create({
          data: {
            type: "SITE_TOWER_UPDATED",
            title: `${current.name} tower type updated`,
            details: `${current.towerType} → ${data.towerType}`,
            entityType: "SITE",
            entityId: current.id,
            actorEmail: profile?.email ?? null,
          },
        });
      }

      if (
        data.towerHeight !== undefined &&
        data.towerHeight !== current.towerHeight
      ) {
        await tx.activityLog.create({
          data: {
            type: "SITE_HEIGHT_UPDATED",
            title: `${current.name} tower height updated`,
            details: `${current.towerHeight ?? "-"} → ${data.towerHeight ?? "-"}`,
            entityType: "SITE",
            entityId: current.id,
            actorEmail: profile?.email ?? null,
          },
        });
      }

      if (data.gps !== undefined && data.gps !== current.gps) {
        await tx.activityLog.create({
          data: {
            type: "SITE_GPS_UPDATED",
            title: `${current.name} GPS updated`,
            details: `${current.gps ?? "-"} → ${data.gps ?? "-"}`,
            entityType: "SITE",
            entityId: current.id,
            actorEmail: profile?.email ?? null,
          },
        });
      }

      return site;
    });

    return NextResponse.json({ ok: true, site: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update site" }, { status: 500 });
  }
}