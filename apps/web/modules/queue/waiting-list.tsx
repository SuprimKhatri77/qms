"use client";

import { useState } from "react";
import type { QueueTicket } from "@repo/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useRemoveTicket } from "./hooks/mutations/useRemoveTicket";

type WaitingListProps = {
  waiting: QueueTicket[];
};

// Names the customer in button labels, so a screen reader hears which row
// each "Remove" belongs to, not just "Remove, Remove, Remove".
function customerLabel(ticket: QueueTicket): string {
  return `#${ticket.tokenNumber} ${ticket.customerName}`;
}

export function WaitingList({ waiting }: WaitingListProps) {
  // Which row is asking "Remove?". Held here rather than in each row so only
  // one row can ask at a time: opening another row's question closes this one.
  const [confirmingTicketId, setConfirmingTicketId] = useState<string | null>(
    null,
  );
  // The row whose question was just answered "Keep". Its Remove button comes
  // back and takes focus, so keyboard users land where they were instead of
  // at the top of the page.
  const [keptTicketId, setKeptTicketId] = useState<string | null>(null);
  const removeTicket = useRemoveTicket();

  function confirmRemove(ticketId: string) {
    removeTicket.mutate(ticketId, {
      // On success the row is gone; on failure the toast explains and the
      // list is re-read. Either way the question has been answered.
      onSettled: () => setConfirmingTicketId(null),
    });
  }

  return (
    <section>
      <h2 className="text-sm font-medium text-ink">
        Waiting{" "}
        <span className="font-normal text-ink-mute">({waiting.length})</span>
      </h2>

      {waiting.length === 0 ? (
        <p className="mt-3 border border-hairline p-6 text-sm text-ink-mute">
          No one is waiting.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-hairline border border-hairline">
          {waiting.map((ticket, index) => (
            <li
              key={ticket.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex items-baseline gap-4">
                <span className="w-12 font-mono text-sm tabular-nums text-ink-mute">
                  #{ticket.tokenNumber}
                </span>
                <span className="text-sm text-ink">{ticket.customerName}</span>
                {ticket.customerPhone ? (
                  <span className="text-xs text-ink-mute">
                    {ticket.customerPhone}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {index === 0 ? (
                  <span className="text-xs font-medium text-primary-deep">
                    Next up
                  </span>
                ) : null}
                {confirmingTicketId === ticket.id ? (
                  <RemoveConfirm
                    ticket={ticket}
                    isRemoving={removeTicket.isPending}
                    onConfirm={() => confirmRemove(ticket.id)}
                    onKeep={() => {
                      setConfirmingTicketId(null);
                      setKeptTicketId(ticket.id);
                    }}
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-ink-mute"
                    disabled={removeTicket.isPending}
                    aria-label={`Remove ${customerLabel(ticket)} from the queue`}
                    autoFocus={keptTicketId === ticket.id}
                    onClick={() => {
                      setKeptTicketId(null);
                      setConfirmingTicketId(ticket.id);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

type RemoveConfirmProps = {
  ticket: QueueTicket;
  isRemoving: boolean;
  onConfirm: () => void;
  onKeep: () => void;
};

// The inline "are you sure?" step, like the customer's own "Leave the
// queue" button. Removing can't be undone (the customer would have to join
// again at the back), so one stray click shouldn't be enough.
function RemoveConfirm({
  ticket,
  isRemoving,
  onConfirm,
  onKeep,
}: RemoveConfirmProps) {
  const label = customerLabel(ticket);

  return (
    <div
      role="group"
      aria-label={`Remove ${label}?`}
      className="flex items-center gap-2"
      // Escape backs out, like closing any other "are you sure?" prompt.
      onKeyDown={(event) => {
        if (event.key === "Escape" && !isRemoving) {
          onKeep();
        }
      }}
    >
      <span className="text-sm text-ink">Remove?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={isRemoving}
        // Stays focusable while the request runs, so focus isn't dropped to
        // the page, and the label says what's happening for screen readers
        // (it replaces the visible "Removing..." text for them).
        focusableWhenDisabled
        aria-label={isRemoving ? `Removing ${label}` : `Yes, remove ${label}`}
        onClick={onConfirm}
      >
        {isRemoving ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Removing...
          </span>
        ) : (
          "Yes, remove"
        )}
      </Button>
      {/* The "Remove" button that had focus is gone now, so focus lands on
          the safe choice instead of dropping back to the top of the page. */}
      <Button
        variant="outline"
        size="sm"
        disabled={isRemoving}
        aria-label={`Keep ${label} in the queue`}
        onClick={onKeep}
        autoFocus
      >
        Keep
      </Button>
    </div>
  );
}
