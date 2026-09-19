"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMinutes, formatPercent } from "@/lib/format";
import { useAnalytics } from "@/modules/analytics/hooks/queries/useAnalytics";
import { PageHeader } from "@/modules/dashboard/page-header";
import { StatCard } from "@/modules/dashboard/stat-card";
import { useShopQueue } from "@/modules/queue/hooks/queries/useShopQueue";
import { useShop } from "@/modules/shop/shop-provider";

// The dashboard's front page: today at a glance, the past week in numbers,
// and shortcuts to the pages you use most.
export function OverviewPage() {
  const shop = useShop();
  const queue = useShopQueue();
  const week = useAnalytics(7);

  const today = queue.data?.data;
  const summary = week.data?.data.summary;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Today at ${shop.name}`}
        actions={
          <Button nativeButton={false} render={<Link href="/shop/queue" />}>
            Open live queue
            <ArrowRight />
          </Button>
        }
      />

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-sm font-medium text-ink">
          Today
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Waiting now" value={today?.waiting.length ?? "—"} />
          <StatCard
            label="Now serving"
            value={today?.serving ? `#${today.serving.tokenNumber}` : "—"}
            hint={today?.serving?.customerName}
          />
          <StatCard label="Done today" value={today?.stats.done ?? "—"} />
          <StatCard label="No-shows today" value={today?.stats.noShow ?? "—"} />
        </div>
      </section>

      <section aria-labelledby="week-heading" className="mt-10">
        <h2 id="week-heading" className="mb-3 text-sm font-medium text-ink">
          Last 7 days
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Customers" value={summary?.customers ?? "—"} />
          <StatCard
            label="Average wait"
            value={formatMinutes(summary?.avgWaitMinutes ?? null)}
            hint="From joining to being called"
          />
          <StatCard
            label="No-show rate"
            value={formatPercent(summary?.noShowRate ?? null)}
          />
        </div>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Get customers in line</CardTitle>
            <CardDescription>
              Print your QR code for the counter, or share your link.
            </CardDescription>
          </CardHeader>
          <div className="px-(--card-spacing)">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/shop/share" />}
            >
              Share & QR
            </Button>
          </div>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle>Tune your queue</CardTitle>
            <CardDescription>
              Change your shop details, the minutes per customer, or how long
              the queue stays open.
            </CardDescription>
          </CardHeader>
          <div className="px-(--card-spacing)">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/shop/settings" />}
            >
              Open settings
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
