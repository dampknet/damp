import Navbar from "@/components/AppNavbar";
import IdleGuard from "@/components/IdleGuard";
import { requireCurrentProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCurrentProfile();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <IdleGuard />
      <main>{children}</main>
    </div>
  );
}