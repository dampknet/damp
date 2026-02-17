"use client";

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            DTT ASSET MANAGEMENT PLATFORM
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign in to continue.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-gray-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                placeholder="••••••••"
              />
            </div>

            {msg ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {msg}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60"
              type="submit"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500">
            If you don’t have access, contact an Admin.
          </p>
        </div>
      </div>
    </div>
  );
}
