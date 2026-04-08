import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  const { instanceId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "ADMIN" && profile.role !== "EDITOR")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const json = await req.json();
  const updated = await prisma.assetInstance.update({
    where: { id: instanceId },
    data: json,
  });

  return NextResponse.json(updated);
}