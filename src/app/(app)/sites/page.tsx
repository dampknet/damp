import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import SitesClient from "./SitesClient";

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

  const tt: "ALL" | "AIR" | "LIQUID" = sp.tt ?? "ALL";
  const ss: "ALL" | "ACTIVE" | "DOWN" = sp.ss ?? "ALL";
  const tw: "ALL" | "GBC" | "KNET" = sp.tw ?? "ALL";
  const group: "status" | "tt" | "tower" | undefined = sp.group;

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
  if (ss !== "ALL" && group !== "status") {
    printTitleParts.push(ss);
  }
  if (tw !== "ALL" && group !== "tower") {
    printTitleParts.push(tw);
  }
  const printTitle = printTitleParts.join(" — ");

  const exportRows = sites.map((s, index) => {
    const tx = s.transmitterType ?? "AIR";
    const tower = s.towerType ?? "GBC";

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
    <SitesClient
      role={role}
      email={profile?.email ?? null}
      canEdit={canEdit}
      q={q}
      tt={tt}
      ss={ss}
      tw={tw}
      group={group}
      printTitle={printTitle}
      sectionHeading={sectionTitle(group)}
      sites={sites}
      activeSites={activeSites}
      downSites={downSites}
      airSites={airSites}
      liquidSites={liquidSites}
      knetSites={knetSites}
      gbcSites={gbcSites}
      exportRows={exportRows}
      exportCols={exportCols}
      siteMini={siteMini}
    />
  );
}