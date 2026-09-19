"use client";

import type { CreateShopFormValues } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/modules/dashboard/page-header";
import { ShopForm, useUpdateShop } from "@/modules/shop";
import { useShop } from "@/modules/shop/shop-provider";

export function SettingsPage() {
  const shop = useShop();
  const updateShop = useUpdateShop();

  const defaultValues: CreateShopFormValues = {
    name: shop.name,
    category: shop.category,
    city: shop.city,
    area: shop.area ?? "",
    avgServiceMinutes: shop.avgServiceMinutes,
    queueExpiryHours: shop.queueExpiryHours,
  };

  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader
        title="Settings"
        description="These are the details customers see and the numbers your queue runs on."
      />

      <Card>
        <CardHeader>
          <CardTitle>Shop details</CardTitle>
          <CardDescription>
            Your public link (/s/{shop.slug}) stays the same even if you rename
            your shop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShopForm
            // Remounts the form if the shop data itself is replaced (e.g. after
            // a save), so the fields always start from the saved values.
            key={shop.updatedAt}
            defaultValues={defaultValues}
            submitLabel="Save changes"
            pendingLabel="Saving..."
            isPending={updateShop.isPending}
            onSubmit={(values) =>
              updateShop.mutateAsync(values).catch(() => undefined)
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
