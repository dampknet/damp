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

  // ✅ Allow auth routes (login/logout/post-login)
  if (pathname.startsWith("/auth")) return res;

  // ✅ Always send home to login
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ✅ Protect /sites and /admin (must be logged in)
  const isProtected =
    pathname.startsWith("/sites") || pathname.startsWith("/admin");

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // ✅ Whitelist check (extra security)
  if (isProtected && user?.email) {
    const email = user.email.toLowerCase();
    const allowed = WHITELISTED_EMAILS.map((e) => e.toLowerCase());

    if (!allowed.includes(email)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/", "/sites/:path*", "/admin/:path*", "/auth/:path*"],
};
