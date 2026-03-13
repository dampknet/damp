import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SiteDetailsClient from "./SiteDetailsClient";

const DEVICE_ORDER = [
  "Genset",
  "Fuel Tank",
  "ISO Transformer",
  "AVR",
  "Solar",
  "Transmitter",
  "Equipment Rack",
] as const;

function prettyTxType(tt?: "AIR" | "LIQUID" | null) {
  if (tt === "AIR") return "A (Air-cooled)";
  if (tt === "LIQUID") return "L (Liquid-cooled)";
  return "-";
}

export default async function SiteDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const site = await prisma.site.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      regMFreq: true,
      power: true,
      transmitterType: true,
      status: true,
    },
  });

  if (!site) return notFound();

  const categories = await prisma.category.findMany({
    where: { name: { in: [...DEVICE_ORDER] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const catByName = new Map(categories.map((c) => [c.name, c] as const));
  const orderedCats = DEVICE_ORDER.map((n) => catByName.get(n)).filter(Boolean) as {
    id: string;
    name: string;
  }[];

  const assets = await prisma.asset.findMany({
    where: { siteId: site.id },
    select: { categoryId: true, assetName: true, specs: true },
  });

  const txCategoryId = catByName.get("Transmitter")?.id ?? null;

  const categoryCount = new Map<string, number>();

  for (const a of assets) {
    if (txCategoryId && a.categoryId === txCategoryId) {
      if (a.assetName === "Transmitter System") continue;

      const mux = (a.specs as { mux?: string } | null)?.mux;
      if (mux !== "TX_MUX_1_2" && mux !== "TX_MUX_3") continue;
    }

    categoryCount.set(a.categoryId, (categoryCount.get(a.categoryId) ?? 0) + 1);
  }

  const totalAssets = assets.length;

  const categoryCards = orderedCats.map((c) => {
    const count = categoryCount.get(c.id) ?? 0;
    const isTransmitter = c.name === "Transmitter";
    const isRack = c.name === "Equipment Rack";

    const href = isTransmitter
      ? `/sites/${site.id}/transmitter`
      : isRack
      ? `/sites/${site.id}/equipment-rack`
      : `/sites/${site.id}/category/${c.id}`;

    return {
      id: c.id,
      name: c.name,
      count,
      href,
      isTransmitter,
      isRack,
    };
  });

  return (
    <SiteDetailsClient
      site={{
        id: site.id,
        name: site.name,
        regMFreq: site.regMFreq,
        power: site.power,
        transmitterTypeLabel: prettyTxType(site.transmitterType),
        status: site.status,
        totalAssets,
      }}
      categoryCards={categoryCards}
    />
  );
}