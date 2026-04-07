import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { EquipmentCondition, InventoryItemStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "EDITOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { instanceId, status, condition } = body;

    if (!instanceId) {
      return NextResponse.json({ error: "Instance ID is required" }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status) updateData.status = status as InventoryItemStatus;
    if (condition) updateData.condition = condition as EquipmentCondition;

    const updatedInstance = await prisma.assetInstance.update({
      where: { id: instanceId },
      data: updateData,
      include: {
        inventoryItem: true // To get the name for the log
      }
    });

    // LOG THE ACTIVITY
    await prisma.activityLog.create({
      data: {
        type: "ASSET_STATUS_CHANGED",
        title: `Unit ${updatedInstance.serialNumber} Updated`,
        details: `Status: ${status || 'no change'} | Condition: ${condition || 'no change'}`,
        entityType: "INVENTORY_ITEM",
        entityId: updatedInstance.inventoryItemId,
        actorEmail: profile.email,
      },
    });

    return NextResponse.json({ ok: true, instance: updatedInstance });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Failed to update unit details" }, { status: 500 });
  }
}