import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import PrintExportButton from "@/components/PrintExportButton";
import SiteStatusSelect from "@/components/SiteStatusSelect";
import DeleteSiteDialog from "@/components/DeleteSiteDialog";
import SiteTowerTypeSelect from "@/components/SiteTowerTypeSelect";
import SiteHeightInlineEdit from "@/components/SiteHeightInlineEdit";
import SiteGpsInlineEdit from "@/components/SiteGpsInlineEdit";

type SearchParams = {
  q?: string;
  tt?: "ALL" | "AIR" | "LIQUID";
  ss?: "ALL" | "ACTIVE" | "DOWN";
  tw?: "ALL" | "GBC" | "KNET";
  group?: "status" | "tt" | "tower";
};

type SiteRow = {
  id: string;
  name: string;
  regMFreq: string | null;
  power: number | null;
  transmitterType: "AIR" | "LIQUID";
  status: "ACTIVE" | "DOWN";
  towerType: "GBC" | "KNET";
  towerHeight: number | null;
  gps: string | null;
};

function ttBadge(tt: "AIR" | "LIQUID") {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";
  return tt === "AIR"
    ? `${base} border-sky-200 bg-sky-50 text-sky-800`
    : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
}

function sectionTitle(group: SearchParams["group"]) {
  if (group === "status") return "Sites grouped by status";
  if (group === "tt") return "Sites grouped by transmitter type";
  if (group === "tower") return "Sites grouped by tower type";
  return "Sites";
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
  const ss = (sp.ss ?? "ALL") as SearchParams["ss"];
  const tw = (sp.tw ?? "ALL") as SearchParams["tw"];
  const group = sp.group as SearchParams["group"] | undefined;

  const qAsNumber = Number(q);
  const isNumberSearch = q.length > 0 && Number.isFinite(qAsNumber);

  const sites = (await prisma.site.findMany({
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
        tt !== "ALL" && group !== "tt" ? { transmitterType: tt } : {},
        ss !== "ALL" && group !== "status" ? { status: ss } : {},
        tw !== "ALL" && group !== "tower" ? { towerType: tw } : {},
      ],
    },
    select: {
      id: true,
      name: true,
      regMFreq: true,
      power: true,
      transmitterType: true,
      status: true,
      towerType: true,
      towerHeight: true,
      gps: true,
    },
    orderBy: { name: "asc" },
  })) as SiteRow[];

  const printTitleParts: string[] = [sectionTitle(group)];

