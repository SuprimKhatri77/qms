"use client"; // Error boundaries must be client components.

import { PageError } from "@/components/page-error";

// The owner dashboard. Sits inside the dashboard layout, so the sidebar stays
// when a page below it fails.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <PageError
      error={error}
      onRetry={unstable_retry}
      homeHref="/shop"
      homeLabel="Back to overview"
    />
  );
}
