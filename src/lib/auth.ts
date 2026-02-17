import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
type Role = "ADMIN" | "EDITOR" | "VIEWER";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";


export async function getCurrentUser() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase();

  if (!WHITELISTED_EMAILS.includes(email)) {
    throw new Error("Unauthorized email");
  }

  const profile = await prisma.userProfile.upsert({
    where: { id: user.id },
    update: {},
    create: {
      id: user.id,
      email,
      fullName: user.user_metadata?.full_name ?? null,
      role: "VIEWER",
    },
  });

  return profile;
}


export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
