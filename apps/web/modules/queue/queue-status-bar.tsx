"use client";

import type { ShopQueue } from "@repo/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSetQueueStatus } from "./hooks/mutations/useSetQueueStatus";

// The date of today's queue, whether it's open to new customers, and the
// button that flips it. No "are you sure?": it can be undone with one click.
export function QueueStatusBar({ queue }: { queue: ShopQueue }) {
  const setQueueStatus = useSetQueueStatus();
  const isClosed = queue.status === "closed";
  const buttonLabel = isClosed ? "Reopen queue" : "Close queue";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-mute">Queue for {queue.date}</p>
          <Badge variant={isClosed ? "outline" : "secondary"}>
            {isClosed ? "Closed" : "Open"}
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
      {isClosed ? (
        <p className="text-sm text-ink-mute">
          New customers can&apos;t join. You can still serve everyone already
          waiting.
        </p>
      ) : null}
    </div>
  );
}
