import { requireStoreArea } from "@/lib/access";

// Every /store page: the user needs Store access (master admins always have it).
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  await requireStoreArea();
  return children;
}
