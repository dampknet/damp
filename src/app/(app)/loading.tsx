import PageLoader from "@/components/PageLoader";

export default function Loading() {
  return (
    <PageLoader
      title="Loading workspace"
      subtitle="Please wait while we fetch the latest records..."
    />
  );
}