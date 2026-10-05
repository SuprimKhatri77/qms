"use client";

import type { OpeningHoursStatus, ShopQueue } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSetQueueStatus } from "./hooks/mutations/useSetQueueStatus";

// The owner's Close wins over the opening hours: a queue closed before
// opening time won't open at all today.
function badgeLabel(
  hoursStatus: OpeningHoursStatus,
  isClosed: boolean,
): string {
  if (isClosed) {
    return "Closed";
  }
  if (hoursStatus === "before_opening") {
    return "Not open yet";
  }
  return hoursStatus === "open" ? "Open" : "Closed";
}

// The line under the bar explaining why nobody new can join, if they can't.
function StatusNote({
  hoursStatus,
  isClosed,
  openingTime,
  closingTime,
}: {
  hoursStatus: OpeningHoursStatus;
  isClosed: boolean;
  openingTime: string | null;
  closingTime: string | null;
}) {
  if (isClosed) {
    return (
      <p className="text-sm text-ink-mute">
        New customers can&apos;t join. You can still serve everyone already
        waiting.
      </p>
    );
  }

  if (hoursStatus === "before_opening") {
    return (
      <p className="text-sm text-ink-mute">
        Customers can join from {openingTime}. You can change your opening time
        in Settings.
      </p>
    );
  }

  if (hoursStatus === "after_closing") {
    return (
      <p className="text-sm text-ink-mute">
        Your closing time ({closingTime}) has passed, so new customers
        can&apos;t join. You can still serve everyone already waiting.
      </p>
    );
  }

  return null;
}

type QueueStatusBarProps = {
  queue: ShopQueue;
  // Whether it's within the shop's opening hours right now, and the hours
  // themselves. They come together with every queue poll, so the message
  // changes on its own at the opening time and always matches the times.
  hoursStatus: OpeningHoursStatus;
  openingTime: string | null;
  closingTime: string | null;
};

// The date of today's queue, whether it's open to new customers, and the
// button that flips it. No "are you sure?": it can be undone with one click.
//
// Outside the shop's opening hours nobody can join whatever the switch
// says, so the badge and the note follow the hours first.
export function QueueStatusBar({
  queue,
  hoursStatus,
  openingTime,
  closingTime,
}: QueueStatusBarProps) {
  const setQueueStatus = useSetQueueStatus();
  const isClosed = queue.status === "closed";
  const buttonLabel = isClosed ? "Reopen queue" : "Close queue";
  const acceptingCustomers = hoursStatus === "open" && !isClosed;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-mute">Queue for {queue.date}</p>
          <Badge variant={acceptingCustomers ? "secondary" : "outline"}>
            {badgeLabel(hoursStatus, isClosed)}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={setQueueStatus.isPending}
          onClick={() => setQueueStatus.mutate(isClosed ? "active" : "closed")}
        >
          {setQueueStatus.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Saving...
            </span>
          ) : (
            buttonLabel
          )}
        </Button>
      </div>
      <StatusNote
        hoursStatus={hoursStatus}
        isClosed={isClosed}
        openingTime={openingTime}
        closingTime={closingTime}
      />
    </div>
  );
}
