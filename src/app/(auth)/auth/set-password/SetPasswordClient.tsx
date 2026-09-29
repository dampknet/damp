"use client";

import { useState }    from "react";
import { useRouter }   from "next/navigation";
import Image           from "next/image";

export default function SetPasswordClient({
  token, email,
}: {
  token: string;
  email: string;
}) {
  const router   = useRouter();
  const [pw,     setPw]     = useState("");
  const [pw2,    setPw2]    = useState("");
  const [error,  setError]  = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (pw.length < 8)  return setError("Password must be at least 8 characters.");
    if (pw !== pw2)     return setError("Passwords don't match.");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Something went wrong.");
      router.push("/auth/login?message=password_set");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(180deg,#fbf8f3_0%,#f5f2ed_48%,#f2ede5_100%)]">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 shadow-xl">
        <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#10b981)]" />
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#e7dfd4] bg-white shadow-sm">
              <Image src="/logo.png" alt="KNET" fill className="object-contain p-2" priority />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-[#1a1814]">Set Your Password</h1>
              <p className="text-xs text-[#8b857c] mt-1">for {email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6b655d]">Password</label>
              <input type="password" required minLength={8}
                value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d5fa8]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6b655d]">Confirm Password</label>
              <input type="password" required
                value={pw2} onChange={(e) => setPw2(e.target.value)}
                placeholder="Repeat password"
                className="w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d5fa8]"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl bg-[#1a1814] py-2.5 text-sm font-bold text-white hover:bg-[#2d2924] disabled:opacity-60">
              {loading ? "Setting password…" : "Set Password & Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
