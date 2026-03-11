import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const [
    sites,
    sitesActive,
    sitesDown,
    airSites,
    liquidSites,
    knetSites,
    gbcSites,
    assets,
    storeTotal,
    received,
    notReceived,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "ACTIVE" } }),
    prisma.site.count({ where: { status: "DOWN" } }),

    // ✅ Air / Liquid
    prisma.site.count({ where: { transmitterType: "AIR" } }),
    prisma.site.count({ where: { transmitterType: "LIQUID" } }),

    // ✅ Tower Type
    prisma.site.count({ where: { towerType: "KNET" } }),
    prisma.site.count({ where: { towerType: "GBC" } }),

    prisma.asset.count(),
    prisma.storeItem.count(),
    prisma.storeItem.count({ where: { status: "RECEIVED" } }),
    prisma.storeItem.count({ where: { status: "NOT_RECEIVED" } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome{profile?.email ? `, ${profile.email}` : ""}. Role:{" "}
            <span className="font-semibold">{role}</span>
          </p>

          {/* GRID */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Total Sites" value={sites} />
            <Card title="Active / Down" value={`${sitesActive} / ${sitesDown}`} />
            <Card title="Air / Liquid" value={`${airSites} / ${liquidSites}`} />
            <Card title="KNET / GBC" value={`${knetSites} / ${gbcSites}`} />
            <Card title="Assets" value={assets} />
            <Card title="Store Items" value={storeTotal} />
            <Card title="Received / Not" value={`${received} / ${notReceived}`} />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/sites"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Go to Sites
            </Link>
            <Link
              href="/store"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Go to Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-xs font-medium text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
