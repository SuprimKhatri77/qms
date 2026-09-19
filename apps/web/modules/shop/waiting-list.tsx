import type { QueueTicket } from "@repo/types";

type WaitingListProps = {
  waiting: QueueTicket[];
};

export function WaitingList({ waiting }: WaitingListProps) {
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
              className="flex items-center justify-between gap-4 px-4 py-3"
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
              {index === 0 ? (
                <span className="text-xs font-medium text-primary-deep">
                  Next up
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
