import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma, AssetStatus } from "@prisma/client";

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

/**
 * Sort "Amplifier 1, Amplifier 2, ... Amplifier 10" correctly (numeric),
 * while keeping non-numbered items stable.
 */
function numericSuffix(name: string): number | null {
  // matches ending number e.g. "Amplifier 12" -> 12
  const m = name.trim().match(/(\d+)\s*$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function sortAssetsNaturally(list: TxAssetRow[]) {
  return [...list].sort((a, b) => {
    // primary: compare by "base name" (remove trailing number)
    const aNum = numericSuffix(a.assetName);
    const bNum = numericSuffix(b.assetName);

    const aBase = a.assetName.replace(/\s*\d+\s*$/, "").trim();
    const bBase = b.assetName.replace(/\s*\d+\s*$/, "").trim();

    if (aBase !== bBase) return aBase.localeCompare(bBase);

    // secondary: if both have numbers, compare numbers
    if (aNum !== null && bNum !== null) return aNum - bNum;

    // if only one has a number, keep the non-numbered first (optional, nicer)
    if (aNum === null && bNum !== null) return -1;
    if (aNum !== null && bNum === null) return 1;

    // fallback: plain string compare
    return a.assetName.localeCompare(b.assetName);
  });
}

export default async function SiteTransmitterPage({
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
    orderBy: { assetName: "asc" }, // fine, we do natural sorting per-group below
  })) as TxAssetRow[];

  const systemAsset =
    systemSubId ? txAssets.find((a) => a.subcategoryId === systemSubId) : null;

  function group(mux: Mux) {
    const grouped = new Map<string, TxAssetRow[]>();

    for (const a of txAssets) {
      const m = getMuxFromSpecs(a.specs);
      if (m !== mux) continue;

      const subName = a.subcategoryId ? subNameById.get(a.subcategoryId) : null;
      if (!subName) continue;
      if (subName === "Transmitter System") continue;

      grouped.set(subName, [...(grouped.get(subName) ?? []), a]);
    }

    // ✅ Natural sort inside every component group (fixes Amplifier 1..10 order)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href={`/sites/${site.id}`}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back to {site.name}
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">
          {site.name} — Transmitter
        </h1>

        {/* Transmitter System header */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-gray-900">
            Transmitter System
          </div>

          <div className="mt-2 text-sm text-gray-700">
            Serial:{" "}
            <span className="font-semibold">{showVal(systemSerial)}</span>
            <span className="mx-2 text-gray-300">•</span>
            Part No:{" "}
            <span className="font-semibold">{showVal(systemPart)}</span>
            <span className="mx-2 text-gray-300">•</span>
            Status: <span className="font-semibold">{systemStatus}</span>
          </div>
        </div>

        {/* MUX sections */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["TX_MUX_1_2", mux12],
            ["TX_MUX_3", mux3],
          ].map(([muxKey, blocks]) => {
            const mux = muxKey as Mux;
            const totalItems = blocks.reduce(
              (acc, [, arr]) => acc + arr.length,
              0
            );

            return (
              <div
                key={mux}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    {muxTitle(mux)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {totalItems} items
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="space-y-4 p-5">
                  {blocks.length === 0 ? (
                    <div className="text-sm text-gray-600">
                      No components yet.
                    </div>
                  ) : (
                    blocks.map(([compName, list]) => (
                      <div
                        key={compName}
                        className="overflow-hidden rounded-xl border"
                      >
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900">
                            {compName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {list.length}
                          </div>
                        </div>

                        <div className="h-px bg-gray-100" />

                        <div className="divide-y">
                          {list.map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between px-4 py-2"
                            >
                              <div className="text-sm text-gray-800">
                                {a.assetName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {a.serialNumber ?? "-"}
                                <span className="mx-2 text-gray-300">•</span>
                                {a.status}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}