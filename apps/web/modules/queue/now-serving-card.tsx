"use client";

import type { QueueTicket } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCallNext } from "./hooks/mutations/useCallNext";
import { useResolveTicket } from "./hooks/mutations/useResolveTicket";

type NowServingCardProps = {
  serving: QueueTicket | null;
  // "Call next" only makes sense when someone is waiting
  hasWaiting: boolean;
};

export function NowServingCard({ serving, hasWaiting }: NowServingCardProps) {
  const callNext = useCallNext();
  const resolveTicket = useResolveTicket();

  const isBusy = callNext.isPending || resolveTicket.isPending;

  if (!serving) {
    return (
      <section className="border border-hairline p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">
          Now serving
        </p>
        <p className="mt-4 text-lg text-ink">Nobody is being served.</p>
        <p className="mt-1 text-sm text-ink-mute">
          {hasWaiting
            ? "Call the next customer when you're ready."
            : "Customers who join and verify their email will appear here."}
        </p>
        <Button
          size="lg"
          className="mt-6"
          disabled={!hasWaiting || isBusy}
          onClick={() => callNext.mutate()}
        >
          {callNext.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Calling...
            </span>
          ) : (
            "Call next"
          )}
        </Button>
      </section>
    );
  }

  return (
    <section className="border border-hairline p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-mute">
        Now serving
      </p>
      <div className="mt-4 flex items-baseline gap-4">
        <span className="text-6xl font-medium tabular-nums tracking-tight text-ink">
          #{serving.tokenNumber}
        </span>
        <span className="text-xl text-ink">{serving.customerName}</span>
      </div>
      {serving.customerPhone ? (
        <p className="mt-2 text-sm text-ink-mute">{serving.customerPhone}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          size="lg"
          disabled={isBusy}
          onClick={() =>
            resolveTicket.mutate({ ticketId: serving.id, outcome: "done" })
          }
        >
          {resolveTicket.isPending &&
          resolveTicket.variables?.outcome === "done" ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Saving...
            </span>
          ) : (
            "Done"
          )}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={isBusy}
          onClick={() =>
            resolveTicket.mutate({ ticketId: serving.id, outcome: "no_show" })
          }
        >
          {resolveTicket.isPending &&
          resolveTicket.variables?.outcome === "no_show" ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Saving...
            </span>
          ) : (
            "No-show"
          )}
        </Button>
      </div>
    </section>
  );
}
