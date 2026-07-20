import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import BackupPage from "./BackupPage";

export default async function BackupPageWrapper() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/auth/login");
  if (profile.role !== "ADMIN") redirect("/dashboard");
  return <BackupPage />;
}
