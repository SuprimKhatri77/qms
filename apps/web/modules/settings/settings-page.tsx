"use client";

import type { CreateShopFormValues, User } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/modules/auth/change-password-form";
import { PageHeader } from "@/modules/dashboard/page-header";
import { ShopForm, useUpdateShop } from "@/modules/shop";
import { useShop } from "@/modules/shop/shop-provider";

export function SettingsPage({ user }: { user: User }) {
  const shop = useShop();
  const updateShop = useUpdateShop();

  const defaultValues: CreateShopFormValues = {
    name: shop.name,
    category: shop.category,
    city: shop.city,
    area: shop.area ?? "",
    address: shop.address ?? "",
    email: shop.email ?? "",
    phone: shop.phone ?? "",
    lat: shop.lat ?? undefined,
    lng: shop.lng ?? undefined,
    avgServiceMinutes: shop.avgServiceMinutes,
    closingTime: shop.closingTime ?? "",
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Signed in as {user.email}. Change the password you log in with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
