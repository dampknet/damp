// src/app/(app)/sites/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import PrintExportButton from "@/components/PrintExportButton";
import SiteStatusSelect from "@/components/SiteStatusSelect";
import DeleteSiteDialog from "@/components/DeleteSiteDialog";

// ✅ NEW inline editors (separate columns, edit beside value)
import SiteTowerTypeSelect from "@/components/SiteTowerTypeSelect";
import SiteHeightInlineEdit from "@/components/SiteHeightInlineEdit";
import SiteGpsInlineEdit from "@/components/SiteGpsInlineEdit";

type SearchParams = {
  q?: string;
  tt?: "ALL" | "AIR" | "LIQUID";
};

function ttBadge(tt: "AIR" | "LIQUID") {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  return tt === "AIR"
    ? `${base} border-sky-200 bg-sky-50 text-sky-800`
    : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
}

export default async function SitesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";

  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const tt = (sp.tt ?? "ALL") as SearchParams["tt"];

  const qAsNumber = Number(q);
  const isNumberSearch = q.length > 0 && Number.isFinite(qAsNumber);

  const sites = await prisma.site.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { regMFreq: { contains: q, mode: "insensitive" } },
                ...(isNumberSearch ? [{ power: qAsNumber }] : []),
              ],
            }
          : {},
        tt && tt !== "ALL" ? { transmitterType: tt } : {},
      ],
    },
    select: {
      id: true,
      name: true,
      regMFreq: true,
      power: true,
      transmitterType: true,
      status: true,

      // ✅ tower meta
      towerType: true,
      towerHeight: true,
      gps: true,
    },
    orderBy: { name: "asc" },
  });

  const printTitleParts = ["Sites"];
  if (tt && tt !== "ALL") {
    printTitleParts.push(tt === "AIR" ? "Air-cooled" : "Liquid-cooled");
  }
  if (q) printTitleParts.push(`Search: ${q}`);
  const printTitle = printTitleParts.join(" — ");

  const exportRows = sites.map((s) => {
    const tx = (s.transmitterType ?? "AIR") as "AIR" | "LIQUID";
    const tw = (s.towerType ?? "GBC") as "GBC" | "KNET";
    return {
      Site: s.name,
      "REG M FREQ": s.regMFreq ?? "",
      Power: s.power ?? "",
      "Transmitter Type": tx === "AIR" ? "A (Air-cooled)" : "L (Liquid-cooled)",
      "Tower Type": tw,
      "Tower Height": s.towerHeight ?? "",
      GPS: s.gps ?? "",
      Status: s.status,
    };
  });

  const exportCols = [
    { key: "Site", label: "Site" },
    { key: "REG M FREQ", label: "REG M FREQ" },
    { key: "Power", label: "Power" },
    { key: "Transmitter Type", label: "Transmitter Type" },
    { key: "Tower Type", label: "Tower Type" },
    { key: "Tower Height", label: "Tower Height" },
    { key: "GPS", label: "GPS" },
    { key: "Status", label: "Status" },
  ];

  const siteMini = sites.map((s) => ({ id: s.id, name: s.name }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="no-print rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Sites</h1>
              <p className="mt-1 text-sm text-gray-600">
                Search, filter by transmitter type, open a site, and manage
                assets.
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {profile?.email ? (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{profile.email}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={printTitle}
                rows={exportRows}
                columns={exportCols}
              />

              <DeleteSiteDialog sites={siteMini} canEdit={canEdit} />

              {canEdit ? (
                <Link
                  href="/sites/new"
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
                >
                  Add Site
                </Link>
              ) : (
                <div className="rounded-xl border bg-white px-4 py-2 text-sm font-medium text-gray-500">
                  View only
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full items-center gap-2 rounded-xl border bg-white px-3 py-2">
                <span className="text-gray-400">🔎</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by site, REG M FREQ, or power (e.g. 5000)…"
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search sites"
                />
              </div>

              <select
                name="tt"
                defaultValue={tt}
                className="rounded-xl border bg-white px-3 py-2 text-sm"
                aria-label="Filter by transmitter type"
              >
                <option value="ALL">All types</option>
                <option value="AIR">Air-cooled (A)</option>
                <option value="LIQUID">Liquid-cooled (L)</option>
              </select>

              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Search
              </button>

              {q || (tt && tt !== "ALL") ? (
                <Link
                  href="/sites"
                  className="text-sm font-medium text-gray-700 hover:underline"
                >
                  Clear
                </Link>
              ) : null}
            </form>
          </div>
        </div>

        <div className="print-area mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="print-only px-5 py-4">
            <div
              id="print-title"
              className="text-lg font-semibold text-gray-900"
            >
              {printTitle}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Printed on {new Date().toLocaleString()}
            </div>
          </div>
          <div className="print-only h-px bg-gray-200" />

          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">Sites</div>
            <div className="text-xs text-gray-500">{sites.length} shown</div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Site</th>
                  <th className="px-5 py-3 font-medium">REG M FREQ</th>
                  <th className="px-5 py-3 font-medium">Power</th>
                  <th className="px-5 py-3 font-medium">Tx</th>

                  {/* ✅ separate columns */}
                  <th className="px-5 py-3 font-medium">Tower</th>
                  <th className="px-5 py-3 font-medium">Height(m)</th>
                  <th className="px-5 py-3 font-medium">GPS</th>

                  <th className="px-5 py-3 font-medium text-right">Status</th>
                  <th className="px-5 py-3 font-medium text-right no-print">
                    Open
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {sites.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-10 text-center text-gray-600"
                      colSpan={9}
                    >
                      No sites found
                    </td>
                  </tr>
                ) : (
                  sites.map((s) => {
                    const tx = (s.transmitterType ?? "AIR") as
                      | "AIR"
                      | "LIQUID";

                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {s.name}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {s.regMFreq ?? "-"}
                        </td>
                        <td className="px-5 py-3 text-gray-700">
                          {typeof s.power === "number" ? s.power : "-"}
                        </td>
                        <td className="px-5 py-3">
                          <span className={ttBadge(tx)}>
                            {tx === "AIR" ? "A" : "L"}
                          </span>
                        </td>

                        {/* ✅ Tower type edit beside value */}
                        <td className="px-5 py-3">
                          <SiteTowerTypeSelect
                            siteId={s.id}
                            initialTowerType={(s.towerType ?? "GBC") as
                              | "GBC"
                              | "KNET"}
                            canEdit={canEdit}
                          />
                        </td>

                        {/* ✅ Height edit beside value */}
                        <td className="px-5 py-3 text-gray-700">
                          <SiteHeightInlineEdit
                            siteId={s.id}
                            initialHeight={
                              typeof s.towerHeight === "number"
                                ? s.towerHeight
                                : null
                            }
                            canEdit={canEdit}
                          />
                        </td>

                        {/* ✅ GPS edit beside value + link to Google maps */}
                        <td className="px-5 py-3 text-gray-700">
                          <SiteGpsInlineEdit
                            siteId={s.id}
                            initialGps={s.gps ?? null}
                            canEdit={canEdit}
                          />
                        </td>

                        <td className="px-5 py-3 text-right">
                          <SiteStatusSelect
                            siteId={s.id}
                            initialStatus={s.status}
                            canEdit={canEdit}
                          />
                        </td>

                        <td className="px-5 py-3 text-right no-print">
                          <Link
                            href={`/sites/${s.id}`}
                            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
