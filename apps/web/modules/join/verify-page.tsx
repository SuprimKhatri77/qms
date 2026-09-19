"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useVerifyTicket } from "./hooks/mutations/useVerifyTicket";

export function VerifyPage({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verifyTicket = useVerifyTicket();
  // Effects can run twice in development; a ref keeps a valid token from
  // being spent (or a used one from re-erroring) on the second run.
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!token || hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    verifyTicket.mutate(token, {
      onSuccess: (result) => {
        router.replace(`/s/${slug}/ticket/${result.data.ticket.id}`);
      },
    });
    // Only ever runs once, for the token this page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-[360px]">
        {!token || verifyTicket.isError ? (
          <>
            <h1 className="text-xl font-medium text-ink">
              {token ? "This link isn't valid" : "Missing confirmation link"}
            </h1>
            <p className="mt-3 text-sm text-ink-mute">
              {verifyTicket.error?.response?.data.message ||
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
        ) : (
          <>
            <Spinner className="mx-auto size-6" />
            <p className="mt-4 text-sm text-ink-mute">
              Confirming your spot...
            </p>
          </>
        )}
      </div>
    </div>
  );
}
