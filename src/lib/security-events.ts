import type { Prisma } from "@prisma/client";

export const SECURITY_EVENT_WHERE: Prisma.ActivityLogWhereInput = {
  OR: [
    { type:       { in: ["USER_LOGIN", "USER_LOGOUT"] } },
    { entityType: { in: ["SECURITY", "AUTH"] } },
    { title:      { contains: "Failed login",   mode: "insensitive" } },
    { title:      { contains: "Security Alert", mode: "insensitive" } },
  ],
};

export const SECURITY_ACTION_TYPES = ["USER_LOGIN", "USER_LOGOUT"];

// Events that need a master admin's attention (counted on the Security badge until reviewed).
// Normal sign-ins / sign-outs are shown in the Security list but don't raise the badge.
export const SECURITY_ALERT_WHERE: Prisma.ActivityLogWhereInput = {
  OR: [
    { entityType: "SECURITY" },
    { title: { contains: "Failed login",   mode: "insensitive" } },
    { title: { contains: "Security Alert", mode: "insensitive" } },
  ],
};

export function isSecurityAlert(e: { entityType: string | null; title: string }) {
  const t = e.title.toLowerCase();
  return e.entityType === "SECURITY" || t.includes("failed login") || t.includes("security alert");
}
