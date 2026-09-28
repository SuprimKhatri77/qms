import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listAdminShops } from "../../api/admin";

export const ADMIN_SHOPS_KEY = ["admin", "shops"];

export const useAdminShops = (page: number) => {
  return useQuery({
    queryKey: [...ADMIN_SHOPS_KEY, page],
    queryFn: () => listAdminShops(page),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
};
