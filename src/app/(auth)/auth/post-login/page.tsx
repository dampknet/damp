import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export default async function PostLogin() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/auth/login");

  if (profile.role === "ADMIN") redirect("/dashboard");

  redirect("/dashboard");
}
