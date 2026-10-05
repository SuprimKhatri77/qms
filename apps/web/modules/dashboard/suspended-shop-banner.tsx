"use client";

import { ShieldAlert } from "lucide-react";
import { useShop } from "@/modules/shop/shop-provider";

// Shown across the top of every dashboard page while an admin has the shop
// suspended. Suspension only blocks new customers on the public link (the
// join page refuses them), so without this the owner would see "Open" on
// their queue and have no idea why nobody can join.
//
// The shop comes from useShop(), which refetches when the dashboard loads
// or the tab regains focus, so the banner appears and disappears on its own
// after an admin suspends or reactivates the shop.
export function SuspendedShopBanner() {
  const shop = useShop();

  if (shop.status !== "suspended") {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">Your shop is suspended</p>
        <p className="mt-0.5 text-red-800">
          An admin has suspended {shop.name}. New customers can&apos;t join your
          queue from your link or QR code, even while it shows Open. You can
          still serve everyone already waiting.
        </p>
      </div>
    </div>
  );
}
