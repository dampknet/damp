import { prisma }             from "@/lib/prisma";
import { requireMasterAdmin } from "@/lib/auth";
import { getMailSettings }    from "@/lib/system-config";
import NotificationAccessClient from "./NotificationAccessClient";

export default async function NotificationAccessPage() {
  await requireMasterAdmin();

  const [users, recent, failedCount, pendingCount, mail] = await Promise.all([
    prisma.userProfile.findMany({
      orderBy: [{ isMasterAdmin: "desc" }, { role: "asc" }, { email: "asc" }],
      select: {
        id: true, email: true, fullName: true, role: true,
        isMasterAdmin: true, isSuspended: true, canSeeNotifications: true,
        emailAlerts: true, emailAlertKinds: true, alertEmail: true,
      },
    }),
    prisma.emailOutbox.findMany({
      orderBy: { createdAt: "desc" },
      take:    40,
      select:  { id: true, toEmail: true, subject: true, kind: true, status: true, attempts: true, lastError: true, createdAt: true, sentAt: true },
    }),
    prisma.emailOutbox.count({ where: { status: "FAILED" } }),
    prisma.emailOutbox.count({ where: { status: { in: ["PENDING", "SENDING"] } } }),
    getMailSettings(),
  ]);

  return (
    <NotificationAccessClient
      users={users}
      emailReady={!!mail}
      log={recent.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), sentAt: r.sentAt?.toISOString() ?? null }))}
      failedCount={failedCount}
      pendingCount={pendingCount}
    />
  );
}
