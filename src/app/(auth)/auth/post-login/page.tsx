import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export default async function PostLogin() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/auth/login");

  await logActivity({
    type: "USER_LOGIN",
    title: "User signed in",
    details: `${profile.fullName ?? profile.email} signed into the platform`,
    actorEmail: profile.email,
    entityType: "USER",
    entityId: profile.id,
  });

  redirect("/dashboard");
}