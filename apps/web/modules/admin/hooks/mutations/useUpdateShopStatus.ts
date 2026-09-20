import type { ApiErrorResponse, UpdateShopStatusResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { updateShopStatus } from "../../api/admin";
import { ADMIN_SHOPS_KEY } from "../queries/useAdminShops";

export const useUpdateShopStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateShopStatusResponse,
    AxiosError<ApiErrorResponse>,
    Parameters<typeof updateShopStatus>[0]
  >({
    mutationFn: updateShopStatus,
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ADMIN_SHOPS_KEY });
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to update shop",
      );
    },
  });
};
