import { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { removeTicket } from "../../api/queue";
import { SHOP_QUEUE_KEY } from "../queries/useShopQueue";

// Takes a waiting customer off today's list (e.g. they told staff they're
// leaving). The variable is the ticket id.
export const useRemoveTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QueueSnapshotResponse,
    AxiosError<ApiErrorResponse>,
    string
  >({
    mutationFn: (ticketId) => removeTicket(ticketId),
    // A 5-second poll that is already on its way could land after this
    // action's response and put the older queue back on screen. Cancelling
    // it first means the newest snapshot (this action's) is the one shown.
    onMutate: () => queryClient.cancelQueries({ queryKey: SHOP_QUEUE_KEY }),
    onSuccess: (result) => {
      queryClient.setQueryData(SHOP_QUEUE_KEY, result);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to remove customer",
      );
      // e.g. the customer was called or left a moment ago: re-read the queue
      // so the list stops showing them as waiting.
      void queryClient.invalidateQueries({ queryKey: SHOP_QUEUE_KEY });
    },
  });
};
