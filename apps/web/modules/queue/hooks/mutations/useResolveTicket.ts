import { ApiErrorResponse, QueueSnapshotResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { markDone, markNoShow } from "../../api/queue";
import { SHOP_QUEUE_KEY } from "../queries/useShopQueue";

export type ResolveTicketVariables = {
  ticketId: string;
  outcome: "done" | "no_show";
};

// Finishes the customer being served, either as done or as a no-show.
export const useResolveTicket = () => {
  const queryClient = useQueryClient();

  return useMutation<
    QueueSnapshotResponse,
    AxiosError<ApiErrorResponse>,
    ResolveTicketVariables
  >({
    mutationFn: ({ ticketId, outcome }) =>
      outcome === "done" ? markDone(ticketId) : markNoShow(ticketId),
    onSuccess: (result) => {
      queryClient.setQueryData(SHOP_QUEUE_KEY, result);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to update ticket",
      );
      void queryClient.invalidateQueries({ queryKey: SHOP_QUEUE_KEY });
    },
  });
};
