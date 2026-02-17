import { supabaseServer } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";

type Role = "ADMIN" | "EDITOR" | "VIEWER";

// Optional: decide default roles by email (edit as you like)
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

  if (!WHITELISTED_EMAILS.includes(email)) {
    throw new Error("Unauthorized email");
  }

  // ✅ 1) Try to find profile by email (so your backend-created rows match)
  const existingByEmail = await prisma.userProfile.findFirst({
    where: { email },
  });

  if (existingByEmail) {
    // (Optional) If the stored id is different, you can leave it,
    // OR you can update it to match Supabase user.id (recommended).
    if (existingByEmail.id !== user.id) {
      // This only works if you’re okay changing the PK id.
      // If it fails due to relations, tell me and we’ll do a safer approach.
      const updated = await prisma.userProfile.update({
        where: { id: existingByEmail.id },
        data: {
          id: user.id,
          // keep role as-is
          fullName: existingByEmail.fullName ?? user.user_metadata?.full_name ?? null,
        },
      });
      return updated;
    }

    return existingByEmail;
  }

  // ✅ 2) Create only if no record exists
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

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
