import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";
import bcrypt           from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, email, password } = await req.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password too short" }, { status: 400 });
    }

    
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token, email, expires: { gt: new Date() } },
    });
    if (!resetToken) {
      return NextResponse.json({ error: "Link expired or invalid" }, { status: 400 });
    }

   
    const hash = await bcrypt.hash(password, 12);
    await prisma.userProfile.update({
      where: { email },
      data:  { passwordHash: hash },
    });

    
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SET_PASSWORD]", error);
    return NextResponse.json({ error: "Failed to set password" }, { status: 500 });
  }
}