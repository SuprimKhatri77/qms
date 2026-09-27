"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type PageErrorProps = {
  // What Next hands every error boundary. In production, errors from server
  // components arrive with a generic message and a `digest` (an id that
  // matches the server log), so the real details never reach the browser.
  error: Error & { digest?: string };
  // Next's `unstable_retry`: fetches and renders the failed part again.
  onRetry: () => void;
  // Where "go back" should lead from this part of the app.
  homeHref: string;
  homeLabel: string;
};

// The one "something went wrong" screen every error boundary shows: the
// public site (app/error.tsx), the owner dashboard and the admin panel (their
// own error.tsx, so the sidebar stays), and app/global-error.tsx.
export function PageError({
  error,
  onRetry,
  homeHref,
  homeLabel,
}: PageErrorProps) {
  // Logged in the browser console so a developer can see the real error;
  // the page itself only shows the reference id.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full max-w-[420px]">
        <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">
          Error
        </p>
        <h1 className="mt-2 text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-ink-mute">
          This page couldn&apos;t load. It&apos;s usually temporary, so try
          again. If it keeps happening, come back in a few minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onRetry}>Try again</Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={homeHref} />}
          >
            {homeLabel}
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-6 text-xs text-ink-faint">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
