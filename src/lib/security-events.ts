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
