// Session rules (shared by the server, the middleware and the browser — no database imports here).
//
// • Signed out after 30 minutes without activity (mouse, keys, clicks, scrolling, touch, scans).
// • On the issue page the limit is 2 hours, so a long issuing session isn't interrupted.
// • Everyone signs in again after 12 hours, however active.
// • The server enforces the same limits (plus a short grace period), so a restored tab or a copied
//   cookie stops working too — the browser timer is only the friendly part.

export const IDLE_MS        = 30 * 60_000;
export const ISSUE_IDLE_MS  = 2 * 60 * 60_000;
export const MAX_SESSION_MS = 12 * 60 * 60_000;
export const WARN_MS        = 2 * 60_000;     // warning pop-up before sign-out
export const PING_EVERY_MS  = 60_000;         // how often the browser reports activity to the server
export const SIGNOUT_REASON_COOKIE = "kims-signout-reason"; // marks an automatic (inactivity) sign-out for the log
const SERVER_GRACE_MS       = 3 * 60_000;     // allows for the ping interval and slow networks

export type SessionTimes = { loginAt?: number; lastActive?: number; idleLimit?: number } | null | undefined;
export type SessionProblem = "idle" | "expired";

export function sessionProblem(t: SessionTimes, now = Date.now()): SessionProblem | null {
  // Sessions created before these rules existed have no times: treat them as expired (one fresh login).
  if (!t?.loginAt || !t?.lastActive) return "expired";
  if (now - t.loginAt > MAX_SESSION_MS) return "expired";
  if (now - t.lastActive > (t.idleLimit ?? IDLE_MS) + SERVER_GRACE_MS) return "idle";
  return null;
}

// The issue page itself (not the waybill/receipt after it).
export function isIssuePage(pathname: string) {
  return /^\/store\/sites\/[^/]+\/issue\/?$/.test(pathname);
}

export function idleLimitFor(pathname: string) {
  return isIssuePage(pathname) ? ISSUE_IDLE_MS : IDLE_MS;
}

// next-auth's session cookie: "__Secure-" prefixed when the site runs on https.
export function sessionCookie() {
  const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  return { name: `${secure ? "__Secure-" : ""}next-auth.session-token`, secure };
}

// Only allow redirects back to a page inside this app (never to another website).
export function safeCallbackPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.startsWith("/auth") || value.startsWith("/api")) return null;
  return value;
}
