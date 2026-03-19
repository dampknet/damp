import { prisma } from "@/lib/prisma";
import ActivityClient from "./ActivityClient";

type SearchParams = {
  q?: string;
  type?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activityIndicator(type: string, reason: string) {
  const t = type.toLowerCase();
  const r = reason.toLowerCase();

  if (t.includes("login")) {
    return { color: "bg-sky-500", label: "LOGIN" as const };
  }

  if (r.includes("down")) {
    return { color: "bg-red-500", label: "DOWN" as const };
  }

  if (r.includes("active") || r.includes("up") || r.includes("restored")) {
    return { color: "bg-emerald-500", label: "UP" as const };
  }

  if (t.includes("equipment_returned") || t.includes("returned")) {
    return { color: "bg-emerald-500", label: "RETURNED" as const };
  }

  if (t.includes("item_issued") || t.includes("issued")) {
    return { color: "bg-amber-500", label: "ISSUED" as const };
  }

  if (t.includes("restock")) {
    return { color: "bg-green-500", label: "RESTOCK" as const };
  }

  if (t.includes("low_stock") || r.includes("low stock")) {
    return { color: "bg-orange-500", label: "LOW STOCK" as const };
  }

  if (t.includes("out_of_stock") || r.includes("out of stock")) {
    return { color: "bg-red-500", label: "OUT" as const };
  }

  if (t.includes("fault") || r.includes("fault")) {
    return { color: "bg-orange-500", label: "FAULT" as const };
  }

  if (t.includes("deleted")) {
    return { color: "bg-rose-500", label: "DELETED" as const };
  }

  if (t.includes("created") || r.includes("created")) {
    return { color: "bg-emerald-500", label: "CREATED" as const };
  }

  if (t.includes("updated") || t.includes("changed") || r.includes("update") || r.includes("edit")) {
    return { color: "bg-blue-500", label: "UPDATED" as const };
  }

  return { color: "bg-gray-400", label: "SYSTEM" as const };
}

function entityHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;

  if (entityType === "SITE") return `/sites/${entityId}`;
  if (entityType === "ASSET") return "/assets";
  if (entityType === "INVENTORY_SITE") return `/store/sites/${entityId}`;
  if (entityType === "INVENTORY_ITEM") return "/store";
  if (entityType === "STORE_ITEM") return "/store";
  if (entityType === "USER") return null;

  return null;
}

function entityLabel(entityType: string | null, entityId: string | null) {
  if (!entityType) return "-";
  if (!entityId) return entityType;
  return `${entityType} (${entityId})`;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const type = (sp.type ?? "").trim();

  const activitiesRaw = await prisma.activityLog.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { details: { contains: q, mode: "insensitive" } },
                { actorEmail: { contains: q, mode: "insensitive" } },
                { entityType: { contains: q, mode: "insensitive" } },
                { entityId: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        type ? { type: type as any } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const title =
    q || type
      ? `Recent Activity${q ? ` — Search: ${q}` : ""}${type ? ` — Type: ${type}` : ""}`
      : "Recent Activity";

  const activities = activitiesRaw.map((a, index) => ({
    id: a.id,
    no: index + 1,
    timeLabel: formatDate(a.createdAt),
    reason: a.title,
    details: a.details ?? "",
    actorEmail: a.actorEmail ?? "-",
    type: a.type,
    indicator: activityIndicator(a.type, a.title),
    href: entityHref(a.entityType, a.entityId),
    entityLabel: entityLabel(a.entityType, a.entityId),
    exportTime: a.createdAt.toISOString(),
    entityType: a.entityType ?? "",
    entityId: a.entityId ?? "",
  }));

  const exportRows = activities.map((a) => ({
    No: a.no,
    Time: a.exportTime,
    Type: a.type,
    Reason: a.reason,
    Details: a.details,
    By: a.actorEmail === "-" ? "" : a.actorEmail,
    EntityType: a.entityType,
    EntityId: a.entityId,
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Time", label: "Time" },
    { key: "Type", label: "Type" },
    { key: "Reason", label: "Reason" },
    { key: "Details", label: "Details" },
    { key: "By", label: "By" },
    { key: "EntityType", label: "Entity Type" },
    { key: "EntityId", label: "Entity ID" },
  ];

  const typeOptions = [
    "USER_LOGIN",

    "SITE_CREATED",
    "SITE_UPDATED",
    "SITE_STATUS_CHANGED",
    "SITE_TOWER_UPDATED",
    "SITE_HEIGHT_UPDATED",
    "SITE_GPS_UPDATED",
    "SITE_DELETED",

    "ASSET_CREATED",
    "ASSET_UPDATED",
    "ASSET_DELETED",
    "ASSET_STATUS_CHANGED",
    "ASSET_SERIAL_UPDATED",

    "INVENTORY_ITEM_CREATED",
    "INVENTORY_ITEM_UPDATED",
    "INVENTORY_ITEM_DELETED",

    "INVENTORY_RESTOCK_ADDED",
    "INVENTORY_ITEM_ISSUED",
    "INVENTORY_EQUIPMENT_RETURNED",

    "INVENTORY_LOW_STOCK",
    "INVENTORY_OUT_OF_STOCK",

    "INVENTORY_IMPORT",
    "SYSTEM_EVENT",

    "STORE_ITEM_STATUS_CHANGED",
    "STORE_ITEM_DELETED",
  ];

  return (
    <ActivityClient
      q={q}
      type={type}
      typeOptions={typeOptions}
      title={title}
      activities={activities}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}