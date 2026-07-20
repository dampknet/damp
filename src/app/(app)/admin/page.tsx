import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminIndexClient from "./AdminIndexClient";

export default async function AdminIndexPage() {
  const me = await getCurrentProfile();
  if (!me)                redirect("/auth/login");
  if (me.role !== "ADMIN") redirect("/sites");

  const [userCount, deletedCount, activityCount] = await Promise.all([
    prisma.userProfile.count(),
    prisma.inventoryItem.count({ where: { isDeleted: true } }),
    prisma.activityLog.count(),
  ]);

  return (
    <AdminIndexClient
      email={me.email ?? ""}
      userCount={userCount}
      deletedCount={deletedCount}
      activityCount={activityCount}
    />
  );
}
