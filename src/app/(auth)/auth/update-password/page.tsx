"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";
import { Eye, EyeOff, Lock, CheckCircle2, Loader2 } from "lucide-react";

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

    setLoading(true);

    // This call will work if the #hash in the URL was processed by the Supabase client
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message + ". Please try opening the link in Incognito.");
      setLoading(false);
    } else {
      router.push("/auth/login?message=Account activated successfully");
    }
  };

  return (
    <div className={dark ? "min-h-screen bg-[#0d1117] flex items-center justify-center px-4" : "min-h-screen bg-[#f5f2ed] flex items-center justify-center px-4"}>
      <div className={dark ? "w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl" : "w-full max-w-md rounded-[28px] border border-[#e7ded3] bg-white p-8 shadow-xl"}>
        <div className="flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#1d5fa8] text-white shadow-lg mb-6">
             <Lock size={28} />
          </div>
          <h1 className={dark ? "text-2xl font-bold text-slate-100" : "text-2xl font-bold text-[#1a1814]"}>Activate Your Account</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Set a password to complete your registration.</p>
        </div>

        <form onSubmit={handleUpdate} className="mt-8 space-y-5">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 outline-none"}
              placeholder="New Password"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={dark ? "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" : "w-full rounded-xl border border-[#ddd5c9] bg-white px-4 py-3 outline-none"}
            placeholder="Confirm Password"
          />

          {error && <div className="text-red-400 text-xs text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#1d5fa8] py-4 font-bold text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Activate Account"}
          </button>
        </form>
      </div>
    </div>
  );
}