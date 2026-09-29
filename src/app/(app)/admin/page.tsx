import { redirect }          from "next/navigation";
import { requireCurrentProfile } from "@/lib/auth";
import { prisma }            from "@/lib/prisma";
import { SECURITY_EVENT_WHERE } from "@/lib/security-events";
import AdminIndexClient      from "./AdminIndexClient";

export default async function AdminIndexPage() {
  const me = await requireCurrentProfile();
  if (me.role !== "ADMIN") redirect("/dashboard");

  const isMasterAdmin = me.isMasterAdmin;

  const [userCount, deletedCount, activityCount] = await Promise.all([
    isMasterAdmin ? prisma.userProfile.count() : Promise.resolve(0),
    prisma.inventoryItem.count({ where: { isDeleted: true } }),
    prisma.activityLog.count({ where: isMasterAdmin ? {} : { NOT: SECURITY_EVENT_WHERE } }),
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
