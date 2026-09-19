import { ApiErrorResponse, Shop } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getMyShop } from "../../api/shop";

export const MY_SHOP_KEY = ["my-shop"];

// The server renders the dashboard with the shop already loaded and hands it
// over as `initialShop`, so the first paint needs no request. From then on the
// query cache owns the shop: saving settings updates it and every page follows.
export const useMyShop = (initialShop: Shop) => {
  return useQuery<Shop, AxiosError<ApiErrorResponse>>({
    queryKey: MY_SHOP_KEY,
    queryFn: async () => {
      const result = await getMyShop();

      if (!result.data.shop) {
        throw new Error("Shop not found");
      }

      return result.data.shop;
    },
    initialData: initialShop,
  });
};
