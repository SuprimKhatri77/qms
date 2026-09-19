import { ApiErrorResponse, VerifyTicketResponse } from "@repo/types";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { verifyTicket } from "../../api/join";

// No onSuccess/onError toasts here: the verify page itself is the only
// consumer, and it shows the outcome (success, expired, invalid) as its
// whole-page state rather than a passing toast.
export const useVerifyTicket = () => {
  return useMutation<
    VerifyTicketResponse,
    AxiosError<ApiErrorResponse>,
    string
  >({
    mutationFn: verifyTicket,
  });
};
