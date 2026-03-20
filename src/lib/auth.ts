import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

const ROLE_BY_EMAIL: Record<string, Role> = {
  "samkwesidavid456@gmail.com": "ADMIN",
  // "someone@company.com": "EDITOR",
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

  // do NOT throw here, just block gracefully
  if (!WHITELISTED_EMAILS.includes(email)) {
    return null;
  }

  const existingByEmail = await prisma.userProfile.findFirst({
    where: { email },
  });

  if (existingByEmail) {
    if (existingByEmail.id !== user.id) {
      const updated = await prisma.userProfile.update({
        where: { id: existingByEmail.id },
        data: {
          id: user.id,
          fullName:
            existingByEmail.fullName ??
            user.user_metadata?.full_name ??
            null,
        },
      });

      return updated;
    }

    return existingByEmail;
  }

  const role: Role = ROLE_BY_EMAIL[email] ?? "VIEWER";

  const created = await prisma.userProfile.create({
    data: {
      id: user.id,
      email,
      fullName: user.user_metadata?.full_name ?? null,
      role,
    },
  });

  return created;
}

export async function requireCurrentProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  return profile;
}

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}