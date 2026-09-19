"use client";

import { PageHeader } from "@/modules/dashboard/page-header";
import { QueueBoard } from "./queue-board";

export function QueuePage() {
  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="Live queue"
        description="Call the next customer and mark them done or no-show. Updates every few seconds."
      />
      <QueueBoard />
    </div>
  );
}
