"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useShopQueue } from "./hooks/queries/useShopQueue";
import { NowServingCard } from "./now-serving-card";
import { WaitingList } from "./waiting-list";

type StatProps = {
  label: string;
  value: number;
};

function Stat({ label, value }: StatProps) {
  return (
    <div className="border border-hairline p-4">
      <p className="text-xs text-ink-mute">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-ink">{value}</p>
    </div>
  );
}

// Today's live queue: who is being served, who is waiting, and the controls.
// It re-reads the queue every few seconds (see useShopQueue).
export function QueueBoard() {
  const { data, isPending, isError, refetch } = useShopQueue();

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
        <Spinner />
        Loading today&apos;s queue...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="border border-hairline p-6 text-sm">
        <p className="text-ink">Couldn&apos;t load the queue.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { queue, serving, waiting, stats } = data.data;

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink-mute">Queue for {queue.date}</p>

      <NowServingCard serving={serving} hasWaiting={waiting.length > 0} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Waiting" value={waiting.length} />
        <Stat label="Done today" value={stats.done} />
        <Stat label="No-shows" value={stats.noShow} />
      </div>

      <WaitingList waiting={waiting} />
    </div>
  );
}
