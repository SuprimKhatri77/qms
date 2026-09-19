import {
  ApiErrorResponse,
  UpdateShopRequest,
  UpdateShopResponse,
} from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { updateShop } from "../../api/shop";
import { MY_SHOP_KEY } from "../queries/useMyShop";

export const useUpdateShop = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateShopResponse,
    AxiosError<ApiErrorResponse>,
    UpdateShopRequest
  >({
    mutationFn: updateShop,
    onSuccess: (result) => {
      toast.success(result.message);
      // Put the saved shop straight into the cache: the sidebar and every
      // page showing the shop update without another request.
      queryClient.setQueryData(MY_SHOP_KEY, result.data.shop);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to save settings",
      );
    },
  });
};
