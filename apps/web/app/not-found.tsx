import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

// Shown for any URL that doesn't exist, and whenever a page calls
// notFound(): an unknown shop link (/s/<slug>), a ticket that no longer
// exists, a history day with no queue. Rendered inside the root layout, so
// public pages keep the navbar and footer around it.
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full max-w-[420px]">
        <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">
          404
        </p>
        <h1 className="mt-2 text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
          Page not found
        </h1>
        <p className="mt-3 text-sm text-ink-mute">
          This page doesn&apos;t exist or has moved. If you followed a
          shop&apos;s QR code or link, it may be out of date. Ask the shop for
          their current one.
        </p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
