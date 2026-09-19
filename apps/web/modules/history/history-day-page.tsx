"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatLongDate, formatTime } from "@/lib/format";
import { PageHeader } from "@/modules/dashboard/page-header";
import { useShop } from "@/modules/shop/shop-provider";
import { useHistoryDay } from "./hooks/queries/useHistory";
import { TicketStatusBadge } from "./ticket-status-badge";

export function HistoryDayPage({ date }: { date: string }) {
  const shop = useShop();
  const { data, isPending, isError, error, refetch } = useHistoryDay(date);

  const back = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link href="/shop/history" />}
    >
      <ArrowLeft />
      All days
    </Button>
  );

  if (isPending) {
    return (
      <>
        <PageHeader title={formatLongDate(date)} actions={back} />
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
          <Spinner />
          Loading day...
        </div>
      </>
    );
  }

  if (isError) {
    const notFound = error.response?.status === 404;

    return (
      <>
        <PageHeader title={formatLongDate(date)} actions={back} />
        <div className="border border-hairline p-6 text-sm">
          <p className="text-ink">
            {notFound
              ? "There was no queue on this day."
              : "Couldn't load this day."}
          </p>
          {notFound ? null : (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => void refetch()}
            >
              Try again
            </Button>
          )}
        </div>
      </>
    );
  }

  const { tickets } = data.data;

  return (
    <>
      <PageHeader
        title={formatLongDate(date)}
        description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}. Times are in ${shop.timezone}.`}
        actions={back}
      />

      <div className="border border-hairline">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Called</TableHead>
              <TableHead>Finished</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono tabular-nums">
                  #{ticket.tokenNumber}
                </TableCell>
                <TableCell>
                  <span className="text-ink">{ticket.customerName}</span>
                  {ticket.customerPhone ? (
                    <span className="ml-2 text-xs text-ink-mute">
                      {ticket.customerPhone}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <TicketStatusBadge status={ticket.status} />
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatTime(ticket.createdAt, shop.timezone)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatTime(ticket.calledAt, shop.timezone)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatTime(ticket.resolvedAt, shop.timezone)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
