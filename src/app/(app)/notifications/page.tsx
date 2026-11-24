import { accessOf, notificationScope } from "@/lib/access";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentProfile } from "@/lib/auth";
import { canSeeNotifications } from "@/lib/notifications";
import NotificationsClient from "./NotificationsClient";

const PAGE_SIZE = 50;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string; page?: string }>;
}) {
  const profile = await requireCurrentProfile();
  if (!canSeeNotifications(profile)) redirect("/dashboard");

  const sp     = (await searchParams) ?? {};
  const filter = sp.filter === "unread" ? "unread" : "all";
  const page   = Math.max(1, Number(sp.page) || 1);

  const scope       = notificationScope(accessOf(profile)); // only this user's warehouses
  const unreadWhere = { reads: { none: { userId: profile.id } }, ...scope };
  const where       = filter === "unread" ? unreadWhere : scope;

  const [total, unread, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: unreadWhere }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select: {
        id: true, type: true, title: true, body: true, link: true, actorEmail: true, createdAt: true,
        reads: { where: { userId: profile.id }, select: { readAt: true } },
      },
    }),
  ]);

  return (
    <NotificationsClient
      filter={filter}
      page={page}
      pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      total={total}
      unread={unread}
      items={rows.map(({ reads, createdAt, ...n }) => ({
        ...n,
        createdAt: createdAt.toISOString(),
        read:      reads.length > 0,
        readAt:    reads[0]?.readAt.toISOString() ?? null,
      }))}
    />
  );
}
