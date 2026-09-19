"use client";

import { EMPTY_SHOP_VALUES, ShopForm } from "./shop-form";
import { useCreateShop } from "./hooks/mutations/useCreateShop";

export function OnboardingForm() {
  const createShop = useCreateShop();

  return (
    <ShopForm
      defaultValues={EMPTY_SHOP_VALUES}
      submitLabel="Create shop"
      pendingLabel="Creating shop..."
      isPending={createShop.isPending}
      // Errors are shown as a toast by the mutation's onError.
      onSubmit={(values) =>
        createShop.mutateAsync(values).catch(() => undefined)
      }
    />
  );
}
