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

  try {
    // If updating entityCode, check for duplicates
    if (json.entityCode) {
      const existing = await prisma.assetInstance.findFirst({
        where: {
          entityCode: json.entityCode,
          NOT: { id: instanceId },
        },
      });
      if (existing) {
        return NextResponse.json(
          { message: "This entity code is already assigned to another unit." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.assetInstance.update({
      where: { id: instanceId },
      data: {
        entityCode:   json.entityCode,
        serialNumber: json.serialNumber,   // optional real serial
        condition:    json.condition,
        status:       json.status,
        manufacturer: json.manufacturer,
        model:        json.model,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json(
      { message: "Database error. Check if fields match schema." },
      { status: 500 }
    );
  }
}