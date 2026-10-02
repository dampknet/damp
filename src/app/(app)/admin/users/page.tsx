import { prisma }             from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/auth";
import UsersTable             from "./ui";

export default async function AdminUsersPage() {
  const me = await requireMasterAdmin();

  const users = await prisma.userProfile.findMany({
    orderBy: [{ isMasterAdmin: "desc" }, { role: "asc" }, { email: "asc" }],
    select: {
      id:              true,
      email:           true,
      fullName:        true,
      role:            true,
      isMasterAdmin:   true,
      isSuspended:     true,
      suspendReason:   true,
      suspendedBy:     true,
      lockedUntil:     true,
      lastLoginAt:     true,
      lastLoginIp:     true,
      lastLoginMethod:    true,
      isEmergency:        true,
      accessExpiresAt:    true,
      mustChangePassword: true,
      passwordHash:       true,
    },
  });

  return (
    <UsersTable
      users={users.map(({ passwordHash, ...u }) => ({
        ...u,
        hasLocalPassword: !!passwordHash,
        lockedUntil:      u.lockedUntil?.toISOString()     ?? null,
        lastLoginAt:      u.lastLoginAt?.toISOString()     ?? null,
        accessExpiresAt:  u.accessExpiresAt?.toISOString() ?? null,
      }))}
      currentUserId={me.id}
    />
  );
}
