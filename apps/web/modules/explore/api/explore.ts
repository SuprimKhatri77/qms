import api from "@/lib/axios";
import type { DiscoverShopsResponse, ShopCategory } from "@repo/types";

// What the explore page searches by. Every field is optional; lat/lng
// switch on "near me".
export type DiscoverFilters = {
  city?: string;
  category?: ShopCategory;
  lat?: number;
  lng?: number;
};

export const discoverShops = async (
  filters: DiscoverFilters,
): Promise<DiscoverShopsResponse> => {
  const res = await api.get<DiscoverShopsResponse>("/public/shops", {
    params: filters,
  });
  return res.data;
};
