import { redirect }          from "next/navigation";
import { requireCurrentProfile } from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { SECURITY_EVENT_WHERE } from "@/lib/security-events";
import { accessOf, activityScope, storeFilter } from "@/lib/access";
import AdminIndexClient      from "./AdminIndexClient";

export default async function AdminIndexPage() {
  const me = await requireCurrentProfile();
  if (me.role !== "ADMIN") redirect("/dashboard");

  const isMasterAdmin = me.isMasterAdmin;

  const [userCount, deletedCount, activityCount] = await Promise.all([
    isMasterAdmin ? prisma.userProfile.count() : Promise.resolve(0),
    prisma.inventoryItem.count({ where: { isDeleted: true, inventorySiteId: storeFilter(accessOf(me)) } }),
    prisma.activityLog.count({ where: isMasterAdmin ? {} : { AND: [{ NOT: SECURITY_EVENT_WHERE }, activityScope(accessOf(me))] } }),
  ]);

  return (
    <AdminIndexClient
      email={me.email ?? ""}
      isMasterAdmin={isMasterAdmin}
      userCount={userCount}
      deletedCount={deletedCount}
      activityCount={activityCount}
    />
  );
}
