import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import SettingsMenu from "@/components/SettingsMenu";
import Image from "next/image";

export default async function AppNavbar() {
  const profile = await getCurrentProfile();
  const role = (profile?.role ?? "VIEWER") as "ADMIN" | "EDITOR" | "VIEWER";
  const email = profile?.email ?? "Unknown user";

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7dfd4] bg-[#fffdf9]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#e7dfd4] bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="Company logo"
              fill
              className="object-contain p-1.5"
              priority
            />
          </div>

          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-[#1a1814]">
              DTT Asset Management
            </div>
            <div className="text-[11px] font-medium text-[#8b857c]">
              Secure inventory & site assets
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 rounded-full border border-[#e7dfd4] bg-white px-2 py-1 sm:flex">
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#4a4740] transition hover:bg-[#f5f2ed] hover:text-[#1a1814]"
          >
            Dashboard
          </Link>
          <Link
            href="/sites"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#4a4740] transition hover:bg-[#f5f2ed] hover:text-[#1a1814]"
          >
            Sites
          </Link>
          <Link
            href="/store"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#4a4740] transition hover:bg-[#f5f2ed] hover:text-[#1a1814]"
          >
            Store
          </Link>
        </nav>

        <SettingsMenu email={email} role={role} />
      </div>

      <div className="border-t border-[#efe8de] bg-white sm:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
          <Link
            href="/dashboard"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#4a4740] hover:bg-[#f5f2ed]"
          >
            Dashboard
          </Link>
          <Link
            href="/sites"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#4a4740] hover:bg-[#f5f2ed]"
          >
            Sites
          </Link>
          <Link
            href="/store"
            className="rounded-full px-3 py-1.5 text-sm font-medium text-[#4a4740] hover:bg-[#f5f2ed]"
          >
            Store
          </Link>
        </div>
      </div>
    </header>
  );
}