import { requireCurrentProfile } from "@/lib/auth";
import AppNavbarClient from "@/components/AppNavbarClient";

export default async function AppNavbar() {
  const profile = await requireCurrentProfile();

  const role = profile.role as "ADMIN" | "EDITOR" | "VIEWER";
  const email = profile.email;
  const displayName =
    profile.fullName?.trim() || profile.email?.split("@")[0] || "User";

  return (
    <AppNavbarClient
      email={email}
      role={role}
      displayName={displayName}
    />
  );
}