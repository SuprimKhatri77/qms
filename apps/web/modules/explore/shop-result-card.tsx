import Link from "next/link";
import type { DiscoveredShop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";
import { Button } from "@/components/ui/button";
import { formatDistance } from "@/lib/format";

// "Open · 3 waiting" or "Closed today".
function queueSummary(shop: DiscoveredShop): string {
  if (!shop.queueOpen) {
    return "Closed today";
  }
  if (shop.waitingCount === 0) {
    return "Open · no wait";
  }
  return `Open · ${shop.waitingCount} waiting`;
}

export function ShopResultCard({ shop }: { shop: DiscoveredShop }) {
  const location = [shop.area, shop.city].filter(Boolean).join(", ");

  return (
    <article className="flex flex-col border border-hairline bg-canvas p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-medium text-ink">{shop.name}</h2>
        {shop.distanceKm !== null ? (
          <span className="shrink-0 text-xs text-ink-mute tabular-nums">
            {formatDistance(shop.distanceKm)}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-ink-mute">
        {SHOP_CATEGORY_LABELS[shop.category]} · {location}
      </p>
      <p
        className={`mt-3 text-sm ${shop.queueOpen ? "text-ink" : "text-ink-mute"}`}
      >
        {queueSummary(shop)}
      </p>
      <Button
        className="mt-4 self-start"
        size="sm"
        variant={shop.queueOpen ? "default" : "outline"}
        nativeButton={false}
        render={<Link href={`/s/${shop.slug}`} />}
      >
        {shop.queueOpen ? "Join the queue" : "View shop"}
      </Button>
    </article>
  );
}
