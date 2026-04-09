// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // 1. Always allow auth routes to bypass checks
  if (pathname.startsWith("/auth")) {
    return res;
  }

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

  // Get the authenticated user from Supabase
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Redirect root to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // 3. Define Protected Routes
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/store") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/admin");

  if (isProtected) {
    // If NOT logged in at all
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
      res.headers.set("x-user-id", user.id);
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};