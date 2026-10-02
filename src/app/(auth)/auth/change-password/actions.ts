"use server";

import { redirect }         from "next/navigation";
import { getServerSession } from "next-auth";
import bcrypt               from "bcryptjs";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";
import { logActivity }      from "@/lib/activity";
import { validatePassword } from "@/lib/passwords";

export type ChangePasswordState = { error: string | null };

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getServerSession(authOptions);
  const email   = session?.user?.email?.toLowerCase();
  if (!email) redirect("/auth/login");

  const current = String(formData.get("currentPassword") ?? "");
  const next    = String(formData.get("newPassword")     ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const profile = await prisma.userProfile.findUnique({
    where:  { email },
    select: { id: true, passwordHash: true, isSuspended: true },
  });

  if (!profile || profile.isSuspended) redirect("/auth/login");
  if (!profile.passwordHash)           return { error: "This account signs in with Microsoft or Google and has no local password." };

  const validCurrent = await bcrypt.compare(current, profile.passwordHash);
  if (!validCurrent) return { error: "Your current password is incorrect." };

  const rule = validatePassword(next);
  if (rule)             return { error: rule };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (await bcrypt.compare(next, profile.passwordHash)) {
    return { error: "Choose a password different from your current one." };
  }

  await prisma.userProfile.update({
    where: { id: profile.id },
    data: {
      passwordHash:       await bcrypt.hash(next, 12),
      mustChangePassword: false,
      failedLoginCount:   0,
      lockedUntil:        null,
    },
  });

  await logActivity({
    type:       "SYSTEM_EVENT",
    title:      `Password changed: ${email}`,
    details:    `${email} changed their own password.`,
    actorEmail: email,
    entityType: "SECURITY",
    entityId:   profile.id,
  });

  redirect("/dashboard");
}
