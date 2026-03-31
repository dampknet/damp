"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Admin client to handle invitations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function addUser(email: string, fullName: string, role: string) {
  const me = await getCurrentProfile();
  if (me?.role !== "ADMIN") throw new Error("Unauthorized");

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Invite via Supabase
  const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: { full_name: fullName },
  });

  if (inviteError) throw new Error(inviteError.message);

  // 2. Upsert in Prisma
  await prisma.userProfile.upsert({
    where: { email: normalizedEmail },
    update: { role: role as any, fullName },
    create: {
      id: data.user.id,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: role as any,
    },
  });

  revalidatePath("/admin/users");
}

export async function removeUser(userId: string) {
  const me = await getCurrentProfile();
  if (me?.role !== "ADMIN") throw new Error("Unauthorized");
  if (me.id === userId) throw new Error("You cannot remove yourself");

  await prisma.userProfile.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function updateUserRole(userId: string, role: string) {
  const me = await getCurrentProfile();
  if (me?.role !== "ADMIN") throw new Error("Unauthorized");

  await prisma.userProfile.update({
    where: { id: userId },
    data: { role: role as any },
  });

  revalidatePath("/admin/users");
}