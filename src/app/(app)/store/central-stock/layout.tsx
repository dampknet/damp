import { requireMasterAdmin } from "@/lib/auth";

// Central Stock is hidden from the app; only master admins can still open it by address.
export default async function CentralStockLayout({ children }: { children: React.ReactNode }) {
  await requireMasterAdmin();
  return children;
}
