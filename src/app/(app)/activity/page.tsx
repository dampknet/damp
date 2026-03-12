import { prisma } from "@/lib/prisma";
import ActivityClient from "./ActivityClient";

type SearchParams = {
  q?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activityIndicator(reason: string) {
  const r = reason.toLowerCase();

  if (r.includes("down")) {
    return { color: "bg-red-500", label: "DOWN" as const };
  }

  if (r.includes("active") || r.includes("up")) {
    return { color: "bg-emerald-500", label: "UP" as const };
  }

  if (r.includes("fault")) {
    return { color: "bg-orange-500", label: "FAULT" as const };
  }

  if (r.includes("update") || r.includes("edit")) {
    return { color: "bg-blue-500", label: "UPDATED" as const };
  }

  return { color: "bg-gray-400", label: "SYSTEM" as const };
}

function entityHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;

  if (entityType === "SITE") return `/sites/${entityId}`;
  if (entityType === "ASSET") return "/assets";

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

  const activitiesRaw = await prisma.activityLog.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { details: { contains: q, mode: "insensitive" } },
            { actorEmail: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  const title = q ? `Recent Activity — Search: ${q}` : "Recent Activity";

  const activities = activitiesRaw.map((a, index) => ({
    id: a.id,
    no: index + 1,
    timeLabel: formatDate(a.createdAt),
    reason: a.title,
    actorEmail: a.actorEmail ?? "-",
    indicator: activityIndicator(a.title),
    href: entityHref(a.entityType, a.entityId),
    entityLabel: entityLabel(a.entityType, a.entityId),
    exportTime: a.createdAt.toISOString(),
    entityType: a.entityType ?? "",
    entityId: a.entityId ?? "",
  }));

  const exportRows = activities.map((a) => ({
    No: a.no,
    Time: a.exportTime,
    Reason: a.reason,
    By: a.actorEmail === "-" ? "" : a.actorEmail,
    EntityType: a.entityType,
    EntityId: a.entityId,
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Time", label: "Time" },
    { key: "Reason", label: "Reason" },
    { key: "By", label: "By" },
    { key: "EntityType", label: "Entity Type" },
    { key: "EntityId", label: "Entity ID" },
  ];

  return (
    <ActivityClient
      q={q}
      title={title}
      activities={activities}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}