"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react"; // Standard icons

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const supabase = supabaseBrowser();
  const router = useRouter();

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
      router.push("/dashboard?success=Account activated");
    }
  };

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] flex items-center justify-center px-4" : "min-h-screen bg-[#f5f2ed] flex items-center justify-center px-4"}>
      <div className={dark ? "w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl" : "w-full max-w-md rounded-[28px] border border-[#e7ded3] bg-white p-8 shadow-xl"}>
        
        <div className="flex flex-col items-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#1d5fa8] flex items-center justify-center text-white mb-6 shadow-lg">
            <Lock size={28} />
          </div>
          <h1 className={dark ? "text-2xl font-bold text-slate-100" : "text-2xl font-bold text-[#1a1814]"}>Set New Password</h1>
          <p className="mt-2 text-sm text-slate-500">Secure your account to access the dashboard.</p>
        </div>

        <form onSubmit={handleUpdate} className="mt-8 space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d5fa8]"}
                placeholder="At least 8 characters"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#3b82f6]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-[#3b82f6]" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 text-sm outline-none focus:border-[#1d5fa8]"}
              placeholder="Repeat password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1d5fa8] py-4 font-bold text-white shadow-lg transition hover:bg-[#3b82f6] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Activating..." : <><CheckCircle2 size={18} /> Activate Account</>}
          </button>
        </form>
      </div>
    </div>
  );
}