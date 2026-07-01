import { prisma } from "@/lib/prisma";
import ActivityClient from "./ActivityClient";

type SearchParams = {
  q?:      string;
  type?:   string;
  period?: "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR";
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function activityIndicator(type: string, title: string) {
  const t          = type.toLowerCase();
  const titleLower = title.toLowerCase();

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (t.includes("logout"))  return { color: "bg-violet-500", label: "SYSTEM"   as const };
  if (t.includes("login"))   return { color: "bg-sky-500",    label: "LOGIN"    as const };

  // ── Site status ───────────────────────────────────────────────────────────
  if (titleLower.includes("active") || titleLower.includes("up"))
    return { color: "bg-emerald-500", label: "UP"   as const };
  if (titleLower.includes("down"))
    return { color: "bg-red-500",     label: "DOWN" as const };

  // ── Warehouse issue (new) ─────────────────────────────────────────────────
  if (t.includes("warehouse_issue_created"))
    return { color: "bg-amber-500",   label: "ISSUED"    as const };
  if (t.includes("warehouse_issue_returned"))
    return { color: "bg-emerald-500", label: "RETURNED"  as const };

  // ── Inventory movement ────────────────────────────────────────────────────
  if (t.includes("returned"))  return { color: "bg-emerald-500", label: "RETURNED"  as const };
  if (t.includes("issued"))    return { color: "bg-amber-500",   label: "ISSUED"    as const };
  if (t.includes("restock"))   return { color: "bg-green-500",   label: "RESTOCK"   as const };
  if (t.includes("import"))    return { color: "bg-blue-500",    label: "IMPORT"    as const };

  // ── Stock alerts ──────────────────────────────────────────────────────────
  if (t.includes("low_stock"))   return { color: "bg-orange-500", label: "LOW STOCK" as const };
  if (t.includes("out_of_stock")) return { color: "bg-red-500",   label: "OUT"       as const };

  // ── Store items ───────────────────────────────────────────────────────────
  if (t.includes("store_item_status"))  return { color: "bg-blue-500",  label: "UPDATED"  as const };
  if (t.includes("store_item_deleted")) return { color: "bg-rose-500",  label: "DELETED"  as const };

  // ── Unit / serial tracking ────────────────────────────────────────────────
  if (t.includes("serial_updated") || titleLower.includes("unit updated"))
    return { color: "bg-indigo-500", label: "UNIT" as const };

  // ── Fault ─────────────────────────────────────────────────────────────────
  if (t.includes("fault") || titleLower.includes("faulty"))
    return { color: "bg-orange-500", label: "FAULT" as const };

  // ── Generic CRUD ──────────────────────────────────────────────────────────
  if (t.includes("deleted"))                   return { color: "bg-rose-500",    label: "DELETED"  as const };
  if (t.includes("created"))                   return { color: "bg-emerald-500", label: "CREATED"  as const };
  if (t.includes("updated") || t.includes("changed"))
                                               return { color: "bg-blue-500",    label: "UPDATED"  as const };

  return { color: "bg-gray-400", label: "SYSTEM" as const };
}

function entityHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return null;
  if (entityType === "SITE")           return `/sites/${entityId}`;
  if (entityType === "ASSET")          return "/assets";
  if (entityType === "INVENTORY_SITE") return `/store/sites/${entityId}`;
  if (entityType === "INVENTORY_ITEM") return "/store";
  if (entityType === "STORE_ITEM")     return "/store";
  if (entityType === "ASSET_INSTANCE") return "/store";
  return null;
}

function entityLabel(entityType: string | null, entityId: string | null) {
  if (!entityType) return "-";
  if (!entityId)   return entityType;
  return `${entityType} (${entityId.slice(-8)})`;
}

function getPeriodStart(period: "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR") {
  const now = new Date();
  if (period === "TODAY") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "WEEK") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day   = today.getDay();
    const diff  = day === 0 ? 6 : day - 1;
    return new Date(today.getTime() - diff * 24 * 60 * 60 * 1000);
  }
  if (period === "MONTH") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "YEAR")  return new Date(now.getFullYear(), 0, 1);
  return null;
}

