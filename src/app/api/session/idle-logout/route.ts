import { NextResponse, type NextRequest } from "next/server";
import { SIGNOUT_REASON_COOKIE } from "@/lib/session-policy";

// POST /api/session/idle-logout
// Called by the inactivity timer right before it signs the user out, so the sign-out
// is recorded as "signed out automatically after inactivity" instead of a normal sign-out.
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin && origin !== (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SIGNOUT_REASON_COOKIE, "idle", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 });
  return res;
}
