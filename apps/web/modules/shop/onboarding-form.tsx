"use client";

import { useForm } from "@tanstack/react-form-nextjs";
import {
  CreateShopFormValues,
  SHOP_CATEGORIES,
  SHOP_CATEGORY_LABELS,
  ShopCategory,
  createShopSchema,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCreateShop } from "./hooks/mutations/useCreateShop";

const inputClassName =
  "h-10 rounded-none border-hairline px-3 text-sm placeholder:text-ink-faint";

// A number input reports NaN when it is empty; show that as an empty box.
function numberToInputValue(value: number) {
  return Number.isNaN(value) ? "" : value;
}

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

// Label + control + hint/error, so every field below reads the same way.
function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-mute">{hint}</p>
      ) : null}
    </div>
  );
}

export function OnboardingForm() {
  const createShop = useCreateShop();

  const defaultValues: CreateShopFormValues = {
    name: "",
    // Empty until the owner picks one. The cast is safe because the schema
    // rejects "" with "Please choose a category" before anything is sent.
    category: "" as ShopCategory,
    city: "",
    area: "",
    avgServiceMinutes: 10,
    queueExpiryHours: 24,
  };

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: createShopSchema,
    },
    onSubmit: async ({ value }) => {
      // Errors are shown as a toast by the mutation's onError.
      await createShop.mutateAsync(value).catch(() => undefined);
    },
  });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="name">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell id="shop-name" label="Shop name" error={error}>
              <Input
                id="shop-name"
                name="name"
                placeholder="Ram's Barbershop"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "shop-name-error" : undefined}
                className={inputClassName}
              />
            </FieldShell>
          );
        }}
      </form.Field>

      <form.Field name="category">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell id="shop-category" label="Category" error={error}>
              <select
                id="shop-category"
                name="category"
                required
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) =>
                  field.handleChange(event.target.value as ShopCategory)
                }
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "shop-category-error" : undefined}
                className={`${inputClassName} w-full border bg-canvas text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`}
              >
                <option value="" disabled>
                  Select a category
                </option>
                {SHOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {SHOP_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </FieldShell>
          );
        }}
      </form.Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="city">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell id="shop-city" label="City" error={error}>
                <Input
                  id="shop-city"
                  name="city"
                  placeholder="Kathmandu"
                  autoComplete="address-level2"
                  required
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "shop-city-error" : undefined}
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>

        <form.Field name="area">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell id="shop-area" label="Area (optional)" error={error}>
                <Input
                  id="shop-area"
                  name="area"
                  placeholder="Baneshwor"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "shop-area-error" : undefined}
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="avgServiceMinutes">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell
                id="shop-avg-minutes"
                label="Minutes per customer"
                error={error}
                hint="Used to estimate each customer's wait."
              >
                <Input
                  id="shop-avg-minutes"
                  name="avgServiceMinutes"
                  type="number"
                  min={1}
                  max={180}
                  required
                  value={numberToInputValue(field.state.value)}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.valueAsNumber)
                  }
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? "shop-avg-minutes-error" : undefined
                  }
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>

        <form.Field name="queueExpiryHours">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell
                id="shop-expiry-hours"
                label="Queue open for (hours)"
                error={error}
                hint="Each day's queue closes after this long."
              >
                <Input
                  id="shop-expiry-hours"
                  name="queueExpiryHours"
                  type="number"
                  min={1}
                  max={48}
                  required
                  value={numberToInputValue(field.state.value)}
                  onBlur={field.handleBlur}
                  onChange={(event) =>
                    field.handleChange(event.target.valueAsNumber)
                  }
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? "shop-expiry-hours-error" : undefined
                  }
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>
      </div>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={createShop.isPending}
      >
        {createShop.isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            Creating shop...
          </span>
        ) : (
          "Create shop"
        )}
      </Button>
    </form>
  );
}
