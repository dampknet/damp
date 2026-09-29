import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";


const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /document\.cookie/i,
  /eval\s*\(/i,
];

const SQL_PATTERNS = [
  /('\s*(or|and)\s*'?\d)/i,
  /(union\s+(all\s+)?select)/i,
  /(drop\s+table)/i,
  /(insert\s+into)/i,
  /(delete\s+from)/i,
  /(-{2}|\bxp_)/i,
  /(\bor\b\s+1\s*=\s*1)/i,
];

const PATH_PATTERNS = [
  /\.\.\//,
  /\.\.%2f/i,
  /%2e%2e/i,
];

function detectThreat(str: string): string | null {
  const decoded = (() => { try { return decodeURIComponent(str); } catch { return str; } })();
  for (const p of XSS_PATTERNS)  if (p.test(decoded)) return "XSS";
  for (const p of SQL_PATTERNS)  if (p.test(decoded)) return "SQL_INJECTION";
  for (const p of PATH_PATTERNS) if (p.test(decoded)) return "PATH_TRAVERSAL";
  return null;
}

async function logSecurityEvent(
  type: string,
  detail: string,
  req: NextRequest,
  actorEmail?: string
) {
  
  fetch(`${req.nextUrl.origin}/api/security/log`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-internal": "1" },
    body:    JSON.stringify({
      type,
      detail,
      ip:         req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
      userAgent:  req.headers.get("user-agent") ?? "",
      url:        req.nextUrl.pathname + req.nextUrl.search,
      actorEmail: actorEmail ?? null,
    }),
  }).catch(() => {});
}

export async function middleware(req: NextRequest) {
  const res      = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  
  if (pathname.startsWith("/auth")) return res;

 
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }


  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });


  const urlToCheck = req.nextUrl.pathname + req.nextUrl.search;
  const urlThreat  = detectThreat(urlToCheck);
  if (urlThreat) {
    await logSecurityEvent(
      urlThreat,
      `Suspicious URL: ${urlToCheck.slice(0, 300)}`,
      req,
      token?.email as string | undefined
    );
    
    return new NextResponse("Bad Request", { status: 400 });
  }

  
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sites")     ||
    pathname.startsWith("/store")     ||
    pathname.startsWith("/activity")  ||
    pathname.startsWith("/assets")    ||
    pathname.startsWith("/admin");

  if (isProtected) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }
    res.headers.set("x-user-id", (token.userId as string) ?? token.sub ?? "");
  }

  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};