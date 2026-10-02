import { redirect }         from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions }      from "@/app/api/auth/[...nextauth]/route";
import { prisma }           from "@/lib/prisma";
import ChangePasswordClient from "./ChangePasswordClient";

export default async function ChangePasswordPage() {
  const session = await getServerSession(authOptions);
  const email   = session?.user?.email?.toLowerCase();
  if (!email) redirect("/auth/login");

  const profile = await prisma.userProfile.findUnique({
    where:  { email },
    select: { email: true, passwordHash: true, mustChangePassword: true, isSuspended: true },
  });

  if (!profile || profile.isSuspended) redirect("/auth/login");
  if (!profile.passwordHash)           redirect("/dashboard");

  return <ChangePasswordClient email={profile.email} forced={profile.mustChangePassword} />;
}
