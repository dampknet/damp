"use client";

import { useTransition } from "react";
import { updateUserRole } from "./actions";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

export default function UsersTable({
  users,
}: {
  users: { id: string; email: string; fullName: string | null; role: Role }[];
}) {
  const [isPending, startTransition] = useTransition();

  const onChangeRole = (id: string, role: Role) => {
    startTransition(async () => {
      try {
        await updateUserRole(id, role);
      } catch (e: unknown) {
    const msg =
        e instanceof Error ? e.message : "Failed to update role";
    alert(msg);
    }

    });
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-700">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Full name</th>
            <th className="px-4 py-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
              <td className="px-4 py-3 text-gray-700">{u.fullName ?? "-"}</td>
              <td className="px-4 py-3">
                <select
                  aria-label={`Role for ${u.email}`}
                  defaultValue={u.role}
                  disabled={isPending}
                  onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
