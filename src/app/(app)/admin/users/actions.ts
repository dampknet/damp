"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

export async function updateUserRole(userId: string, role: Role) {
  const me = await getCurrentProfile();

  if (!me || me.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (role !== "ADMIN" && role !== "EDITOR" && role !== "VIEWER") {
    throw new Error("Invalid role.");
  }

  const targetUser = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  // Safety: don't let admin remove their own admin role accidentally
  if (me.id === userId && role !== "ADMIN") {
    throw new Error("You cannot remove your own ADMIN role.");
  }

  // no-op protection
  if (targetUser.role === role) {
    return { ok: true };
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role },
  });

  revalidatePath("/admin/users");

  return { ok: true };
}