"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DiscoveredShop, ShopCategory } from "@repo/types";
import {
  DEFAULT_DISCOVERY_RADIUS_KM,
  SHOP_CATEGORIES,
  SHOP_CATEGORY_LABELS,
} from "@repo/types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDiscoverShops } from "./hooks/queries/useDiscoverShops";
import { useNearMe, type NearMeStatus } from "./hooks/use-near-me";
import { ShopResultCard } from "./shop-result-card";

// Leaflet touches `window` as soon as it loads, so the map is only ever
// rendered in the browser.
const ShopsMap = dynamic(
  () => import("./shops-map").then((mod) => mod.ShopsMap),
  { ssr: false },
);

const selectClassName =
  "h-10 w-full rounded-none border border-hairline bg-canvas px-3 text-sm text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// Only a known category from the URL is used; anything else means "all".
function parseCategory(value: string | null): ShopCategory | undefined {
  return SHOP_CATEGORIES.find((category) => category === value);
}

// A line under the filters explaining what "near me" is doing, if anything.
function nearMeMessage(status: NearMeStatus): string | null {
  switch (status) {
    case "locating":
      return "Finding your location...";
    case "on":
      return `Showing shops within ${DEFAULT_DISCOVERY_RADIUS_KM} km of you, nearest first.`;
    case "denied":
      return "Location access was blocked, so here are all shops instead. You can allow it in your browser settings.";
    case "unavailable":
      return "We couldn't get your location, so here are all shops instead.";
    default:
      return null;
  }
}

export function ExplorePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const nearMe = useNearMe();

  // City and category live in the URL, so a filtered list can be shared.
  const city = searchParams.get("city") ?? "";
  const category = parseCategory(searchParams.get("category"));

  const { data, isPending, isError, isFetching, refetch } = useDiscoverShops({
    city: city || undefined,
    category,
    lat: nearMe.location?.lat,
    lng: nearMe.location?.lng,
  });

  function setFilter(name: "city" | "category", value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  const message = nearMeMessage(nearMe.status);
  const shops = data?.data.shops ?? [];
  const cities = data?.data.cities ?? [];

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[28px] font-medium leading-[1.2] tracking-[-0.42px] text-ink">
        Find a shop
      </h1>
      <p className="mt-2 text-sm text-ink-mute">
        See how busy a shop is before you go, and join its queue from here.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-xs text-ink-mute">
          City
          <select
            className={`mt-1 ${selectClassName}`}
            value={city}
            onChange={(event) => setFilter("city", event.target.value)}
          >
            <option value="">All cities</option>
            {/* Keeps a city from a shared link selectable before the list loads. */}
            {city && !cities.includes(city) ? (
              <option value={city}>{city}</option>
            ) : null}
            {cities.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-ink-mute">
          Category
          <select
            className={`mt-1 ${selectClassName}`}
            value={category ?? ""}
            onChange={(event) => setFilter("category", event.target.value)}
          >
            <option value="">All categories</option>
            {SHOP_CATEGORIES.map((categoryName) => (
              <option key={categoryName} value={categoryName}>
                {SHOP_CATEGORY_LABELS[categoryName]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          {nearMe.status === "on" ? (
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={nearMe.clear}
            >
              Clear location
            </Button>
          ) : (
            <Button
              className="h-10 w-full"
              disabled={nearMe.status === "locating"}
              onClick={nearMe.locate}
            >
              {nearMe.status === "locating" ? <Spinner /> : null}
              Near me
            </Button>
          )}
        </div>
      </div>

      {message ? (
        <p role="status" className="mt-3 text-sm text-ink-mute">
          {message}
        </p>
      ) : null}

      <ExploreResults
        isPending={isPending}
        isError={isError}
        isFetching={isFetching}
        onRetry={() => void refetch()}
        shops={shops}
        userLocation={nearMe.location}
      />
    </div>
  );
}

type ExploreResultsProps = {
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  shops: DiscoveredShop[];
  userLocation: { lat: number; lng: number } | null;
};

// The loading, error, empty and "here they are" states of the results.
function ExploreResults({
  isPending,
  isError,
  isFetching,
  onRetry,
  shops,
  userLocation,
}: ExploreResultsProps) {
  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-ink-mute">
        <Spinner />
        Loading shops...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-8 border border-hairline p-6 text-sm">
        <p className="text-ink">Couldn&apos;t load shops.</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <p className="mt-8 border border-hairline p-6 text-sm text-ink-mute">
        No shops match. Try another city or category
        {userLocation ? ", or clear your location" : ""}.
      </p>
    );
  }

  const hasPins = shops.some((shop) => shop.lat !== null);

  return (
    <div className={`mt-8 space-y-6 ${isFetching ? "opacity-60" : ""}`}>
      {hasPins ? <ShopsMap shops={shops} userLocation={userLocation} /> : null}
      <p className="text-xs text-ink-mute">
        {shops.length === 1 ? "1 shop" : `${shops.length} shops`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {shops.map((shop) => (
          <ShopResultCard key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
}
