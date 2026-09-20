import { useQuery } from "@tanstack/react-query";
import { listAdminShops } from "../../api/admin";

export const ADMIN_SHOPS_KEY = ["admin", "shops"];

export const useAdminShops = () => {
  return useQuery({
    queryKey: ADMIN_SHOPS_KEY,
    queryFn: listAdminShops,
  });
};
