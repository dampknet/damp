"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

export default function UpdatePasswordPage() {
  // State for Passwords
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");
  
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const supabase = supabaseBrowser();
  const router = useRouter();

  useEffect(() => {
    const initializeSession = async () => {
      // 1. Check if we already have a session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setSessionReady(true);
      } else {
        // 2. If no session, try to exchange the code in the URL for one
        // This is what prevents the "Auth Session Missing" error
        const { error } = await supabase.auth.getSession();
        if (error) {
          setError("Your session has expired or the link is invalid. Please ask for a new invite.");
        } else {
          setSessionReady(true);
        }
      }
    };
    initializeSession();
  }, [supabase.auth]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // This updates the user record with the new password
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      // Success!
      router.push("/dashboard?success=Your account is now active");
    }
  };

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] flex items-center justify-center px-4"
          : "min-h-screen bg-[#f5f2ed] flex items-center justify-center px-4"
      }
    >
      <div
        className={
          dark
            ? "w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl"
            : "w-full max-w-md rounded-[28px] border border-[#e7ded3] bg-white p-8 shadow-[0_24px_80px_rgba(26,24,20,0.1)]"
        }
      >
        <div className="flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-white shadow-lg mb-6">
             <span className="text-2xl font-bold">D</span>
          </div>
          
          <h1 className={dark ? "text-2xl font-bold tracking-tight text-slate-100" : "text-2xl font-bold tracking-tight text-[#1a1814]"}>
            Activate Your Account
          </h1>
          <p className={dark ? "mt-2 text-center text-sm text-slate-400" : "mt-2 text-center text-sm text-[#6f6a62]"}>
            Please set a strong password to complete your registration.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="mt-8 space-y-5">
          {/* Password Input */}
          <div className="relative">
            <label className={dark ? "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" : "block text-xs font-bold uppercase tracking-wider text-[#9c9890] mb-2"}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={
                  dark
                    ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-slate-100 outline-none focus:border-blue-500/50"
                    : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-[#1d5fa8]"
                }
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? "👁️" : "🙈"}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label className={dark ? "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" : "block text-xs font-bold uppercase tracking-wider text-[#9c9890] mb-2"}>
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500/50"
                  : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d5fa8]"
              }
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400" : "rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sessionReady}
            className={
              dark
                ? "w-full rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] py-3.5 font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                : "w-full rounded-xl bg-[#1a1814] py-3.5 font-semibold text-white shadow-lg transition hover:bg-black disabled:opacity-50"
            }
          >
            {!sessionReady 
              ? "Verifying link..." 
              : loading 
                ? "Activating..." 
                : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}