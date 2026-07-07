import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

/**
 * Gets the raw Supabase user — cached per request so it's only called once
 * no matter how many server components call it on the same page render.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/**
 * Gets the full profile — cached per request.
 * Single DB query. No fallback loops.
 */
export const getCurrentProfile = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;

  // Single query: try ID first, fallback to email in the same query using OR
  const profile = await prisma.userProfile.findFirst({
    where: {
      OR: [
        { id: user.id },
        ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
      ],
    },
    select: {
      id:        true,
      email:     true,
      fullName:  true,
      role:      true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!profile) return null;

  // If the profile was found by email but ID doesn't match, sync it in the background
  // without blocking the current request
  if (profile.id !== user.id) {
    prisma.userProfile.update({
      where: { email: profile.email },
      data:  { id: user.id },
    }).catch(console.error); // fire-and-forget, don't await
  }

  return profile;
});

/**
 * Guard: redirects to login if not authenticated.
 * Uses the cached getCurrentProfile so no extra DB call.
 */
export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login?error=not_authorized");
  return profile;
}

export function hasRole(userRole: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(userRole);
}
