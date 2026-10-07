import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { prisma }       from "@/lib/prisma";

const ALERT_TYPES       = ["XSS", "SQL_INJECTION", "PATH_TRAVERSAL"];
const MAX_ALERTS_PER_IP = 5;      // per IP per hour; extra hits are dropped, not logged
const MAX_SUMMARY_IPS   = 25;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

function isAuthorized(header: string | null) {
  const secret = process.env.SECURITY_LOG_SECRET;
  if (!secret) {
    console.error("[SECURITY_LOG] SECURITY_LOG_SECRET is not set — security events are not being recorded.");
    return false;
  }
  if (!header) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

async function recordScanner(ip: string, url: string, userAgent: string) {
  const day      = new Date().toISOString().slice(0, 10);
  const entityId = `SCANNER:${day}`;

  const existing = await prisma.activityLog.findFirst({
    where:  { entityType: "SECURITY", entityId },
    select: { id: true, details: true },
  });

  const prevCount = Number(existing?.details?.match(/^(\d+) requests/)?.[1] ?? 0);
  const prevIps   = existing?.details?.match(/\nIPs: (.*)$/)?.[1]?.split(", ").filter(Boolean) ?? [];
  const ips       = prevIps.includes(ip) || prevIps.length >= MAX_SUMMARY_IPS ? prevIps : [...prevIps, ip];
  const count     = prevCount + 1;

  const title   = `🛡️ Scanner traffic blocked (${day}): ${count} request${count === 1 ? "" : "s"}`;
  const details = `${count} requests from ${ips.length}${prevIps.length >= MAX_SUMMARY_IPS ? "+" : ""} IPs blocked with 404.\nLatest: ${url} | IP: ${ip} | Agent: ${userAgent}\nIPs: ${ips.join(", ")}`;

  if (existing) {
    await prisma.activityLog.update({ where: { id: existing.id }, data: { title, details } });
  } else {
    await prisma.activityLog.create({
      data: { type: "SYSTEM_EVENT", title, details, actorEmail: "unknown", entityType: "SECURITY", entityId },
    });
  }
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req.headers.get("x-security-log-secret"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body       = await req.json().catch(() => ({}));
    const type       = clip(body.type, 32);
    const ip         = clip(body.ip, 64) || "unknown";
    const userAgent  = clip(body.userAgent, 100);
    const url        = clip(body.url, 300);
    const detail     = clip(body.detail, 400);
    const actorEmail = clip(body.actorEmail, 254) || "unknown";

    if (type === "SCANNER") {
      await recordScanner(ip, url, userAgent);
      return NextResponse.json({ ok: true });
    }

    if (!ALERT_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const recent = await prisma.activityLog.count({
      where: {
        entityType: "SECURITY",
        entityId:   { in: ALERT_TYPES },
        details:    { contains: `| IP: ${ip} |` },
        createdAt:  { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recent >= MAX_ALERTS_PER_IP) return NextResponse.json({ ok: true, throttled: true });

    await prisma.activityLog.create({
      data: {
        type:       "SYSTEM_EVENT",
        title:      `⚠️ Security Alert: ${type.replace(/_/g, " ")}`,
        details:    `${detail} | IP: ${ip} | Agent: ${userAgent} | URL: ${url}`,
        actorEmail,
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
