import { accessOf, notificationScope } from "@/lib/access";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { canSeeNotifications } from "@/lib/notifications";

// POST /api/notifications/read  { id } marks one as read; { all: true } marks everything read.
// Reading only hides the alert for this user — the notification itself stays in history.
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canSeeNotifications(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  if (body?.all === true) {
    const unread = await prisma.notification.findMany({
      where:  { reads: { none: { userId: profile.id } }, ...notificationScope(accessOf(profile)) },
      select: { id: true },
    });
    if (unread.length) {
      await prisma.notificationRead.createMany({
        data:           unread.map((n) => ({ notificationId: n.id, userId: profile.id })),
        skipDuplicates: true,
      });
    }
    return NextResponse.json({ ok: true, marked: unread.length });
  }

  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await prisma.notificationRead.createMany({
      data:           [{ notificationId: id, userId: profile.id }],
      skipDuplicates: true,
    });
  } catch {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
