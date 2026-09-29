"use server";

import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity }       from "@/lib/activity";
import { revalidatePath }    from "next/cache";
import { sendSetPasswordEmail, sendCompanyAccessEmail } from "@/lib/mailer";
import crypto                from "crypto";

const COMPANY_DOMAIN = process.env.COMPANY_EMAIL_DOMAIN ?? "knetgh.com";
const VALID_ROLES    = ["ADMIN", "EDITOR", "VIEWER"];

function isCompanyEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${COMPANY_DOMAIN}`);
}

async function requireMaster() {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) throw new Error("Only a master admin can do this.");
  return me;
}

async function activeMasterCount() {
  return prisma.userProfile.count({ where: { isMasterAdmin: true, isSuspended: false } });
}

async function getTarget(userId: string) {
  const target = await prisma.userProfile.findUnique({
    where:  { id: userId },
    select: { id: true, email: true, role: true, isMasterAdmin: true, isSuspended: true },
  });
  if (!target) throw new Error("User not found.");
  return target;
}

async function securityLog(actor: string, title: string, details: string, targetId: string) {
  await logActivity({
    type:       "SYSTEM_EVENT",
    title,
    details,
    actorEmail: actor,
    entityType: "SECURITY",
    entityId:   targetId,
  });
}

export async function addUser(email: string, fullName: string, role: string) {
  const me = await requireMaster();

  const normalizedEmail = email.toLowerCase().trim();
  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role.");

  const existing = await prisma.userProfile.findUnique({
    where:  { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) throw new Error("A user with this email already exists.");

  const created = await prisma.userProfile.create({
    data: {
      email:    normalizedEmail,
      fullName: fullName.trim(),
      role:     role as any,
    },
  });

  try {
    if (isCompanyEmail(normalizedEmail)) {
      await sendCompanyAccessEmail(normalizedEmail, fullName);
    } else {
      const token       = crypto.randomBytes(32).toString("hex");
      const expires     = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const setPassLink = `${process.env.NEXTAUTH_URL}/auth/set-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;

      await prisma.passwordResetToken.create({
        data: { email: normalizedEmail, token, expires },
      });

      await sendSetPasswordEmail(normalizedEmail, setPassLink, fullName);
    }
  } catch (err) {
    console.error("[INVITE EMAIL]", err);
  }

  await securityLog(me.email, `User added: ${normalizedEmail}`, `Role: ${role}. Added by ${me.email}.`, created.id);
  revalidatePath("/admin/users");
}

export async function removeUser(userId: string) {
  const me     = await requireMaster();
  const target = await getTarget(userId);

  if (target.id === me.id) throw new Error("You cannot remove yourself.");
  if (target.isMasterAdmin && !target.isSuspended && (await activeMasterCount()) <= 1) {
    throw new Error("You cannot remove the last active master admin.");
  }

  await prisma.userProfile.delete({ where: { id: userId } });

  await securityLog(me.email, `User removed: ${target.email}`, `Removed by ${me.email}.`, userId);
  revalidatePath("/admin/users");
}

export async function updateUserRole(userId: string, role: string) {
  const me     = await requireMaster();
  const target = await getTarget(userId);

  if (!VALID_ROLES.includes(role)) throw new Error("Invalid role.");
  if (target.isMasterAdmin && role !== "ADMIN") {
    throw new Error("Remove master admin access before changing this user's role.");
  }
  if (target.role === role) return;

  await prisma.userProfile.update({
    where: { id: userId },
    data:  { role: role as any },
  });

  await securityLog(me.email, `Role changed: ${target.email}`, `${target.role} → ${role}. Changed by ${me.email}.`, userId);
  revalidatePath("/admin/users");
}

export async function setMasterAdmin(userId: string, makeMaster: boolean) {
  const me     = await requireMaster();
  const target = await getTarget(userId);

  if (makeMaster) {
    if (target.isSuspended) throw new Error("Reinstate this account before making it a master admin.");
    await prisma.userProfile.update({
      where: { id: userId },
      data:  { isMasterAdmin: true, role: "ADMIN" },
    });
    await securityLog(me.email, `Master admin granted: ${target.email}`, `Granted by ${me.email}. Role set to ADMIN.`, userId);
  } else {
    if (!target.isMasterAdmin) return;
    if ((await activeMasterCount()) <= 1) {
      throw new Error("There must always be at least one active master admin.");
    }
    await prisma.userProfile.update({
      where: { id: userId },
      data:  { isMasterAdmin: false },
    });
    await securityLog(me.email, `Master admin removed: ${target.email}`, `Removed by ${me.email}. Role remains ADMIN.`, userId);
  }

  revalidatePath("/admin/users");
}

export async function suspendUser(userId: string, reason: string) {
  const me     = await requireMaster();
  const target = await getTarget(userId);
  const why    = reason.trim();

  if (target.id === me.id) throw new Error("You cannot suspend yourself.");
  if (!why)                throw new Error("Please give a reason for the suspension.");
  if (target.isMasterAdmin && (await activeMasterCount()) <= 1) {
    throw new Error("You cannot suspend the last active master admin.");
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      isSuspended:   true,
      suspendedAt:   new Date(),
      suspendedBy:   me.email,
      suspendReason: why,
    },
  });

  await securityLog(me.email, `Account suspended: ${target.email}`, `Reason: ${why}. Suspended by ${me.email}.`, userId);
  revalidatePath("/admin/users");
}

export async function reinstateUser(userId: string) {
  const me     = await requireMaster();
  const target = await getTarget(userId);

  await prisma.userProfile.update({
    where: { id: userId },
    data: {
      isSuspended:      false,
      suspendedAt:      null,
      suspendedBy:      null,
      suspendReason:    null,
      failedLoginCount: 0,
      lockedUntil:      null,
    },
  });

  await securityLog(me.email, `Account reinstated: ${target.email}`, `Reinstated by ${me.email}.`, userId);
  revalidatePath("/admin/users");
}

export async function unlockUser(userId: string) {
  const me     = await requireMaster();
  const target = await getTarget(userId);

  await prisma.userProfile.update({
    where: { id: userId },
    data:  { failedLoginCount: 0, lockedUntil: null },
  });

  await securityLog(me.email, `Account unlocked: ${target.email}`, `Unlocked early by ${me.email}.`, userId);
  revalidatePath("/admin/users");
}
