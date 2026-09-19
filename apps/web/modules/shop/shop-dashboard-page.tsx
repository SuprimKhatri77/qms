import type { Shop } from "@repo/types";
import { SHOP_CATEGORY_LABELS } from "@repo/types";
import { QueueBoard } from "./queue-board";

type ShopDashboardPageProps = {
  shop: Shop;
};

export function ShopDashboardPage({ shop }: ShopDashboardPageProps) {
  const location = shop.area ? `${shop.area}, ${shop.city}` : shop.city;

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-12 lg:py-16">
      <header>
        <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
          {shop.name}
        </h1>
        <p className="mt-3 text-sm text-ink-mute">
          {SHOP_CATEGORY_LABELS[shop.category]} · {location} ·{" "}
          <span className="font-mono">/s/{shop.slug}</span>
        </p>
      </header>

      <div className="mt-10">
        <QueueBoard />
      </div>
    </div>
  );
}
