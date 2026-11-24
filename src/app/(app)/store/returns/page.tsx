import { accessOf, storeFilter } from "@/lib/access";
import { requireCurrentProfile, isEditorProfile } from "@/lib/auth";
import { getAwaitingReturns } from "@/lib/deliveries";
import AwaitingReturnsClient from "./AwaitingReturnsClient";

export default async function AwaitingReturnsPage() {
  const profile = await requireCurrentProfile();
  const rows    = await getAwaitingReturns({ inventorySiteId: storeFilter(accessOf(profile)) });
  return <AwaitingReturnsClient rows={rows} canReceive={isEditorProfile(profile)} />;
}
