import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import UsersTable from "./ui";

export default async function AdminUsersPage() {
  const me = await getCurrentProfile();

  if (!me) redirect("/auth/login");
  if (me.role !== "ADMIN") redirect("/sites");

  const users = await prisma.userProfile.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, fullName: true, role: true },
  });

  return (
    <UsersTable
      users={users}
      currentEmail={me.email ?? null}
    />
  );
}