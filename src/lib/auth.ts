import { redirect }         from "next/navigation";
import { cache }            from "react";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return session.user;
});

const loadProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  return prisma.userProfile.findFirst({
    where: {
      OR: [
        ...(user.id ? [{ id: user.id }] : []),
        { email: user.email.toLowerCase() },
      ],
    },
    select: {
      id:            true,
      email:         true,
      fullName:      true,
      role:          true,
      isMasterAdmin: true,
      isSuspended:   true,
      createdAt:     true,
      updatedAt:     true,
    },
  });
});

export const getCurrentProfile = cache(async () => {
  const profile = await loadProfile();
  if (!profile || profile.isSuspended) return null;
  return profile;
});

export async function requireCurrentProfile() {
  const profile = await loadProfile();
  if (!profile)            redirect("/auth/login?error=not_authorized");
  if (profile.isSuspended) redirect("/auth/error?error=Suspended");
  return profile;
}

export async function requireMasterAdmin() {
  const profile = await requireCurrentProfile();
  if (!profile.isMasterAdmin) redirect("/dashboard");
  return profile;
}

export function hasRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}
