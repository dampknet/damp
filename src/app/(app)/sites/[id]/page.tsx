import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  // We need assetName so we can exclude "Transmitter System" from the transmitter count
  const assets = await prisma.asset.findMany({
    where: { siteId: site.id },
    select: { categoryId: true, assetName: true, specs: true },
  });

  const txCategoryId = catByName.get("Transmitter")?.id ?? null;

  const categoryCount = new Map<string, number>();

  for (const a of assets) {
    // ✅ Fix: transmitter "Items" should be ONLY mux components (exclude Transmitter System)
    if (txCategoryId && a.categoryId === txCategoryId) {
      if (a.assetName === "Transmitter System") continue;

      // extra safety: only count transmitter rows that actually belong to a mux
      const mux = (a.specs as any)?.mux;
      if (mux !== "TX_MUX_1_2" && mux !== "TX_MUX_3") continue;
    }

    categoryCount.set(a.categoryId, (categoryCount.get(a.categoryId) ?? 0) + 1);
  }

  const totalAssets = assets.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Link href="/sites" className="text-sm text-gray-600 hover:underline">
              ← Back to Sites
            </Link>

            <h1 className="mt-2 text-2xl font-semibold text-gray-900">{site.name}</h1>

            <p className="mt-1 text-sm text-gray-600">
              REG M FREQ: <span className="font-medium">{site.regMFreq ?? "-"}</span>{" "}
              • Power: <span className="font-medium">{site.power ?? "-"}</span>{" "}
              • Tx Type:{" "}
              <span className="font-medium">{prettyTxType(site.transmitterType)}</span>{" "}
              • Status: <span className="font-medium">{site.status}</span>{" "}
              • Total devices: <span className="font-medium">{totalAssets}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/sites/${site.id}/assets`}
              className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              View All Devices
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {orderedCats.map((c) => {
            const count = categoryCount.get(c.id) ?? 0;
            const isTransmitter = c.name === "Transmitter";
            const isRack = c.name === "Equipment Rack";

            const href = isTransmitter
              ? `/sites/${site.id}/transmitter`
              : isRack
              ? `/sites/${site.id}/equipment-rack`
              : `/sites/${site.id}/category/${c.id}`;

            return (
              <div key={c.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-gray-900">{c.name}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      Items: <span className="font-medium">{count}</span>
                    </div>

                    {isTransmitter ? (
                      <p className="mt-2 text-xs text-gray-500">
                        TX MUX 1/2 and TX MUX 3 components (amps, exciters, pumps, etc.).
                      </p>
                    ) : null}

                    {isRack ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Harmonic(PVR), Modem, Mikrotik Routerboard (and Enensys for some sites).
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={href}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}