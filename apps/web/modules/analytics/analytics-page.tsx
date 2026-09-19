"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatMinutes, formatPercent } from "@/lib/format";
import { PageHeader } from "@/modules/dashboard/page-header";
import { StatCard } from "@/modules/dashboard/stat-card";
import { DailyChart } from "./daily-chart";
import { HourlyChart } from "./hourly-chart";
import { useAnalytics } from "./hooks/queries/useAnalytics";

const RANGES = [7, 30, 90] as const;

export function AnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const { data, isPending, isError, isFetching, refetch } = useAnalytics(days);

  const rangePicker = (
    <div className="flex items-center gap-2">
      {isFetching && !isPending ? <Spinner /> : null}
      <div role="group" aria-label="Date range" className="flex">
        {RANGES.map((range) => (
          <Button
            key={range}
            variant={range === days ? "default" : "outline"}
            aria-pressed={range === days}
            onClick={() => setDays(range)}
          >
            {range} days
          </Button>
        ))}
      </div>
    </div>
  );

  if (isPending) {
    return (
      <>
        <PageHeader title="Analytics" actions={rangePicker} />
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
          <Spinner />
          Loading analytics...
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Analytics" actions={rangePicker} />
        <div className="border border-hairline p-6 text-sm">
          <p className="text-ink">Couldn&apos;t load analytics.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      </>
    );
  }

  const { summary, daily, hourly, from, to } = data.data;

  return (
    <>
      <PageHeader
        title="Analytics"
        description={`${from} to ${to}`}
        actions={rangePicker}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={summary.customers}
          hint="Joined and verified"
        />
        <StatCard
          label="Average wait"
          value={formatMinutes(summary.avgWaitMinutes)}
          hint="From joining to being called"
        />
        <StatCard label="Served" value={summary.served} />
        <StatCard
          label="No-show rate"
          value={formatPercent(summary.noShowRate)}
          hint={`${summary.noShows} no-show${summary.noShows === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <DailyChart daily={daily} />
        <HourlyChart hourly={hourly} />
      </div>
    </>
  );
}
