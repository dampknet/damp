import Link from "next/link";
import SignOutOnLoad from "./SignOutOnLoad";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp    = (await searchParams) ?? {};
  const error = sp.error ?? "";

  const isSuspended    = error === "Suspended";
  const isAccessDenied = error === "AccessDenied" || error === "not_invited";
  const isExpired      = error === "link_expired";
  const isLocked       = error.startsWith("Locked");

  const title = isSuspended    ? "Account Suspended"
              : isLocked       ? "Account Temporarily Locked"
              : isAccessDenied ? "Access Denied"
              : isExpired      ? "Link Expired"
              :                  "Sign In Error";

  const message = isSuspended
    ? "Your account has been suspended and you have been signed out. Contact a master admin if you believe this is a mistake."
    : isLocked
    ? "Too many failed sign-in attempts. Wait a few minutes and try again, or ask a master admin to unlock your account."
    : isAccessDenied
    ? "Your account has not been granted access to DAMP. Please contact your system administrator."
    : isExpired
    ? "Your invite link has expired. Ask your admin to send a new invite."
    : "Something went wrong. Please try again.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]">
      {isSuspended && <SignOutOnLoad />}
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 shadow-xl">
        <div className="h-1 bg-[linear-gradient(90deg,#dc2626,#f87171)]" />
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-2xl">
            🔒
          </div>
          <h1 className="text-lg font-bold text-[#1a1814]">{title}</h1>
          <p className="mt-2 text-sm text-[#6b655d]">{message}</p>
          <Link href="/auth/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1a1814] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2d2924]">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
