import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function progressWidthClass(width: number) {
  const safe = Math.max(0, Math.min(100, width));
  const rounded = Math.round(safe / 5) * 5;

  switch (rounded) {
    case 0:
      return "w-0";
    case 5:
      return "w-[5%]";
    case 10:
      return "w-[10%]";
    case 15:
      return "w-[15%]";
    case 20:
      return "w-[20%]";
    case 25:
      return "w-[25%]";
    case 30:
      return "w-[30%]";
    case 35:
      return "w-[35%]";
    case 40:
      return "w-[40%]";
    case 45:
      return "w-[45%]";
    case 50:
      return "w-[50%]";
    case 55:
      return "w-[55%]";
    case 60:
      return "w-[60%]";
    case 65:
      return "w-[65%]";
    case 70:
      return "w-[70%]";
    case 75:
      return "w-[75%]";
    case 80:
      return "w-[80%]";
    case 85:
      return "w-[85%]";
    case 90:
      return "w-[90%]";
    case 95:
      return "w-[95%]";
    case 100:
      return "w-full";
    default:
      return "w-0";
  }
}

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const role = profile?.role ?? "VIEWER";

  const [
    sites,
    sitesActive,
    sitesDown,
    airSites,
    liquidSites,
    knetSites,
    gbcSites,
    assets,
    storeTotal,
    received,
    notReceived,
    recentActivity,
  ] = await Promise.all([
    prisma.site.count(),
    prisma.site.count({ where: { status: "ACTIVE" } }),
    prisma.site.count({ where: { status: "DOWN" } }),
    prisma.site.count({ where: { transmitterType: "AIR" } }),
    prisma.site.count({ where: { transmitterType: "LIQUID" } }),
    prisma.site.count({ where: { towerType: "KNET" } }),
    prisma.site.count({ where: { towerType: "GBC" } }),
    prisma.asset.count(),
    prisma.storeItem.count(),
    prisma.storeItem.count({ where: { status: "RECEIVED" } }),
    prisma.storeItem.count({ where: { status: "NOT_RECEIVED" } }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const activePct = percent(sitesActive, sites);
  const airPct = percent(airSites, sites);
  const knetPct = percent(knetSites, sites);
  const receivedPct = percent(received, storeTotal);

  const displayName =
    profile?.fullName?.trim() || profile?.email?.split("@")[0] || "User";

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-8 flex flex-col gap-5 border-b border-[#e0dbd2] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]">
              March 2026
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#1a1814]">
              Asset Dashboard
            </h1>
            <p className="mt-2 text-sm font-medium text-[#8b857c]">
              Welcome back, {displayName}. Here is a live summary of your sites,
              assets and store activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/sites"
              className="rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] transition hover:border-[#4a4740]"
            >
              Go to Sites
            </Link>
            <Link
              href="/store"
              className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2c2823]"
            >
              Go to Store
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/sites"
            label="Total Sites"
            value={String(sites)}
            stripe="bg-[#1d5fa8]"
            tag={`${sites} total`}
            tagClass="bg-[#e8f0fb] text-[#1d5fa8]"
            meta="registered in system"
          />

          <KpiCard
            href="/sites?group=status"
            label="Active / Down"
            value={`${sitesActive} / ${sitesDown}`}
            stripe="bg-[#2a7d52]"
            tag={`${sitesDown} offline`}
            tagClass="bg-[#fdecea] text-[#c0392b]"
            meta="view grouped status"
          />

          <KpiCard
            href="/sites?group=tt"
            label="Air / Liquid"
            value={`${airSites} / ${liquidSites}`}
            stripe="bg-[#b08b2c]"
            tag={`${airPct}% air`}
            tagClass="bg-[#fdf6e3] text-[#b08b2c]"
            meta="view grouped cooling"
          />

          <KpiCard
            href="/sites?group=tower"
            label="KNET / GBC"
            value={`${knetSites} / ${gbcSites}`}
            stripe="bg-[#c8611a]"
            tag={`${knetPct}% KNET`}
            tagClass="bg-[#fdf0e6] text-[#c8611a]"
            meta="view grouped towers"
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <Card title="Assets" rightTag={`${assets} total`} href="/assets">
            <ProgressRow
              label="Utilization"
              value={`${sites ? percent(assets, Math.max(assets, 1)) : 0}%`}
              width={94}
              fill="bg-[#1a1814]"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniStat
                label="Registered Assets"
                value={String(assets)}
                valueClass="text-[#2a7d52]"
              />
              <MiniStat
                label="Site Records"
                value={String(sites)}
                valueClass="text-[#b08b2c]"
              />
            </div>
          </Card>

          <Card title="Store" rightTag={`${storeTotal} items`}>
            <StoreRow
              label="Received"
              value={String(received)}
              valueClass="text-[#2a7d52]"
            />
            <StoreRow
              label="Pending"
              value={String(notReceived)}
              valueClass="text-[#c8611a]"
            />

            <div className="mt-4">
              <ProgressRow
                label="Fulfilment rate"
                value={`${receivedPct}%`}
                width={receivedPct}
                fill="bg-[#2a7d52]"
              />
            </div>
          </Card>

          <Card title="Site Health" rightTag={`${activePct}% up`}>
            <ProgressRow
              label="Active"
              value={`${sitesActive} / ${sites}`}
              width={activePct}
              fill="bg-[#2a7d52]"
            />
            <ProgressRow
              label="Air-cooled"
              value={`${airSites} / ${sites}`}
              width={airPct}
              fill="bg-[#1d5fa8]"
            />
            <ProgressRow
              label="KNET"
              value={`${knetSites} / ${sites}`}
              width={knetPct}
              fill="bg-[#c8611a]"
            />
          </Card>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          <Card
            title="Recent Activity"
            action={
              <Link
                href="/activity"
                className="text-xs font-bold text-[#c8611a] hover:underline"
              >
                View all →
              </Link>
            }
            href="/activity"
          >
            <div className="space-y-1">
              {recentActivity.length === 0 ? (
                <div className="py-8 text-sm text-[#8b857c]">
                  No recent activity yet.
                </div>
              ) : (
                recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border-b border-[#e9e2d8] py-3 last:border-b-0"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-[#c8611a]" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[#1a1814]">
                        {item.title}
                      </div>
                      {item.details ? (
                        <div className="mt-1 text-sm text-[#6f6a62]">
                          {item.details}
                        </div>
                      ) : null}
                      {item.actorEmail ? (
                        <div className="mt-1 text-xs font-medium text-[#9c9890]">
                          By {item.actorEmail}
                        </div>
                      ) : null}
                    </div>
                    <div className="whitespace-nowrap pt-0.5 text-xs font-semibold text-[#9c9890]">
                      {formatRelative(item.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Quick Actions">
            <QuickAction
              href="/sites"
              title="Go to Sites"
              subtitle={`Manage all ${sites} sites`}
              iconBg="bg-[#e8f0fb]"
              iconColor="text-[#1d5fa8]"
            />
            <QuickAction
              href="/store"
              title="Go to Store"
              subtitle={`${storeTotal} items · ${notReceived} pending`}
              iconBg="bg-[#fdf6e3]"
              iconColor="text-[#b08b2c]"
            />
            <QuickAction
              href="/sites?group=status"
              title="Review Down Sites"
              subtitle={`${sitesDown} currently offline`}
              iconBg="bg-[#fdecea]"
              iconColor="text-[#c0392b]"
            />
          </Card>
        </div>

        <div className="mt-6 text-xs font-medium text-[#9c9890]">
          Signed in as{" "}
          <span className="font-semibold text-[#1a1814]">{role}</span>
          {profile?.email ? <> • {profile.email}</> : null}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  href,
  label,
  value,
  stripe,
  tag,
  tagClass,
  meta,
}: {
  href?: string;
  label: string;
  value: string;
  stripe: string;
  tag: string;
  tagClass: string;
  meta: string;
}) {
  const content = (
    <div className="overflow-hidden rounded-2xl border border-[#e0dbd2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`h-1 ${stripe}`} />
      <div className="p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9c9890]">
          {label}
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight text-[#1a1814]">
          {value}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-[#eee7dd] pt-3">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${tagClass}`}
          >
            {tag}
          </span>
          <span className="text-xs font-medium text-[#9c9890]">{meta}</span>
        </div>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function Card({
  title,
  rightTag,
  action,
  children,
  href,
}: {
  title: string;
  rightTag?: string;
  action?: ReactNode;
  children: ReactNode;
  href?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-[#e0dbd2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-lg font-semibold tracking-tight text-[#1a1814]">
          {title}
        </div>
        {action ? (
          action
        ) : rightTag ? (
          <span className="rounded-full bg-[#f1ece4] px-2.5 py-1 text-[11px] font-bold text-[#5b564d]">
            {rightTag}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

function ProgressRow({
  label,
  value,
  width,
  fill,
}: {
  label: string;
  value: string;
  width: number;
  fill: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-[#5d584f]">{label}</span>
        <span className="text-sm font-semibold text-[#1a1814]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eee7dd]">
        <div
          className={`h-full rounded-full ${fill} ${progressWidthClass(width)}`}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-[#f5f2ed] px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#9c9890]">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          valueClass ?? "text-[#1a1814]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StoreRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#eee7dd] py-3 last:border-b-0">
      <div className="text-sm font-medium text-[#5d584f]">{label}</div>
      <div
        className={`text-xl font-semibold tracking-tight ${
          valueClass ?? "text-[#1a1814]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  subtitle,
  iconBg,
  iconColor,
}: {
  href: string;
  title: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="mb-3 flex items-center gap-3 rounded-xl border border-[#e0dbd2] bg-white p-4 transition hover:border-[#6b655d] hover:bg-[#faf8f4] last:mb-0"
    >
      <div className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}>
        <span className={`text-sm font-bold ${iconColor}`}>→</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-[#1a1814]">{title}</div>
        <div className="mt-0.5 text-xs font-medium text-[#8b857c]">
          {subtitle}
        </div>
      </div>
      <span className="text-lg text-[#9c9890]">›</span>
    </Link>
  );
}