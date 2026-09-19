"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { AnalyticsHour } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatHour } from "@/lib/format";

const chartConfig = {
  customers: { label: "Customers", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function HourlyChart({ hourly }: { hourly: AnalyticsHour[] }) {
  const hasData = hourly.some((hour) => hour.customers > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Busiest hours</CardTitle>
        <CardDescription>
          When customers join your queue, in your shop&apos;s local time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <BarChart data={hourly} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={2}
                tickFormatter={formatHour}
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
                    labelFormatter={(value) => formatHour(Number(value))}
                  />
                }
              />
              <Bar dataKey="customers" fill="var(--color-customers)" />
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="flex h-64 items-center justify-center text-sm text-ink-mute">
            No customers have joined in this period yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
