import Link from "next/link";
import { prisma } from "@/lib/prisma";
import PrintExportButton from "@/components/PrintExportButton";

type SearchParams = {
  q?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();

  const activities = await prisma.activityLog.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { details: { contains: q, mode: "insensitive" } },
            { actorEmail: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
  });

  const title = q ? `Recent Activity — Search: ${q}` : "Recent Activity";

  const exportRows = activities.map((a, index) => ({
    No: index + 1,
    Time: a.createdAt.toISOString(),
    Title: a.title,
    Details: a.details ?? "",
    By: a.actorEmail ?? "",
    EntityType: a.entityType ?? "",
    EntityId: a.entityId ?? "",
  }));

  const exportCols = [
    { key: "No", label: "No" },
    { key: "Time", label: "Time" },
    { key: "Title", label: "Title" },
    { key: "Details", label: "Details" },
    { key: "By", label: "By" },
    { key: "EntityType", label: "Entity Type" },
    { key: "EntityId", label: "Entity ID" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f2ed]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="rounded-3xl border border-[#e0dbd2] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c8611a]">
                Activity Feed
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#1a1814]">
                Recent Activity
              </h1>
              <p className="mt-2 text-sm font-medium text-[#8b857c]">
                Full log of recent actions across the system.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrintExportButton
                title={title}
                filename="recent-activity.csv"
                rows={exportRows}
                columns={exportCols}
              />
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#e0dbd2] bg-white px-4 py-2 text-sm font-semibold text-[#1a1814] hover:border-[#4a4740]"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <form className="flex items-center gap-2">
              <input
                name="q"
                defaultValue={q}
                placeholder="Search title, details, actor..."
                className="w-full rounded-xl border border-[#e0dbd2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1a1814]"
              />
              <button
                type="submit"
                className="rounded-xl bg-[#1a1814] px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Search
              </button>
              <Link
                href="/activity"
                className="text-sm font-semibold text-[#5b564d] hover:underline"
              >
                Clear
              </Link>
            </form>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#e0dbd2] bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="text-sm font-semibold text-[#1a1814]">Activity Log</div>
            <div className="text-xs font-medium text-[#8b857c]">
              {activities.length} shown
            </div>
          </div>

          <div className="h-px bg-[#eee7dd]" />

          <div className="max-h-[75vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-20 bg-[#f8f4ee] text-left text-[#5b564d] shadow-sm">
                <tr>
                  <th className="px-5 py-3 font-semibold">No</th>
                  <th className="px-5 py-3 font-semibold">Time</th>
                  <th className="px-5 py-3 font-semibold">Title</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                  <th className="px-5 py-3 font-semibold">By</th>
                  <th className="px-5 py-3 font-semibold">Entity</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#eee7dd]">
                {activities.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-12 text-center text-[#8b857c]"
                      colSpan={6}
                    >
                      No activity found
                    </td>
                  </tr>
                ) : (
                  activities.map((a, index) => (
                    <tr key={a.id} className="hover:bg-[#fcfaf7]">
                      <td className="px-5 py-3 font-medium text-[#6b655d]">
                        {index + 1}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {formatDate(a.createdAt)}
                      </td>
                      <td className="px-5 py-3 font-semibold text-[#1a1814]">
                        {a.title}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.details ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.actorEmail ?? "-"}
                      </td>
                      <td className="px-5 py-3 text-[#5d584f]">
                        {a.entityType ?? "-"} {a.entityId ? `(${a.entityId})` : ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}