import type { Shop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";

type ShopDashboardPageProps = {
  shop: Shop;
};

// Placeholder: the live queue controls (call next, done, no-show) come in a
// later feature. For now this confirms onboarding worked.
export function ShopDashboardPage({ shop }: ShopDashboardPageProps) {
  const location = shop.area ? `${shop.area}, ${shop.city}` : shop.city;

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-12 lg:py-16">
      <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
        {shop.name}
      </h1>
      <p className="mt-3 text-sm text-ink-mute">
        {SHOP_CATEGORY_LABELS[shop.category]} · {location}
      </p>

      <dl className="mt-8 divide-y divide-hairline border border-hairline text-sm">
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-ink-mute">Public link</dt>
          <dd className="font-mono text-ink">/s/{shop.slug}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-ink-mute">Minutes per customer</dt>
          <dd className="text-ink">{shop.avgServiceMinutes}</dd>
        </div>
        <div className="flex justify-between gap-4 p-4">
          <dt className="text-ink-mute">Queue open for</dt>
          <dd className="text-ink">{shop.queueExpiryHours} hours</dd>
        </div>
      </dl>

      <p className="mt-8 text-sm text-ink-mute">
        The live queue dashboard is coming next.
      </p>
    </div>
  );
}
