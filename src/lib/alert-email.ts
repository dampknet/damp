import { prisma } from "@/lib/prisma";
import { sendEmail, baseTemplate } from "@/lib/mailer";
import { accessOf } from "@/lib/access";

// Email alerts. A master admin turns them on per user (Admin → Notification Access) and picks the kinds.
// Every bell notification is checked against those settings; matching users get one email, sent from a
// queue so the action that raised the alert (issue, return, …) is never slowed down or blocked by email.

export const ALERT_KINDS = ["ISSUED", "DELIVERED", "RETURNED", "STOCK"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export const ALERT_KIND_LABEL: Record<AlertKind, string> = {
  ISSUED:    "Issued",
  DELIVERED: "Delivered",
  RETURNED:  "Returned",
  STOCK:     "Low / out of stock",
};

const KIND_OF: Record<string, AlertKind> = {
  ITEM_ISSUED:        "ISSUED",
  DELIVERY_CONFIRMED: "DELIVERED",
  ITEM_RETURNED:      "RETURNED",
  LOW_STOCK:          "STOCK",
  OUT_OF_STOCK:       "STOCK",
};

const MAX_ATTEMPTS = 5;
const RETRY_AFTER  = [1, 5, 15, 60]; // minutes before attempts 2–5
const STUCK_AFTER  = 10;             // minutes: a "sending" email that never finished is tried again

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function appUrl(link: string | null | undefined) {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "");
  if (!base) return null;
  return link && link.startsWith("/") ? base + link : base + "/dashboard";
}

const KIND_COLOR: Record<AlertKind, string> = { ISSUED: "#c8611a", DELIVERED: "#7c3aed", RETURNED: "#0e7490", STOCK: "#b91c1c" };

// Extra facts shown in the email (not stored on the bell notification).
export type AlertDetails = {
  items?: { name: string; qty: string }[];   // e.g. RF Cable — 5 pcs
  rows?:  [string, string | null | undefined][];  // label / value; empty values are skipped
  when?:  Date;
  actorLabel?: string; // e.g. "Issued by" (default "Recorded by")
};

