"use client"; // Error boundaries must be client components.

import { PageError } from "@/components/page-error";

// Catches errors on the public site and the customer pages (join, verify,
// ticket). Errors in the root layout itself go to global-error.tsx.
export default function RootError({
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
      homeHref="/"
      homeLabel="Go home"
    />
  );
}
