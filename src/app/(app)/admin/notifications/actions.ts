"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";
import { processOutbox }      from "@/lib/alert-email";

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

const KINDS = ["ISSUED", "DELIVERED", "RETURNED", "STOCK"];

// Email alerts for one user: on/off, which kinds, and an optional address to send them to.
export async function setEmailAlerts(userId: string, input: { enabled: boolean; kinds: string[]; alertEmail: string }): Promise<{ ok: boolean; message: string }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false, message: "Only a master admin can change email alerts." };

  const target = await prisma.userProfile.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) return { ok: false, message: "User not found." };

  const enabled    = !!input?.enabled;
  const kinds      = [...new Set((Array.isArray(input?.kinds) ? input.kinds : []).filter((k) => KINDS.includes(k)))];
  const alertEmail = String(input?.alertEmail ?? "").trim().toLowerCase();
  if (alertEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alertEmail) || alertEmail.length > 254)) {
    return { ok: false, message: "The alert email isn't a valid address." };
  }
  if (enabled && !kinds.length) return { ok: false, message: "Pick at least one kind of alert, or turn email off." };

  await prisma.userProfile.update({
    where: { id: userId },
    data:  { emailAlerts: enabled, emailAlertKinds: kinds, alertEmail: alertEmail || null },
  });

  const kindText = kinds.length === KINDS.length ? "all alerts" : kinds.map((k) => k.toLowerCase()).join(", ");
  await logActivity({
    type:       "SYSTEM_EVENT",
    title:      `Email alerts ${enabled ? "on" : "off"} for ${target.email}`,
    details:    `${enabled ? `Kinds: ${kindText}. Sent to: ${alertEmail || target.email}.` : "No alert emails."} Changed by ${me.email}.`,
    actorEmail: me.email,
    entityType: "SECURITY",
    entityId:   target.id,
  });

  revalidatePath("/admin/notifications");
  return { ok: true, message: enabled ? `${target.email} will get ${kindText} by email at ${alertEmail || target.email}.` : `Email alerts off for ${target.email}.` };
}

// Put failed alert emails back in the queue and send now.
export async function retryFailedEmails(): Promise<{ ok: boolean; message: string }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false, message: "Only a master admin can do this." };
  const r = await prisma.emailOutbox.updateMany({
    where: { status: "FAILED" },
    data:  { status: "PENDING", attempts: 0, nextAttemptAt: new Date() },
  });
  const res = await processOutbox(50);
  revalidatePath("/admin/notifications");
  return { ok: true, message: `${r.count} failed email(s) retried: ${res.sent} sent, ${res.failed} still failing.` };
}
