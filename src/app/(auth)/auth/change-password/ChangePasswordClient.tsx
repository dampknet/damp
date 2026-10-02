"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { signOut } from "next-auth/react";
import { changePassword, type ChangePasswordState } from "./actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwords";

const initialState: ChangePasswordState = { error: null };

export default function ChangePasswordClient({
  email, forced,
}: {
  email:  string;
  forced: boolean;
}) {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  const inputCls = "w-full rounded-xl border border-[#ddd5c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1d5fa8]";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f7f4ee_0%,#efe6d8_45%,#f6f1e8_100%)] px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-[28px] border border-[#e7ded3] bg-white/95 shadow-xl">
        <div className="h-1 bg-[linear-gradient(90deg,#1d5fa8,#3b82f6,#c8611a)]" />
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-[#e7dfd4] bg-white shadow-sm">
              <Image src="/logo.png" alt="KNET" fill className="object-contain p-2" priority />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold text-[#1a1814]">
                {forced ? "Set a New Password" : "Change Password"}
              </h1>
              <p className="mt-1 text-xs text-[#8b857c]">{email}</p>
            </div>
          </div>

          {forced && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Your password was set by an administrator. Choose your own password to continue.
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6b655d]">
                {forced ? "Password you were given" : "Current password"}
              </label>
              <input type="password" name="currentPassword" required autoComplete="current-password" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6b655d]">New password</label>
              <input type="password" name="newPassword" required minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number`}
                className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6b655d]">Confirm new password</label>
              <input type="password" name="confirmPassword" required autoComplete="new-password" className={inputCls} />
            </div>

            {state.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {state.error}
              </div>
            )}

            <button type="submit" disabled={pending}
              className="w-full rounded-xl bg-[#1a1814] py-2.5 text-sm font-bold text-white hover:bg-[#2d2924] disabled:opacity-60">
              {pending ? "Saving…" : "Save Password"}
            </button>
          </form>

          <div className="mt-5 text-center">
            {forced ? (
              <button type="button" onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="text-xs font-semibold text-[#8b857c] hover:text-[#1a1814] hover:underline">
                Sign out instead
              </button>
            ) : (
              <Link href="/dashboard" className="text-xs font-semibold text-[#8b857c] hover:text-[#1a1814] hover:underline">
                ← Back to dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
