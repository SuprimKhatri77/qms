import { ApiErrorResponse, PublicTicketResponse } from "@repo/types";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getPublicTicket } from "../../api/join";

// Once a ticket reaches one of these, its position stops changing, so
// there's nothing left to poll for.
const RESOLVED_STATUSES = new Set(["done", "no_show", "cancelled", "expired"]);

const POLL_INTERVAL_MS = 10_000;

export const publicTicketKey = (ticketId: string) => [
  "public-ticket",
  ticketId,
];

// The server renders the ticket page with the ticket already loaded (see
// get-public-ticket.server.ts), handed over as `initialData`, so the first
// paint needs no request. From then on this polls for the owner calling
// "next" or resolving the ticket, same pattern as the owner dashboard's
// useShopQueue — just slower, since a few seconds' delay here is fine.
export const usePublicTicket = (
  ticketId: string,
  initialData: PublicTicketResponse["data"],
) => {
  return useQuery<PublicTicketResponse["data"], AxiosError<ApiErrorResponse>>({
    queryKey: publicTicketKey(ticketId),
    queryFn: async () => (await getPublicTicket(ticketId)).data,
    initialData,
    refetchInterval: (query) => {
      const status = query.state.data?.ticket.status;
      return status && RESOLVED_STATUSES.has(status) ? false : POLL_INTERVAL_MS;
    },
  });
};
