import PageLoader from "@/components/PageLoader";

export default function Loading() {
  return (
    <PageLoader
      title="Loading assets"
      subtitle="Fetching asset registry and device information..."
    />
  );
}