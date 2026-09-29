"use client";

import Image from "next/image";
import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function errorMessage(code: string | null): string | null {
  if (!code) return null;
  if (code === "not_invited")   return "Your account has not been granted access. Contact your admin.";
  if (code === "link_expired")  return "Your invite link has expired. Ask your admin to re-invite you.";
  if (code === "AccessDenied")  return "Access denied. Contact your system administrator.";
  if (code === "OAuthSignin")   return "That sign-in provider is unavailable right now. Try another method.";
  if (code === "Suspended")     return "This account has been suspended. Contact a master admin.";
  if (code.startsWith("Locked:")) {
    const mins = Number(code.split(":")[1]) || 5;
    return `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}, or ask a master admin to unlock your account.`;
  }
  if (code === "not_authorized") return null;
  return "Invalid email or password, or your account doesn't have access.";
}

function LoginFormInner() {
  const searchParams = useSearchParams();
  const urlError     = searchParams.get("error");
  const message      = searchParams.get("message");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [ssoLoad,  setSsoLoad]  = useState(false);
  const [msg,      setMsg]      = useState<string | null>(errorMessage(urlError));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 80);
    return () => window.clearTimeout(t);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email:    email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setMsg(errorMessage(res.error));
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleMicrosoft = async () => {
    setSsoLoad(true);
    signIn("azure-ad", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f7f4ee_0%,#efe6d8_45%,#f6f1e8_100%)]">
      <style jsx>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes signal {
          0%, 100% { transform: scaleY(0.55); opacity: 0.4; }
          50% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes shine {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes progress {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(300%); }
        }
      `}</style>

      {loading && (
        <div className="fixed inset-0 z-200 bg-black/25 backdrop-blur-sm">
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/30">
            <div
              className="h-full w-1/3 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]"
              style={{ animation: "progress 1.1s ease-in-out infinite" }}
            />
          </div>
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-sm rounded-3xl border border-white/40 bg-white/90 p-6 text-center shadow-2xl">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-white shadow-md">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#1a1814]">Signing you in...</h2>
              <p className="mt-1 text-sm text-[#746f67]">Please wait while we prepare your dashboard.</p>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#1d5fa8]/10 blur-3xl"
          style={{ animation: "floaty 7s ease-in-out infinite" }} />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#c8611a]/10 blur-3xl"
          style={{ animation: "floaty 8s ease-in-out infinite 0.7s" }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          style={{ animation: "floaty 9s ease-in-out infinite 1.2s" }} />
      </div>

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(to right, #1d5fa8 1px, transparent 1px), linear-gradient(to bottom, #1d5fa8 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">

          <div className={`hidden lg:block transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e4d9cb] bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c8611a] backdrop-blur">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#1d5fa8]" />
                Secure Access
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-4.5 flex items-end gap-1 opacity-50">
                  {[16, 24, 34, 48, 34, 24, 16].map((h, i) => (
                    <span key={i}
                      className="w-0.75 rounded-full bg-[linear-gradient(180deg,#1d5fa8,#3b82f6,#c8611a)]"
                      style={{ height: `${h}px`, transformOrigin: "bottom", animation: "signal 1.6s ease-in-out infinite", animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
                <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight text-[#1a1814]">
                  DTT Asset
                  <span className="block pb-1 bg-[linear-gradient(90deg,#1d5fa8_0%,#3b82f6_35%,#c8611a_100%)] bg-clip-text text-transparent">
                    Management Platform
                  </span>
                </h1>
              </div>
              <p className="mt-5 max-w-lg text-base leading-7 text-[#6f6a62]">
                Manage sites, monitor assets, track store records, and keep your
                operations organized from one smart central dashboard.
              </p>
              <div className="mt-8 max-w-md">
                <div className="group relative overflow-hidden rounded-3xl border border-[#e2d7c9] bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-lg text-white shadow-md">✓</div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9c9890]">System</div>
                      <div className="mt-1 text-lg font-semibold text-[#1a1814]">Secure & Centralized</div>
                      <p className="mt-2 text-sm leading-6 text-[#736d64]">Built to keep site, asset, and inventory operations in one reliable and protected space.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mx-auto w-full max-w-md transition-all duration-700 ${mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}>
            <div className="overflow-hidden rounded-[30px] border border-[#e4dccf] bg-white/80 shadow-[0_24px_70px_rgba(0,0,0,0.10)] backdrop-blur">

              <div className="relative overflow-hidden border-b border-[#efe8de] bg-[linear-gradient(135deg,#fcfaf7_0%,#f6efe6_100%)] px-6 py-6">
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.65),transparent)]"
                  style={{ animation: "shine 3.8s ease-in-out infinite" }}
                />
                <div className="relative flex items-center gap-4">
                  <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#e7dfd4] bg-white shadow-sm transition duration-300 hover:rotate-3 hover:scale-105">
                    <Image src="/logo.png" alt="Company logo" fill className="object-contain p-2.5" priority />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1a1814]">Welcome back</h2>
                    <p className="mt-1 text-sm text-[#7c766e]">Sign in to continue to the platform.</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">

                {message === "password_set" && (
                  <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    ✓ Password set successfully. Sign in below.
                  </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="transition duration-200 hover:-translate-y-0.5">
                    <label className="text-sm font-medium text-[#4f4a43]">Email</label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none transition placeholder:text-[#a09a92] focus:border-[#1d5fa8] focus:ring-2 focus:ring-[#1d5fa8]/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="name@company.com"
                    />
                  </div>

                  <div className="transition duration-200 hover:-translate-y-0.5">
                    <label className="text-sm font-medium text-[#4f4a43]">Password</label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none transition placeholder:text-[#a09a92] focus:border-[#1d5fa8] focus:ring-2 focus:ring-[#1d5fa8]/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  {msg && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      {msg}
                    </div>
                  )}

                  <button
                    disabled={loading || ssoLoad}
                    className="w-full rounded-xl bg-[linear-gradient(135deg,#1d5fa8_0%,#2563eb_45%,#c8611a_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,95,168,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(29,95,168,0.28)] disabled:opacity-60"
                    type="submit"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div className="my-5 flex items-center gap-3">
                  <div className="flex-1 border-t border-[#e7dfd4]" />
                  <span className="text-xs text-[#9c9890]">or</span>
                  <div className="flex-1 border-t border-[#e7dfd4]" />
                </div>

                <button
                  onClick={handleMicrosoft}
                  disabled={loading || ssoLoad}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#ddd5c9] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1814] shadow-sm hover:-translate-y-0.5 hover:bg-[#f7f3ed] transition disabled:opacity-60"
                >
                  {ssoLoad ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1d5fa8]/30 border-t-[#1d5fa8]" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                      <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
                      <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                  )}
                  {ssoLoad ? "Redirecting..." : "Sign in with Microsoft"}
                </button>

                <div className="mt-5 rounded-2xl border border-[#eee6da] bg-[#faf7f2] px-4 py-3 transition duration-200 hover:bg-[#f7f1ea]">
                  <p className="text-xs leading-5 text-[#7c766e]">
                    Only authorized users can sign in. If you don't have access,
                    contact an Admin.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs font-medium text-[#9c9890]">
              © 2026 DTT Asset Management Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[linear-gradient(135deg,#f7f4ee_0%,#efe6d8_45%,#f6f1e8_100%)]" />}>
      <LoginFormInner />
    </Suspense>
  );
}
