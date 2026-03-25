import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/auth/login", req.url), {
    status: 303,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (user?.email) {
      await prisma.activityLog.create({
        data: {
          type: "USER_LOGOUT",
          title: "User signed out",
          details: `${user.email} signed out of the platform`,
          entityType: "USER",
          entityId: user.id,
          actorEmail: user.email.toLowerCase(),
        },
      });
    }
  } catch (error) {
    console.error("Failed to log logout activity:", error);
  }

  await supabase.auth.signOut();
  return res;
}