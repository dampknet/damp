import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      siteId?: string;
      status?: "ACTIVE" | "DOWN";
    };

    if (!body.siteId || !body.status) {
      return NextResponse.json(
        { error: "siteId and status are required" },
        { status: 400 }
      );
    }

    if (body.status !== "ACTIVE" && body.status !== "DOWN") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data: { status: body.status },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, site: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update site status" },
      { status: 500 }
    );
  }
}
