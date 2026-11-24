import { requireStoreView } from "@/lib/access";

// Every page of one warehouse: the user must be assigned to it (or have All stores).
export default async function WarehouseLayout({ children, params }: { children: React.ReactNode; params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireStoreView(siteId);
  return children;
}
