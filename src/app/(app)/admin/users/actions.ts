"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Admin client to handle invitations and deletions
// Using the Service Role Key allows us to manage users in Supabase Auth
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

  // Handle case where user is already in Supabase Auth but not in our Prisma DB
  if (inviteError) {
    if (inviteError.message.includes("already registered") || inviteError.status === 422) {
      // Fetch the user from Supabase to get their ID
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw new Error("Failed to verify existing user account.");

      const existingAuthUser = listData.users.find(u => u.email?.toLowerCase() === normalizedEmail);

      if (existingAuthUser) {
        // Link the existing Supabase ID to a new Prisma Profile
        await prisma.userProfile.upsert({
          where: { email: normalizedEmail },
          update: { role: role as any, fullName, id: existingAuthUser.id },
          create: {
            id: existingAuthUser.id,
            email: normalizedEmail,
            fullName: fullName.trim(),
            role: role as any,
          },
        });
        revalidatePath("/admin/users");
        return; // Success handled
      }
    }
    throw new Error(inviteError.message);
  }

  // 2. Standard flow for a brand new user
  if (data?.user) {
    await prisma.userProfile.upsert({
      where: { email: normalizedEmail },
      update: { role: role as any, fullName, id: data.user.id },
      create: {
        id: data.user.id,
        email: normalizedEmail,
        fullName: fullName.trim(),
        role: role as any,
      },
    });
  }

  revalidatePath("/admin/users");
}

export async function removeUser(userId: string) {
  const me = await getCurrentProfile();
  if (me?.role !== "ADMIN") throw new Error("Unauthorized");
  if (me.id === userId) throw new Error("You cannot remove yourself");

  // 1. Delete from Supabase Auth FIRST
  // This ensures they cannot log in again and frees up the email for re-invitation
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  
  if (authError) {
    console.error("Supabase Auth deletion failed:", authError.message);
    // If user is already gone from Auth (404), we still want to clean up our DB
    if (authError.status !== 404) {
      throw new Error("Could not revoke authentication access. Please try again.");
    }
  }

  // 2. Delete from Prisma Database Profile
  await prisma.userProfile.delete({ 
    where: { id: userId } 
  });

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