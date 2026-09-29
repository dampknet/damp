import { NextResponse } from "next/server";
import { prisma }       from "@/lib/prisma";

export async function POST(req: Request) {
  try {
 
    const internal = req.headers.get("x-internal");
    if (internal !== "1") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, detail, ip, userAgent, url, actorEmail } = await req.json();

    await prisma.activityLog.create({
      data: {
        type:       "SYSTEM_EVENT",
        title:      `⚠️ Security Alert: ${type.replace("_", " ")}`,
        details:    `${detail} | IP: ${ip} | Agent: ${userAgent?.slice(0, 100)} | URL: ${url}`,
        actorEmail: actorEmail ?? "unknown",
        entityType: "SECURITY",
        entityId:   type,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SECURITY_LOG]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}