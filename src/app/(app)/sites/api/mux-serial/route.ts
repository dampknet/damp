import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MuxKey = "MUX1" | "MUX2" | "MUX3";

export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as {
      siteId?: string;
      mux?: MuxKey;
      serial?: string | null;
    };

    if (!body.siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }
    if (!body.mux) {
      return NextResponse.json({ error: "mux is required" }, { status: 400 });
    }

    const serial =
      body.serial === null ? null : String(body.serial ?? "").trim() || null;

    const data =
      body.mux === "MUX1"
        ? { txMux1Serial: serial }
        : body.mux === "MUX2"
        ? { txMux2Serial: serial }
        : { txMux3Serial: serial };

    const updated = await prisma.site.update({
      where: { id: body.siteId },
      data,
      select: { id: true, txMux1Serial: true, txMux2Serial: true, txMux3Serial: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: "Failed to update mux serial" }, { status: 500 });
  }
}