import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

/**
 * Gets the raw user object from Supabase Auth
 */
export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Gets the full user profile from Prisma.
 * Uses strict ID checking to prevent session leakage between different accounts.
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  // 1. Strict Check: Try to find profile by unique Supabase ID
  // This is the fastest and most secure way to ensure the right user is fetched.
  let profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  // 2. Fallback Check: If ID isn't linked yet (e.g., manual DB entry without ID), 
  // try email and then link the ID immediately.
  if (!profile && user.email) {
    const email = user.email.toLowerCase();
    const profileByEmail = await prisma.userProfile.findUnique({
      where: { email },
    });

    if (profileByEmail) {
      // Sync the Supabase ID to the Prisma record permanently
      profile = await prisma.userProfile.update({
        where: { email },
        data: {
          id: user.id,
          fullName: profileByEmail.fullName ?? user.user_metadata?.full_name ?? null,
        },
      });
    }
  }

  // 3. Authorization Check: No profile in DB means they are not an authorized user
  if (!profile) return null;

  return profile;
}

/**
 * Server-side guard to bounce unauthorized users back to login
 */
export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login?error=not_authorized");
  }

  return profile;
}

/**
 * Simple role-based permission helper
 */
export function hasRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}