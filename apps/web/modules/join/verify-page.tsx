"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { RateLimitNotice } from "@/components/rate-limit-notice";
import { isBlockedNow, useRetryCountdown } from "@/hooks/use-retry-countdown";
import { getRetryAfterSeconds } from "@/lib/rate-limit";
import { useVerifyTicket } from "./hooks/mutations/useVerifyTicket";

const VERIFY_BLOCK_KEY = "rate-limit:verify";

export function VerifyPage({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyTicket = useVerifyTicket();
  const retryCountdown = useRetryCountdown(VERIFY_BLOCK_KEY);
  const secondsLeft = token ? retryCountdown.secondsLeftFor(token) : 0;
  const isBlocked = secondsLeft > 0;
  // Effects can run twice in development; a ref keeps a valid token from
  // being spent (or a used one from re-erroring) on the second run.
  const hasStarted = useRef(false);

  function confirmSpot(ticketToken: string) {
    verifyTicket.mutate(ticketToken, {
      onSuccess: (result) => {
        router.replace(`/s/${slug}/ticket/${result.data.ticket.id}`);
      },
      onError: (error) => {
        const retryAfter = getRetryAfterSeconds(error);
        if (retryAfter !== null) {
          retryCountdown.start(retryAfter, ticketToken);
          // Lets the effect below try again once the countdown ends.
          hasStarted.current = false;
        }
      },
    });
  }

  // Confirms the spot as soon as the page opens, and again by itself when a
  // rate-limit countdown ends: the same thing opening the link does, just
  // later. Re-runs when `isBlocked` changes for that reason.
  useEffect(() => {
    if (!token || hasStarted.current) {
      return;
    }

    // Read straight from the store, not from `isBlocked`: on the very first
    // render after a reload, the saved block isn't in React's state yet, and
    // a request sent now would only be refused again.
    if (isBlockedNow(VERIFY_BLOCK_KEY, token)) {
      return;
    }

    hasStarted.current = true;
    confirmSpot(token);
    // confirmSpot is left out on purpose: it's a new function every render,
    // and this must only run when the token or the block changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isBlocked]);

  if (!token) {
    return (
      <VerifyShell>
        <InvalidLink slug={slug} title="Missing confirmation link" />
      </VerifyShell>
    );
  }

  if (isBlocked) {
    return (
      <VerifyShell>
        <h1 className="text-xl font-medium text-ink">Almost there</h1>
        <div className="mt-4 text-left">
          <RateLimitNotice
            secondsLeft={secondsLeft}
            retryLabel="We'll try again automatically in"
          />
        </div>
        <p className="mt-4 text-sm text-ink-mute">Keep this page open.</p>
      </VerifyShell>
    );
  }

  // A 429 here means the countdown has just ended and the retry is about to
  // go out, so it's shown as "confirming", not as a broken link.
  if (
    verifyTicket.isError &&
    getRetryAfterSeconds(verifyTicket.error) === null
  ) {
    return (
      <VerifyShell>
        <InvalidLink
          slug={slug}
          title="This link isn't valid"
          message={verifyTicket.error.response?.data.message}
        />
      </VerifyShell>
    );
  }

  // Before the first request goes out, while it's in flight, and while
  // redirecting on success.
  return (
    <VerifyShell>
      <Confirming />
    </VerifyShell>
  );
}

function VerifyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-[360px]">{children}</div>
    </div>
  );
}

function Confirming() {
  return (
    <>
      <Spinner className="mx-auto size-6" />
      <p className="mt-4 text-sm text-ink-mute">Confirming your spot...</p>
    </>
  );
}

function InvalidLink({
  slug,
  title,
  message,
}: {
  slug: string;
  title: string;
  message?: string;
}) {
  return (
    <>
      <h1 className="text-xl font-medium text-ink">{title}</h1>
      <p className="mt-3 text-sm text-ink-mute">
        {message ||
          "It may have expired, or already been used. You can join the queue again."}
      </p>
      <Button
        className="mt-6"
        nativeButton={false}
        render={<Link href={`/s/${slug}`} />}
      >
        Join the queue
      </Button>
    </>
  );
}
