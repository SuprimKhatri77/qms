"use client"; // Error boundaries must be client components.

import "./globals.css";
import { PageError } from "@/components/page-error";

// The last line of defence: catches errors thrown by the root layout itself,
// which app/error.tsx can't (it sits inside that layout), and shows them
// instead of Next's bare default screen. (An API outage during the layout's
// "who is signed in?" lookup no longer ends up here: that lookup falls back
// to the signed-out navbar.) It replaces the whole root layout, so it brings
// its own <html>, <body>, styles and <title> (metadata exports aren't allowed
// in error boundaries).
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-canvas font-sans text-ink">
        <title>Something went wrong · Queueup</title>
        <PageError
          error={error}
          onRetry={unstable_retry}
          homeHref="/"
          homeLabel="Go home"
        />
      </body>
    </html>
  );
}
