import { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { callNext } from "../../api/queue";
import { SHOP_QUEUE_KEY } from "../queries/useShopQueue";

export const useCallNext = () => {
  const queryClient = useQueryClient();

  return useMutation<QueueSnapshotResponse, AxiosError<ApiErrorResponse>>({
    mutationFn: callNext,
    // The response is already the updated queue, so show it straight away.
    onSuccess: (result) => {
      queryClient.setQueryData(SHOP_QUEUE_KEY, result);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to call next customer",
      );
      // The queue may have changed under us (e.g. another tab), so re-read it.
      void queryClient.invalidateQueries({ queryKey: SHOP_QUEUE_KEY });
    },
  });
};
