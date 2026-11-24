import { accessOf, notificationScope } from "@/lib/access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeNotifications } from "@/lib/notifications";

// GET /api/notifications?limit=10  → { unread, items: [...] } for the bell.
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeNotifications(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scope = notificationScope(accessOf(profile)); // only this user's warehouses
  const limit = Math.min(50, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 10));

  const [unread, rows] = await Promise.all([
    prisma.notification.count({ where: { reads: { none: { userId: profile.id } }, ...scope } }),
    prisma.notification.findMany({
      where:   scope,
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id: true, type: true, title: true, body: true, link: true, createdAt: true,
        reads: { where: { userId: profile.id }, select: { id: true } },
      },
    }),
  ]);

  return NextResponse.json(
    {
      unread,
      items: rows.map(({ reads, createdAt, ...n }) => ({
        ...n,
        createdAt: createdAt.toISOString(),
        read:      reads.length > 0,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
