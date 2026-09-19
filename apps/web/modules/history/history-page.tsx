"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatLongDate, formatMinutes } from "@/lib/format";
import { PageHeader } from "@/modules/dashboard/page-header";
import { useHistory } from "./hooks/queries/useHistory";

// The filters and current page live in the URL (?page=2&from=...&to=...), so
// going back from a day's detail returns to the same view, and it can be shared.
export function HistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  // What's typed in the date boxes; only applied when the owner presses Apply.
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  const { data, isPending, isError, isFetching, refetch } = useHistory({
    page,
    from: from || undefined,
    to: to || undefined,
  });

  function updateUrl(next: { page?: number; from?: string; to?: string }) {
    const params = new URLSearchParams();
    const nextPage = next.page ?? 1;
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const hasFilter = Boolean(from || to);

  return (
    <>
      <PageHeader
        title="History"
        description="Every past day that had customers."
      />

      <form
        className="mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          updateUrl({ page: 1, from: draftFrom, to: draftTo });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="history-from">From</Label>
          <Input
            id="history-from"
            type="date"
            value={draftFrom}
            max={draftTo || undefined}
            onChange={(event) => setDraftFrom(event.target.value)}
            className="h-9 w-40 rounded-none border-hairline"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="history-to">To</Label>
          <Input
            id="history-to"
            type="date"
            value={draftTo}
            min={draftFrom || undefined}
            onChange={(event) => setDraftTo(event.target.value)}
            className="h-9 w-40 rounded-none border-hairline"
          />
        </div>
        <Button type="submit">Apply</Button>
        {hasFilter ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraftFrom("");
              setDraftTo("");
              updateUrl({ page: 1, from: "", to: "" });
            }}
          >
            Clear
          </Button>
        ) : null}
        {isFetching && !isPending ? <Spinner /> : null}
      </form>

      {isPending ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
          <Spinner />
          Loading history...
        </div>
      ) : isError ? (
        <div className="border border-hairline p-6 text-sm">
          <p className="text-ink">Couldn&apos;t load history.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      ) : data.data.days.length === 0 ? (
        <p className="border border-hairline p-6 text-sm text-ink-mute">
          {hasFilter
            ? "No days match those dates."
            : "No history yet. Days appear here once customers have joined your queue."}
        </p>
      ) : (
        <>
          <div className="border border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Served</TableHead>
                  <TableHead className="text-right">No-shows</TableHead>
                  <TableHead className="text-right">Avg wait</TableHead>
                  <TableHead>Queue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.days.map((day) => (
                  <TableRow key={day.queueId}>
                    <TableCell>
                      <Link
                        href={`/shop/history/${day.date}`}
                        className="font-medium text-ink underline-offset-4 hover:underline"
                      >
                        {formatLongDate(day.date)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.customers}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.served}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {day.noShows}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinutes(day.avgWaitMinutes)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          day.status === "active" ? "default" : "outline"
                        }
                      >
                        {day.status === "active" ? "Open" : "Closed"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-ink-mute">
            <span>
              Page {data.meta.page} of {data.meta.totalPages} ·{" "}
              {data.meta.total} day{data.meta.total === 1 ? "" : "s"}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={data.meta.page <= 1}
                onClick={() => updateUrl({ page: data.meta.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={data.meta.page >= data.meta.totalPages}
                onClick={() => updateUrl({ page: data.meta.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
