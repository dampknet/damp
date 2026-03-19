import { prisma } from "@/lib/prisma";
import type { ActivityType } from "@prisma/client";

type LogActivityInput = {
  type: ActivityType;
  title: string;
  details?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorEmail?: string | null;
};

export async function logActivity({
  type,
  title,
  details,
  entityType,
  entityId,
  actorEmail,
}: LogActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        type,
        title,
        details: details ?? null,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        actorEmail: actorEmail ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}