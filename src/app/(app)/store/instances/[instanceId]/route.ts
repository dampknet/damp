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
    // 1. If we are updating the serial number, check if it already exists elsewhere
    if (json.serialNumber) {
      const existing = await prisma.assetInstance.findFirst({
        where: {
          serialNumber: json.serialNumber,
          NOT: { id: instanceId } // Don't count this specific unit
        }
      });

      if (existing) {
        return NextResponse.json(
          { message: "This serial number is already assigned to another device." }, 
          { status: 400 }
        );
      }
    }

    // 2. Perform the update (includes manufacturer/model if provided)
    const updated = await prisma.assetInstance.update({
      where: { id: instanceId },
      data: {
        serialNumber: json.serialNumber,
        condition: json.condition,
        status: json.status,
        // These are saved but not shown on your main table
        manufacturer: json.manufacturer,
        model: json.model
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