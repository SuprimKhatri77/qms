"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCancelTicket } from "./hooks/mutations/useCancelTicket";

// "Leave the queue", with an inline "are you sure?" step. Leaving can't be
// undone (rejoining puts you at the back), so one accidental tap shouldn't
// be enough. Inline rather than a pop-up dialog: it's one question, and it
// keeps the page simple on a phone.
export function LeaveQueueButton({ ticketId }: { ticketId: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const cancelTicket = useCancelTicket(ticketId);

  if (!isConfirming) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 text-ink-mute"
        onClick={() => setIsConfirming(true)}
      >
        Leave the queue
      </Button>
    );
  }

  return (
    <div className="mt-4 border-t border-hairline pt-4">
      <p className="text-sm text-ink">
        Leave the queue? You&apos;ll lose your spot.
      </p>
      <div className="mt-3 flex justify-center gap-3">
        <Button
          variant="destructive"
          size="sm"
          disabled={cancelTicket.isPending}
          onClick={() => cancelTicket.mutate()}
        >
          {cancelTicket.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner />
              Leaving...
            </span>
          ) : (
            "Yes, leave"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={cancelTicket.isPending}
          onClick={() => setIsConfirming(false)}
        >
          Stay
        </Button>
      </div>
    </div>
  );
}
