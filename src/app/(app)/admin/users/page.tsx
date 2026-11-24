import { prisma }             from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/auth";
import { getCompanyDomain }   from "@/lib/system-config";
import { describeAccess }     from "@/lib/access";
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
      siteAccess:         true,
      storeAccess:        true,
      allStores:          true,
      storeAccessList:    { select: { inventorySiteId: true, level: true } },
    },
  });
  const warehouses = await prisma.inventorySite.findMany({ where: { isDeleted: false }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const whName     = new Map(warehouses.map((w) => [w.id, w.name]));

  return (
    <UsersTable
      users={users.map(({ passwordHash, storeAccessList, ...u }) => ({
        ...u,
        stores:        storeAccessList.filter((a) => whName.has(a.inventorySiteId)).map((a) => ({ id: a.inventorySiteId, level: a.level })),
        accessSummary: describeAccess(u, storeAccessList.filter((a) => whName.has(a.inventorySiteId)).map((a) => ({ name: whName.get(a.inventorySiteId)!, level: a.level }))),
        hasLocalPassword: !!passwordHash,
        lockedUntil:      u.lockedUntil?.toISOString()     ?? null,
        lastLoginAt:      u.lastLoginAt?.toISOString()     ?? null,
        accessExpiresAt:  u.accessExpiresAt?.toISOString() ?? null,
      }))}
      currentUserId={me.id}
      companyDomain={await getCompanyDomain()}
      warehouses={warehouses}
    />
  );
}
