import { prisma } from "@/lib/prisma";
import { SECURITY_EVENT_WHERE } from "@/lib/security-events";
import { Paragraph, Table } from "docx";
import { sectionTitle, heading, keyFigures, table, emptyNote, gap, type Cell } from "./docx";

type Block = Paragraph | Table;
type Ctx   = { start: Date; end: Date; isMasterAdmin: boolean };

const DAY  = 86_400_000;
const MAX_LIST = 1500;
const fmt  = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-GB") : "—");
const unit = (u: string | null | undefined) => u || "pcs";
const placeKey = (siteId: string | null, name: string | null) => siteId ?? `place:${(name ?? "").trim().toLowerCase()}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function topBy<T>(rows: T[], key: (r: T) => string, qty: (r: T) => number) {
  const m = new Map<string, { key: string; units: number; times: number }>();
  for (const r of rows) {
    const k = key(r);
    const cur = m.get(k) ?? { key: k, units: 0, times: 0 };
    cur.units += qty(r);
    cur.times += 1;
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.units - a.units || b.times - a.times || a.key.localeCompare(b.key));
}

function truncNote(total: number) {
  return total > MAX_LIST ? [emptyNote(`Showing the first ${MAX_LIST} of ${total} rows.`)] : [];
}

function deliveryLabel(status: string | null, deliveredAt: Date | null) {
  if (status === "PENDING")   return "Pending delivery";
  if (status === "DELIVERED") return `Delivered ${fmt(deliveredAt)}`;
  return "—";
}

/* ───────────────────────────── Activity & logins ───────────────────────────── */

export async function activitySection(ctx: Ctx): Promise<Block[]> {
  const [logs, people] = await Promise.all([
    prisma.activityLog.findMany({
      where:  { createdAt: { gte: ctx.start, lte: ctx.end }, ...(ctx.isMasterAdmin ? {} : { NOT: SECURITY_EVENT_WHERE }) },
      select: { type: true, title: true, entityType: true, actorEmail: true },
    }),
    prisma.userProfile.findMany({ select: { email: true, fullName: true } }),
  ]);
  const nameOf = new Map(people.map((p) => [p.email, p.fullName || p.email]));
  const who    = (email: string | null) => (email ? nameOf.get(email) ?? email : "Unknown");

  const security = logs.filter((l) => l.entityType === "SECURITY");
  const logins   = logs.filter((l) => l.type === "USER_LOGIN" && l.entityType !== "SECURITY" && !l.title.toLowerCase().includes("failed"));
  const work     = logs.filter((l) => l.type !== "USER_LOGIN" && l.type !== "USER_LOGOUT" && l.entityType !== "SECURITY");

  const byType   = topBy(work, (l) => l.type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), () => 1);
  const byPerson = topBy(work.filter((l) => l.actorEmail), (l) => who(l.actorEmail), () => 1);
  const byLogin  = topBy(logins, (l) => who(l.actorEmail), () => 1);

  const out: Block[] = [
    sectionTitle(ctx.isMasterAdmin ? "Activity & Sign-ins" : "Activity"),
    keyFigures([
      ["Recorded actions", work.length, "Changes made in the system (issues, edits, restocks, deliveries…)"],
      ...(ctx.isMasterAdmin ? [
        ["Sign-ins", logins.length, "Successful logins"] as [string, number, string],
        ["Security events", security.length, "Failed logins, lockouts, blocked attacks, setting changes"] as [string, number, string],
      ] : []),
      ["Most active person", byPerson[0] ? `${byPerson[0].key} (${byPerson[0].times})` : "—", "Most recorded actions in this period"],
    ]),
    gap(),
    ...heading("Actions by type"),
    byType.length
      ? table({ headers: ["Action", "Count"], weights: [6, 1.5], align: ["left", "center"], rows: byType.map((t) => [t.key, t.times]) })
      : emptyNote("No actions were recorded in this period."),
    gap(),
    ...heading("Actions by person"),
    byPerson.length
      ? table({ headers: ["Person", "Actions"], weights: [6, 1.5], align: ["left", "center"], rows: byPerson.slice(0, 30).map((p) => [p.key, p.times]) })
      : emptyNote("Nobody made changes in this period."),
  ];

  if (ctx.isMasterAdmin) {
    out.push(
      gap(),
      ...heading("Sign-ins per person"),
      byLogin.length
        ? table({ headers: ["Person", "Sign-ins"], weights: [6, 1.5], align: ["left", "center"], rows: byLogin.map((p) => [p.key, p.times]) })
        : emptyNote("No sign-ins in this period."),
    );
  }
  return out;
}

/* ──────────────────────────────── Warehouses ──────────────────────────────── */

export async function warehouseSection(ctx: Ctx, warehouseId: string | null): Promise<Block[]> {
  const scope = warehouseId ? { inventorySiteId: warehouseId } : {};

  const [warehouses, issues, returns, restocks, alertItems] = await Promise.all([
    prisma.inventorySite.findMany({
      where:   warehouseId ? { id: warehouseId } : { isDeleted: false },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
    prisma.warehouseIssue.findMany({
      where:   { takenAt: { gte: ctx.start, lte: ctx.end }, ...scope },
      orderBy: { takenAt: "asc" },
      select: {
        quantityTaken: true, takenAt: true, takenBy: true, destinationName: true, deliveryStatus: true, deliveredAt: true,
        inventoryItem: { select: { name: true, unit: true } },
        inventorySite: { select: { id: true, name: true } },
      },
    }),
    // Returns: every receipt recorded since partial returns existed, plus older full returns.
    (async () => {
      const [recorded, legacy] = await Promise.all([
        prisma.issueReturn.findMany({
          where:   { receivedAt: { gte: ctx.start, lte: ctx.end }, warehouseIssue: scope },
          orderBy: { receivedAt: "asc" },
          select: {
            quantity: true, receivedAt: true, returnedBy: true,
            warehouseIssue: { select: { inventoryItem: { select: { name: true, unit: true } }, inventorySite: { select: { id: true, name: true } } } },
          },
        }),
        prisma.warehouseIssue.findMany({
          where:   { status: "RETURNED", returnedAt: { gte: ctx.start, lte: ctx.end }, NOT: { returnedBy: "Non-returnable" }, returns: { none: {} }, ...scope },
          select: {
            quantityTaken: true, returnedAt: true, returnedBy: true,
            inventoryItem: { select: { name: true, unit: true } },
            inventorySite: { select: { id: true, name: true } },
          },
        }),
      ]);
      return [
        ...recorded.map((r) => ({ at: r.receivedAt, qty: r.quantity, returnedBy: r.returnedBy, inventoryItem: r.warehouseIssue.inventoryItem, inventorySite: r.warehouseIssue.inventorySite })),
        ...legacy.map((r) => ({ at: r.returnedAt, qty: r.quantityTaken, returnedBy: r.returnedBy, inventoryItem: r.inventoryItem, inventorySite: r.inventorySite })),
      ].sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
    })(),
    prisma.inventoryRestock.findMany({
      where:   { dateReceived: { gte: ctx.start, lte: ctx.end }, ...scope },
      orderBy: { dateReceived: "asc" },
      select: {
        quantityAdded: true, dateReceived: true, supplier: true, receivedBy: true,
        inventoryItem: { select: { name: true, unit: true } },
        inventorySite: { select: { id: true, name: true } },
      },
    }),
    prisma.inventoryItem.findMany({
      where: {
        isDeleted: false, uncountable: false, ...scope,
        OR: [{ status: { in: ["LOW_STOCK", "OUT_OF_STOCK"] } }, { quantity: { lte: 0 } }],
      },
      orderBy: [{ quantity: "asc" }, { name: "asc" }],
      select: { name: true, quantity: true, reorderLevel: true, unit: true, inventorySite: { select: { id: true, name: true } } },
    }),
  ]);

  const unitsIssued = issues.reduce((s, i) => s + i.quantityTaken, 0);
  const unitsIn     = restocks.reduce((s, r) => s + r.quantityAdded, 0);
  const outNow      = alertItems.filter((a) => a.quantity <= 0).length;

  const perWarehouse = warehouses.map((w) => {
    const wi = issues.filter((i) => i.inventorySite.id === w.id);
    const wr = restocks.filter((r) => r.inventorySite.id === w.id);
    return [
      w.name,
      wi.length,
      wi.reduce((s, i) => s + i.quantityTaken, 0),
      returns.filter((r) => r.inventorySite.id === w.id).reduce((s, r) => s + r.qty, 0),
      wr.length,
      wr.reduce((s, r) => s + r.quantityAdded, 0),
      alertItems.filter((a) => a.inventorySite.id === w.id).length,
    ] as Cell[];
  });

  const topItems = topBy(issues, (i) => `${i.inventoryItem.name}|${i.inventorySite.name}|${unit(i.inventoryItem.unit)}`, (i) => i.quantityTaken);
  const destNames = new Map<string, string>();
  for (const i of issues) if (i.destinationName) destNames.set(i.destinationName.trim().toLowerCase(), destNames.get(i.destinationName.trim().toLowerCase()) ?? i.destinationName);
  const byDest = topBy(issues, (i) => (i.destinationName ? destNames.get(i.destinationName.trim().toLowerCase())! : "No destination recorded"), (i) => i.quantityTaken);

  return [
    sectionTitle(warehouseId ? `Warehouse: ${warehouses[0]?.name ?? ""}` : "Warehouses"),
    keyFigures([
      ["Items issued", `${plural(issues.length, "line")} · ${unitsIssued} units`, "Everything taken out of the warehouse(s)"],
      ["Items returned", `${plural(returns.length, "return")} · ${returns.reduce((s, r) => s + r.qty, 0)} units`, "Items brought back to the store (full and partial returns)"],
      ["Restocks", `${plural(restocks.length, "delivery")} · ${unitsIn} units`, "Stock received into the warehouse(s)"],
      ["Low / out of stock now", `${alertItems.length} (${outNow} out)`, "As of the day this report was made"],
    ]),
    gap(),
    ...(warehouseId ? [] : [
      ...heading("Summary per warehouse"),
      table({
        headers: ["Warehouse", "Issues", "Units issued", "Returned", "Restocks", "Units in", "Low / out now"],
        weights: [3, 1.1, 1.4, 1.2, 1.2, 1.2, 1.5],
        align:   ["left", "center", "center", "center", "center", "center", "center"],
        rows:    perWarehouse,
      }),
      gap(),
    ]),
    ...heading("Most issued items", "Ranked by units taken out in this period."),
    topItems.length
      ? table({
          headers: ["#", "Item", "Warehouse", "Units", "Times issued"],
          weights: [0.5, 4, 2.2, 1.2, 1.4],
          align:   ["center", "left", "left", "center", "center"],
          rows:    topItems.slice(0, 15).map((t, i) => { const [name, wh, u] = t.key.split("|"); return [i + 1, name, wh, `${t.units} ${u}`, t.times]; }),
        })
      : emptyNote("Nothing was issued in this period."),
    gap(),
    ...heading("Where items were sent"),
    byDest.length
      ? table({
          headers: ["Destination", "Issue lines", "Units"],
          weights: [5, 1.5, 1.5],
          align:   ["left", "center", "center"],
          rows:    byDest.map((d) => [d.key === "No destination recorded" ? { text: d.key, italic: true, color: "666666" } : d.key, d.times, d.units]),
        })
      : emptyNote("Nothing was issued in this period."),
    gap(),
    ...heading("All items issued"),
    issues.length
      ? table({
          headers: ["#", "Date", "Item", "Qty", ...(warehouseId ? [] : ["From"]), "Taken by", "Destination", "Status"],
          weights: warehouseId ? [0.5, 1.2, 3, 1, 1.8, 2, 1.7] : [0.5, 1.2, 2.7, 1, 1.4, 1.6, 1.8, 1.6],
          align:   warehouseId ? ["center", "left", "left", "center", "left", "left", "left"] : ["center", "left", "left", "center", "left", "left", "left", "left"],
          rows:    issues.slice(0, MAX_LIST).map((i, n) => [
            n + 1, fmt(i.takenAt), i.inventoryItem.name, `${i.quantityTaken} ${unit(i.inventoryItem.unit)}`,
            ...(warehouseId ? [] : [i.inventorySite.name]),
            i.takenBy, i.destinationName ?? { text: "—", color: "999999" }, deliveryLabel(i.deliveryStatus, i.deliveredAt),
          ]),
        })
      : emptyNote("Nothing was issued in this period."),
    ...truncNote(issues.length),
    gap(),
    ...heading("Returns"),
    returns.length
      ? table({
          headers: ["#", "Date", "Item", "Qty", "Warehouse", "Returned by"],
          weights: [0.5, 1.2, 3.4, 1.1, 2, 2.2],
          align:   ["center", "left", "left", "center", "left", "left"],
          rows:    returns.slice(0, MAX_LIST).map((r, n) => [n + 1, fmt(r.at), r.inventoryItem.name, `${r.qty} ${unit(r.inventoryItem.unit)}`, r.inventorySite.name, r.returnedBy ?? "—"]),
        })
      : emptyNote("No returns in this period."),
    gap(),
    ...heading("Restocks"),
    restocks.length
      ? table({
          headers: ["#", "Date", "Item", "Qty", "Warehouse", "Supplier / received by"],
          weights: [0.5, 1.2, 3, 1.1, 1.8, 2.6],
          align:   ["center", "left", "left", "center", "left", "left"],
          rows:    restocks.slice(0, MAX_LIST).map((r, n) => [n + 1, fmt(r.dateReceived), r.inventoryItem.name, `${r.quantityAdded} ${unit(r.inventoryItem.unit)}`, r.inventorySite.name, `${r.supplier ?? "—"} / ${r.receivedBy ?? "—"}`]),
        })
      : emptyNote("No restocks in this period."),
    gap(),
    ...heading("Low and out-of-stock items", "Current stock on the day this report was made."),
    alertItems.length
      ? table({
          headers: ["Item", "Warehouse", "In stock", "Reorder level", "Status"],
          weights: [3.6, 2, 1.3, 1.4, 1.5],
          align:   ["left", "left", "center", "center", "left"],
          rows:    alertItems.map((a) => [
            a.name, a.inventorySite.name, `${a.quantity} ${unit(a.unit)}`, a.reorderLevel,
            a.quantity <= 0 ? { text: "Out of stock", bold: true, color: "B91C1C" } : { text: "Low", bold: true, color: "C2410C" },
          ]),
        })
      : emptyNote("No items are low or out of stock."),
  ];
}

/* ─────────────────────── Site stores (42 sites + other places) ─────────────────────── */

export async function siteStoresSection(ctx: Ctx, scope: string): Promise<Block[]> {
  // scope: "ALL" | "OTHER" | <siteId>
  const onlySite  = scope !== "ALL" && scope !== "OTHER" ? scope : null;
  const onlyOther = scope === "OTHER";
  const destWhere = onlySite ? { destinationSiteId: onlySite } : onlyOther ? { destinationSiteId: null } : {};

  const [sites, sent, pendingNow, noDestination] = await Promise.all([
    onlyOther ? Promise.resolve([] as { id: string; name: string }[]) : prisma.site.findMany({
      where:   onlySite ? { id: onlySite } : { isDeleted: false },
      orderBy: { name: "asc" },
      select:  { id: true, name: true },
    }),
    prisma.warehouseIssue.findMany({
      where:   { takenAt: { gte: ctx.start, lte: ctx.end }, deliveryStatus: { not: null }, ...destWhere },
      orderBy: { takenAt: "asc" },
      select: {
        quantityTaken: true, takenAt: true, takenBy: true, destinationSiteId: true, destinationName: true,
        deliveryStatus: true, deliveredAt: true, deliveredBy: true, quantityUsed: true, quantityReturned: true,
        inventoryItem: { select: { name: true, unit: true } },
        inventorySite: { select: { name: true } },
      },
    }),
    prisma.warehouseIssue.findMany({
      where:   { deliveryStatus: "PENDING", ...destWhere },
      orderBy: { takenAt: "asc" },
      select: {
        quantityTaken: true, quantityReturned: true, takenAt: true, destinationSiteId: true, destinationName: true,
        inventoryItem: { select: { name: true, unit: true } },
        inventorySite: { select: { name: true } },
      },
    }),
    scope === "ALL"
      ? prisma.warehouseIssue.count({ where: { takenAt: { gte: ctx.start, lte: ctx.end }, destinationName: null } })
      : Promise.resolve(0),
  ]);

  // Units that stayed at the destination: used (reported at delivery), or still on the way while pending.
  const usedUnits = (r: (typeof sent)[number]) =>
    r.deliveryStatus === "DELIVERED" ? (r.quantityUsed ?? r.quantityTaken - r.quantityReturned)
    : r.deliveryStatus === "PENDING" ? r.quantityTaken - r.quantityReturned
    : 0;

  type Agg = { name: string; items: number; units: number; used: number; returned: number; delivered: number; pending: number; rows: typeof sent };
  const blank = (name: string): Agg => ({ name, items: 0, units: 0, used: 0, returned: 0, delivered: 0, pending: 0, rows: [] });
  const agg = new Map<string, Agg>();
  for (const s of sites) agg.set(s.id, blank(s.name));
  for (const r of sent) {
    const k = placeKey(r.destinationSiteId, r.destinationName);
    const a = agg.get(k) ?? blank(r.destinationName ?? "—");
    a.items    += 1;
    a.units    += r.quantityTaken;
    a.returned += r.quantityReturned;
    if (r.deliveryStatus === "DELIVERED") { a.delivered += 1; a.used += usedUnits(r); }
    if (r.deliveryStatus === "PENDING") a.pending += 1;
    a.rows.push(r);
    agg.set(k, a);
  }

  const siteRows  = sites.map((s) => agg.get(s.id)!);
  const placeRows = [...agg.entries()].filter(([k]) => k.startsWith("place:")).map(([, v]) => v).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
  const mostUsed  = (a: Agg) => { const t = topBy(a.rows.filter((r) => usedUnits(r) > 0), (r) => r.inventoryItem.name, usedUnits)[0]; return t ? `${t.key} (${t.units})` : "—"; };

  const totalUnits     = sent.reduce((s, r) => s + r.quantityTaken, 0);
  const totalUsed      = sent.filter((r) => r.deliveryStatus === "DELIVERED").reduce((s, r) => s + usedUnits(r), 0);
  const totalReturned  = sent.reduce((s, r) => s + r.quantityReturned, 0);
  const deliveredCount = sent.filter((r) => r.deliveryStatus === "DELIVERED").length;
  const pendingCount   = sent.filter((r) => r.deliveryStatus === "PENDING").length;
  const sitesWithNone  = siteRows.filter((a) => a.items === 0).length;
  const title          = onlySite ? `Site Store: ${sites[0]?.name ?? ""}` : onlyOther ? "Other Places" : "Site Stores";

  const grey = (t: string | number) => ({ text: t, color: "999999" });
  const destTable = (rows: Agg[], firstHeader: string) => table({
    headers: [firstHeader, "Items", "Units sent", "Used", "Returned", "Pending", "Most used item"],
    weights: [2.4, 0.8, 1, 0.9, 1, 0.9, 2.8],
    align:   ["left", "center", "center", "center", "center", "center", "left"],
    rows:    rows.map((a) => a.items === 0
      ? [grey(a.name), grey("0"), grey("0"), grey("—"), grey("—"), grey("—"), { text: "Nothing sent", italic: true, color: "B45309" }]
      : [{ text: a.name, bold: true }, a.items, a.units, { text: a.used, bold: true }, a.returned || 0, a.pending ? { text: a.pending, bold: true, color: "B45309" } : 0, mostUsed(a)]),
  });

  const withData = [...siteRows, ...placeRows].filter((a) => a.items > 0);

  return [
    sectionTitle(title),
    keyFigures([
      ["Items sent", `${plural(sent.length, "line")} · ${totalUnits} units`, onlySite ? "Issued from the warehouses to this site" : "Issued from the warehouses to sites and other places"],
      ["Used at destinations", `${totalUsed} units`, `Reported used when delivery was confirmed (${plural(deliveredCount, "line")} delivered)`],
      ["Returned to store", `${totalReturned} units`, "Unused items brought back"],
      ["Still pending (from this period)", pendingCount, "Sent in this period but not yet confirmed"],
      ...(!onlySite && !onlyOther ? [["Sites that received nothing", `${sitesWithNone} of ${sites.length}`, "Listed as “Nothing sent” below"] as [string, string, string]] : []),
      ["Pending right now (all time)", pendingNow.length, "Everything still waiting, whenever it was sent"],
    ]),
    ...(noDestination ? [emptyNote(`Not included: ${plural(noDestination, "issue line")} from this period with no destination recorded (issued before destinations were added).`)] : []),
    gap(),
    ...(onlyOther ? [] : [
      ...heading(onlySite ? "This site" : "All sites", onlySite ? undefined : "Every site is listed, including sites that received nothing."),
      destTable(siteRows, "Site"),
      gap(),
    ]),
    ...(onlySite ? [] : [
      ...heading("Other places", "Destinations typed on the issue form (not one of the 42 sites)."),
      placeRows.length ? destTable(placeRows, "Place") : emptyNote("Nothing was sent to other places in this period."),
      gap(),
    ]),
    ...heading("Most used items per destination", "Top 5 items by units that stayed at the destination (used, or still on the way). Returned units are not counted."),
    ...(withData.length
      ? withData.flatMap((a) => {
          const top = topBy(a.rows.filter((r) => usedUnits(r) > 0), (r) => `${r.inventoryItem.name}|${unit(r.inventoryItem.unit)}`, usedUnits).slice(0, 5);
          return [
            heading(`${a.name} — ${a.units} units sent, ${a.used} used${a.returned ? `, ${a.returned} returned` : ""}`)[0],
            top.length
              ? table({
                  headers: ["#", "Item", "Units", "Times sent"],
                  weights: [0.5, 5, 1.3, 1.3],
                  align:   ["center", "left", "center", "center"],
                  rows:    top.map((t, i) => { const [n, u] = t.key.split("|"); return [i + 1, n, `${t.units} ${u}`, t.times]; }),
                })
              : emptyNote("Everything sent here came back."),
          ];
        })
      : [emptyNote("Nothing was sent in this period.")]),
    gap(),
    ...heading("Still pending (as of today)", "Everything not yet confirmed delivered, oldest first."),
    pendingNow.length
      ? table({
          headers: ["Destination", "Item", "Qty", "From", "Issued", "Days waiting"],
          weights: [2.2, 3, 1, 1.6, 1.3, 1.2],
          align:   ["left", "left", "center", "left", "left", "center"],
          rows:    pendingNow.slice(0, MAX_LIST).map((p) => {
            const days = Math.floor((Date.now() - p.takenAt.getTime()) / DAY);
            return [p.destinationName ?? "—", p.inventoryItem.name, `${p.quantityTaken - p.quantityReturned} ${unit(p.inventoryItem.unit)}`, p.inventorySite.name, fmt(p.takenAt),
              days >= 14 ? { text: days, bold: true, color: "B91C1C" } : days];
          }),
        })
      : emptyNote("Nothing is pending."),
    ...truncNote(pendingNow.length),
    gap(),
    ...heading("All items sent in this period"),
    sent.length
      ? table({
          headers: ["#", "Date", "Destination", "Item", "Qty", "From", "Status"],
          weights: [0.5, 1.2, 2, 2.8, 1, 1.5, 2],
          align:   ["center", "left", "left", "left", "center", "left", "left"],
          rows:    sent.slice(0, MAX_LIST).map((r, n) => [
            n + 1, fmt(r.takenAt), r.destinationName ?? "—", r.inventoryItem.name, `${r.quantityTaken} ${unit(r.inventoryItem.unit)}`, r.inventorySite.name,
            r.deliveryStatus === "DELIVERED"
              ? { text: `Delivered ${fmt(r.deliveredAt)} · used ${usedUnits(r)}${r.quantityReturned ? ` · returned ${r.quantityReturned}` : ""}`, color: "047857" }
              : r.deliveryStatus === "RETURNED"
              ? { text: `All returned (${r.quantityReturned})`, color: "0369A1" }
              : { text: `Pending${r.quantityReturned ? ` · returned ${r.quantityReturned}` : ""}`, bold: true, color: "B45309" },
          ]),
        })
      : emptyNote("Nothing was sent in this period."),
    ...truncNote(sent.length),
  ];
}
