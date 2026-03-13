"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { WHITELISTED_EMAILS } from "@/lib/whitelist";

export default function LoginForm() {
  const supabase = supabaseBrowser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 80);
    return () => window.clearTimeout(t);
  }, []);

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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f7f4ee_0%,#efe6d8_45%,#f6f1e8_100%)]">
      {/* animated background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 animate-pulse rounded-full bg-[#1d5fa8]/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 animate-pulse rounded-full bg-[#c8611a]/12 blur-3xl [animation-delay:700ms]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-pulse rounded-full bg-emerald-500/10 blur-3xl [animation-delay:1200ms]" />
      </div>

      {/* grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1d5fa8 1px, transparent 1px), linear-gradient(to bottom, #1d5fa8 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          {/* left content */}
          <div
            className={`hidden lg:block transition-all duration-700 ${
              mounted
                ? "translate-y-0 opacity-100"
                : "translate-y-6 opacity-0"
            }`}
          >
            <div className="max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e4d9cb] bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c8611a] backdrop-blur">
                <span className="inline-block h-2 w-2 rounded-full bg-[#1d5fa8] animate-pulse" />
                Secure Access
              </div>

              <h1 className="text-5xl font-semibold tracking-tight text-[#1a1814]">
                DTT Asset
                <span className="block bg-[linear-gradient(90deg,#1d5fa8_0%,#3b82f6_35%,#c8611a_100%)] bg-clip-text text-transparent">
                  Management Platform
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-[#6f6a62]">
                Manage sites, monitor assets, track store records, and keep your
                operations organized from one smart central dashboard.
              </p>

              <div className="mt-8 max-w-md">
                <div className="group relative overflow-hidden rounded-3xl border border-[#e2d7c9] bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-lg">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-lg text-white shadow-md">
                      ✓
                    </div>

                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9c9890]">
                        System
                      </div>
                      <div className="mt-1 text-lg font-semibold text-[#1a1814]">
                        Secure & Centralized
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#736d64]">
                        Built to keep site, asset, and inventory operations in
                        one reliable and protected space.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* form side */}
          <div
            className={`mx-auto w-full max-w-md transition-all duration-700 ${
              mounted
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <div className="overflow-hidden rounded-[30px] border border-[#e4dccf] bg-white/88 shadow-[0_24px_70px_rgba(0,0,0,0.10)] backdrop-blur">
              <div className="relative border-b border-[#efe8de] bg-[linear-gradient(135deg,#fcfaf7_0%,#f6efe6_100%)] px-6 py-6">
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#1d5fa8]/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-[#c8611a]/10 blur-2xl" />

                <div className="relative flex items-center gap-4">
                  <div className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#e7dfd4] bg-white shadow-sm transition duration-300 hover:rotate-3 hover:scale-105">
                    <Image
                      src="/logo.png"
                      alt="Company logo"
                      fill
                      className="object-contain p-2.5"
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
                  <div className="transition duration-200 hover:-translate-y-0.5">
                    <label className="text-sm font-medium text-[#4f4a43]">
                      Email
                    </label>
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
                    <label className="text-sm font-medium text-[#4f4a43]">
                      Password
                    </label>
                    <input
                      className="mt-1.5 w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm text-[#1a1814] outline-none transition placeholder:text-[#a09a92] focus:border-[#1d5fa8] focus:ring-2 focus:ring-[#1d5fa8]/10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      placeholder="••••••••"
                    />
                  </div>

                  {msg ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-in fade-in duration-200">
                      {msg}
                    </div>
                  ) : null}

                  <button
                    disabled={loading}
                    className="w-full rounded-xl bg-[linear-gradient(135deg,#1d5fa8_0%,#2563eb_45%,#c8611a_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(29,95,168,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(29,95,168,0.28)] disabled:opacity-60"
                    type="submit"
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div className="mt-5 rounded-2xl border border-[#eee6da] bg-[#faf7f2] px-4 py-3 transition duration-200 hover:bg-[#f7f1ea]">
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