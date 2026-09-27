import { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { cancelTicket } from "../../api/join";
import { publicTicketKey } from "../queries/usePublicTicket";

// The customer leaving the queue from their ticket page.
export const useCancelTicket = (ticketId: string) => {
  const queryClient = useQueryClient();

  return useMutation<PublicTicketResponse, AxiosError<ApiErrorResponse>>({
    mutationFn: () => cancelTicket(ticketId),
    // The response is the ticket, now cancelled: show it straight away.
    // Polling then stops by itself, because "cancelled" is a final status.
    onSuccess: (result) => {
      queryClient.setQueryData(publicTicketKey(ticketId), result.data);
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(
        error.response?.data.message ||
          error.message ||
          "Failed to leave the queue",
      );
      // e.g. the owner called this ticket a moment ago: re-read it so the
      // page shows "It's your turn!" instead of a stale "waiting".
      void queryClient.invalidateQueries({
        queryKey: publicTicketKey(ticketId),
      });
    },
  });
};
