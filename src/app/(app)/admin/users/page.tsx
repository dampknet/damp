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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Admin only: assign roles (ADMIN / EDITOR / VIEWER).
        </p>

        <div className="mt-6">
          <UsersTable users={users} />
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Note: A new user becomes VIEWER automatically after their first login.
        </p>
      </div>
    </div>
  );
}
