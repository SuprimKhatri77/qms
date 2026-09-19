"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AnalyticsDay } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatShortDate } from "@/lib/format";

const chartConfig = {
  served: { label: "Served", color: "var(--chart-1)" },
  noShows: { label: "No-shows", color: "var(--chart-5)" },
} satisfies ChartConfig;

export function DailyChart({ daily }: { daily: AnalyticsDay[] }) {
  const hasData = daily.some((day) => day.served + day.noShows > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers per day</CardTitle>
        <CardDescription>
          Customers you finished, split into served and no-shows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={daily} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={formatShortDate}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => formatShortDate(String(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="served" stackId="day" fill="var(--color-served)" />
              <Bar
                dataKey="noShows"
                stackId="day"
                fill="var(--color-noShows)"
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="flex h-64 items-center justify-center text-sm text-ink-mute">
            No finished customers in this period yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