const fmtWhen = (d: Date) =>
  d.toLocaleString("en-GB", { timeZone: "Africa/Accra", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function alertEmailHtml(
  n: { type: string; title: string; body?: string | null; link?: string | null },
  details?: AlertDetails,
  actor?: string | null,
) {
  const kind = KIND_OF[n.type] ?? "ISSUED";
  const url  = appUrl(n.link);
  const rows = [...(details?.rows ?? []), ["Date", fmtWhen(details?.when ?? new Date())] as [string, string], ...(actor ? [[details?.actorLabel ?? "Recorded by", actor] as [string, string]] : [])]
    .filter(([, v]) => v && String(v).trim());
  const cell = "padding:9px 12px;border-bottom:1px solid #f0ebe3;font-size:13px;vertical-align:top;";

  const itemsTable = details?.items?.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #eee7dd;border-radius:10px;margin:0 0 16px;">
      <tr><td style="${cell}background:#faf7f2;font-size:11px;font-weight:700;color:#8b857c;text-transform:uppercase;letter-spacing:.06em;">Item</td>
          <td style="${cell}background:#faf7f2;font-size:11px;font-weight:700;color:#8b857c;text-transform:uppercase;letter-spacing:.06em;text-align:right;">Qty</td></tr>
      ${details.items.map((i) => `<tr><td style="${cell}color:#1a1814;">${esc(i.name)}</td><td style="${cell}color:#1a1814;text-align:right;white-space:nowrap;font-weight:600;">${esc(i.qty)}</td></tr>`).join("")}
    </table>` : "";

  const detailTable = rows.length ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 22px;">
      ${rows.map(([k, v]) => `<tr><td style="${cell}width:34%;color:#8b857c;">${esc(k)}</td><td style="${cell}color:#1a1814;font-weight:600;">${esc(String(v))}</td></tr>`).join("")}
    </table>` : "";

  return baseTemplate(`
    <div style="display:inline-block;background:${KIND_COLOR[kind]};color:#fff;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">
      ${ALERT_KIND_LABEL[kind]}
    </div>
    <h1 style="font-size:20px;line-height:1.3;font-weight:700;color:#1a1814;margin:14px 0 18px;">${esc(n.title)}</h1>
    ${itemsTable}
    ${detailTable}
    ${!details && n.body ? `<p style="color:#4a4740;font-size:14px;line-height:1.55;margin:0 0 22px;">${esc(n.body)}</p>` : ""}
    ${url ? `<a href="${esc(url)}" style="display:inline-block;background:#1a1814;color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:600;">Open in KIMS →</a>` : ""}
  `);
}

// Who should get this alert by email: switched on, wants this kind, active account, and allowed to see
// the warehouse(s) it is about (store access; all stores or one of them assigned).
export async function alertRecipients(type: string, siteIds: string[]) {
  const kind = KIND_OF[type];
  if (!kind) return [];
  const users = await prisma.userProfile.findMany({
    where: {
      emailAlerts:     true,
      emailAlertKinds: { has: kind },
      isSuspended:     false,
      OR: [{ accessExpiresAt: null }, { accessExpiresAt: { gt: new Date() } }],
    },
    select: {
      id: true, email: true, alertEmail: true, role: true, isMasterAdmin: true,
      siteAccess: true, storeAccess: true, allStores: true,
      storeAccessList: { select: { inventorySiteId: true, level: true } },
    },
  });
  return users.filter((u) => {
    const a = accessOf(u);
    if (!a.store) return false;
    if (a.all || !siteIds.length) return true;
    return siteIds.some((id) => a.levels.has(id));
  }).map((u) => ({ userId: u.id, to: (u.alertEmail || u.email).trim().toLowerCase() }));
}

// Called for every bell notification. Never throws.
export async function queueAlertEmails(
  n: { id: string; type: string; title: string; body?: string | null; link?: string | null; inventorySiteId?: string | null; actorEmail?: string | null },
  siteIds?: string[],
  details?: AlertDetails,
) {
  try {
    const kind = KIND_OF[n.type];
    if (!kind) return 0;
    const sites = [...new Set([...(siteIds ?? []), ...(n.inventorySiteId ? [n.inventorySiteId] : [])])];
    const recipients = await alertRecipients(n.type, sites);
    if (!recipients.length) return 0;

    const seen = new Set<string>();
    const rows = recipients.filter((r) => (seen.has(r.to) ? false : (seen.add(r.to), true)));
    const who  = n.actorEmail ? await prisma.userProfile.findUnique({ where: { email: n.actorEmail }, select: { fullName: true } }) : null;
    const actor = n.actorEmail ? (who?.fullName ? `${who.fullName} (${n.actorEmail})` : n.actorEmail) : null;
    const html = alertEmailHtml(n, details, actor);
    await prisma.emailOutbox.createMany({
      data: rows.map((r) => ({
        toEmail: r.to, userId: r.userId, kind, notificationId: n.id,
        subject: `KIMS · ${n.title}`.slice(0, 250), html,
      })),
    });
    kickOutbox();
    return rows.length;
  } catch (e) {
    console.error("[ALERT EMAIL] queue failed:", (e as Error).message);
    return 0;
  }
}

// Send what's due. Each email is claimed first, so two runs never send the same email twice.
export async function processOutbox(limit = 25): Promise<{ sent: number; failed: number }> {
  let sent = 0, failed = 0;
  const now = new Date();
  const due = await prisma.emailOutbox.findMany({
    where:   { status: { in: ["PENDING", "SENDING"] }, nextAttemptAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take:    limit,
    select:  { id: true, status: true, toEmail: true, subject: true, html: true, attempts: true },
  });

  for (const m of due) {
    const claimed = await prisma.emailOutbox.updateMany({
      where: { id: m.id, status: m.status, nextAttemptAt: { lte: now } },
      data:  { status: "SENDING", nextAttemptAt: new Date(Date.now() + STUCK_AFTER * 60_000), attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;

    const attempt = m.attempts + 1;
    try {
      await sendEmail(m.toEmail, m.subject, m.html);
      await prisma.emailOutbox.update({ where: { id: m.id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
      sent++;
    } catch (e) {
      const giveUp = attempt >= MAX_ATTEMPTS;
      const wait   = RETRY_AFTER[Math.min(attempt - 1, RETRY_AFTER.length - 1)];
      await prisma.emailOutbox.update({
        where: { id: m.id },
        data: {
          status:        giveUp ? "FAILED" : "PENDING",
          lastError:     String((e as Error).message ?? e).slice(0, 500),
          nextAttemptAt: new Date(Date.now() + wait * 60_000),
        },
      });
      failed++;
    }
  }
  return { sent, failed };
}

// Fire-and-forget send in the background (one run at a time in this server process),
// plus a slow timer so retries happen even when no new alerts come in.
const g = globalThis as unknown as { __kimsOutboxRunning?: boolean; __kimsOutboxTimer?: ReturnType<typeof setInterval> };

export function kickOutbox() {
  if (g.__kimsOutboxRunning) return;
  g.__kimsOutboxRunning = true;
  processOutbox()
    .catch((e) => console.error("[ALERT EMAIL] send failed:", (e as Error).message))
    .finally(() => { g.__kimsOutboxRunning = false; });
}

if (typeof window === "undefined" && !g.__kimsOutboxTimer && process.env.NODE_ENV === "production") {
  g.__kimsOutboxTimer = setInterval(kickOutbox, 2 * 60_000);
  g.__kimsOutboxTimer.unref?.();
}
