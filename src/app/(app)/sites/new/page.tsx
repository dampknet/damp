// src/app/(app)/sites/new/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import type { TransmitterType, TowerType } from "@prisma/client";

export default async function NewSitePage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";
  const canEdit = role === "ADMIN" || role === "EDITOR";
  if (!canEdit) redirect("/sites");

  async function createSite(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const regMFreqRaw = String(formData.get("regMFreq") ?? "").trim();
    const powerRaw = String(formData.get("power") ?? "").trim();
    const transmitterTypeRaw = String(formData.get("transmitterType") ?? "AIR").trim();

    // ✅ NEW
    const towerTypeRaw = String(formData.get("towerType") ?? "GBC").trim();
    const towerHeightRaw = String(formData.get("towerHeight") ?? "").trim();
    const gpsRaw = String(formData.get("gps") ?? "").trim();

    if (!name) redirect(`/sites/new?error=${encodeURIComponent("Site name is required")}`);

    const power = powerRaw ? Number(powerRaw) : null;
    if (powerRaw && !Number.isFinite(power)) {
      redirect(`/sites/new?error=${encodeURIComponent("Power must be a number")}`);
    }

    const transmitterType = (transmitterTypeRaw === "LIQUID" ? "LIQUID" : "AIR") as TransmitterType;
    const regMFreq = regMFreqRaw || null;

    // ✅ NEW
    const towerType = (towerTypeRaw === "KNET" ? "KNET" : "GBC") as TowerType;

    const towerHeightNum = towerHeightRaw ? Number(towerHeightRaw) : null;
    if (towerHeightRaw && !Number.isFinite(towerHeightNum)) {
      redirect(`/sites/new?error=${encodeURIComponent("Tower height must be a number")}`);
    }

    const gps = gpsRaw || null;

    try {
      const created = await prisma.site.create({
        data: {
          name,
          regMFreq,
          power: power === null ? null : Math.trunc(power),
          transmitterType,
          status: "ACTIVE",

          // ✅ NEW
          towerType,
          towerHeight: towerHeightNum === null ? null : Math.trunc(towerHeightNum),
          gps,
        },
        select: { id: true },
      });

      redirect(`/sites/${created.id}`);
    } catch {
      redirect(`/sites/new?error=${encodeURIComponent("Could not create site (maybe name already exists)")}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link href="/sites" className="text-sm text-gray-600 hover:underline">
          ← Back to Sites
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-gray-900">Add Site</h1>
        <p className="mt-1 text-sm text-gray-600">Create a new site record.</p>

        <form action={createSite} className="mt-6 space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <Field label="Site name">
            <input
              name="name"
              placeholder="e.g. Adjangote"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
              required
            />
          </Field>

          <Field label="REG M FREQ">
            <input
              name="regMFreq"
              placeholder="e.g. 25/506"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </Field>

          <Field label="Power">
            <input
              name="power"
              placeholder="e.g. 5000"
              inputMode="numeric"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </Field>

          <Field label="Transmitter type">
            <select
              name="transmitterType"
              defaultValue="AIR"
              aria-label="Transmitter type"
              title="Transmitter type"
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
            >
              <option value="AIR">Air-cooled (A)</option>
              <option value="LIQUID">Liquid-cooled (L)</option>
            </select>
          </Field>

          {/* ✅ NEW */}
          <Field label="Tower type">
            <select
              name="towerType"
              defaultValue="GBC"
              aria-label="Tower type"
              title="Tower type"
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
            >
              <option value="GBC">GBC</option>
              <option value="KNET">KNET</option>
            </select>
          </Field>

          {/* ✅ NEW */}
          <Field label="Tower height (meters)">
            <input
              name="towerHeight"
              placeholder="e.g. 60"
              inputMode="numeric"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </Field>

          {/* ✅ NEW */}
          <Field label="GPS (lat, long)">
            <input
              name="gps"
              placeholder="e.g. 5.6037, -0.1870"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-gray-400"
            />
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            >
              Create site
            </button>
            <Link
              href="/sites"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-gray-600">{label}</div>
      {children}
    </label>
  );
}
