import { prisma }  from "@/lib/prisma";
import { redirect } from "next/navigation";
import SetPasswordClient from "./SetPasswordClient";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; email?: string }>;
}) {
  const sp    = (await searchParams) ?? {};
  const token = sp.token ?? "";
  const email = sp.email ?? "";

  if (!token || !email) redirect("/auth/login");

 
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token,
      email:   decodeURIComponent(email),
      expires: { gt: new Date() },
    },
  });

  if (!resetToken) {
    redirect("/auth/login?error=link_expired");
  }

  return <SetPasswordClient token={token} email={decodeURIComponent(email)} />;
}
