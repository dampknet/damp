import { redirect }         from "next/navigation";
import { cache }            from "react";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export const getCurrentUser = cache(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.invalid) return null;
  return session.user;
});

const loadProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const record = await prisma.userProfile.findFirst({
    where: {
      OR: [
        ...(user.id ? [{ id: user.id }] : []),
        { email: user.email.toLowerCase() },
      ],
    },
    select: {
      id:                 true,
      email:              true,
      fullName:           true,
      role:               true,
      isMasterAdmin:      true,
      isSuspended:        true,
      isEmergency:        true,
      accessExpiresAt:    true,
      mustChangePassword: true,
      canSeeNotifications: true,
      siteAccess:         true,
      storeAccess:        true,
      allStores:          true,
      storeAccessList:    { select: { inventorySiteId: true, level: true } },
      passwordHash:       true,
      createdAt:          true,
      updatedAt:          true,
    },
  });

  if (!record) return null;

  const { passwordHash, ...rest } = record;
  return {
    ...rest,
    hasLocalPassword: !!passwordHash,
    isExpired:        !!rest.accessExpiresAt && rest.accessExpiresAt.getTime() <= Date.now(),
  };
});

export const getCurrentProfile = cache(async () => {
  const profile = await loadProfile();
  if (!profile || profile.isSuspended || profile.isExpired) return null;
  return profile;
});

export async function requireCurrentProfile() {
  const profile = await loadProfile();
  if (!profile)                    redirect("/auth/login?error=not_authorized");
  if (profile.isSuspended)         redirect("/auth/error?error=Suspended");
  if (profile.isExpired)           redirect("/auth/error?error=Expired");
  if (profile.mustChangePassword)  redirect("/auth/change-password");
  return profile;
}

// ADMIN role or master admin: may see the audit trail, Recent Activity and reports.
export function isAdminProfile(profile: { role: string; isMasterAdmin: boolean } | null | undefined) {
  return !!profile && (profile.role === "ADMIN" || profile.isMasterAdmin);
}

// ADMIN or EDITOR (and not suspended/expired): may change inventory and site data.
export function isEditorProfile(profile: { role: string } | null | undefined) {
  return !!profile && (profile.role === "ADMIN" || profile.role === "EDITOR");
}

// For API routes and server actions: re-check the caller from the database on every request.
export async function getEditorProfile() {
  const profile = await getCurrentProfile();
  return isEditorProfile(profile) ? profile : null;
}

export async function requireAdmin() {
  const profile = await requireCurrentProfile();
  if (!isAdminProfile(profile)) redirect("/dashboard");
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
