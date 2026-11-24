import { requireSitesArea } from "@/lib/access";

// Every /assets page: the user needs Sites access (master admins always have it).
export default async function AssetsLayout({ children }: { children: React.ReactNode }) {
  await requireSitesArea();
  return children;
}
