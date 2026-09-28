"use client";

import Link from "next/link";
import type { PublicTicketResponse, TicketStatus } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Logo } from "@/modules/landing/logo";
import { usePublicTicket } from "./hooks/queries/usePublicTicket";
import { LeaveQueueButton } from "./leave-queue-button";

type TicketStatusPageProps = {
  ticketId: string;
  initialData: PublicTicketResponse["data"];
};

// Shown for every status except "waiting", which gets its own big-number
// layout below.
const STATUS_COPY: Partial<
  Record<TicketStatus, { title: string; description: string }>
> = {
  pending_verification: {
    title: "Check your email",
    description: "Click the confirmation link we sent you to join the line.",
  },
  serving: {
    title: "It's your turn!",
    description: "Please head to the counter now.",
  },
  done: {
    title: "You've been served",
    description: "Thanks for visiting — come again!",
  },
  no_show: {
    title: "Marked as a no-show",
    description: "You missed your turn. Ask at the counter if you can rejoin.",
  },
  cancelled: {
    title: "Ticket cancelled",
    description: "This ticket is no longer active.",
  },
  expired: {
    title: "Ticket expired",
    // Covers both ways a ticket expires: the confirmation link ran out
    // before it was clicked, or the queue ended before the ticket was called.
    description:
      "You didn't confirm in time, or the queue closed before your turn.",
  },
};

// Still in line: the customer may leave. Once they're being served it's
// the owner's call, so the button disappears.
const LEAVABLE_STATUSES = new Set<TicketStatus>([
  "pending_verification",
  "waiting",
]);

// Finished without being served: offer a way back into the queue.
const REJOINABLE_STATUSES = new Set<TicketStatus>([
  "cancelled",
  "expired",
  "no_show",
]);

export function TicketStatusPage({
  ticketId,
  initialData,
}: TicketStatusPageProps) {
  const { data } = usePublicTicket(ticketId, initialData);
  const { ticket, shop } = data;
  const copy = STATUS_COPY[ticket.status];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-full max-w-[400px]">
        <Logo className="mx-auto mb-4 justify-center" />
        <p className="text-sm text-ink-mute">{shop.name}</p>

        <div className="mt-4 rounded-none border border-hairline bg-canvas p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          {ticket.status === "waiting" && ticket.position !== null ? (
            <>
              <p className="text-xs font-medium tracking-wide text-ink-mute uppercase">
                {ticket.position === 1 ? "You're next" : "Your position"}
              </p>
              <p className="mt-2 font-mono text-6xl font-medium tabular-nums text-ink">
                {ticket.position}
              </p>
              <p className="mt-2 text-sm text-ink-mute">
                {ticket.position === 1
                  ? "Please stay nearby."
                  : peopleAheadText(ticket.position - 1)}
                {ticket.etaMinutes ? ` · about ${ticket.etaMinutes} min` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-ink">
                {copy?.title ?? "Ticket update"}
              </p>
              <p className="mt-2 text-sm text-ink-mute">
                {copy?.description ?? ""}
              </p>
              {REJOINABLE_STATUSES.has(ticket.status) ? (
                <Button
                  className="mt-6"
                  nativeButton={false}
                  render={<Link href={`/s/${shop.slug}`} />}
                >
                  Join again
                </Button>
              ) : null}
            </>
          )}

          <p className="mt-6 border-t border-hairline pt-4 text-xs text-ink-mute">
            Token #{ticket.tokenNumber} · {ticket.customerName}
          </p>

          {LEAVABLE_STATUSES.has(ticket.status) ? (
            <LeaveQueueButton ticketId={ticket.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Position 1 means "next", so the number of people waiting in front is one
// less than the position.
function peopleAheadText(peopleAhead: number): string {
  return peopleAhead === 1
    ? "1 person ahead of you"
    : `${peopleAhead} people ahead of you`;
}
