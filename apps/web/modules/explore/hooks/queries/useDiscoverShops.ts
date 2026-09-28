import { ApiErrorResponse, DiscoverShopsResponse } from "@repo/types";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { discoverShops, type DiscoverFilters } from "../../api/explore";

// Refetches whenever a filter changes (the filters are part of the key).
// The previous results stay on screen while the new ones load, so the list
// doesn't flash empty on every change.
export const useDiscoverShops = (filters: DiscoverFilters) => {
  return useQuery<DiscoverShopsResponse, AxiosError<ApiErrorResponse>>({
    queryKey: ["discover-shops", filters],
    queryFn: () => discoverShops(filters),
    placeholderData: keepPreviousData,
  });
};