if (q) printTitleParts.push(`Search: ${q}`);
if (tt !== "ALL" && group !== "tt") {
  printTitleParts.push(tt === "AIR" ? "Air-cooled" : "Liquid-cooled");
}
if (ss && ss !== "ALL" && group !== "status") {
  printTitleParts.push(ss);
}
if (tw && tw !== "ALL" && group !== "tower") {
  printTitleParts.push(tw);
}
  const printTitle = printTitleParts.join(" — ");

  const exportRows = sites.map((s, index) => {
    const tx = (s.transmitterType ?? "AIR") as "AIR" | "LIQUID";
    const tower = (s.towerType ?? "GBC") as "GBC" | "KNET";

    return {
      No: index + 1,
      Site: s.name,
      "REG M FREQ": s.regMFreq ?? "",
      Power: s.power ?? "",
      "Transmitter Type": tx === "AIR" ? "A (Air-cooled)" : "L (Liquid-cooled)",
      "Tower Type": tower,
      "Tower Height": s.towerHeight ?? "",
      GPS: s.gps ?? "",
      Status: s.status,
    };
  });

  const exportCols = [
    { key: "No", label: "No" },
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

  const activeSites = sites.filter((s) => s.status === "ACTIVE");
  const downSites = sites.filter((s) => s.status === "DOWN");
  const airSites = sites.filter((s) => s.transmitterType === "AIR");
  const liquidSites = sites.filter((s) => s.transmitterType === "LIQUID");
  const knetSites = sites.filter((s) => s.towerType === "KNET");
  const gbcSites = sites.filter((s) => s.towerType === "GBC");

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="no-print rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]">
                Site Directory
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1a1814]">
                {sectionTitle(group)}
              </h1>
              <p className="mt-2 text-sm font-medium text-[#8b857c]">
                Search, filter by transmitter type, open a site, and manage
                assets.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {profile?.email ? (
                  <>
                    <span className="text-[#b5aea4]">•</span>
                    <span className="text-[#7a746a]">{profile.email}</span>
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
                  className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2924]"
                >
                  Add Site
                </Link>
              ) : (
                <div className="rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-medium text-[#8b857c]">
                  View only
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <form className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2 flex w-full items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-3 py-2">
                <span className="text-[#b0a79b]">🔎</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by site, REG M FREQ, or power..."
                  className="w-full bg-transparent text-sm outline-none"
                  aria-label="Search sites"
                />
              </div>

              <select
                name="tt"
                defaultValue={tt}
                className="rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                aria-label="Filter by transmitter type"
                title="Filter by transmitter type"
              >
                <option value="ALL">All Tx types</option>
                <option value="AIR">Air-cooled (A)</option>
                <option value="LIQUID">Liquid-cooled (L)</option>
              </select>

              <select
                name="ss"
                defaultValue={ss}
                className="rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                aria-label="Filter by site status"
                title="Filter by site status"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DOWN">DOWN</option>
              </select>

              <select
                name="tw"
                defaultValue={tw}
                className="rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                aria-label="Filter by tower type"
                title="Filter by tower type"
              >
                <option value="ALL">All towers</option>
                <option value="GBC">GBC</option>
                <option value="KNET">KNET</option>
              </select>

              {group ? <input type="hidden" name="group" value={group} /> : null}

              <div className="flex items-center gap-2 md:col-span-5">
                <button
                  type="submit"
                  className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                >
                  Search
                </button>

                {q || tt !== "ALL" || ss !== "ALL" || tw !== "ALL" || group ? (
                  <Link
                    href="/sites"
                    className="text-sm font-semibold text-[#5b564d] hover:underline"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>
          </div>
        </div>

        {group === "status" ? (
          <div className="mt-6 space-y-6">
            <SitesSection
              title={`Active Sites (${activeSites.length})`}
              sites={activeSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              title={`Down Sites (${downSites.length})`}
              sites={downSites}
              canEdit={canEdit}
              startIndex={activeSites.length + 1}
            />
          </div>
        ) : group === "tt" ? (
          <div className="mt-6 space-y-6">
            <SitesSection
              title={`Air-cooled Sites (${airSites.length})`}
              sites={airSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              title={`Liquid-cooled Sites (${liquidSites.length})`}
              sites={liquidSites}
              canEdit={canEdit}
              startIndex={airSites.length + 1}
            />
          </div>
        ) : group === "tower" ? (
          <div className="mt-6 space-y-6">
            <SitesSection
              title={`KNET Tower Sites (${knetSites.length})`}
              sites={knetSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              title={`GBC Tower Sites (${gbcSites.length})`}
              sites={gbcSites}
              canEdit={canEdit}
              startIndex={knetSites.length + 1}
            />
          </div>
        ) : (
          <div className="mt-6">
            <SitesSection
              title={`Sites (${sites.length})`}
              sites={sites}
              canEdit={canEdit}
              startIndex={1}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SitesSection({
  title,
  sites,
  canEdit,
  startIndex,
}: {
  title: string;
  sites: SiteRow[];
  canEdit: boolean;
  startIndex: number;
}) {
  return (
    <div className="print-area overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-sm font-semibold text-[#1a1814]">{title}</div>
        <div className="text-xs font-medium text-[#8b857c]">
          {sites.length} shown
        </div>
      </div>

      <div className="h-px bg-[#eee7dd]" />

      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm">
            <tr>
              <th className="px-5 py-3 font-semibold">No</th>
              <th className="px-5 py-3 font-semibold">Site</th>
              <th className="px-5 py-3 font-semibold">REG M FREQ</th>
              <th className="px-5 py-3 font-semibold">Power</th>
              <th className="px-5 py-3 font-semibold">Tx</th>
              <th className="px-5 py-3 font-semibold">Tower</th>
              <th className="px-5 py-3 font-semibold">Height(m)</th>
              <th className="px-5 py-3 font-semibold">GPS</th>
              <th className="px-5 py-3 font-semibold text-right">Status</th>
              <th className="px-5 py-3 font-semibold text-right no-print">
                Open
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#eee7dd]">
            {sites.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-12 text-center text-[#8b857c]"
                  colSpan={10}
                >
                  No sites found
                </td>
              </tr>
            ) : (
              sites.map((s, index) => {
                const tx = (s.transmitterType ?? "AIR") as "AIR" | "LIQUID";

                return (
                  <tr key={s.id} className="hover:bg-[#fcfaf7]">
                    <td className="px-5 py-3 font-medium text-[#6b655d]">
                      {startIndex + index}
                    </td>

                    <td className="px-5 py-3 font-semibold text-[#1a1814]">
                      {s.name}
                    </td>

                    <td className="px-5 py-3 text-[#5d584f]">
                      {s.regMFreq ?? "-"}
                    </td>

                    <td className="px-5 py-3 text-[#5d584f]">
                      {typeof s.power === "number" ? s.power : "-"}
                    </td>

                    <td className="px-5 py-3">
                      <span className={ttBadge(tx)}>
                        {tx === "AIR" ? "A" : "L"}
                      </span>
                    </td>

                    <td className="px-5 py-3">
                      <SiteTowerTypeSelect
                        siteId={s.id}
                        initialTowerType={(s.towerType ?? "GBC") as "GBC" | "KNET"}
                        canEdit={canEdit}
                      />
                    </td>

                    <td className="px-5 py-3 text-[#5d584f]">
                      <SiteHeightInlineEdit
                        siteId={s.id}
                        initialHeight={
                          typeof s.towerHeight === "number" ? s.towerHeight : null
                        }
                        canEdit={canEdit}
                      />
                    </td>

                    <td className="px-5 py-3 text-[#5d584f]">
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
                        className="rounded-md border border-[#e0dbd2] px-3 py-1.5 text-xs font-semibold text-[#1a1814] hover:bg-[#f7f3ed]"
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
  );
}