import { NextResponse, type NextRequest } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import {
  IDLE_MS, ISSUE_IDLE_MS, MAX_SESSION_MS, sessionCookie, sessionProblem,
} from "@/lib/session-policy";

// POST /api/session/activity  { issuePage: boolean }
// The browser calls this (at most about once a minute) while the user is active.
// It moves the inactivity clock forward and re-issues the session cookie WITHOUT an expiry date,
// so the browser deletes it when it is closed.
export async function POST(req: NextRequest) {
  // Only accept calls from our own pages.
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin && origin !== (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.NEXTAUTH_SECRET!;
  const token  = await getToken({ req, secret });
  if (!token) return NextResponse.json({ expired: "expired" }, { status: 401 });

  const problem = sessionProblem(token);
  if (problem) {
    const res = NextResponse.json({ expired: problem }, { status: 401 });
    res.cookies.delete(sessionCookie().name);
    return res;
  }

  const body      = await req.json().catch(() => ({}));
  const idleLimit = body?.issuePage === true ? ISSUE_IDLE_MS : IDLE_MS;
  const now       = Date.now();

  // Keep the original sign-in time; the token never outlives the 12-hour maximum.
  const { exp: _exp, iat: _iat, jti: _jti, ...claims } = token;
  const remainingSec = Math.max(60, Math.floor((MAX_SESSION_MS - (now - Number(token.loginAt))) / 1000));
  const value = await encode({
    token:  { ...claims, lastActive: now, idleLimit },
    secret,
    maxAge: remainingSec,
  });

  const { name, secure } = sessionCookie();
  const res = NextResponse.json({ ok: true, idleLimit });
  res.cookies.set(name, value, { httpOnly: true, sameSite: "lax", path: "/", secure });
  return res;
}
