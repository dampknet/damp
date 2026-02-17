"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
type Role = "ADMIN" | "EDITOR" | "VIEWER";


export async function updateUserRole(userId: string, role: Role) {
  const me = await getCurrentProfile();
  if (!me || me.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  // Safety: don't let admin remove their own admin accidentally
  if (me.id === userId && role !== "ADMIN") {
    throw new Error("You cannot remove your own ADMIN role.");
  }

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role },
  });

  return { ok: true };
}
