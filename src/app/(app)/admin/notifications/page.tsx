import { prisma }             from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/auth";
import NotificationAccessClient from "./NotificationAccessClient";

export default async function NotificationAccessPage() {
  await requireMasterAdmin();

  const users = await prisma.userProfile.findMany({
    orderBy: [{ isMasterAdmin: "desc" }, { role: "asc" }, { email: "asc" }],
    select: {
      id: true, email: true, fullName: true, role: true,
      isMasterAdmin: true, isSuspended: true, canSeeNotifications: true,
    },
  });

  return <NotificationAccessClient users={users} />;
}
