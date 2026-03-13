"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useThemeMode } from "@/context/ThemeContext";
import { updateUserRole } from "./actions";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

function roleBadge(role: Role, dark: boolean) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold";

  if (role === "ADMIN") {
    return dark
      ? `${base} border-red-500/30 bg-red-500/10 text-red-300`
      : `${base} border-red-200 bg-red-50 text-red-700`;
  }

  if (role === "EDITOR") {
    return dark
      ? `${base} border-blue-500/30 bg-blue-500/10 text-blue-300`
      : `${base} border-blue-200 bg-blue-50 text-blue-700`;
  }

  return dark
    ? `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`
    : `${base} border-emerald-200 bg-emerald-50 text-emerald-700`;
}

export default function UsersTable({
  users,
  currentEmail,
}: {
  users: { id: string; email: string; fullName: string | null; role: Role }[];
  currentEmail?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const { mode } = useThemeMode();
  const dark = mode === "dark";

  const onChangeRole = (id: string, role: Role) => {
    startTransition(async () => {
      try {
        await updateUserRole(id, role);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to update role";
        alert(msg);
      }
    });
  };

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-gray-50"
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/dashboard"
          className={
            dark
              ? "text-sm text-slate-400 hover:underline"
              : "text-sm text-gray-600 hover:underline"
          }
        >
          ← Back to Dashboard
        </Link>

        <h1
          className={
            dark
              ? "mt-3 text-2xl font-semibold text-slate-100"
              : "mt-3 text-2xl font-semibold text-gray-900"
          }
        >
          User Management
        </h1>

        <p
          className={
            dark
              ? "mt-1 text-sm text-slate-500"
              : "mt-1 text-sm text-gray-600"
          }
        >
          Admin only: assign roles (ADMIN / EDITOR / VIEWER).
        </p>

        <div
          className={
            dark
              ? "mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm backdrop-blur-xl"
              : "mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm"
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead
                className={
                  dark
                    ? "bg-[#101720] text-left text-slate-400"
                    : "bg-gray-100 text-left text-gray-700"
                }
              >
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Full name</th>
                  <th className="px-4 py-3 font-semibold">Current role</th>
                  <th className="px-4 py-3 font-semibold">Change role</th>
                </tr>
              </thead>

              <tbody className={dark ? "divide-y divide-white/8" : ""}>
                {users.map((u) => {
                  const isMe = currentEmail === u.email;

                  return (
                    <tr key={u.id} className={dark ? "hover:bg-white/5" : "border-t"}>
                      <td
                        className={
                          dark
                            ? "px-4 py-3 font-medium text-slate-100"
                            : "px-4 py-3 font-medium text-gray-900"
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span>{u.email}</span>
                          {isMe ? (
                            <span
                              className={
                                dark
                                  ? "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400"
                                  : "rounded-full border bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                              }
                            >
                              You
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className={dark ? "px-4 py-3 text-slate-400" : "px-4 py-3 text-gray-700"}>
                        {u.fullName ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span className={roleBadge(u.role, dark)}>{u.role}</span>
                      </td>

                      <td className="px-4 py-3">
                        <select
                          aria-label={`Role for ${u.email}`}
                          defaultValue={u.role}
                          disabled={isPending}
                          onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
                          className={
                            dark
                              ? "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20 disabled:opacity-60"
                              : "rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
                          }
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p
          className={
            dark
              ? "mt-3 text-xs text-slate-500"
              : "mt-3 text-xs text-gray-500"
          }
        >
          Note: A new user becomes VIEWER automatically after their first login.
        </p>
      </div>
    </div>
  );
}