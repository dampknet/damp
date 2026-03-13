"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import PrintExportButton from "@/components/PrintExportButton";
import SiteStatusSelect from "@/components/SiteStatusSelect";
import DeleteSiteDialog from "@/components/DeleteSiteDialog";
import SiteTowerTypeSelect from "@/components/SiteTowerTypeSelect";
import SiteHeightInlineEdit from "@/components/SiteHeightInlineEdit";
import SiteGpsInlineEdit from "@/components/SiteGpsInlineEdit";

type GroupType = "status" | "tt" | "tower" | undefined;

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

type Props = {
  role: string;
  email: string | null;
  canEdit: boolean;
  q: string;
  tt: "ALL" | "AIR" | "LIQUID";
  ss: "ALL" | "ACTIVE" | "DOWN";
  tw: "ALL" | "GBC" | "KNET";
  group: GroupType;
  printTitle: string;
  sectionHeading: string;
  sites: SiteRow[];
  activeSites: SiteRow[];
  downSites: SiteRow[];
  airSites: SiteRow[];
  liquidSites: SiteRow[];
  knetSites: SiteRow[];
  gbcSites: SiteRow[];
  exportRows: Array<Record<string, string | number>>;
  exportCols: Array<{ key: string; label: string }>;
  siteMini: Array<{ id: string; name: string }>;
};

type SectionFilterState = {
  regMFreq: string;
  power: string;
  tx: string;
  tower: string;
  height: string;
  status: string;
};

function ttBadge(tt: "AIR" | "LIQUID", dark: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

  return tt === "AIR"
    ? dark
      ? `${base} border-sky-500/30 bg-sky-500/10 text-sky-300`
      : `${base} border-sky-200 bg-sky-50 text-sky-800`
    : dark
    ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
    : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
}

function headerSelectClass(dark: boolean) {
  return dark
    ? "rounded-md border border-white/10 bg-[#101720] px-2 py-1 text-xs font-semibold text-slate-300 outline-none transition hover:bg-white/5 focus:border-sky-400"
    : "rounded-md border border-[#ddd5c9] bg-white px-2 py-1 text-xs font-semibold text-[#5b564d] outline-none transition hover:bg-[#f7f3ed] focus:border-[#1a1814]";
}

function plainCellClass(dark: boolean) {
  return dark ? "text-slate-300" : "text-[#5d584f]";
}

function uniqueStrings(values: Array<string | null>) {
  return [...new Set(values.filter((v): v is string => typeof v === "string" && v.trim() !== ""))];
}

function uniqueNumbers(values: Array<number | null>) {
  return [...new Set(values.filter((v): v is number => typeof v === "number"))].sort(
    (a, b) => b - a
  );
}

function GpsLink({ gps, dark }: { gps: string | null; dark: boolean }) {
  if (!gps) {
    return <span>-</span>;
  }

  return (
    <a
      href={`https://www.google.com/maps?q=${encodeURIComponent(gps)}`}
      target="_blank"
      rel="noreferrer"
      className={
        dark
          ? "font-medium text-sky-300 hover:underline"
          : "font-medium text-blue-600 hover:underline"
      }
      title="Open in Google Maps"
    >
      {gps}
    </a>
  );
}

