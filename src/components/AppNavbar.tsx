import { getCurrentProfile } from "@/lib/auth";
import AppNavbarClient from "@/components/AppNavbarClient";

export default async function AppNavbar() {
  const profile = await getCurrentProfile();
  const role = (profile?.role ?? "VIEWER") as "ADMIN" | "EDITOR" | "VIEWER";
  const email = profile?.email ?? "Unknown user";

  return <AppNavbarClient email={email} role={role} />;
}