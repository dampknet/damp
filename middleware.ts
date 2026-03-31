import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

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

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const pathname = req.nextUrl.pathname;

  // 1. CRITICAL BYPASS: Always allow the update-password page to load.
  // This allows the browser to process the #access_token from the invitation link.
  if (pathname === "/auth/update-password") {
    return res;
  }

  // 2. Allow all other auth routes (login, callback, etc.)
  if (pathname.startsWith("/auth")) {
    return res;
  }

  // 3. Send home to login
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 4. Protect all main app routes
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sites") ||
    pathname.startsWith("/store") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/admin");

  // If trying to access a protected route without a user session, redirect to login
  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 5. Whitelist check for protected routes
  if (isProtected) {
    const email = user?.email?.toLowerCase() ?? "";
    const allowed = WHITELISTED_EMAILS.map((e) => e.toLowerCase());

    if (!email || !allowed.includes(email)) {
      // If user is authenticated but not whitelisted, kick them back to login
      // (Optional: You could redirect to a /unauthorized page instead)
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo.png, etc.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};