"use client";

import dynamic from "next/dynamic";
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

// Leaflet touches `window` as soon as its module runs, which crashes a server
// render. Loading it only on the client sidesteps that entirely.
const LocationPicker = dynamic(
  () => import("./location-picker").then((mod) => mod.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center border border-hairline text-sm text-ink-mute">
        Loading map...
      </div>
    ),
  },
);

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

// Form values for a brand-new shop. The category stays empty until the owner
// picks one; the cast is safe because the schema rejects "" with
// "Please choose a category" before anything is sent.
export const EMPTY_SHOP_VALUES: CreateShopFormValues = {
  name: "",
  category: "" as ShopCategory,
  city: "",
  area: "",
  address: "",
  email: "",
  phone: "",
  avgServiceMinutes: 10,
  queueExpiryHours: 24,
};

type ShopFormProps = {
  defaultValues: CreateShopFormValues;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  // Errors are shown as a toast by the caller's mutation, so this should not throw.
  onSubmit: (values: CreateShopFormValues) => Promise<unknown>;
};

// The shop's editable fields. Used by onboarding (create) and settings (update),
// which differ only in the starting values and what happens on submit.
export function ShopForm({
  defaultValues,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
}: ShopFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: createShopSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
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

      <form.Field name="address">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell
              id="shop-address"
              label="Street address (optional)"
              error={error}
            >
              <Input
                id="shop-address"
                name="address"
                placeholder="Putalisadak Road, near Civil Mall"
                autoComplete="street-address"
                value={field.state.value ?? ""}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "shop-address-error" : undefined}
                className={inputClassName}
              />
            </FieldShell>
          );
        }}
      </form.Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <form.Field name="email">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell
                id="shop-email"
                label="Contact email (optional)"
                error={error}
              >
                <Input
                  id="shop-email"
                  name="email"
                  type="email"
                  placeholder="shop@example.com"
                  autoComplete="email"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "shop-email-error" : undefined}
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>

        <form.Field name="phone">
          {(field) => {
            const error = field.state.meta.errors[0]?.message;
            return (
              <FieldShell
                id="shop-phone"
                label="Contact phone (optional)"
                error={error}
              >
                <Input
                  id="shop-phone"
                  name="phone"
                  type="tel"
                  placeholder="98XXXXXXXX"
                  autoComplete="tel"
                  value={field.state.value ?? ""}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "shop-phone-error" : undefined}
                  className={inputClassName}
                />
              </FieldShell>
            );
          }}
        </form.Field>
      </div>

      <form.Field name="lat">
        {(field) => {
          const error = field.state.meta.errors[0]?.message;
          return (
            <FieldShell
              id="shop-location"
              label="Location on map (optional)"
              error={error}
              hint="Click the map to drop a pin. Shown later on the landing page's shop map."
            >
              {/* lng lives on its own field; reading it here keeps the picker
                  in sync without re-rendering the whole form on every click. */}
              <form.Subscribe selector={(state) => state.values.lng}>
                {(lng) => (
                  <LocationPicker
                    lat={field.state.value}
                    lng={lng}
                    onSelect={(lat, lng) => {
                      field.handleChange(lat);
                      form.setFieldValue("lng", lng);
                    }}
                  />
                )}
              </form.Subscribe>
            </FieldShell>
          );
        }}
      </form.Field>

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

      <Button type="submit" className="h-10 w-full" disabled={isPending}>
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            {pendingLabel}
          </span>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
