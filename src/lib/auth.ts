import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// We keep the Role type for TypeScript safety
export type Role = "ADMIN" | "EDITOR" | "VIEWER";

// This is only for the very first "Super Admin"
// All other users get their roles from the Database now
const ROLE_BY_EMAIL: Record<string, Role> = {
  "samkwesidavid456@gmail.com": "ADMIN",
};

export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const email = user.email.toLowerCase();

  // 1. Check if the user exists in our Database (userProfile table)
  // This replaces the hardcoded WHITELISTED_EMAILS check
  const existingProfile = await prisma.userProfile.findFirst({
    where: { 
      OR: [
        { email: email },
        { id: user.id }
      ]
    },
  });

  // 2. If no profile exists in the DB, they aren't authorized
  if (!existingProfile) {
    return null;
  }

  // 3. Sync ID if necessary (handles cases where Supabase ID and Prisma ID get out of sync)
  if (existingProfile.id !== user.id) {
    const updated = await prisma.userProfile.update({
      where: { email: email },
      data: {
        id: user.id,
        fullName: existingProfile.fullName ?? user.user_metadata?.full_name ?? null,
      },
    });
    return updated;
  }

  return existingProfile;
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();

  // This is the "Bounce" trigger. 
  // If the logic above returns null, the user is kicked back to login.
  if (!profile) {
    redirect("/auth/login?error=not_authorized");
  }

  return profile;
}

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}