// ── ALL activity types that exist in your ActivityType enum ─────────────────
const actionOptions = [
  // Auth
  { value: "USER_LOGIN",  label: "User Login"  },
  { value: "USER_LOGOUT", label: "User Logout" },

  // Sites
  { value: "SITE_CREATED",        label: "Site Created"         },
  { value: "SITE_UPDATED",        label: "Site Updated"         },
  { value: "SITE_STATUS_CHANGED", label: "Site Status Changed"  },
  { value: "SITE_TOWER_UPDATED",  label: "Site Tower Updated"   },
  { value: "SITE_HEIGHT_UPDATED", label: "Site Height Updated"  },
  { value: "SITE_GPS_UPDATED",    label: "Site GPS Updated"     },
  { value: "SITE_DELETED",        label: "Site Deleted"         },

  // Assets
  { value: "ASSET_CREATED",        label: "Asset Created"        },
  { value: "ASSET_UPDATED",        label: "Asset Updated"        },
  { value: "ASSET_DELETED",        label: "Asset Deleted"        },
  { value: "ASSET_STATUS_CHANGED", label: "Asset Status Changed" },
  { value: "ASSET_SERIAL_UPDATED", label: "Unit / Serial Updated"},

  // Inventory items
  { value: "INVENTORY_ITEM_CREATED", label: "Inventory Item Created" },
  { value: "INVENTORY_ITEM_UPDATED", label: "Inventory Item Updated" },
  { value: "INVENTORY_ITEM_DELETED", label: "Inventory Item Deleted" },

  // Inventory movement
  { value: "INVENTORY_RESTOCK_ADDED",        label: "Restock Added"        },
  { value: "INVENTORY_ITEM_ISSUED",          label: "Item Issued"          },
  { value: "INVENTORY_EQUIPMENT_RETURNED",   label: "Equipment Returned"   },
  { value: "INVENTORY_IMPORT",               label: "Inventory Import"     },

  // Stock alerts
  { value: "INVENTORY_LOW_STOCK",   label: "Low Stock Alert"    },
  { value: "INVENTORY_OUT_OF_STOCK", label: "Out of Stock Alert" },

  // Store (Central Stock)
  { value: "STORE_ITEM_STATUS_CHANGED", label: "Store Item Status Changed" },
  { value: "STORE_ITEM_DELETED",        label: "Store Item Deleted"        },

  // ✅ NEW: Warehouse issue (borrow/return tracking)
  { value: "WAREHOUSE_ISSUE_CREATED",  label: "Warehouse Issue Created"   },
  { value: "WAREHOUSE_ISSUE_RETURNED", label: "Warehouse Item Returned"   },

  // System
  { value: "SYSTEM_EVENT", label: "System Event" },
];

function getActionLabel(type: string) {
  return actionOptions.find((item) => item.value === type)?.label ?? type;
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp     = (await searchParams) ?? {};
  const q      = (sp.q      ?? "").trim();
  const type   = (sp.type   ?? "").trim();
  const period = sp.period  ?? "ALL";

  const periodStart = getPeriodStart(period);

  const activitiesRaw = await prisma.activityLog.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { title:      { contains: q, mode: "insensitive" } },
            { details:    { contains: q, mode: "insensitive" } },
            { actorEmail: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { entityId:   { contains: q, mode: "insensitive" } },
          ],
        } : {},
        type        ? { type: type as any }            : {},
        periodStart ? { createdAt: { gte: periodStart } } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const title =
    q || type || period !== "ALL"
      ? `Activity Log${q      ? ` — "${q}"`                    : ""}${type   ? ` — ${getActionLabel(type)}`    : ""}${period !== "ALL" ? ` — ${period}` : ""}`
      : "Activity Log";

  const activities = activitiesRaw.map((a, index) => ({
    id:          a.id,
    no:          index + 1,
    timeLabel:   formatDate(a.createdAt),
    reason:      a.title,
    details:     a.details ?? "",
    actorEmail:  a.actorEmail ?? "-",
    type:        a.type,
    typeLabel:   getActionLabel(a.type),
    indicator:   activityIndicator(a.type, a.title),
    href:        entityHref(a.entityType, a.entityId),
    entityLabel: entityLabel(a.entityType, a.entityId),
    exportTime:  a.createdAt.toISOString(),
    entityType:  a.entityType ?? "",
    entityId:    a.entityId   ?? "",
  }));

  const exportRows = activities.map((a) => ({
    No:         a.no,
    Time:       a.exportTime,
    Action:     a.typeLabel,
    Reason:     a.reason,
    Details:    a.details,
    By:         a.actorEmail === "-" ? "" : a.actorEmail,
    EntityType: a.entityType,
    EntityId:   a.entityId,
  }));

  const exportCols = [
    { key: "No",         label: "No"          },
    { key: "Time",       label: "Time"        },
    { key: "Action",     label: "Action"      },
    { key: "Reason",     label: "Reason"      },
    { key: "Details",    label: "Details"     },
    { key: "By",         label: "By"          },
    { key: "EntityType", label: "Entity Type" },
    { key: "EntityId",   label: "Entity ID"   },
  ];

  return (
    <ActivityClient
      q={q}
      type={type}
      period={period}
      actionOptions={actionOptions}
      title={title}
      activities={activities}
      exportRows={exportRows}
      exportCols={exportCols}
    />
  );
}
