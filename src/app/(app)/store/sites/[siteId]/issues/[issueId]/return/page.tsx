import { redirect } from "next/navigation";

// Returns now happen in the "Receive returned items" window on the issue log
// (supports partial returns and puts units back into stock correctly).
// This address is kept so old links and bookmarks still work.
export default async function ReturnItemPage({
  params,
}: {
  params: Promise<{ siteId: string; issueId: string }>;
}) {
  const { siteId, issueId } = await params;
  redirect(`/store/sites/${siteId}/issues?return=${encodeURIComponent(issueId)}`);
}
