import Link from "next/link";
import Image from "next/image";
import { getCurrentProfile } from "@/lib/auth";
import SettingsMenu from "@/components/SettingsMenu";
import NavbarThemeShell from "@/components/NavBarThemeShell";

export default async function AppNavbar() {
  const profile = await getCurrentProfile();
  const role = (profile?.role ?? "VIEWER") as "ADMIN" | "EDITOR" | "VIEWER";
  const email = profile?.email ?? "Unknown user";

  return (
    <NavbarThemeShell
      email={email}
      role={role}
      brand={
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
            <div className="text-sm font-semibold tracking-tight">
              DTT Asset Management
            </div>
            <div className="text-[11px] font-medium">
              Secure inventory & site assets
            </div>
          </div>
        </Link>
      }
      settings={<SettingsMenu email={email} role={role} />}
    />
  );
}