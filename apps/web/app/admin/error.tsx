"use client"; // Error boundaries must be client components.

import { PageError } from "@/components/page-error";

// The admin panel. Sits inside the admin layout, so the sidebar stays
// when a page below it fails.
export default function AdminError({
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
      homeHref="/admin"
      homeLabel="Back to shops"
    />
  );
}
