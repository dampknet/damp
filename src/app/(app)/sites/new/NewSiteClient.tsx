"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useThemeMode } from "@/context/ThemeContext";

export default function NewSiteClient({
  action,
}: {
  action: (formData: FormData) => void;
}) {
  const { mode } = useThemeMode();
  const dark = mode === "dark";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[linear-gradient(135deg,#0d1117_0%,#0f1923_50%,#0d1117_100%)] text-slate-200"
          : "min-h-screen bg-gray-50"
      }
    >
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link
          href="/sites"
          className={
            dark
              ? "text-sm text-slate-400 hover:underline"
              : "text-sm text-gray-600 hover:underline"
          }
        >
          ← Back to Sites
        </Link>

        <h1
          className={
            dark
              ? "mt-3 text-2xl font-semibold text-slate-100"
              : "mt-3 text-2xl font-semibold text-gray-900"
          }
        >
          Add Site
        </h1>

        <p
          className={
            dark
              ? "mt-1 text-sm text-slate-500"
              : "mt-1 text-sm text-gray-600"
          }
        >
          Create a new site record.
        </p>

        {error ? (
          <div
            className={
              dark
                ? "mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                : "mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {error}
          </div>
        ) : null}

        <form
          action={action}
          className={
            dark
              ? "mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm backdrop-blur-xl"
              : "mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-sm"
          }
        >
          <Field label="Site name" dark={dark}>
            <input
              name="name"
              placeholder="e.g. Adjangote"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
              required
            />
          </Field>

          <Field label="REG M FREQ" dark={dark}>
            <input
              name="regMFreq"
              placeholder="e.g. 25/506"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            />
          </Field>

          <Field label="Power" dark={dark}>
            <input
              name="power"
              placeholder="e.g. 5000"
              inputMode="numeric"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            />
          </Field>

          <Field label="Transmitter type" dark={dark}>
            <select
              name="transmitterType"
              defaultValue="AIR"
              aria-label="Transmitter type"
              title="Transmitter type"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  : "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            >
              <option value="AIR">Air-cooled (A)</option>
              <option value="LIQUID">Liquid-cooled (L)</option>
            </select>
          </Field>

          <Field label="Tower type" dark={dark}>
            <select
              name="towerType"
              defaultValue="GBC"
              aria-label="Tower type"
              title="Tower type"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-white/20"
                  : "w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            >
              <option value="GBC">GBC</option>
              <option value="KNET">KNET</option>
            </select>
          </Field>

          <Field label="Tower height (meters)" dark={dark}>
            <input
              name="towerHeight"
              placeholder="e.g. 60"
              inputMode="numeric"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            />
          </Field>

          <Field label="GPS (lat, long)" dark={dark}>
            <input
              name="gps"
              placeholder="e.g. 5.6037, -0.1870"
              className={
                dark
                  ? "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/20"
                  : "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              }
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className={
                dark
                  ? "rounded-xl bg-[linear-gradient(135deg,#1d5fa8,#3b82f6)] px-4 py-2 text-sm font-medium text-white hover:opacity-95"
                  : "rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
              }
            >
              Create site
            </button>

            <Link
              href="/sites"
              className={
                dark
                  ? "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10"
                  : "rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
              }
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  dark,
}: {
  label: string;
  children: React.ReactNode;
  dark: boolean;
}) {
  return (
    <label className="block">
      <div
        className={
          dark
            ? "mb-1 text-xs font-medium text-slate-400"
            : "mb-1 text-xs font-medium text-gray-600"
        }
      >
        {label}
      </div>
      {children}
    </label>
  );
}