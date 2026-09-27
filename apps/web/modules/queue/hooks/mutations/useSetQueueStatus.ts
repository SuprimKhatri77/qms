import {
  ApiErrorResponse,
  QueueSnapshotResponse,
  QueueStatus,
} from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { setQueueStatus } from "../../api/queue";
import { SHOP_QUEUE_KEY } from "../queries/useShopQueue";

// Opens or closes today's queue to new customers.
export const useSetQueueStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QueueSnapshotResponse,
    AxiosError<ApiErrorResponse>,
    QueueStatus
  >({
    mutationFn: setQueueStatus,
    onSuccess: (result) => {
      queryClient.setQueryData(SHOP_QUEUE_KEY, result);
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to update the queue",
      );
      void queryClient.invalidateQueries({ queryKey: SHOP_QUEUE_KEY });
    },
  });
};
