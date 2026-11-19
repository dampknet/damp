"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";

export async function setNotificationAccess(userId: string, allowed: boolean): Promise<{ ok: boolean; message: string }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false, message: "Only a master admin can change notification access." };

  const target = await prisma.userProfile.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, isMasterAdmin: true },
  });
  if (!target) return { ok: false, message: "User not found." };
  if (target.isMasterAdmin) return { ok: false, message: "Master admins always see notifications." };

  await prisma.userProfile.update({ where: { id: userId }, data: { canSeeNotifications: allowed } });

  await logActivity({
    type:       "SYSTEM_EVENT",
    title:      `Notification access ${allowed ? "granted to" : "removed from"} ${target.email}`,
    details:    `Changed by ${me.email}.`,
    actorEmail: me.email,
    entityType: "SECURITY",
    entityId:   target.id,
  });

  revalidatePath("/admin/notifications");
  return { ok: true, message: `${target.email} ${allowed ? "can now see" : "can no longer see"} notifications.` };
}
