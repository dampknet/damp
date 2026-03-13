"use client";

import Image from "next/image";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";

export default function LoginForm() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!WHITELISTED_EMAILS.includes(normalizedEmail)) {
      setMsg("Access denied. This email is not authorized.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    window.location.href = "/auth/post-login";
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f8f5ef_0%,#efe8dc_45%,#f7f3ed_100%)]">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-[#c8611a]/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#1d5fa8]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left side */}
          <div className="hidden lg:block">
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e7dfd4] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c8611a] backdrop-blur">
                Secure Access
              </div>

              <h1 className="text-5xl font-semibold tracking-tight text-[#1a1814]">
                DTT Asset
                <span className="block text-[#c8611a]">Management Platform</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-[#6f6a62]">
                Manage sites, monitor assets, track store records, and keep your
                operations organized from one central dashboard.
              </p>

              <div className="mt-8 grid max-w-md grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#e3dbcf] bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]">
                    Access
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[#1a1814]">
                    Admin / Editor / Viewer
                  </div>
                </div>

                <div className="rounded-2xl border border-[#e3dbcf] bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]">
                    System
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[#1a1814]">
                    Secure & Centralized
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side / form */}
          <div className="mx-auto w-full max-w-md">
            <div className="overflow-hidden rounded-[28px] border border-[#e4dccf] bg-white/90 shadow-[0_20px_60px_rgba(0,0,0,0.08)] backdrop-blur">
              <div className="border-b border-[#efe8de] bg-[#fcfaf7] px-6 py-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#e7dfd4] bg-white shadow-sm">
                    <Image
                      src="/logo.png"
                      alt="Company logo"
                      fill
                      className="object-contain p-2"
                      priority
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-[#1a1814]">
                      Welcome back
                    </h2>
                    <p className="mt-1 text-sm text-[#7c766e]">
                      Sign in to continue to the platform.
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[#4f4a43]">
                      Email
                    </label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none transition placeholder:text-[#a09a92] focus:border-[#1a1814]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      placeholder="name@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#4f4a43]">
                      Password
                    </label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none transition placeholder:text-[#a09a92] focus:border-[#1a1814]"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  {msg ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      {msg}
                    </div>
                  ) : null}

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-[#1a1814] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                    type="submit"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div className="mt-5 rounded-2xl border border-[#eee6da] bg-[#faf7f2] px-4 py-3">
                  <p className="text-xs leading-5 text-[#7c766e]">
                    Only authorized users can sign in. If you don’t have access,
                    contact an Admin.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-[#9c9890]">
              DTT Asset Management Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}