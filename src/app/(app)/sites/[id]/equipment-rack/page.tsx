import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import EquipmentRackClient from "./EquipmentRackClient";

function showVal(v: unknown) {
  if (typeof v === "string" && v.trim()) return v;
  return "-";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getSpecString(specs: Prisma.JsonValue | null | undefined, key: string) {
  if (!specs || !isRecord(specs)) return null;
  const raw = specs[key];
  return typeof raw === "string" && raw.trim() ? raw : null;
}

function rackLabel(name: string) {
  if (name.toLowerCase() === "harmonic") return "Harmonic (PVR)";
  return name;
}

export default async function SiteRackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!site) return notFound();

  const rackCategory = await prisma.category.findUnique({
    where: { name: "Equipment Rack" },
    select: { id: true },
  });

  if (!rackCategory) return notFound();

  const subcategories = await prisma.subcategory.findMany({
    where: { categoryId: rackCategory.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const assets = await prisma.asset.findMany({
    where: { siteId: site.id, categoryId: rackCategory.id },
    select: {
      id: true,
      assetName: true,
      serialNumber: true,
      status: true,
      subcategoryId: true,
      specs: true,
    },
    orderBy: { assetName: "asc" },
  });

  const rackSystem = assets.find(
    (a) => a.subcategoryId === null && a.assetName === "Equipment Rack"
  );

  const systemSerial =
    rackSystem?.serialNumber ?? getSpecString(rackSystem?.specs, "serial");

  const systemPart =
    getSpecString(rackSystem?.specs, "partNumber") ??
    getSpecString(rackSystem?.specs, "partNo");

  const systemStatus = rackSystem?.status ?? "ACTIVE";

  const bySub = new Map<string, typeof assets>();
  for (const a of assets) {
    if (!a.subcategoryId) continue;
    bySub.set(a.subcategoryId, [...(bySub.get(a.subcategoryId) ?? []), a]);
  }

  const cards = subcategories.map((sc) => ({
    id: sc.id,
    name: rackLabel(sc.name),
    items: (bySub.get(sc.id) ?? []).map((a) => ({
      id: a.id,
      assetName: a.assetName,
      serialNumber: a.serialNumber ?? "-",
      status: a.status,
    })),
  }));

  return (
    <EquipmentRackClient
      siteId={site.id}
      siteName={site.name}
      system={{
        serial: showVal(systemSerial),
        part: showVal(systemPart),
        status: systemStatus,
      }}
      cards={cards}
    />
  );
}