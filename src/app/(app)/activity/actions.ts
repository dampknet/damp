"use server";

import { revalidatePath }    from "next/cache";
import { prisma }            from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

// A master admin has reviewed the Security tab: older events stop counting on the badge.
// (Not logged as an activity on purpose — that would itself be a new security event.)
export async function markSecurityReviewed(): Promise<{ ok: boolean }> {
  const me = await getCurrentProfile();
  if (!me?.isMasterAdmin) return { ok: false };

  await prisma.userProfile.update({ where: { id: me.id }, data: { securitySeenAt: new Date() } });
  revalidatePath("/activity");
  return { ok: true };
}
