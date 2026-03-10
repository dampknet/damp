import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

type AssetStatus = "ACTIVE" | "FAULTY" | "DECOMMISSIONED";

export async function PATCH(req: Request) {
  try {
    const profile = await getCurrentProfile();
    const role = profile?.role ?? "VIEWER";
    const canEdit = role === "ADMIN" || role === "EDITOR";

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      assetId?: string;
      status?: AssetStatus;
    };

    if (!body.assetId || !body.status) {
      return NextResponse.json(
        { error: "assetId and status are required" },
        { status: 400 }
      );
    }

    if (
      body.status !== "ACTIVE" &&
      body.status !== "FAULTY" &&
      body.status !== "DECOMMISSIONED"
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.asset.update({
      where: { id: body.assetId },
      data: { status: body.status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, asset: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update asset status" },
      { status: 500 }
    );
  }
}