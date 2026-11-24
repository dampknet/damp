import { requireSitesArea } from "@/lib/access";

// Every /sites page: the user needs Sites access (master admins always have it).
export default async function SitesLayout({ children }: { children: React.ReactNode }) {
  await requireSitesArea();
  return children;
}
