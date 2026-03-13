import PageLoader from "@/components/PageLoader";

export default function Loading() {
  return (
    <PageLoader
      title="Loading store"
      subtitle="Fetching inventory and stock records..."
    />
  );
}