export default function SitesClient({
  role,
  email,
  canEdit,
  q,
  tt,
  ss,
  tw,
  group,
  printTitle,
  sectionHeading,
  sites,
  activeSites,
  downSites,
  airSites,
  liquidSites,
  knetSites,
  gbcSites,
  exportRows,
  exportCols,
  siteMini,
}: Props) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-[#f5f2ed]"
      }
    >
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div
          className={
            dark
              ? "no-print rounded-3xl border border-white/10 bg-white/5 p-6 shadow-none backdrop-blur-xl"
              : "no-print rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm"
          }
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div
                className={
                  dark
                    ? "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#f97316]"
                    : "mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]"
                }
              >
                Site Directory
              </div>

              <h1
                className={
                  dark
                    ? "text-3xl font-semibold tracking-tight text-slate-100"
                    : "text-3xl font-semibold tracking-tight text-[#1a1814]"
                }
              >
                {sectionHeading}
              </h1>

              <p
                className={
                  dark
                    ? "mt-2 text-sm font-medium text-slate-500"
                    : "mt-2 text-sm font-medium text-[#8b857c]"
                }
              >
                Search, filter by transmitter type, open a site, and manage assets.
              </p>

              <div
                className={
                  dark
                    ? "mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400"
                    : "mt-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-[#fffdf9] px-3 py-1.5 text-xs font-medium text-[#5b564d]"
                }
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role: {role}
                {email ? (
                  <>
                    <span className={dark ? "text-slate-600" : "text-[#b5aea4]"}>•</span>
                    <span className={dark ? "text-slate-500" : "text-[#7a746a]"}>{email}</span>
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
                  className={
                    dark
                      ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2d2924]"
                  }
                >
                  Add Site
                </Link>
              ) : (
                <div
                  className={
                    dark
                      ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-500"
                      : "rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-medium text-[#8b857c]"
                  }
                >
                  View only
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <form className="grid gap-3 md:grid-cols-5">
              <div
                className={
                  dark
                    ? "md:col-span-2 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                    : "md:col-span-2 flex w-full items-center gap-2 rounded-xl border border-[#e0dbd2] bg-white px-3 py-2"
                }
              >
                <span className={dark ? "text-slate-600" : "text-[#b0a79b]"}>🔎</span>
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search by site, REG M FREQ, or power..."
                  className={
                    dark
                      ? "w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                      : "w-full bg-transparent text-sm outline-none"
                  }
                  aria-label="Search sites"
                />
              </div>

              <select
                name="tt"
                defaultValue={tt}
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
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
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
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
                className={
                  dark
                    ? "rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
                    : "rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm"
                }
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
                  className={
                    dark
                      ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                      : "rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
                  }
                >
                  Search
                </button>

                {q || tt !== "ALL" || ss !== "ALL" || tw !== "ALL" || group ? (
                  <Link
                    href="/sites"
                    className={
                      dark
                        ? "text-sm font-semibold text-slate-400 hover:underline"
                        : "text-sm font-semibold text-[#5b564d] hover:underline"
                    }
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
              dark={dark}
              title="Active Sites"
              sites={activeSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              dark={dark}
              title="Down Sites"
              sites={downSites}
              canEdit={canEdit}
              startIndex={activeSites.length + 1}
            />
          </div>
        ) : group === "tt" ? (
          <div className="mt-6 space-y-6">
            <SitesSection
              dark={dark}
              title="Air-cooled Sites"
              sites={airSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              dark={dark}
              title="Liquid-cooled Sites"
              sites={liquidSites}
              canEdit={canEdit}
              startIndex={airSites.length + 1}
            />
          </div>
        ) : group === "tower" ? (
          <div className="mt-6 space-y-6">
            <SitesSection
              dark={dark}
              title="KNET Tower Sites"
              sites={knetSites}
              canEdit={canEdit}
              startIndex={1}
            />
            <SitesSection
              dark={dark}
              title="GBC Tower Sites"
              sites={gbcSites}
              canEdit={canEdit}
              startIndex={knetSites.length + 1}
            />
          </div>
        ) : (
          <div className="mt-6">
            <SitesSection
              dark={dark}
              title="Sites"
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
  dark,
  title,
  sites,
  canEdit,
  startIndex,
}: {
  dark: boolean;
  title: string;
  sites: SiteRow[];
  canEdit: boolean;
  startIndex: number;
}) {
  const [filters, setFilters] = useState<SectionFilterState>({
    regMFreq: "",
    power: "",
    tx: "",
    tower: "",
    height: "",
    status: "",
  });

  const filteringActive = Object.values(filters).some(Boolean);

  const regMFreqOptions = useMemo(
    () => uniqueStrings(sites.map((s) => s.regMFreq)).sort((a, b) => a.localeCompare(b)),
    [sites]
  );

  const powerOptions = useMemo(() => uniqueNumbers(sites.map((s) => s.power)), [sites]);

  const heightOptions = useMemo(
    () => uniqueNumbers(sites.map((s) => s.towerHeight)),
    [sites]
  );

  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      if (filters.regMFreq && (s.regMFreq ?? "") !== filters.regMFreq) return false;
      if (filters.power && String(s.power ?? "") !== filters.power) return false;
      if (filters.tx && s.transmitterType !== filters.tx) return false;
      if (filters.tower && s.towerType !== filters.tower) return false;
      if (filters.height && String(s.towerHeight ?? "") !== filters.height) return false;
      if (filters.status && s.status !== filters.status) return false;
      return true;
    });
  }, [sites, filters]);

  const filteredExportRows = filteredSites.map((s, index) => ({
    No: startIndex + index,
    Site: s.name,
    "REG M FREQ": s.regMFreq ?? "",
    Power: s.power ?? "",
    Tx: s.transmitterType === "AIR" ? "A" : "L",
    Tower: s.towerType ?? "",
    "Height(m)": s.towerHeight ?? "",
    GPS: s.gps ?? "",
    Status: s.status,
  }));

  const filteredExportCols = [
    { key: "No", label: "No" },
    { key: "Site", label: "Site" },
    { key: "REG M FREQ", label: "REG M FREQ" },
    { key: "Power", label: "Power" },
    { key: "Tx", label: "Tx" },
    { key: "Tower", label: "Tower" },
    { key: "Height(m)", label: "Height(m)" },
    { key: "GPS", label: "GPS" },
    { key: "Status", label: "Status" },
  ];

  function clearColumnFilter<K extends keyof SectionFilterState>(key: K) {
    setFilters((prev) => ({ ...prev, [key]: "" }));
  }

  function clearAllFilters() {
    setFilters({
      regMFreq: "",
      power: "",
      tx: "",
      tower: "",
      height: "",
      status: "",
    });
  }

  const printTitle = filteringActive
    ? `${title} (${filteredSites.length}) — Filtered`
    : `${title} (${sites.length})`;

  return (
    <div
      className={
        dark
          ? "print-area overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-none backdrop-blur-xl"
          : "print-area overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm"
      }
    >
      <div className="print-only px-5 py-4">
        <div id="print-title" className="text-lg font-semibold text-gray-900">
          {printTitle}
        </div>
        <div id="print-count" className="mt-1 text-xs text-gray-500">
          {filteredSites.length} shown
        </div>
      </div>
      <div className="print-only h-px bg-gray-200" />

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className={dark ? "text-sm font-semibold text-slate-100" : "text-sm font-semibold text-[#1a1814]"}>
          {title} ({filteredSites.length})
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <PrintExportButton
            title={printTitle}
            rows={filteredExportRows}
            columns={filteredExportCols}
          />

          {filteringActive ? (
            <>
              {filters.regMFreq ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("regMFreq")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  REG M FREQ: {filters.regMFreq} ✕
                </button>
              ) : null}

              {filters.power ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("power")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  Power: {filters.power} ✕
                </button>
              ) : null}

              {filters.tx ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("tx")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  Tx: {filters.tx} ✕
                </button>
              ) : null}

              {filters.tower ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("tower")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  Tower: {filters.tower} ✕
                </button>
              ) : null}

              {filters.height ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("height")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  Height: {filters.height} ✕
                </button>
              ) : null}

              {filters.status ? (
                <button
                  type="button"
                  onClick={() => clearColumnFilter("status")}
                  className={
                    dark
                      ? "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10"
                      : "rounded-full border border-[#e0dbd2] bg-[#faf7f2] px-3 py-1 text-[11px] font-medium text-[#5b564d] hover:bg-[#f3ede4]"
                  }
                >
                  Status: {filters.status} ✕
                </button>
              ) : null}

              <button
                type="button"
                onClick={clearAllFilters}
                className={
                  dark
                    ? "rounded-lg border border-white/10 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-white/10"
                    : "rounded-lg border border-[#e0dbd2] px-3 py-1 text-xs font-medium text-[#5b564d] hover:bg-[#f5f2ed]"
                }
              >
                Clear Filters
              </button>
            </>
          ) : null}

          <div className={dark ? "text-xs font-medium text-slate-500" : "text-xs font-medium text-[#8b857c]"}>
            {filteredSites.length} shown
          </div>
        </div>
      </div>

      <div className={dark ? "h-px bg-white/8" : "h-px bg-[#eee7dd]"} />

      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full text-sm">
          <thead
            className={
              dark
                ? "sticky top-0 z-20 bg-[#101720] text-left text-slate-400"
                : "sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm"
            }
          >
            <tr>
              <th className="px-5 py-3 font-semibold">No</th>
              <th className="px-5 py-3 font-semibold">Site</th>

              <th className="px-5 py-3 font-semibold">
                <select
                  value={filters.regMFreq}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, regMFreq: e.target.value }))
                  }
                  className={headerSelectClass(dark)}
                  aria-label="Filter by REG M FREQ"
                  title="Filter by REG M FREQ"
                >
                  <option value="">REG M FREQ ▼</option>
                  {regMFreqOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>

              <th className="px-5 py-3 font-semibold">
                <select
                  value={filters.power}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, power: e.target.value }))
                  }
                  className={headerSelectClass(dark)}
                  aria-label="Filter by power"
                  title="Filter by power"
                >
                  <option value="">Power ▼</option>
                  {powerOptions.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>

              <th className="px-5 py-3 font-semibold">
                <select
                  value={filters.tx}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, tx: e.target.value }))
                  }
                  className={headerSelectClass(dark)}
                  aria-label="Filter by transmitter type"
                  title="Filter by transmitter type"
                >
                  <option value="">Tx ▼</option>
                  <option value="AIR">AIR</option>
                  <option value="LIQUID">LIQUID</option>
                </select>
              </th>

              <th className="px-5 py-3 font-semibold">
                <select
                  value={filters.tower}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, tower: e.target.value }))
                  }
                  className={headerSelectClass(dark)}
                  aria-label="Filter by tower"
                  title="Filter by tower"
                >
                  <option value="">Tower ▼</option>
                  <option value="GBC">GBC</option>
                  <option value="KNET">KNET</option>
                </select>
              </th>

              <th className="px-5 py-3 font-semibold">
                <select
                  value={filters.height}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, height: e.target.value }))
                  }
                  className={headerSelectClass(dark)}
                  aria-label="Filter by tower height"
                  title="Filter by tower height"
                >
                  <option value="">Height(m) ▼</option>
                  {heightOptions.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </th>

              <th className="px-5 py-3 font-semibold">GPS</th>

              <th className="px-5 py-3 font-semibold text-right">
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, status: e.target.value }))
                  }
                  className={`${headerSelectClass(dark)} text-right`}
                  aria-label="Filter by status"
                  title="Filter by status"
                >
                  <option value="">Status ▼</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DOWN">DOWN</option>
                </select>
              </th>

              <th className="px-5 py-3 font-semibold text-right no-print">Open</th>
            </tr>
          </thead>

          <tbody className={dark ? "divide-y divide-white/8" : "divide-y divide-[#eee7dd]"}>
            {filteredSites.length === 0 ? (
              <tr>
                <td
                  className={
                    dark
                      ? "px-5 py-12 text-center text-slate-500"
                      : "px-5 py-12 text-center text-[#8b857c]"
                  }
                  colSpan={10}
                >
                  No sites found
                </td>
              </tr>
            ) : (
              filteredSites.map((s, index) => (
                <tr key={s.id} className={dark ? "hover:bg-white/5" : "hover:bg-[#fcfaf7]"}>
                  <td className={dark ? "px-5 py-3 font-medium text-slate-500" : "px-5 py-3 font-medium text-[#6b655d]"}>
                    {startIndex + index}
                  </td>

                  <td className={dark ? "px-5 py-3 font-semibold text-slate-100" : "px-5 py-3 font-semibold text-[#1a1814]"}>
                    {s.name}
                  </td>

                  <td className={`${plainCellClass(dark)} px-5 py-3`}>
                    {s.regMFreq ?? "-"}
                  </td>

                  <td className={`${plainCellClass(dark)} px-5 py-3`}>
                    {typeof s.power === "number" ? s.power : "-"}
                  </td>

                  <td className="px-5 py-3">
                    <span className={ttBadge(s.transmitterType ?? "AIR", dark)}>
                      {s.transmitterType === "AIR" ? "A" : "L"}
                    </span>
                  </td>

                  <td className="px-5 py-3">
                    {filteringActive ? (
                      <span className={plainCellClass(dark)}>{s.towerType ?? "-"}</span>
                    ) : (
                      <SiteTowerTypeSelect
                        siteId={s.id}
                        initialTowerType={s.towerType ?? "GBC"}
                        canEdit={canEdit}
                      />
                    )}
                  </td>

                  <td className={`${plainCellClass(dark)} px-5 py-3`}>
                    {filteringActive ? (
                      typeof s.towerHeight === "number" ? s.towerHeight : "-"
                    ) : (
                      <SiteHeightInlineEdit
                        siteId={s.id}
                        initialHeight={typeof s.towerHeight === "number" ? s.towerHeight : null}
                        canEdit={canEdit}
                      />
                    )}
                  </td>

                  <td className={`${plainCellClass(dark)} px-5 py-3`}>
                    {filteringActive ? (
                      <GpsLink gps={s.gps ?? null} dark={dark} />
                    ) : (
                      <SiteGpsInlineEdit
                        siteId={s.id}
                        initialGps={s.gps ?? null}
                        canEdit={canEdit}
                      />
                    )}
                  </td>

                  <td className="px-5 py-3 text-right">
                    {filteringActive ? (
                      <span className={plainCellClass(dark)}>{s.status}</span>
                    ) : (
                      <SiteStatusSelect
                        siteId={s.id}
                        initialStatus={s.status}
                        canEdit={canEdit}
                      />
                    )}
                  </td>

                  <td className="px-5 py-3 text-right no-print">
                    <Link
                      href={`/sites/${s.id}`}
                      className={
                        dark
                          ? "rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-white/10"
                          : "rounded-md border border-[#e0dbd2] px-3 py-1.5 text-xs font-semibold text-[#1a1814] hover:bg-[#f7f3ed]"
                      }
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}