import { PageSkeleton } from "@/components/ui/skeleton";

// Segment-level Suspense fallback: navigation paints this immediately instead
// of waiting on the server component's data, which is what makes tapping
// through the app feel instant even when a query is slow.
export default function Loading() {
  return <PageSkeleton />;
}
