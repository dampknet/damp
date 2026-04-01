"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      // 1. Try to get session normally
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSessionReady(true);
        return;
      }

      // 2. Backup: Manually check the URL for a hash (Implicit Flow)
      // Supabase sometimes needs a nudge to process the #access_token
      if (window.location.hash) {
        const { data: hashData, error: hashError } = await supabase.auth.getSession();
        if (hashData.session) {
          setSessionReady(true);
          return;
        }
      }

      // 3. Listen for changes (Standard)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          setSessionReady(true);
        } else if (event === 'SIGNED_OUT') {
          setSessionReady(false);
        }
      });

      // 4. Final timeout - if after 5 seconds nothing happens, show an error
      const timer = setTimeout(() => {
        if (!sessionReady) {
          setError("Verification taking longer than expected. Please ensure you clicked the link from your most recent invite email.");
        }
      }, 5000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    };

    initializeSession();
  }, [supabase.auth]);
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      router.push("/dashboard?success=Account activated successfully");
    }
  };

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] flex items-center justify-center px-4" : "min-h-screen bg-[#f5f2ed] flex items-center justify-center px-4"}>
      <div className={dark ? "w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl" : "w-full max-w-md rounded-[28px] border border-[#e7ded3] bg-white p-8 shadow-xl"}>
        
        <div className="flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] text-white shadow-lg mb-6">
             <Lock size={28} />
          </div>
          
          <h1 className={dark ? "text-2xl font-bold tracking-tight text-slate-100" : "text-2xl font-bold tracking-tight text-[#1a1814]"}>
            Activate Your Account
          </h1>
          <p className={dark ? "mt-2 text-center text-sm text-slate-400" : "mt-2 text-center text-sm text-[#6f6a62]"}>
            Please set a strong password to complete your registration.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="mt-8 space-y-5">
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
                className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-blue-500/50" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-[#1d5fa8]"}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#3b82f6] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className={dark ? "block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2" : "block text-xs font-bold uppercase tracking-wider text-[#9c9890] mb-2"}>
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d5fa8]"}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className={dark ? "rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2" : "rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-center gap-2"}>
              <span className="shrink-0">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !sessionReady}
            className={dark ? "w-full rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] py-4 font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2" : "w-full rounded-xl bg-[#1a1814] py-4 font-bold text-white shadow-lg transition hover:bg-black disabled:opacity-50 flex items-center justify-center gap-2"}
          >
            {!sessionReady ? (
              <><Loader2 className="animate-spin" size={18} /> Verifying link...</>
            ) : loading ? (
              "Activating..."
            ) : (
              <><CheckCircle2 size={18} /> Activate Account</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}