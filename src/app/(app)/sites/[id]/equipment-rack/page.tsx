import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  // Your requested naming
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

  // System asset: the standalone rack record (subcategoryId null)
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
          {site.name} — Equipment Rack
        </h1>

        {/* Rack System header */}
        <div className="mt-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-base font-semibold text-gray-900">
            Equipment Rack
          </div>

          <div className="mt-2 text-sm text-gray-700">
            Serial:{" "}
            <span className="font-semibold">{showVal(systemSerial)}</span>
            <span className="mx-2 text-gray-300">•</span>
            Part No: <span className="font-semibold">{showVal(systemPart)}</span>
            <span className="mx-2 text-gray-300">•</span>
            Status: <span className="font-semibold">{systemStatus}</span>
          </div>
        </div>

        {/* Components */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {subcategories.map((sc) => {
            const list = bySub.get(sc.id) ?? [];

            return (
              <div
                key={sc.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    {rackLabel(sc.name)}
                  </div>
                  <div className="text-xs text-gray-500">{list.length}</div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="divide-y">
                  {list.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-600">None</div>
                  ) : (
                    list.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between px-5 py-3"
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
