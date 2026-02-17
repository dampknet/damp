import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import SettingsMenu from "@/components/SettingsMenu";
import Image from "next/image";


export default async function AppNavbar() {
  const profile = await getCurrentProfile();
  const role = (profile?.role ?? "VIEWER") as "ADMIN" | "EDITOR" | "VIEWER";
  const email = profile?.email ?? "Unknown user";

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="relative h-9 w-9 overflow-hidden rounded-xl border bg-white">
            <Image
              src="/logo.png"
              alt="Company logo"
              fill
              className="object-contain p-1"
              priority
            />
          </div>

          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">
              DTT Asset Management
            </div>
            <div className="text-[11px] text-gray-500">
              Secure inventory & site assets
            </div>
          </div>
        </Link>

        {/* Main menu */}
        <nav className="hidden items-center gap-6 sm:flex">
           <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-black">
            Dashboard
          </Link>
          <Link href="/sites" className="text-sm font-medium text-gray-700 hover:text-black">
            Sites
          </Link>
          <Link href="/store" className="text-sm font-medium text-gray-700 hover:text-black">
            Store
          </Link>
        </nav>

        {/* Settings */}
        <SettingsMenu email={email} role={role} />
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden border-t bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-2">
           <Link href="/dashboard" className="text-sm font-medium text-gray-700">
            Dashboard
          </Link>
          <Link href="/sites" className="text-sm font-medium text-gray-700">
            Sites
          </Link>
          <Link href="/store" className="text-sm font-medium text-gray-700">
            Store
          </Link>
        </div>
      </div>
    </header>
  );
}
