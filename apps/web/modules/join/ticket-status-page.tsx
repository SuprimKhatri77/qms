"use client";

import type { PublicTicketResponse, TicketStatus } from "@repo/types";
import { Logo } from "@/modules/landing/logo";
import { usePublicTicket } from "./hooks/queries/usePublicTicket";

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
    description: "This queue closed before your turn came up.",
  },
};

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
                  : `${ticket.position} people ahead of you`}
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
            </>
          )}

          <p className="mt-6 border-t border-hairline pt-4 text-xs text-ink-mute">
            Token #{ticket.tokenNumber} · {ticket.customerName}
          </p>
        </div>
      </div>
    </div>
  );
}
