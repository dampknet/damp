import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { TransmitterType, TowerType } from "@prisma/client";
import NewSiteClient from "./NewSiteClient";

export default async function NewSitePage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  if (!canEdit) redirect("/sites");

  async function createSite(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const regMFreqRaw = String(formData.get("regMFreq") ?? "").trim();
    const powerRaw = String(formData.get("power") ?? "").trim();
    const transmitterTypeRaw = String(formData.get("transmitterType") ?? "AIR").trim();

    const towerTypeRaw = String(formData.get("towerType") ?? "GBC").trim();
    const towerHeightRaw = String(formData.get("towerHeight") ?? "").trim();
    const gpsRaw = String(formData.get("gps") ?? "").trim();

    if (!name) {
      redirect(`/sites/new?error=${encodeURIComponent("Site name is required")}`);
    }

    const power = powerRaw ? Number(powerRaw) : null;
    if (powerRaw && !Number.isFinite(power)) {
      redirect(`/sites/new?error=${encodeURIComponent("Power must be a number")}`);
    }

    const transmitterType = (transmitterTypeRaw === "LIQUID" ? "LIQUID" : "AIR") as TransmitterType;
    const regMFreq = regMFreqRaw || null;

    const towerType = (towerTypeRaw === "KNET" ? "KNET" : "GBC") as TowerType;

    const towerHeightNum = towerHeightRaw ? Number(towerHeightRaw) : null;
    if (towerHeightRaw && !Number.isFinite(towerHeightNum)) {
      redirect(`/sites/new?error=${encodeURIComponent("Tower height must be a number")}`);
    }

    const gps = gpsRaw || null;

    try {
      const created = await prisma.site.create({
        data: {
          name,
          regMFreq,
          power: power === null ? null : Math.trunc(power),
          transmitterType,
          status: "ACTIVE",
          towerType,
          towerHeight: towerHeightNum === null ? null : Math.trunc(towerHeightNum),
          gps,
        },
        select: { id: true },
      });

      redirect(`/sites/${created.id}`);
    } catch {
      redirect(
        `/sites/new?error=${encodeURIComponent(
          "Could not create site (maybe name already exists)"
        )}`
      );
    }
  }

  return <NewSiteClient action={createSite} />;
}