import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma, AssetStatus } from "@prisma/client";
import { getCurrentProfile } from "@/lib/auth";
import TransmitterClient from "./TransmitterClient";

type Mux = "TX_MUX_1_2" | "TX_MUX_3";

type TxAssetRow = {
  id: string;
  assetName: string;
  subcategoryId: string | null;
  serialNumber: string | null;
  status: AssetStatus;
  specs: Prisma.JsonValue;
  partNumber: string | null;
};

type Block = readonly [string, TxAssetRow[]];
type Blocks = Block[];

function muxTitle(mux: Mux) {
  return mux === "TX_MUX_1_2" ? "TX MUX 1/2" : "TX MUX 3";
}

function showVal(v: unknown) {
  if (typeof v === "string" && v.trim()) return v;
  return "-";
}

function jsonObj(v: Prisma.JsonValue): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function getMuxFromSpecs(specs: Prisma.JsonValue): Mux | null {
  const o = jsonObj(specs);
  const mux = o?.mux;
  return mux === "TX_MUX_1_2" || mux === "TX_MUX_3" ? mux : null;
}

function getSpecString(specs: Prisma.JsonValue, key: string): string | null {
  const o = jsonObj(specs);
  const v = o?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

function numericSuffix(name: string): number | null {
  const m = name.trim().match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function sortAssetsNaturally(list: TxAssetRow[]) {
  return [...list].sort((a, b) => {
    const aNum = numericSuffix(a.assetName);
    const bNum = numericSuffix(b.assetName);

    const aBase = a.assetName.replace(/\s*\d+\s*$/, "").trim();
    const bBase = b.assetName.replace(/\s*\d+\s*$/, "").trim();

    if (aBase !== bBase) return aBase.localeCompare(bBase);

    if (aNum !== null && bNum !== null) return aNum - bNum;
    if (aNum === null && bNum !== null) return -1;
    if (aNum !== null && bNum === null) return 1;

    return a.assetName.localeCompare(b.assetName);
  });
}

export default async function SiteTransmitterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const site = await prisma.site.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
    },
  });

  if (!site) return notFound();

  const txCategory = await prisma.category.findUnique({
    where: { name: "Transmitter" },
    select: { id: true },
  });

  if (!txCategory) return notFound();

  const txSubs = await prisma.subcategory.findMany({
    where: { categoryId: txCategory.id },
    select: { id: true, name: true },
  });

  const subNameById = new Map(txSubs.map((s) => [s.id, s.name] as const));
  const subIdByName = new Map(txSubs.map((s) => [s.name, s.id] as const));
  const systemSubId = subIdByName.get("Transmitter System") ?? null;
  const muxSubId = subIdByName.get("TX MUX") ?? null;

  const txAssets = (await prisma.asset.findMany({
    where: { siteId: site.id, categoryId: txCategory.id },
    select: {
      id: true,
      assetName: true,
      subcategoryId: true,
      serialNumber: true,
      status: true,
      specs: true,
      partNumber: true,
    },
    orderBy: { assetName: "asc" },
  })) as TxAssetRow[];

  const systemAsset =
    systemSubId ? txAssets.find((a) => a.subcategoryId === systemSubId) : null;

  const mux1Asset =
    muxSubId
      ? txAssets.find(
          (a) => a.subcategoryId === muxSubId && a.assetName === "TX MUX 1"
        )
      : null;

  const mux2Asset =
    muxSubId
      ? txAssets.find(
          (a) => a.subcategoryId === muxSubId && a.assetName === "TX MUX 2"
        )
      : null;

  const mux3Asset =
    muxSubId
      ? txAssets.find(
          (a) => a.subcategoryId === muxSubId && a.assetName === "TX MUX 3"
        )
      : null;

  function group(mux: Mux): Blocks {
    const grouped = new Map<string, TxAssetRow[]>();

    for (const a of txAssets) {
      const m = getMuxFromSpecs(a.specs);
      if (m !== mux) continue;

      const subName = a.subcategoryId ? subNameById.get(a.subcategoryId) : null;
      if (!subName) continue;
      if (subName === "Transmitter System") continue;
      if (subName === "TX MUX") continue;

      grouped.set(subName, [...(grouped.get(subName) ?? []), a]);
    }

    for (const [comp, list] of grouped.entries()) {
      grouped.set(comp, sortAssetsNaturally(list));
    }

    const order = [
      "Exciter",
      "Exciter/System Control",
      "Amplifier",
      "Pump",
      "Channel Combiner",
      "Heat Exchanger",
      "Humidifier",
      "System Control",
    ];

    return order
      .filter((k) => grouped.has(k))
      .map((k) => [k, grouped.get(k)!] as const);
  }

  const mux12 = group("TX_MUX_1_2");
  const mux3 = group("TX_MUX_3");

  const systemSerial =
    systemAsset?.serialNumber ??
    getSpecString(systemAsset?.specs ?? null, "serial") ??
    null;

  const systemPart =
    systemAsset?.partNumber ??
    getSpecString(systemAsset?.specs ?? null, "partNumber") ??
    getSpecString(systemAsset?.specs ?? null, "partNo") ??
    null;

  const systemStatus = systemAsset?.status ?? "ACTIVE";

  const muxPairs = [
    {
      key: "TX_MUX_1_2" as const,
      title: muxTitle("TX_MUX_1_2"),
      blocks: mux12.map(([compName, list]) => ({
        compName,
        list: list.map((a) => ({
          id: a.id,
          assetName: a.assetName,
          serialNumber: a.serialNumber ?? "-",
          status: a.status,
        })),
      })),
      totalItems: mux12.reduce((acc, [, arr]) => acc + arr.length, 0),
      serialRows: [
        {
          label: "MUX 1 Serial",
          serial: showVal(mux1Asset?.serialNumber),
          status: mux1Asset?.status ?? "ACTIVE",
        },
        {
          label: "MUX 2 Serial",
          serial: showVal(mux2Asset?.serialNumber),
          status: mux2Asset?.status ?? "ACTIVE",
        },
      ],
    },
    {
      key: "TX_MUX_3" as const,
      title: muxTitle("TX_MUX_3"),
      blocks: mux3.map(([compName, list]) => ({
        compName,
        list: list.map((a) => ({
          id: a.id,
          assetName: a.assetName,
          serialNumber: a.serialNumber ?? "-",
          status: a.status,
        })),
      })),
      totalItems: mux3.reduce((acc, [, arr]) => acc + arr.length, 0),
      serialRows: [
        {
          label: "MUX 3 Serial",
          serial: showVal(mux3Asset?.serialNumber),
          status: mux3Asset?.status ?? "ACTIVE",
        },
      ],
    },
  ];

  return (
    <TransmitterClient
      siteId={site.id}
      siteName={site.name}
      role={role}
      system={{
        serial: showVal(systemSerial),
        part: showVal(systemPart),
        status: systemStatus,
      }}
      muxPairs={muxPairs}
    />
  );
}