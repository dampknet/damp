import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import bcrypt           from "bcryptjs";
import { validatePassword } from "@/lib/passwords";

// Invited (non-company) users set their first password from the emailed link.
export async function POST(req: Request) {
  try {
    const body     = await req.json().catch(() => ({}));
    const token    = typeof body.token    === "string" ? body.token    : "";
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Same rules as everywhere else: 8+ characters with a letter and a number.
    const rule = validatePassword(password);
    if (rule) return NextResponse.json({ error: rule }, { status: 400 });

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token, email, expires: { gt: new Date() } },
    });
    if (!resetToken) {
      return NextResponse.json({ error: "Link expired or invalid" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.userProfile.update({
        where: { email },
        data:  { passwordHash: hash, failedLoginCount: 0, lockedUntil: null },
      }),
      // One-time link: remove every outstanding link for this email.
      prisma.passwordResetToken.deleteMany({ where: { email } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SET_PASSWORD]", error);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}
