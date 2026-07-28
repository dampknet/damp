import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export async function POST() {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await prisma.mqttConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: "No config saved" }, { status: 400 });
    }

    // Test by attempting a WebSocket connection to HiveMQ
    // We use fetch to check if the host is reachable
    const url = `https://${config.clusterUrl}:${config.websocketPort}`;

    try {
      const res = await fetch(url, {
        method:  "GET",
        signal:  AbortSignal.timeout(5000), // 5s timeout
      });
      // HiveMQ returns a 400 on plain HTTP — that means the host IS reachable
      if (res.status === 400 || res.ok) {
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: "Host unreachable" }, { status: 502 });
    } catch {
      // If fetch fails entirely, host is unreachable
      return NextResponse.json({ error: "Cannot reach HiveMQ host" }, { status: 502 });
    }

  } catch (error) {
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}